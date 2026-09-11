import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../src/lib/prisma";
import { getAuthenticatedMedicalStaff } from "../../../../src/lib/auth";
import { notifyUsers } from "../../../../src/lib/notifications";
import { logAudit } from "../../../../src/lib/audit";

const bloodGroups = [
  "A_POSITIVE",
  "A_NEGATIVE",
  "B_POSITIVE",
  "B_NEGATIVE",
  "AB_POSITIVE",
  "AB_NEGATIVE",
  "O_POSITIVE",
  "O_NEGATIVE",
] as const;

const urgencies = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export async function GET(request: NextRequest) {
  const authentication = await getAuthenticatedMedicalStaff(request);

  if (!authentication.user) {
    return NextResponse.json({ error: authentication.error }, { status: authentication.status });
  }

  const requests = await prisma.bloodRequest.findMany({
    where: { healthInstituteId: authentication.user.healthInstituteId },
    orderBy: { createdAt: "desc" },
    include: {
      requestedBy: { select: { firstName: true, lastName: true } },
    },
  });

  return NextResponse.json({ requests });
}

export async function POST(request: NextRequest) {
  const authentication = await getAuthenticatedMedicalStaff(request);

  if (!authentication.user) {
    return NextResponse.json({ error: authentication.error }, { status: authentication.status });
  }

  const body = await request.json();
  const bloodGroup = body.bloodGroup as (typeof bloodGroups)[number];
  const unitsNeeded = Number(body.unitsNeeded);
  const urgency = (body.urgency as (typeof urgencies)[number]) ?? "MEDIUM";
  const notes = String(body.notes ?? "").trim();

  if (!bloodGroups.includes(bloodGroup)) {
    return NextResponse.json({ error: "A valid blood group is required." }, { status: 400 });
  }

  if (!Number.isInteger(unitsNeeded) || unitsNeeded < 1) {
    return NextResponse.json({ error: "Units needed must be a positive whole number." }, { status: 400 });
  }

  if (!urgencies.includes(urgency)) {
    return NextResponse.json({ error: "Invalid urgency level." }, { status: 400 });
  }

  const bloodRequest = await prisma.bloodRequest.create({
    data: {
      healthInstituteId: authentication.user.healthInstituteId,
      requestedById: authentication.user.id,
      bloodGroup,
      unitsNeeded,
      urgency,
      notes: notes || null,
    },
    include: {
      requestedBy: { select: { firstName: true, lastName: true } },
    },
  });

  await logAudit({
    actorId: authentication.user.id,
    action: "BLOOD_REQUEST_CREATED",
    targetType: "BloodRequest",
    targetId: bloodRequest.id,
    metadata: { bloodGroup, unitsNeeded, urgency },
  });

  const matchingDonors = await prisma.user.findMany({
    where: {
      role: "DONOR",
      isActive: true,
      donorProfile: { bloodGroup, eligibilityStatus: true },
    },
    select: { id: true },
    take: 250,
  });

  const urgencyLabel = urgency.charAt(0) + urgency.slice(1).toLowerCase();

  await notifyUsers(
    matchingDonors.map((donor) => donor.id),
    {
      type: "BLOOD_REQUEST",
      title: `${urgencyLabel} priority blood request`,
      message: `A health institute needs ${unitsNeeded} unit${unitsNeeded === 1 ? "" : "s"} of your blood type. Check current requests to help.`,
      link: "/request",
    },
  );

  return NextResponse.json({ request: bloodRequest }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const authentication = await getAuthenticatedMedicalStaff(request);

  if (!authentication.user) {
    return NextResponse.json({ error: authentication.error }, { status: authentication.status });
  }

  const body = await request.json();
  const id = String(body.id ?? "");
  const status = body.status as "FULFILLED" | "CANCELLED";

  if (!id || (status !== "FULFILLED" && status !== "CANCELLED")) {
    return NextResponse.json({ error: "A request id and valid status are required." }, { status: 400 });
  }

  const existing = await prisma.bloodRequest.findFirst({
    where: { id, healthInstituteId: authentication.user.healthInstituteId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Blood request not found." }, { status: 404 });
  }

  const bloodRequest = await prisma.bloodRequest.update({
    where: { id },
    data: { status },
    include: {
      requestedBy: { select: { firstName: true, lastName: true } },
    },
  });

  return NextResponse.json({ request: bloodRequest });
}
