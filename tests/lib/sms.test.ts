/*
  Phone-number normalisation and the SMS gateway guard (FR-45, FR-46).

  `sendSms` decides whether to call a provider from module-level environment
  state, so each block re-imports the module under the environment it is
  testing. Nothing here performs a real request: global.fetch is replaced, and
  a test that reached the network would be visible as a call to a fetch that
  was never configured.
*/

const ORIGINAL_ENV = process.env;

async function loadSms(env: Record<string, string | undefined> = {}) {
  jest.resetModules();
  process.env = { ...ORIGINAL_ENV, SMS_PROVIDER: undefined, ...env };
  return import("@/src/lib/sms");
}

afterEach(() => {
  process.env = ORIGINAL_ENV;
});

describe("toE164", () => {
  it.each([
    ["an international number", "+237650000000", "+237650000000"],
    ["a number with spaces and dashes", "+237 650-00-00-00", "+237650000000"],
    ["a 00 prefix", "00237650000000", "+237650000000"],
    ["a local 9-digit number", "650000000", "+237650000000"],
    ["an 11-digit number with no prefix", "237650000000", "+237650000000"],
  ])("normalises %s", async (_label, input, expected) => {
    const { toE164 } = await loadSms();

    expect(toE164(input)).toBe(expected);
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["an empty string", ""],
    ["a number that is too short", "12345"],
    ["a + with too few digits", "+1234"],
    ["letters only", "call me"],
  ])("returns null for %s", async (_label, input) => {
    const { toE164 } = await loadSms();

    expect(toE164(input)).toBeNull();
  });

  it("uses the configured default country code for local numbers", async () => {
    const { toE164 } = await loadSms({ SMS_DEFAULT_COUNTRY_CODE: "254" });

    expect(toE164("700000000")).toBe("+254700000000");
  });
});

describe("sendSms", () => {
  it("is disabled, and sends nothing, when no provider is configured", async () => {
    const { sendSms, smsEnabled } = await loadSms();
    const fetchMock = jest.fn();
    global.fetch = fetchMock as never;

    expect(smsEnabled).toBe(false);
    await expect(sendSms(["+237650000000"], "hello")).resolves.toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  describe("with a provider configured", () => {
    const provider = {
      SMS_PROVIDER: "africastalking",
      AT_USERNAME: "sandbox",
      AT_API_KEY: "test-key",
    };

    it("sends to a normalised number and reports how many were attempted", async () => {
      const { sendSms } = await loadSms(provider);
      const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
      global.fetch = fetchMock as never;

      await expect(sendSms(["650000000"], "hello")).resolves.toBe(1);

      const [, init] = fetchMock.mock.calls[0];
      expect(String(init.body)).toContain("%2B237650000000");
    });

    it("skips numbers it cannot normalise", async () => {
      const { sendSms } = await loadSms(provider);
      const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
      global.fetch = fetchMock as never;

      await expect(sendSms([null, "", "12345"], "hello")).resolves.toBe(0);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("sends one message per distinct number", async () => {
      const { sendSms } = await loadSms(provider);
      const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
      global.fetch = fetchMock as never;

      // The same number written two ways must not be texted twice.
      await expect(sendSms(["650000000", "+237650000000"], "hello")).resolves.toBe(1);
    });

    it("swallows a provider failure so the action it followed still stands", async () => {
      const { sendSms } = await loadSms(provider);
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 502 }) as never;
      const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

      await expect(sendSms(["650000000"], "hello")).resolves.toBe(0);
      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });

    it("swallows a network error too", async () => {
      const { sendSms } = await loadSms(provider);
      global.fetch = jest.fn().mockRejectedValue(new Error("ENOTFOUND")) as never;
      const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

      await expect(sendSms(["650000000"], "hello")).resolves.toBe(0);
      consoleError.mockRestore();
    });

    it("logs the failure without the number or the message body (FR-46)", async () => {
      const { sendSms } = await loadSms(provider);
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 502 }) as never;
      const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

      await sendSms(["650000000"], "Your blood test result is ready");

      const logged = consoleError.mock.calls.flat().join(" ");

      expect(logged).not.toContain("650000000");
      expect(logged).not.toContain("blood test result");
      consoleError.mockRestore();
    });
  });
});
