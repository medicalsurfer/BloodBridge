import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSystemAdmin } from "@/src/lib/auth";
import { sendTestEmail } from "@/src/lib/mail";
import { rateLimit } from "@/src/lib/rate-limit";

// Sends a test email to the signed-in system admin (SRS acceptance: "SMTP can
// send a configured test email").
export async function POST(request: NextRequest) {
  const authentication = await getAuthenticatedSystemAdmin(request);

  if (!authentication.user) {
    return NextResponse.json({ error: authentication.error }, { status: authentication.status });
  }

  const limited = rateLimit(`test-email:${authentication.user.id}`, 5, 15 * 60_000);
  if (limited) return limited;

  try {
    await sendTestEmail({
      recipient: authentication.user.email,
      firstName: authentication.user.firstName,
    });

    return NextResponse.json({ message: `Test email sent to ${authentication.user.email}.` });
  } catch (error) {
    console.error("TEST EMAIL ERROR:", error instanceof Error ? error.message : error);

    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message.startsWith("Email delivery is not configured")
            ? error.message
            : "The email could not be sent. Check the SMTP settings in .env and the server log.",
      },
      { status: 502 },
    );
  }
}
