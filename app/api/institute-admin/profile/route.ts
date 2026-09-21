import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "../../../../src/lib/prisma";
import { getAuthenticatedUser } from "../../../../src/lib/auth";
import { logAudit } from "../../../../src/lib/audit";

async function getAdmin(request: NextRequest) {
  const authentication = await getAuthenticatedUser(request);

  if (
    !authentication.user ||
    authentication.user.role !== "HEALTH_INSTITUTE_ADMIN"
  ) {
    return null;
  }

  return authentication.user;
}

export async function GET(request: NextRequest) {
  const admin = await getAdmin(request);

  if (!admin) {
    return NextResponse.json({ error: "Only institute administrators can access this profile." }, { status: 403 });
  }

  const user = await prisma.user.findUnique({
    where: { id: admin.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phoneNumber: true,
      role: true,
      healthInstitute: {
        select: { id: true, name: true, city: true, region: true },
      },
    },
  });

  return NextResponse.json({ user });
}

export async function PUT(request: NextRequest) {
  const admin = await getAdmin(request);

  if (!admin) {
    return NextResponse.json({ error: "Only institute administrators can update this profile." }, { status: 403 });
  }

  const body = await request.json();
  const firstName = String(body.firstName ?? "").trim();
  const lastName = String(body.lastName ?? "").trim();
  const phoneNumber = String(body.phoneNumber ?? "").trim();

  if (!firstName || !lastName) {
    return NextResponse.json({ error: "First name and last name are required." }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: admin.id },
    data: { firstName, lastName, phoneNumber: phoneNumber || null },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phoneNumber: true,
      role: true,
      healthInstitute: {
        select: { id: true, name: true, city: true, region: true },
      },
    },
  });

  return NextResponse.json({ user, message: "Profile updated successfully." });
}

export async function PATCH(request: NextRequest) {
  const admin = await getAdmin(request);

  if (!admin) {
    return NextResponse.json({ error: "Only institute administrators can update this profile." }, { status: 403 });
  }

  const body = await request.json();
  const currentPassword = String(body.currentPassword ?? "");
  const newPassword = String(body.newPassword ?? "");

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Current and new password are required." }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters long." }, { status: 400 });
  }

  if (newPassword === currentPassword) {
    return NextResponse.json({ error: "New password must be different from your current password." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: admin.id } });

  if (!user) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);

  if (!isCurrentPasswordValid) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: admin.id },
    data: { passwordHash },
  });

  await logAudit({
    actorId: admin.id,
    action: "PASSWORD_CHANGED",
    targetType: "User",
    targetId: admin.id,
  });

  return NextResponse.json({ message: "Password updated successfully." });
}