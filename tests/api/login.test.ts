jest.mock("@/src/lib/prisma", () => require("../helpers/prisma-mock").prismaMockModule);

import bcrypt from "bcryptjs";
import { jwtVerify } from "jose";
import { POST } from "@/app/api/login/route";
import { helpers, prisma, resetPrismaMock } from "../helpers/prisma-mock";
import { makeRequest, makeUser, type Role } from "../helpers/fixtures";

/*
  The login endpoint end to end, with only the database replaced: the password
  really is hashed and compared by bcrypt, and the session cookie really is a
  jose-signed JWT that these tests verify with the same secret the app uses.

  Rate limiting is per-IP and per-email in a process-wide map, so every test
  logs in from its own IP and its own address - otherwise the tenth test would
  start getting the 429 earned by the first nine.
*/

const PASSWORD = "correct-horse-battery";
let passwordHash: string;
let unique = 0;

beforeAll(async () => {
  passwordHash = await bcrypt.hash(PASSWORD, 4); // low cost: these are tests
});

beforeEach(() => {
  resetPrismaMock();
  unique += 1;
});

/** A fresh email/IP pair, so one test's attempts never count against another. */
function identity() {
  return { email: `donor${unique}@gmail.com`, ip: `203.0.113.${unique % 250}` };
}

function loginRequest(body: unknown, ip = identity().ip) {
  return makeRequest({
    url: "http://localhost/api/login",
    method: "POST",
    body,
    headers: { "x-forwarded-for": ip },
  });
}

/** Signs in `user` with the correct password, returning the parsed response. */
async function login(user: ReturnType<typeof makeUser>, password = PASSWORD, ip?: string) {
  helpers.getUserByEmail.mockResolvedValue(user);

  const response = await POST(loginRequest({ email: user.email, password }, ip));

  return { response, body: await response.json() };
}

function donor(overrides: Parameters<typeof makeUser>[0] = {}) {
  const { email } = identity();
  return makeUser({ email, passwordHash, ...overrides });
}

