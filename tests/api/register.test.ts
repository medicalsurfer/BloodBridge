jest.mock("@/src/lib/prisma", () => require("../helpers/prisma-mock").prismaMockModule);

import bcrypt from "bcryptjs";
import { POST } from "@/app/api/register/route";
import { helpers, prisma, resetPrismaMock } from "../helpers/prisma-mock";
import { makeRequest, makeUser } from "../helpers/fixtures";

/*
  Donor self-registration (FR-1). bcrypt is left real: that the stored value
  is a hash of the submitted password, and not the password itself, is the
  point of the test.

  As with login, registration is rate limited per IP in a process-wide map,
  so each test registers from its own address.
*/

let unique = 0;

beforeEach(() => {
  resetPrismaMock();
  unique += 1;
  helpers.createUser.mockImplementation(async (data: never) => ({
    ...makeUser(),
    ...(data as object),
    id: `usr_new_${unique}`,
  }));
});

function registration(overrides: Record<string, unknown> = {}) {
  return {
    firstName: "Ada",
    lastName: "Mwangi",
    email: `new.donor${unique}@gmail.com`,
    password: "a-strong-passphrase",
    ...overrides,
  };
}

function post(body: unknown, ip = `203.0.113.${unique % 250}`) {
  return POST(
    makeRequest({
      url: "http://localhost/api/register",
      method: "POST",
      body,
      headers: { "x-forwarded-for": ip },
    }),
  );
}

describe("POST /api/register", () => {
  describe("a valid registration", () => {
    it("creates the account and returns 201", async () => {
      const body = registration();
      const response = await post(body);

      expect(response.status).toBe(201);
      await expect(response.json()).resolves.toMatchObject({
        email: body.email,
        firstName: "Ada",
      });
    });

    it("stores a bcrypt hash, never the password", async () => {
      const body = registration();
      await post(body);

      const [[created]] = helpers.createUser.mock.calls as [[{ passwordHash: string }]];

      expect(created.passwordHash).not.toBe(body.password);
      expect(created.passwordHash).toMatch(/^\$2[aby]\$/);
      await expect(bcrypt.compare(body.password, created.passwordHash)).resolves.toBe(true);
    });

    it("never returns the hash to the client", async () => {
      const response = await post(registration());
      const body = await response.json();

      expect(body).not.toHaveProperty("passwordHash");
      expect(body).not.toHaveProperty("password");
    });

    it("normalises the email and trims the name", async () => {
      await post(
        registration({
          email: `  NEW.Donor${unique}@Gmail.COM `,
          firstName: "  Ada  ",
          lastName: "  Mwangi ",
        }),
      );

      expect(helpers.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: `new.donor${unique}@gmail.com`,
          firstName: "Ada",
          lastName: "Mwangi",
        }),
      );
    });

    it("stores a trimmed phone number, or null when none was given", async () => {
      await post(registration({ phone: "  +254700000000 " }));
      expect(helpers.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ phoneNumber: "+254700000000" }),
      );

      unique += 1;
      await post(registration());
      expect(helpers.createUser).toHaveBeenLastCalledWith(
        expect.objectContaining({ phoneNumber: null }),
      );
    });

    it("records the registration in the audit trail", async () => {
      await post(registration());

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "USER_REGISTERED", targetType: "User" }),
      });
    });

    it("checks for an existing account using the normalised email", async () => {
      await post(registration({ email: `NEW.Donor${unique}@GMAIL.com` }));

      expect(helpers.getUserByEmail).toHaveBeenCalledWith(`new.donor${unique}@gmail.com`);
    });
  });

  describe("a rejected registration", () => {
    it.each(["firstName", "lastName", "email", "password"])(
      "rejects a submission with no %s",
      async (field) => {
        const body = registration();
        delete (body as Record<string, unknown>)[field];

        const response = await post(body);

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({ error: "Missing required fields." });
        expect(helpers.createUser).not.toHaveBeenCalled();
      },
    );

    it("rejects an empty body", async () => {
      expect((await post({})).status).toBe(400);
    });

    it("rejects a body that is not JSON", async () => {
      expect((await post("not json")).status).toBe(400);
    });

    it("rejects an email outside the allowed domains", async () => {
      const response = await post(registration({ email: `donor${unique}@example.com` }));

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        error: "Only Gmail and iCloud email addresses are allowed.",
      });
      expect(helpers.createUser).not.toHaveBeenCalled();
    });

    it("accepts icloud.com", async () => {
      expect((await post(registration({ email: `donor${unique}@icloud.com` }))).status).toBe(201);
    });

    it("refuses an address that is already registered, with 409", async () => {
      helpers.getUserByEmail.mockResolvedValue(makeUser());

      const response = await post(registration());

      expect(response.status).toBe(409);
      await expect(response.json()).resolves.toEqual({ error: "Email is already registered." });
      expect(helpers.createUser).not.toHaveBeenCalled();
    });

    it("refuses a duplicate regardless of the casing submitted", async () => {
      helpers.getUserByEmail.mockResolvedValue(makeUser());

      expect((await post(registration({ email: `EXISTING${unique}@GMAIL.COM` }))).status).toBe(409);
    });
  });

  describe("rate limiting", () => {
    it("blocks the sixth registration from one address", async () => {
      const ip = `198.51.100.${unique}`;

      for (let i = 0; i < 5; i += 1) {
        unique += 1;
        expect((await post(registration(), ip)).status).toBe(201);
      }

      const blocked = await post(registration(), ip);

      expect(blocked.status).toBe(429);
      await expect(blocked.json()).resolves.toMatchObject({
        error: expect.stringContaining("Too many attempts"),
      });
    });

    it("does not count a blocked attempt as an account", async () => {
      const ip = `198.51.100.${unique + 100}`;

      for (let i = 0; i < 6; i += 1) {
        unique += 1;
        await post(registration(), ip);
      }

      expect(helpers.createUser).toHaveBeenCalledTimes(5);
    });
  });
});
