import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "../../../../src/lib/prisma";
import { getAuthenticatedUser } from "../../../../src/lib/auth";
import { sendStaffInvitationEmail } from "../../../../src/lib/mail";
import { logAudit } from "../../../../src/lib/audit";

const staffRoles = ["MEDICAL_STAFF", "LAB_TECHNICIAN"] as const;
type StaffRole = (typeof staffRoles)[number];
type AssignedInstituteAdmin = NonNullable<
  Awaited<ReturnType<typeof getAuthenticatedUser>>["user"]
> & { healthInstituteId: string };

async function getInstituteAdmin(
  request: NextRequest,
): Promise<AssignedInstituteAdmin | null> {
  const authentication = await getAuthenticatedUser(request);

  if (!authentication.user) {
    return null;
  }

  return authentication.user.role === "HEALTH_INSTITUTE_ADMIN" && authentication.user.healthInstituteId
    ? authentication.user as AssignedInstituteAdmin
    : null;
}

export async function GET(request: NextRequest) {
  const admin = await getInstituteAdmin(request);

  if (!admin) {
    return NextResponse.json(
      { error: "Only institute administrators can manage staff." },
      { status: 403 },
    );
  }

  const staff = await prisma.user.findMany({
    where: { role: { in: [...staffRoles] }, healthInstituteId: admin.healthInstituteId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phoneNumber: true,
      role: true,
      isActive: true,
      createdAt: true,
      healthInstitute: { select: { name: true, city: true, region: true } },
    },
  });

  const institute = await prisma.healthInstitute.findUnique({
    where: { id: admin.healthInstituteId },
    select: { id: true, name: true, city: true, region: true, address: true, email: true, phoneNumber: true },
  });

  return NextResponse.json({ staff, institute });
}

export async function POST(request: NextRequest) {
  const admin = await getInstituteAdmin(request);

  if (!admin) {
    return NextResponse.json(
      { error: "Only institute administrators can invite staff." },
      { status: 403 },
    );
  }

  const body = await request.json();
  const firstName = String(body.firstName ?? "").trim();
  const lastName = String(body.lastName ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const role = body.role as StaffRole;

  if (!firstName || !lastName || !email || !staffRoles.includes(role)) {
    return NextResponse.json(
      { error: "First name, last name, email, and a valid staff role are required." },
      { status: 400 },
    );
  }

  const institute = await prisma.healthInstitute.findUnique({
    where: { id: admin.healthInstituteId },
    select: { id: true, name: true, isActive: true },
  });

  if (!institute || !institute.isActive) {
    return NextResponse.json({ error: "Your assigned institute is inactive." }, { status: 403 });
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    return NextResponse.json(
      { error: "That email address is already registered." },
      { status: 409 },
    );
  }

  const temporaryPassword = randomBytes(6).toString("base64url");
  const staff = await prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      passwordHash: await bcrypt.hash(temporaryPassword, 12),
      role,
      isActive: true,
      healthInstituteId: admin.healthInstituteId,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phoneNumber: true,
      role: true,
      isActive: true,
      createdAt: true,
      healthInstitute: { select: { name: true, city: true, region: true } },
    },
  });

  try {
    await sendStaffInvitationEmail({
      recipient: staff.email,
      firstName: staff.firstName,
      temporaryPassword,
      instituteName: institute.name,
      role: role === "MEDICAL_STAFF" ? "medical staff" : "laboratory technician",
    });
  } catch (error) {
    await prisma.user.delete({ where: { id: staff.id } });
    throw error;
  }

  await logAudit({
    actorId: admin.id,
    action: "STAFF_INVITED",
    targetType: "User",
    targetId: staff.id,
    metadata: { role, healthInstituteId: admin.healthInstituteId },
  });

  return NextResponse.json({ staff, emailSent: true }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const admin = await getInstituteAdmin(request);

  if (!admin) {
    return NextResponse.json(
      { error: "Only institute administrators can delete staff." },
      { status: 403 },
    );
  }

  const id = new URL(request.url).searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Staff member id is required." }, { status: 400 });
  }

  const staff = await prisma.user.findFirst({
    where: {
      id,
      role: { in: [...staffRoles] },
      healthInstituteId: admin.healthInstituteId,
    },
    select: { id: true },
  });

  if (!staff) {
    return NextResponse.json({ error: "Staff member not found." }, { status: 404 });
  }

  await prisma.user.update({
    where: { id },
    data: { isActive: false },
  });

  await logAudit({
    actorId: admin.id,
    action: "STAFF_REMOVED",
    targetType: "User",
    targetId: id,
  });

  return NextResponse.json({ success: true, message: "Staff member deactivated." });
}