describe("POST /api/login", () => {
  describe("a successful sign-in", () => {
    it("returns 200 with the user and no password material", async () => {
      const user = donor();
      const { response, body } = await login(user);

      expect(response.status).toBe(200);
      expect(body.user).toEqual({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      });
      expect(JSON.stringify(body)).not.toContain(passwordHash);
      expect(body.user).not.toHaveProperty("passwordHash");
    });

    it("looks the user up by the normalised email", async () => {
      const user = donor();
      helpers.getUserByEmail.mockResolvedValue(user);

      await POST(loginRequest({ email: `  ${user.email.toUpperCase()}  `, password: PASSWORD }));

      expect(helpers.getUserByEmail).toHaveBeenCalledWith(user.email);
    });

    it("sets an httpOnly, lax, site-wide session cookie for a week", async () => {
      const { response } = await login(donor());
      const cookie = response.cookies.get("bloodbridge_session");

      expect(cookie).toMatchObject({
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
      expect(cookie!.value).not.toBe("");
    });

    it("issues a session token carrying the user id and role", async () => {
      const user = donor({ role: "MEDICAL_STAFF" });
      const { response } = await login(user);

      const token = response.cookies.get("bloodbridge_session")!.value;
      const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(process.env.AUTH_SECRET),
      );

      expect(payload).toMatchObject({ userId: user.id, role: "MEDICAL_STAFF" });
      expect(payload.exp).toBeGreaterThan(Date.now() / 1000);
    });

    it("records the sign-in in the audit trail", async () => {
      const user = donor();
      await login(user);

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorId: user.id,
          action: "USER_LOGGED_IN",
          targetType: "User",
          targetId: user.id,
        }),
      });
    });

    it.each([
      ["DONOR", "/home"],
      ["MEDICAL_STAFF", "/portal/medical-staff"],
      ["LAB_TECHNICIAN", "/portal/lab-technician"],
      ["HEALTH_INSTITUTE_ADMIN", "/portal/institute-admin"],
      ["SYSTEM_ADMIN", "/system-admin"],
    ])("sends a %s to %s", async (role, redirectTo) => {
      const { body } = await login(donor({ role: role as Role }));

      expect(body.redirectTo).toBe(redirectTo);
    });
  });

  describe("a rejected sign-in", () => {
    it("rejects a missing email with 400", async () => {
      const response = await POST(loginRequest({ password: PASSWORD }));

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        error: "Email and password are required.",
      });
    });

    it("rejects a missing password with 400", async () => {
      const response = await POST(loginRequest({ email: "ada@gmail.com" }));

      expect(response.status).toBe(400);
    });

    it("rejects an unsupported email domain", async () => {
      const response = await POST(
        loginRequest({ email: `donor${unique}@example.com`, password: PASSWORD }),
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        error: "Only Gmail and iCloud email addresses are allowed.",
      });
    });

    it("accepts icloud.com as well as gmail.com", async () => {
      const user = donor({ email: `donor${unique}@icloud.com` });
      const { response } = await login(user);

      expect(response.status).toBe(200);
    });

    it("never queries the database for a disallowed domain", async () => {
      await POST(loginRequest({ email: `donor${unique}@example.com`, password: PASSWORD }));

      expect(helpers.getUserByEmail).not.toHaveBeenCalled();
    });

    it("returns 401 for an unknown account", async () => {
      helpers.getUserByEmail.mockResolvedValue(null);

      const response = await POST(
        loginRequest({ email: `nobody${unique}@gmail.com`, password: PASSWORD }),
      );

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual({ error: "Invalid email or password." });
    });

    it("returns 401 for a wrong password", async () => {
      const { response } = await login(donor(), "wrong-password");

      expect(response.status).toBe(401);
    });

    it("gives the same message for an unknown account and a wrong password", async () => {
      helpers.getUserByEmail.mockResolvedValue(null);
      const unknown = await (
        await POST(loginRequest({ email: `nobody${unique}@gmail.com`, password: PASSWORD }))
      ).json();

      const wrongPassword = (await login(donor(), "wrong-password")).body;

      // Distinguishing the two would tell an attacker which addresses exist.
      expect(unknown).toEqual(wrongPassword);
    });

    it("issues no session cookie when the password is wrong", async () => {
      const { response } = await login(donor(), "wrong-password");

      expect(response.cookies.get("bloodbridge_session")).toBeUndefined();
    });

    it("does not audit a failed attempt as a sign-in", async () => {
      await login(donor(), "wrong-password");

      expect(prisma.auditLog.create).not.toHaveBeenCalled();
    });

    it("returns 500 rather than leaking an internal error", async () => {
      const user = donor();
      helpers.getUserByEmail.mockRejectedValue(new Error("connection terminated unexpectedly"));
      const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

      const response = await POST(loginRequest({ email: user.email, password: PASSWORD }));

      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({ error: "Internal server error." });
      consoleError.mockRestore();
    });

    it("survives a body that is not JSON", async () => {
      const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

      const response = await POST(loginRequest("not json at all"));

      expect(response.status).toBe(500);
      consoleError.mockRestore();
    });
  });

  describe("rate limiting", () => {
    it("blocks the 11th attempt on one email with a 429", async () => {
      const user = donor();
      helpers.getUserByEmail.mockResolvedValue(user);

      const attempt = () =>
        POST(loginRequest({ email: user.email, password: "wrong" }, `198.51.100.${unique}`));

      for (let i = 0; i < 10; i += 1) {
        expect((await attempt()).status).toBe(401);
      }

      const blocked = await attempt();

      expect(blocked.status).toBe(429);
      expect(blocked.headers.get("Retry-After")).not.toBeNull();
    });

    it("counts attempts per email, so one account cannot lock out another", async () => {
      const victim = donor();
      const attacker = donor({ email: `attacker${unique}@gmail.com` });
      helpers.getUserByEmail.mockResolvedValue(attacker);

      for (let i = 0; i < 11; i += 1) {
        await POST(loginRequest({ email: attacker.email, password: "wrong" }, "198.51.100.200"));
      }

      helpers.getUserByEmail.mockResolvedValue(victim);
      const response = await POST(
        loginRequest({ email: victim.email, password: PASSWORD }, "198.51.100.201"),
      );

      expect(response.status).toBe(200);
    });
  });
});
