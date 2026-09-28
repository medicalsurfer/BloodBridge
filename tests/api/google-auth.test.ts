jest.mock("@/src/lib/prisma", () => require("../helpers/prisma-mock").prismaMockModule);

// The one thing a test must never do here is talk to Google. Both network
// calls the flow makes - the token exchange and the JWKS fetch behind ID
// token verification - are replaced, and the assertions below check what the
// route did with the answers rather than that Google was reachable.
jest.mock("@/src/lib/google-oauth", () => {
  const actual = jest.requireActual("@/src/lib/google-oauth");
  return {
    ...actual,
    exchangeCodeForIdToken: jest.fn(),
    verifyGoogleIdToken: jest.fn(),
  };
});

import { GET as START } from "@/app/api/auth/google/route";
import { GET as CALLBACK } from "@/app/api/auth/google/callback/route";
import {
  NONCE_COOKIE,
  STATE_COOKIE,
  exchangeCodeForIdToken,
  verifyGoogleIdToken,
} from "@/src/lib/google-oauth";
import { SESSION_COOKIE } from "@/src/lib/session";
import { helpers, prisma, resetPrismaMock } from "../helpers/prisma-mock";
import { makeRequest, makeUser } from "../helpers/fixtures";

/*
  Google sign-in, both halves.

  The start route's job is to mint the two one-time secrets and send the donor
  to Google with them. The callback's job is to refuse everything that does
  not carry those same secrets back, and only then to touch an account.
*/

const IDENTITY = { email: "ada@gmail.com", firstName: "Ada", lastName: "Mwangi" };

let unique = 0;

function ip() {
  unique += 1;
  return `203.0.113.${unique % 250}`;
}

function startRequest() {
  return makeRequest({
    url: "http://localhost:3000/api/auth/google",
    headers: { "x-forwarded-for": ip() },
  });
}

/** A callback request carrying whichever state and nonce the test wants. */
function callbackRequest({
  code = "google-auth-code",
  state = "the-state",
  cookieState = "the-state",
  cookieNonce = "the-nonce",
  error,
}: {
  code?: string | null;
  state?: string | null;
  cookieState?: string | null;
  cookieNonce?: string | null;
  error?: string;
} = {}) {
  const url = new URL("http://localhost:3000/api/auth/google/callback");
  if (code) url.searchParams.set("code", code);
  if (state) url.searchParams.set("state", state);
  if (error) url.searchParams.set("error", error);

  const cookies = [
    cookieState ? `${STATE_COOKIE}=${cookieState}` : "",
    cookieNonce ? `${NONCE_COOKIE}=${cookieNonce}` : "",
  ]
    .filter(Boolean)
    .join("; ");

  return makeRequest({
    url: url.toString(),
    headers: { "x-forwarded-for": ip(), ...(cookies ? { cookie: cookies } : {}) },
  });
}

/** Where a redirect response points, as a path plus query. */
function destination(response: Response) {
  const location = response.headers.get("location") ?? "";
  const url = new URL(location, "http://localhost:3000");
  return `${url.pathname}${url.search}`;
}

const OLD_ENV = process.env;

beforeEach(() => {
  resetPrismaMock();

  process.env = {
    ...OLD_ENV,
    GOOGLE_CLIENT_ID: "test-client-id.apps.googleusercontent.com",
    GOOGLE_CLIENT_SECRET: "test-client-secret",
  };

  (exchangeCodeForIdToken as jest.Mock).mockResolvedValue("a.signed.idtoken");
  (verifyGoogleIdToken as jest.Mock).mockResolvedValue(IDENTITY);
  helpers.createUser.mockImplementation(async (data: never) => ({
    ...makeUser(),
    ...(data as object),
    id: "usr_google_new",
  }));
});

afterEach(() => {
  process.env = OLD_ENV;
});

