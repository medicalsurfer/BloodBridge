import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/src/lib/prisma";
import { getAuthenticatedUser } from "@/src/lib/auth";
import { logAudit } from "@/src/lib/audit";
import { LIMITS, rateLimit } from "@/src/lib/rate-limit";

// Account settings shared by every role (FR-05, FR-07): basic details and
// password change. Donor-specific fields stay in /api/profile.

const accountSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phoneNumber: true,
  role: true,
  healthInstitute: { select: { name: true, city: true } },
} as const;

export async function GET(request: NextRequest) {
  const authentication = await getAuthenticatedUser(request);

  if (!authentication.user) {
    return NextResponse.json({ error: authentication.error }, { status: authentication.status });
  }

  const user = await prisma.user.findUnique({
    where: { id: authentication.user.id },
    select: accountSelect,
  });

  return NextResponse.json({ user });
}

export async function PUT(request: NextRequest) {
  const authentication = await getAuthenticatedUser(request);

  if (!authentication.user) {
    return NextResponse.json({ error: authentication.error }, { status: authentication.status });
  }

  const body = await request.json().catch(() => ({}));
  const firstName = String(body.firstName ?? "").trim().slice(0, 80);
  const lastName = String(body.lastName ?? "").trim().slice(0, 80);
  const phoneNumber = String(body.phoneNumber ?? "").trim().slice(0, 30);

  if (!firstName || !lastName) {
    return NextResponse.json({ error: "First name and last name are required." }, { status: 400 });
  }

  if (phoneNumber && !/^\+?[0-9 ()-]{6,30}$/.test(phoneNumber)) {
    return NextResponse.json({ error: "Enter a valid phone number." }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: authentication.user.id },
    data: { firstName, lastName, phoneNumber: phoneNumber || null },
    select: accountSelect,
  });

  await logAudit({
    actorId: user.id,
    action: "USER_UPDATED",
    targetType: "User",
    targetId: user.id,
    metadata: { fields: ["firstName", "lastName", "phoneNumber"] },
  });

  return NextResponse.json({ user, message: "Your details have been updated." });
}

// Change password.
export async function PATCH(request: NextRequest) {
  const authentication = await getAuthenticatedUser(request);

  if (!authentication.user) {
    return NextResponse.json({ error: authentication.error }, { status: authentication.status });
  }

  const userId = authentication.user.id;
  const limited = rateLimit(
    `password-change:${userId}`,
    LIMITS.passwordChange.limit,
    LIMITS.passwordChange.windowMs,
  );
  if (limited) return limited;

  const body = await request.json().catch(() => ({}));
  const currentPassword = String(body.currentPassword ?? "");
  const newPassword = String(body.newPassword ?? "");

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Current and new password are required." }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters long." }, { status: 400 });
  }

  if (newPassword === currentPassword) {
    return NextResponse.json(
      { error: "New password must be different from your current password." },
      { status: 400 },
    );
  }

  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, authentication.user.passwordHash);

  if (!isCurrentPasswordValid) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(newPassword, 12) },
  });

  await logAudit({
    actorId: userId,
    action: "PASSWORD_CHANGED",
    targetType: "User",
    targetId: userId,
  });

  return NextResponse.json({ message: "Your password has been changed." });
}
