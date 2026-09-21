jest.mock("@/src/lib/prisma", () => require("../helpers/prisma-mock").prismaMockModule);

import {
  getAuthenticatedDonor,
  getAuthenticatedInstituteAdmin,
  getAuthenticatedLabTechnician,
  getAuthenticatedMedicalStaff,
  getAuthenticatedSystemAdmin,
  getAuthenticatedUser,
  getAuthenticatedUserFromToken,
} from "@/src/lib/auth";
import { prisma, resetPrismaMock } from "../helpers/prisma-mock";
import {
  makeRequest,
  makeStaff,
  makeUser,
  signSession,
  signWithWrongSecret,
  type Role,
} from "../helpers/fixtures";

/*
  Session verification and the per-role guards every protected route calls
  first. The tokens are really signed and really verified; only the user
  lookup is mocked, so a forged or expired cookie fails here exactly as it
  would in production.
*/

beforeEach(() => {
  resetPrismaMock();
});

async function requestFor(user: ReturnType<typeof makeUser>) {
  return makeRequest({ token: await signSession({ userId: user.id, role: user.role }) });
}

describe("getAuthenticatedUser", () => {
  it("returns the user behind a valid session cookie", async () => {
    const user = makeUser();
    prisma.user.findUnique.mockResolvedValue(user);

    const result = await getAuthenticatedUser(await requestFor(user));

    expect(result).toEqual({ user, status: 200, error: null });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: user.id } });
  });

  it("rejects a request with no session cookie", async () => {
    expect(await getAuthenticatedUser(makeRequest())).toEqual({
      user: null,
      status: 401,
      error: "Not authenticated.",
    });
  });

  it("never looks up a user when there is no cookie", async () => {
    await getAuthenticatedUser(makeRequest());

    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await signWithWrongSecret({ userId: "usr_donor_1", role: "DONOR" });

    expect(await getAuthenticatedUser(makeRequest({ token }))).toEqual({
      user: null,
      status: 401,
      error: "Invalid or expired session.",
    });
  });

  it("rejects a malformed token", async () => {
    expect(await getAuthenticatedUser(makeRequest({ token: "not.a.jwt" }))).toEqual({
      user: null,
      status: 401,
      error: "Invalid or expired session.",
    });
  });

  it("rejects an expired token", async () => {
    const token = await signSession({ userId: "usr_donor_1" }, { expiresIn: "-1h" });

    expect(await getAuthenticatedUser(makeRequest({ token }))).toEqual({
      user: null,
      status: 401,
      error: "Invalid or expired session.",
    });
  });

  it("rejects a validly signed token that carries no user id", async () => {
    const token = await signSession({ role: "SYSTEM_ADMIN" });

    expect(await getAuthenticatedUserFromToken(token)).toEqual({
      user: null,
      status: 401,
      error: "Invalid session.",
    });
  });

  it("rejects a token whose user id is not a string", async () => {
    const token = await signSession({ userId: 12345 });

    expect(await getAuthenticatedUserFromToken(token)).toEqual({
      user: null,
      status: 401,
      error: "Invalid session.",
    });
  });

  it("returns 404 when the session points at a deleted user", async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const token = await signSession({ userId: "usr_gone", role: "DONOR" });

    expect(await getAuthenticatedUserFromToken(token)).toEqual({
      user: null,
      status: 404,
      error: "User not found.",
    });
  });

  it("returns 403 for a deactivated account, even with a valid session", async () => {
    const user = makeUser({ isActive: false });
    prisma.user.findUnique.mockResolvedValue(user);

    expect(await getAuthenticatedUser(await requestFor(user))).toEqual({
      user: null,
      status: 403,
      error: "This account is inactive.",
    });
  });

  it("does not trust the role claim in the token over the stored role", async () => {
    // A donor cookie re-signed with role: SYSTEM_ADMIN must still load the
    // donor record - the role used for authorisation comes from the database.
    const user = makeUser({ role: "DONOR" });
    prisma.user.findUnique.mockResolvedValue(user);

    const token = await signSession({ userId: user.id, role: "SYSTEM_ADMIN" });
    const result = await getAuthenticatedUser(makeRequest({ token }));

    expect(result.user?.role).toBe("DONOR");
  });
});

describe("role guards", () => {
  const guards = [
    { name: "donor", guard: getAuthenticatedDonor, role: "DONOR" as Role, needsInstitute: false },
    {
      name: "medical staff",
      guard: getAuthenticatedMedicalStaff,
      role: "MEDICAL_STAFF" as Role,
      needsInstitute: true,
    },
    {
      name: "lab technician",
      guard: getAuthenticatedLabTechnician,
      role: "LAB_TECHNICIAN" as Role,
      needsInstitute: true,
    },
    {
      name: "institute admin",
      guard: getAuthenticatedInstituteAdmin,
      role: "HEALTH_INSTITUTE_ADMIN" as Role,
      needsInstitute: true,
    },
    {
      name: "system admin",
      guard: getAuthenticatedSystemAdmin,
      role: "SYSTEM_ADMIN" as Role,
      needsInstitute: false,
    },
  ];

  describe.each(guards)("$name", ({ guard, role, needsInstitute }) => {
    const user = () =>
      needsInstitute ? makeStaff(role) : makeUser({ id: `usr_${role}`, role, healthInstituteId: null });

    it("admits its own role", async () => {
      const account = user();
      prisma.user.findUnique.mockResolvedValue(account);

      const result = await guard(await requestFor(account));

      expect(result.status).toBe(200);
      expect(result.user).toEqual(account);
    });

    it.each(guards.filter((other) => other.role !== role).map((other) => other.role))(
      "refuses a %s with 403",
      async (otherRole) => {
        const account = makeUser({
          id: `usr_${otherRole}`,
          role: otherRole,
          healthInstituteId: "inst_1",
        });
        prisma.user.findUnique.mockResolvedValue(account);

        const result = await guard(await requestFor(account));

        expect(result.status).toBe(403);
        expect(result.user).toBeNull();
        expect(result.error).toMatch(/is not a/);
      },
    );

    it("passes an unauthenticated request straight through as 401", async () => {
      const result = await guard(makeRequest());

      expect(result).toEqual({ user: null, status: 401, error: "Not authenticated." });
    });

    if (needsInstitute) {
      it("refuses the right role when no institute is assigned", async () => {
        const account = makeStaff(role, { healthInstituteId: null });
        prisma.user.findUnique.mockResolvedValue(account);

        const result = await guard(await requestFor(account));

        expect(result.status).toBe(403);
        expect(result.user).toBeNull();
      });
    }
  });
});