describe("GET /api/auth/google", () => {
  it("sends the donor to Google's consent screen", async () => {
    const response = await START(startRequest());
    const location = new URL(response.headers.get("location")!);

    expect(response.status).toBe(307);
    expect(location.origin + location.pathname).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth",
    );
    expect(location.searchParams.get("client_id")).toBe(
      "test-client-id.apps.googleusercontent.com",
    );
    expect(location.searchParams.get("response_type")).toBe("code");
    expect(location.searchParams.get("scope")).toBe("openid email profile");
  });

  it("asks Google to send the donor back to our callback", async () => {
    const response = await START(startRequest());
    const location = new URL(response.headers.get("location")!);

    expect(location.searchParams.get("redirect_uri")).toBe(
      "http://localhost:3000/api/auth/google/callback",
    );
  });

  it("stores the state and nonce it generated in httpOnly cookies", async () => {
    const response = await START(startRequest());
    const location = new URL(response.headers.get("location")!);

    const state = response.cookies.get(STATE_COOKIE);
    const nonce = response.cookies.get(NONCE_COOKIE);

    expect(state).toMatchObject({ httpOnly: true, sameSite: "lax" });
    expect(nonce).toMatchObject({ httpOnly: true, sameSite: "lax" });
    expect(location.searchParams.get("state")).toBe(state!.value);
    expect(location.searchParams.get("nonce")).toBe(nonce!.value);
  });

  it("generates unguessable secrets, different on every attempt", async () => {
    const first = await START(startRequest());
    const second = await START(startRequest());

    const a = first.cookies.get(STATE_COOKIE)!.value;
    const b = second.cookies.get(STATE_COOKIE)!.value;

    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(32);
  });

  it("keeps the cookies out of reach of other routes", async () => {
    const response = await START(startRequest());

    expect(response.cookies.get(STATE_COOKIE)!.path).toBe("/api/auth/google");
  });

  it("says so plainly when Google sign-in is not configured", async () => {
    delete process.env.GOOGLE_CLIENT_ID;

    const response = await START(startRequest());

    expect(destination(response)).toBe("/login?error=google_unavailable");
  });
});

