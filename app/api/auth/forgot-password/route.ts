import { NextRequest, NextResponse } from "next/server";
import { clientIp, LIMITS, rateLimit } from "@/src/lib/rate-limit";
import { randomBytes, createHash } from "crypto";
import { prisma } from "@/src/lib/prisma";
import { getUserByEmail } from "@/src/lib/prisma";
import { sendPasswordResetEmail } from "@/src/lib/mail";
import { logAudit } from "@/src/lib/audit";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

const GENERIC_MESSAGE =
  "If an account exists for that email, we've sent password reset instructions.";

export async function POST(request: NextRequest) {
  const limited = rateLimit(`forgot-password:${clientIp(request)}`, LIMITS.passwordReset.limit, LIMITS.passwordReset.windowMs);
  if (limited) return limited;

  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  try {
    const user = await getUserByEmail(email);

    // Always respond the same way whether or not the account exists, so this
    // endpoint can't be used to enumerate registered email addresses.
    if (user && user.isActive) {
      const rawToken = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(rawToken).digest("hex");

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
        },
      });

      const resetLink = `${request.nextUrl.origin}/reset-password?token=${rawToken}`;

      try {
        await sendPasswordResetEmail({
          recipient: user.email,
          firstName: user.firstName,
          resetLink,
        });
      } catch (mailError) {
        // The response stays generic on purpose — telling the caller that
        // delivery failed would confirm the account exists. But a silent
        // failure is invisible to operators too, so make it unmistakable in
        // the server log: the donor is waiting for a mail that never left.
        console.error(
          "[PASSWORD RESET] SMTP delivery FAILED for an existing account. " +
            "The reset token was created but no email was sent, so the donor " +
            "cannot complete the reset. Check SMTP_USER/SMTP_PASSWORD.",
          mailError,
        );
      }

      await logAudit({
        actorId: user.id,
        action: "PASSWORD_RESET_REQUESTED",
        targetType: "User",
        targetId: user.id,
      });
    }

    return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 200 });
  } catch (error) {
    console.error("FORGOT PASSWORD ERROR:", error);
    return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 200 });
  }
}
