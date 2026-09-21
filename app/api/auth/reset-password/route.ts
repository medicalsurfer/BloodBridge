import { NextRequest, NextResponse } from "next/server";
import { clientIp, LIMITS, rateLimit } from "@/src/lib/rate-limit";
import { createHash } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/src/lib/prisma";
import { logAudit } from "@/src/lib/audit";

export async function POST(request: NextRequest) {
  const limited = rateLimit(`reset-password:${clientIp(request)}`, LIMITS.passwordReset.limit, LIMITS.passwordReset.windowMs);
  if (limited) return limited;

  const body = await request.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!token) {
    return NextResponse.json({ error: "A reset token is required." }, { status: 400 });
  }

  if (!password || password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });

  if (
    !resetToken ||
    resetToken.usedAt ||
    resetToken.expiresAt.getTime() < Date.now()
  ) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired." },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
  ]);

  await logAudit({
    actorId: resetToken.userId,
    action: "PASSWORD_RESET_COMPLETED",
    targetType: "User",
    targetId: resetToken.userId,
  });

  return NextResponse.json({ message: "Password updated. You can now sign in." }, { status: 200 });
}