describe("GET /api/auth/google/callback", () => {
  describe("a donor who already has an account", () => {
    it("signs them in and sends them to their role's home", async () => {
      const staff = makeUser({ role: "MEDICAL_STAFF", email: IDENTITY.email });
      helpers.getUserByEmail.mockResolvedValue(staff);

      const response = await CALLBACK(callbackRequest());

      expect(destination(response)).toBe("/portal/medical-staff");
      expect(response.cookies.get(SESSION_COOKIE)!.value).not.toBe("");
      expect(helpers.createUser).not.toHaveBeenCalled();
    });

    it("issues the same session cookie the password form does", async () => {
      helpers.getUserByEmail.mockResolvedValue(makeUser({ email: IDENTITY.email }));

      const response = await CALLBACK(callbackRequest());

      expect(response.cookies.get(SESSION_COOKIE)).toMatchObject({
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
    });

    it("records the sign-in in the audit trail", async () => {
      helpers.getUserByEmail.mockResolvedValue(makeUser({ email: IDENTITY.email }));

      await CALLBACK(callbackRequest());

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "USER_LOGGED_IN" }),
      });
    });

    it("clears the one-time secrets once they are spent", async () => {
      helpers.getUserByEmail.mockResolvedValue(makeUser({ email: IDENTITY.email }));

      const response = await CALLBACK(callbackRequest());

      expect(response.cookies.get(STATE_COOKIE)!.value).toBe("");
      expect(response.cookies.get(NONCE_COOKIE)!.value).toBe("");
    });

    it("refuses a deactivated account", async () => {
      helpers.getUserByEmail.mockResolvedValue(
        makeUser({ email: IDENTITY.email, isActive: false }),
      );

      const response = await CALLBACK(callbackRequest());

      expect(destination(response)).toBe("/login?error=account_inactive");
      expect(response.cookies.get(SESSION_COOKIE)).toBeUndefined();
    });
  });

  describe("a donor Google knows but BloodBridge does not", () => {
    it("creates a donor account from the verified identity", async () => {
      helpers.getUserByEmail.mockResolvedValue(null);

      const response = await CALLBACK(callbackRequest());

      expect(helpers.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "ada@gmail.com",
          firstName: "Ada",
          lastName: "Mwangi",
          phoneNumber: null,
        }),
      );
      expect(destination(response)).toBe("/home");
    });

    it("gives the new account a password nobody holds", async () => {
      helpers.getUserByEmail.mockResolvedValue(null);

      await CALLBACK(callbackRequest());

      const [[created]] = helpers.createUser.mock.calls as [[{ passwordHash: string }]];

      expect(created.passwordHash).toMatch(/^\$2[aby]\$/);
      expect(created.passwordHash).not.toContain("ada@gmail.com");
    });

    it("records the registration as well as the sign-in", async () => {
      helpers.getUserByEmail.mockResolvedValue(null);

      await CALLBACK(callbackRequest());

      const actions = prisma.auditLog.create.mock.calls.map(
        ([call]) => (call as { data: { action: string } }).data.action,
      );

      expect(actions).toEqual(["USER_REGISTERED", "USER_LOGGED_IN"]);
    });

    it("never creates anything but a donor", async () => {
      helpers.getUserByEmail.mockResolvedValue(null);

      await CALLBACK(callbackRequest());

      const [[created]] = helpers.createUser.mock.calls as [[Record<string, unknown>]];

      expect(created).not.toHaveProperty("role");
      expect(created).not.toHaveProperty("healthInstituteId");
    });
  });

  describe("requests that must be refused", () => {
    it("refuses a callback whose state does not match the cookie", async () => {
      helpers.getUserByEmail.mockResolvedValue(makeUser({ email: IDENTITY.email }));

      const response = await CALLBACK(
        callbackRequest({ state: "forged-state", cookieState: "the-real-state" }),
      );

      expect(destination(response)).toBe("/login?error=google_failed");
      expect(exchangeCodeForIdToken).not.toHaveBeenCalled();
      expect(response.cookies.get(SESSION_COOKIE)).toBeUndefined();
    });

    it("refuses a callback that arrives with no state cookie at all", async () => {
      const response = await CALLBACK(callbackRequest({ cookieState: null }));

      expect(destination(response)).toBe("/login?error=google_failed");
      expect(exchangeCodeForIdToken).not.toHaveBeenCalled();
    });

    it("refuses a callback with no nonce cookie, which would let a token be replayed", async () => {
      const response = await CALLBACK(callbackRequest({ cookieNonce: null }));

      expect(destination(response)).toBe("/login?error=google_failed");
      expect(exchangeCodeForIdToken).not.toHaveBeenCalled();
    });

    it("refuses a callback carrying no code", async () => {
      const response = await CALLBACK(callbackRequest({ code: null }));

      expect(destination(response)).toBe("/login?error=google_failed");
    });

    it("reports a cancelled sign-in as cancelled, not as a failure", async () => {
      const response = await CALLBACK(callbackRequest({ error: "access_denied" }));

      expect(destination(response)).toBe("/login?error=google_cancelled");
      expect(exchangeCodeForIdToken).not.toHaveBeenCalled();
    });

    it("refuses an ID token that does not verify", async () => {
      (verifyGoogleIdToken as jest.Mock).mockRejectedValue(new Error("bad signature"));
      const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

      const response = await CALLBACK(callbackRequest());

      expect(destination(response)).toBe("/login?error=google_failed");
      expect(helpers.createUser).not.toHaveBeenCalled();
      expect(response.cookies.get(SESSION_COOKIE)).toBeUndefined();
      consoleError.mockRestore();
    });

    it("refuses when the token exchange fails", async () => {
      (exchangeCodeForIdToken as jest.Mock).mockRejectedValue(new Error("HTTP 400"));
      const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

      expect(destination(await CALLBACK(callbackRequest()))).toBe(
        "/login?error=google_failed",
      );
      consoleError.mockRestore();
    });

    it.each([
      ["a work domain", "nurse@hospital.org"],
      ["an outlook address", "ada@outlook.com"],
    ])("applies the platform's domain rule to %s", async (_label, email) => {
      (verifyGoogleIdToken as jest.Mock).mockResolvedValue({ ...IDENTITY, email });

      const response = await CALLBACK(callbackRequest());

      expect(destination(response)).toBe("/login?error=google_domain");
      expect(helpers.createUser).not.toHaveBeenCalled();
      expect(helpers.getUserByEmail).not.toHaveBeenCalled();
    });

    it("accepts an icloud address, as the password form does", async () => {
      (verifyGoogleIdToken as jest.Mock).mockResolvedValue({
        ...IDENTITY,
        email: "ada@icloud.com",
      });
      helpers.getUserByEmail.mockResolvedValue(makeUser({ email: "ada@icloud.com" }));

      expect(destination(await CALLBACK(callbackRequest()))).toBe("/home");
    });

    it("refuses when Google sign-in is not configured", async () => {
      delete process.env.GOOGLE_CLIENT_SECRET;

      const response = await CALLBACK(callbackRequest());

      expect(destination(response)).toBe("/login?error=google_unavailable");
      expect(exchangeCodeForIdToken).not.toHaveBeenCalled();
    });

    it("survives the database failing mid sign-in", async () => {
      helpers.getUserByEmail.mockRejectedValue(new Error("connection terminated"));
      const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

      expect(destination(await CALLBACK(callbackRequest()))).toBe(
        "/login?error=google_failed",
      );
      consoleError.mockRestore();
    });
  });
});
