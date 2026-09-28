import { SignJWT } from "jose";
import { NextResponse } from "next/server";

/*
  Issuing a BloodBridge session.

  There are two ways into the platform now — the password form and Google —
  and both have to end in exactly the same cookie, or a session minted by one
  would be read differently by the other. The token shape, the cookie flags
  and the per-role landing page live here so there is one definition of what
  being signed in means. src/lib/auth.ts is the other half: it verifies what
  this file issues.
*/

const authSecret = process.env.AUTH_SECRET;

if (!authSecret) {
  throw new Error("AUTH_SECRET is not defined in the environment variables.");
}

const secret = new TextEncoder().encode(authSecret);

export const SESSION_COOKIE = "bloodbridge_session";

/** A week, in seconds — the cookie's max-age and the token's lifetime. */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

/**
 * The session token. `userId` is the only claim authorisation relies on:
 * getAuthenticatedUser re-reads the role from the database, so a re-signed
 * cookie cannot promote its own account (see tests/lib/auth.test.ts).
 */
export async function createSessionToken(user: { id: string; role: string }) {
  return new SignJWT({ userId: user.id, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

/** Attaches the session cookie to a response. Mutates and returns it. */
export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  return response;
}

const ROLE_HOME: Record<string, string> = {
  DONOR: "/home",
  MEDICAL_STAFF: "/portal/medical-staff",
  LAB_TECHNICIAN: "/portal/lab-technician",
  HEALTH_INSTITUTE_ADMIN: "/portal/institute-admin",
  SYSTEM_ADMIN: "/system-admin",
};

/** Where a role lands after signing in. Unknown roles go to the donor home. */
export function getRedirectPath(role: string) {
  return ROLE_HOME[role] ?? "/home";
}
