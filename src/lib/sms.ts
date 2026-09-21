/*
  SMS gateway adaptor (FR-45, SRS §7.3). Optional: nothing is sent unless
  SMS_PROVIDER is set. Sending never throws, so a delivery failure can't undo
  the appointment or blood request that triggered it. Keep message text free
  of medical detail (FR-46).

  Africa's Talking:  SMS_PROVIDER=africastalking, AT_USERNAME, AT_API_KEY,
                     optional AT_SENDER_ID (use AT_USERNAME=sandbox for testing)
  Twilio:            SMS_PROVIDER=twilio, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
                     TWILIO_FROM_NUMBER
*/

const provider = process.env.SMS_PROVIDER?.toLowerCase();

export const smsEnabled = provider === "africastalking" || provider === "twilio";

// Phone numbers are stored as typed; normalise to E.164, assuming Cameroon (+237)
// for local 9-digit numbers.
export function toE164(phone: string | null | undefined): string | null {
  if (!phone) return null;

  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits.length >= 8 ? digits : null;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  if (digits.length === 9) return `+${process.env.SMS_DEFAULT_COUNTRY_CODE ?? "237"}${digits}`;
  if (digits.length >= 11) return `+${digits}`;
  return null;
}

async function sendViaAfricasTalking(to: string[], message: string) {
  const username = process.env.AT_USERNAME ?? "";
  const host = username === "sandbox" ? "api.sandbox.africastalking.com" : "api.africastalking.com";
  const body = new URLSearchParams({ username, to: to.join(","), message });
  if (process.env.AT_SENDER_ID) body.set("from", process.env.AT_SENDER_ID);

  const response = await fetch(`https://${host}/version1/messaging`, {
    method: "POST",
    headers: {
      apiKey: process.env.AT_API_KEY ?? "",
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) throw new Error(`Africa's Talking HTTP ${response.status}`);
}

async function sendViaTwilio(to: string[], message: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID ?? "";
  const auth = Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN ?? ""}`).toString("base64");

  const results = await Promise.allSettled(
    to.map((recipient) =>
      fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ To: recipient, From: process.env.TWILIO_FROM_NUMBER ?? "", Body: message }),
        signal: AbortSignal.timeout(15_000),
      }).then((response) => {
        if (!response.ok) throw new Error(`Twilio HTTP ${response.status}`);
      }),
    ),
  );

  const failed = results.filter((result) => result.status === "rejected").length;
  if (failed) throw new Error(`${failed} of ${to.length} Twilio messages failed`);
}

/** Sends one SMS to each phone number. Returns how many numbers were attempted. */
export async function sendSms(phones: (string | null | undefined)[], message: string): Promise<number> {
  if (!smsEnabled) return 0;

  const to = [...new Set(phones.map(toE164).filter((phone): phone is string => Boolean(phone)))];
  if (to.length === 0) return 0;

  try {
    if (provider === "africastalking") await sendViaAfricasTalking(to, message);
    else await sendViaTwilio(to, message);
    return to.length;
  } catch (error) {
    // Log the failure only; never the phone numbers or message body.
    console.error("SMS DELIVERY FAILED:", error instanceof Error ? error.message : error);
    return 0;
  }
}
