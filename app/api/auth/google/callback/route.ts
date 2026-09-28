import { randomBytes, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { logAudit } from "@/src/lib/audit";
import {
  NONCE_COOKIE,
  STATE_COOKIE,
  exchangeCodeForIdToken,
  googleRedirectUri,
  isGoogleConfigured,
  verifyGoogleIdToken,
  type GoogleIdentity,
} from "@/src/lib/google-oauth";
import { createUser, getUserByEmail } from "@/src/lib/prisma";
import { clientIp, LIMITS, rateLimit } from "@/src/lib/rate-limit";
import { createSessionToken, getRedirectPath, setSessionCookie } from "@/src/lib/session";

/*
  Step two of Google sign-in: Google sends the donor back here with a code.

  The order of the checks is the security of the flow — state before anything
  is spent, then the code exchanged, then the ID token verified against
  Google's keys, and only then is any account touched.

  Failures always land back on /login with a short reason in the query string
  rather than a JSON body, because this URL is opened by the browser as a
  navigation. The reason codes are deliberately coarse: the donor sees a
  sentence, and the detail goes to the server log.
*/

/** The same domain rule the password form applies (see app/api/login). */
function isAllowedEmail(email: string) {
  const domain = email.trim().toLowerCase().split("@")[1];
  return domain === "gmail.com" || domain === "icloud.com";
}

function failure(request: NextRequest, reason: string) {
  const response = NextResponse.redirect(new URL(`/login?error=${reason}`, request.url));

  // The round trip is over either way; do not leave the one-time secrets in
  // the browser for the next attempt to reuse.
  response.cookies.delete({ name: STATE_COOKIE, path: "/api/auth/google" });
  response.cookies.delete({ name: NONCE_COOKIE, path: "/api/auth/google" });

  return response;
}

/** Constant-time comparison, so the state check leaks no timing signal. */
function matches(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  if (left.length !== right.length) return false;

  return timingSafeEqual(left, right);
}

/**
 * The account behind a verified Google identity, created as a donor the
 * first time we see it.
 *
 * Accounts made this way have no usable password: the hash is of random
 * bytes nobody holds, so the password form can never open them. "Forgot your
 * password" sets a real one if the donor ever wants to sign in that way.
 */
async function findOrCreateDonor(identity: GoogleIdentity) {
  const existing = await getUserByEmail(identity.email);

  if (existing) return { user: existing, created: false as const };

  const unusablePassword = await bcrypt.hash(randomBytes(32).toString("base64"), 12);

  const user = await createUser({
    firstName: identity.firstName,
    lastName: identity.lastName,
    email: identity.email,
    passwordHash: unusablePassword,
    phoneNumber: null,
  });

  return { user, created: true as const };
}

export async function GET(request: NextRequest) {
  const limited = rateLimit(
    `google-callback:${clientIp(request)}`,
    LIMITS.login.limit,
    LIMITS.login.windowMs,
  );
  if (limited) return failure(request, "rate_limited");

  if (!isGoogleConfigured()) return failure(request, "google_unavailable");

  const query = request.nextUrl.searchParams;

  // The donor pressed Cancel, or Google refused the request outright.
  if (query.get("error")) return failure(request, "google_cancelled");

  const code = query.get("code") ?? "";
  const state = query.get("state") ?? "";
  const expectedState = request.cookies.get(STATE_COOKIE)?.value ?? "";
  const expectedNonce = request.cookies.get(NONCE_COOKIE)?.value ?? "";

  if (!code || !state || !expectedState || !expectedNonce) {
    return failure(request, "google_failed");
  }

  if (!matches(state, expectedState)) return failure(request, "google_failed");

  let identity: GoogleIdentity;

  try {
    const idToken = await exchangeCodeForIdToken(code, googleRedirectUri(request.url));
    identity = await verifyGoogleIdToken(idToken, expectedNonce);
  } catch (error) {
    console.error("GOOGLE SIGN-IN ERROR:", error);
    return failure(request, "google_failed");
  }

  if (!isAllowedEmail(identity.email)) return failure(request, "google_domain");

  try {
    const { user, created } = await findOrCreateDonor(identity);

    if (!user.isActive) return failure(request, "account_inactive");

    const response = NextResponse.redirect(
      new URL(getRedirectPath(user.role), request.url),
    );

    setSessionCookie(response, await createSessionToken(user));
    response.cookies.delete({ name: STATE_COOKIE, path: "/api/auth/google" });
    response.cookies.delete({ name: NONCE_COOKIE, path: "/api/auth/google" });

    if (created) {
      await logAudit({
        actorId: user.id,
        action: "USER_REGISTERED",
        targetType: "User",
        targetId: user.id,
        metadata: { email: user.email, via: "google" },
      });
    }

    await logAudit({
      actorId: user.id,
      action: "USER_LOGGED_IN",
      targetType: "User",
      targetId: user.id,
      metadata: { via: "google" },
    });

    return response;
  } catch (error) {
    console.error("GOOGLE SIGN-IN ERROR:", error);
    return failure(request, "google_failed");
  }
}
