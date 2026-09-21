import { SignJWT } from "jose";
import { NextRequest } from "next/server";

/*
  Shared fixtures: users in the shape Prisma returns them, and requests
  carrying a real signed session cookie.

  The tokens here are signed with the same AUTH_SECRET the code under test
  verifies with (set in tests/setup-env.ts), so the session path being
  exercised is the real one - jose signing and verifying - rather than a
  stubbed-out `getAuthenticatedUser`.
*/

export type Role =
  | "DONOR"
  | "MEDICAL_STAFF"
  | "LAB_TECHNICIAN"
  | "HEALTH_INSTITUTE_ADMIN"
  | "SYSTEM_ADMIN";

export type TestUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  phoneNumber: string | null;
  role: Role;
  isActive: boolean;
  healthInstituteId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function makeUser(overrides: Partial<TestUser> = {}): TestUser {
  return {
    id: "usr_donor_1",
    firstName: "Ada",
    lastName: "Mwangi",
    email: "ada@gmail.com",
    // bcrypt hash of "correct-horse"; tests that check passwords hash their own.
    passwordHash: "$2b$10$notarealhashnotarealhashno",
    phoneNumber: "+254700000000",
    role: "DONOR",
    isActive: true,
    healthInstituteId: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

export function makeStaff(role: Role, overrides: Partial<TestUser> = {}): TestUser {
  return makeUser({
    id: `usr_${role.toLowerCase()}`,
    email: `${role.toLowerCase()}@gmail.com`,
    role,
    healthInstituteId: "inst_1",
    ...overrides,
  });
}

const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET);

/** A session token in the format app/api/login/route.ts issues. */
export async function signSession(
  payload: Record<string, unknown>,
  { expiresIn = "7d" }: { expiresIn?: string } = {},
) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret());
}

/** A token signed with the wrong key - what a forged cookie looks like. */
export async function signWithWrongSecret(payload: Record<string, unknown>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(new TextEncoder().encode("an-entirely-different-secret"));
}

type RequestOptions = {
  url?: string;
  method?: string;
  body?: unknown;
  token?: string | null;
  headers?: Record<string, string>;
};

/** A NextRequest, optionally carrying the bloodbridge_session cookie. */
export function makeRequest({
  url = "http://localhost/api/test",
  method = "GET",
  body,
  token,
  headers = {},
}: RequestOptions = {}) {
  const init: ConstructorParameters<typeof NextRequest>[1] = {
    method,
    headers: {
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(token ? { cookie: `bloodbridge_session=${token}` } : {}),
      ...headers,
    },
  };

  if (body !== undefined) {
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  }

  return new NextRequest(url, init);
}

/** A request already authenticated as `user`. */
export async function makeAuthenticatedRequest(
  user: TestUser,
  options: Omit<RequestOptions, "token"> = {},
) {
  const token = await signSession({ userId: user.id, role: user.role });
  return makeRequest({ ...options, token });
}
