import { createRemoteJWKSet, jwtVerify } from "jose";

/*
  Google sign-in, as plain OpenID Connect.

  BloodBridge already issues its own session (src/lib/session.ts), so this is
  the authorization-code flow written out rather than an auth framework: a
  second framework would bring a second notion of "signed in" alongside the
  bloodbridge_session cookie and the role guards built on it.

  What Google gives back is an ID token — a JWT signed by Google. It is
  verified here against Google's published keys, not merely decoded: an
  unverified token is just a string the browser handed us, and trusting its
  `email` claim would let anyone sign in as anyone.

  Setup, once, at https://console.cloud.google.com/apis/credentials:
    1. Create an OAuth 2.0 Client ID of type "Web application".
    2. Add an authorised redirect URI, exactly:
         http://localhost:3000/api/auth/google/callback   (development)
         https://<your-domain>/api/auth/google/callback   (production)
    3. Put the client ID and secret in .env as GOOGLE_CLIENT_ID and
       GOOGLE_CLIENT_SECRET.
  Set GOOGLE_REDIRECT_URI too if the app is served behind a proxy whose
  public URL differs from the origin the app sees.
*/

const AUTHORIZE_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

/** Google signs ID tokens with rotating keys; jose caches the key set. */
const googleKeys = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

// Google has issued tokens under both spellings for years; accept either.
const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

/** Carries the CSRF state and the ID-token nonce across the round trip. */
export const STATE_COOKIE = "bloodbridge_oauth_state";
export const NONCE_COOKIE = "bloodbridge_oauth_nonce";

/** The round trip is a few seconds; ten minutes is generous. */
export const OAUTH_COOKIE_MAX_AGE = 600;

export type GoogleIdentity = {
  email: string;
  firstName: string;
  lastName: string;
};

export function googleClientId() {
  return process.env.GOOGLE_CLIENT_ID ?? "";
}

function googleClientSecret() {
  return process.env.GOOGLE_CLIENT_SECRET ?? "";
}

/** False when the deployment has no Google credentials configured. */
export function isGoogleConfigured() {
  return googleClientId() !== "" && googleClientSecret() !== "";
}

/**
 * The redirect URI, which must match what is registered in Google Cloud
 * character for character. Derived from the incoming request so development
 * and production work without separate builds; GOOGLE_REDIRECT_URI overrides
 * that for deployments behind a proxy.
 */
export function googleRedirectUri(requestUrl: string) {
  const configured = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (configured) return configured;

  return new URL("/api/auth/google/callback", requestUrl).toString();
}

export function buildAuthorizeUrl({
  redirectUri,
  state,
  nonce,
}: {
  redirectUri: string;
  state: string;
  nonce: string;
}) {
  const url = new URL(AUTHORIZE_ENDPOINT);

  url.searchParams.set("client_id", googleClientId());
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  // Always let the donor choose, rather than silently reusing whichever
  // Google account the browser signed in with last.
  url.searchParams.set("prompt", "select_account");

  return url.toString();
}

/** Trades the one-time code for Google's tokens. Returns the raw ID token. */
export async function exchangeCodeForIdToken(code: string, redirectUri: string) {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: googleClientId(),
      client_secret: googleClientSecret(),
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`Google token exchange failed with HTTP ${response.status}`);
  }

  const payload = (await response.json()) as { id_token?: unknown };

  if (typeof payload.id_token !== "string") {
    throw new Error("Google token response contained no id_token");
  }

  return payload.id_token;
}

/**
 * Verifies the ID token's signature, issuer, audience and nonce, then reads
 * the identity out of it.
 *
 * `email_verified` is required: Google will assert an address the account
 * has not proven it owns, and treating that as proof of identity would let
 * an unverified Google account take over a BloodBridge account with the same
 * address.
 */
export async function verifyGoogleIdToken(
  idToken: string,
  expectedNonce: string,
): Promise<GoogleIdentity> {
  const { payload } = await jwtVerify(idToken, googleKeys, {
    issuer: ISSUERS,
    audience: googleClientId(),
  });

  if (payload.nonce !== expectedNonce) {
    throw new Error("Google ID token nonce did not match the one we issued");
  }

  if (payload.email_verified !== true) {
    throw new Error("Google account has not verified its email address");
  }

  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";

  if (!email) {
    throw new Error("Google ID token carried no email address");
  }

  const given = typeof payload.given_name === "string" ? payload.given_name.trim() : "";
  const family = typeof payload.family_name === "string" ? payload.family_name.trim() : "";
  const full = typeof payload.name === "string" ? payload.name.trim() : "";

  // Some Google accounts carry only a display name; split it rather than
  // creating a donor whose surname is blank.
  const [fallbackFirst, ...fallbackRest] = full.split(/\s+/).filter(Boolean);

  return {
    email,
    firstName: given || fallbackFirst || "Donor",
    lastName: family || fallbackRest.join(" ") || "-",
  };
}
