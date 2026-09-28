import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  NONCE_COOKIE,
  OAUTH_COOKIE_MAX_AGE,
  STATE_COOKIE,
  buildAuthorizeUrl,
  googleRedirectUri,
  isGoogleConfigured,
} from "@/src/lib/google-oauth";
import { clientIp, LIMITS, rateLimit } from "@/src/lib/rate-limit";

/*
  Step one of Google sign-in: send the donor to Google.

  Two secrets are minted here and kept in short-lived httpOnly cookies:

  - `state` comes back as a query parameter and is compared to the cookie, so
    a callback that did not begin at this route is rejected. Without it,
    anyone could feed the callback a code of their own and sign a victim's
    browser into the attacker's account.
  - `nonce` is embedded in the ID token Google signs, so the token that comes
    back can be tied to this particular request rather than replayed from
    another one.

  Both cookies are SameSite=Lax deliberately: Strict would drop them on the
  redirect back from accounts.google.com, and the flow could never complete.
*/

function oauthCookie(name: string, value: string) {
  return {
    name,
    value,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/api/auth/google",
    maxAge: OAUTH_COOKIE_MAX_AGE,
  };
}

export async function GET(request: NextRequest) {
  const limited = rateLimit(
    `google:${clientIp(request)}`,
    LIMITS.login.limit,
    LIMITS.login.windowMs,
  );
  if (limited) {
    return NextResponse.redirect(new URL("/login?error=rate_limited", request.url));
  }

  if (!isGoogleConfigured()) {
    // A dead button is worse than an honest message: say it is unavailable
    // rather than bouncing the donor to a Google error page.
    return NextResponse.redirect(new URL("/login?error=google_unavailable", request.url));
  }

  const state = randomBytes(32).toString("base64url");
  const nonce = randomBytes(32).toString("base64url");

  const response = NextResponse.redirect(
    buildAuthorizeUrl({
      redirectUri: googleRedirectUri(request.url),
      state,
      nonce,
    }),
  );

  response.cookies.set(oauthCookie(STATE_COOKIE, state));
  response.cookies.set(oauthCookie(NONCE_COOKIE, nonce));

  return response;
}
