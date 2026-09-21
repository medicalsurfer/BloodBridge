import { NextRequest } from "next/server";
import { LIMITS, clientIp, rateLimit } from "@/src/lib/rate-limit";

/*
  Abuse controls for the authentication and AI endpoints (SRS section 9).

  The counters live in a module-level Map, so a key used by one test would
  still be counted in the next. Every test therefore takes a unique key from
  `key()` rather than resetting module state - which also mirrors production,
  where keys are per-IP and per-email.
*/

let counter = 0;
const key = (label: string) => `test:${label}:${(counter += 1)}`;

function request(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/login", { headers });
}

describe("rateLimit", () => {
  it("allows requests up to the limit", () => {
    const k = key("under");

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      expect(rateLimit(k, 3, 60_000)).toBeNull();
    }
  });

  it("blocks the attempt after the limit with a 429", async () => {
    const k = key("over");

    for (let attempt = 1; attempt <= 3; attempt += 1) rateLimit(k, 3, 60_000);

    const blocked = rateLimit(k, 3, 60_000);

    expect(blocked).not.toBeNull();
    expect(blocked!.status).toBe(429);
    await expect(blocked!.json()).resolves.toEqual({
      error: "Too many attempts. Please try again in 1 minute.",
    });
  });

  it("sends a Retry-After header the client can honour", () => {
    const k = key("retry-after");

    for (let attempt = 1; attempt <= 2; attempt += 1) rateLimit(k, 1, 300_000);

    const blocked = rateLimit(k, 1, 300_000)!;
    const retryAfter = Number(blocked.headers.get("Retry-After"));

    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(300);
  });

  it("pluralises the wait in the message", async () => {
    const k = key("plural");

    rateLimit(k, 0, 15 * 60_000);

    const blocked = rateLimit(k, 0, 15 * 60_000)!;

    await expect(blocked.json()).resolves.toEqual({
      error: "Too many attempts. Please try again in 15 minutes.",
    });
  });

  it("counts each key separately", () => {
    const a = key("separate-a");
    const b = key("separate-b");

    rateLimit(a, 1, 60_000);
    rateLimit(a, 1, 60_000);

    expect(rateLimit(a, 1, 60_000)).not.toBeNull();
    expect(rateLimit(b, 1, 60_000)).toBeNull();
  });

  describe("when the window expires", () => {
    beforeEach(() => {
      jest.useFakeTimers({ doNotFake: ["performance"] });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("lets the caller through again", () => {
      const k = key("expiry");

      rateLimit(k, 1, 60_000);
      expect(rateLimit(k, 1, 60_000)).not.toBeNull();

      jest.advanceTimersByTime(60_001);

      expect(rateLimit(k, 1, 60_000)).toBeNull();
    });

    it("keeps blocking while the window is still open", () => {
      const k = key("still-open");

      rateLimit(k, 1, 60_000);
      rateLimit(k, 1, 60_000);

      jest.advanceTimersByTime(59_000);

      expect(rateLimit(k, 1, 60_000)).not.toBeNull();
    });
  });
});

describe("clientIp", () => {
  it("reads the first address from x-forwarded-for", () => {
    expect(clientIp(request({ "x-forwarded-for": "203.0.113.5, 70.41.3.18" }))).toBe("203.0.113.5");
  });

  it("trims whitespace around the address", () => {
    expect(clientIp(request({ "x-forwarded-for": "  203.0.113.5  " }))).toBe("203.0.113.5");
  });

  it("falls back to x-real-ip", () => {
    expect(clientIp(request({ "x-real-ip": "198.51.100.7" }))).toBe("198.51.100.7");
  });

  it("prefers x-forwarded-for over x-real-ip", () => {
    expect(
      clientIp(request({ "x-forwarded-for": "203.0.113.5", "x-real-ip": "198.51.100.7" })),
    ).toBe("203.0.113.5");
  });

  it("returns 'unknown' when no forwarding header is present", () => {
    expect(clientIp(request())).toBe("unknown");
  });

  it("returns 'unknown' rather than an empty key for a blank header", () => {
    // An empty key would put every unattributed request in one bucket, which
    // is what "unknown" does deliberately - but it must not be the empty string.
    expect(clientIp(request({ "x-forwarded-for": "" }))).toBe("unknown");
  });
});

describe("the configured limits", () => {
  it("are tighter for account creation and password reset than for login", () => {
    expect(LIMITS.register.limit).toBeLessThan(LIMITS.login.limit);
    expect(LIMITS.passwordReset.limit).toBeLessThan(LIMITS.login.limit);
  });

  it("all define a positive limit and window", () => {
    for (const [name, limit] of Object.entries(LIMITS)) {
      expect({ name, ...limit }).toEqual({
        name,
        limit: expect.any(Number),
        windowMs: expect.any(Number),
      });
      expect(limit.limit).toBeGreaterThan(0);
      expect(limit.windowMs).toBeGreaterThan(0);
    }
  });
});
