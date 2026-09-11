import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../src/lib/prisma";
import { getAuthenticatedLabTechnician } from "../../../../src/lib/auth";
import { notifyUser } from "../../../../src/lib/notifications";
import { logAudit } from "../../../../src/lib/audit";

const REWARD_POINTS_PER_DONATION = 50;

export async function GET(request: NextRequest) {
  const authentication = await getAuthenticatedLabTechnician(request);

  if (!authentication.user) {
    return NextResponse.json({ error: authentication.error }, { status: authentication.status });
  }

  const donations = await prisma.donation.findMany({
    where: { healthInstituteId: authentication.user.healthInstituteId },
    orderBy: { donatedAt: "desc" },
    include: {
      donor: { select: { firstName: true, lastName: true, email: true } },
    },
    take: 100,
  });

  return NextResponse.json({ donations });
}

export async function POST(request: NextRequest) {
  const authentication = await getAuthenticatedLabTechnician(request);

  if (!authentication.user) {
    return NextResponse.json({ error: authentication.error }, { status: authentication.status });
  }

  const body = await request.json();
  const appointmentId = String(body.appointmentId ?? "");
  const volumeMl = Number(body.volumeMl ?? 450);
  const bloodPackId = String(body.bloodPackId ?? "").trim();
  const notes = String(body.notes ?? "").trim();

  if (!appointmentId) {
    return NextResponse.json({ error: "An appointment is required." }, { status: 400 });
  }

  if (!Number.isInteger(volumeMl) || volumeMl < 1) {
    return NextResponse.json({ error: "Volume must be a positive whole number of millilitres." }, { status: 400 });
  }

  const appointment = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      healthInstituteId: authentication.user.healthInstituteId,
      status: "COMPLETED",
    },
    include: {
      donation: { select: { id: true } },
      donor: { select: { id: true, donorProfile: { select: { bloodGroup: true } } } },
    },
  });

  if (!appointment) {
    return NextResponse.json({ error: "Completed appointment not found." }, { status: 404 });
  }

  if (appointment.donation) {
    return NextResponse.json({ error: "A donation has already been recorded for this appointment." }, { status: 409 });
  }

  const bloodGroup = appointment.donor.donorProfile?.bloodGroup;

  if (!bloodGroup) {
    return NextResponse.json(
      { error: "This donor has no blood group on file. Ask them to update their profile first." },
      { status: 400 },
    );
  }

  const [donation] = await prisma.$transaction([
    prisma.donation.create({
      data: {
        donorId: appointment.donorId,
        healthInstituteId: authentication.user.healthInstituteId,
        appointmentId: appointment.id,
        recordedById: authentication.user.id,
        bloodGroup,
        volumeMl,
        bloodPackId: bloodPackId || null,
        notes: notes || null,
      },
      include: {
        donor: { select: { firstName: true, lastName: true, email: true } },
      },
    }),
    prisma.bloodInventory.upsert({
      where: {
        healthInstituteId_bloodGroup: {
          healthInstituteId: authentication.user.healthInstituteId,
          bloodGroup,
        },
      },
      create: {
        healthInstituteId: authentication.user.healthInstituteId,
        bloodGroup,
        units: 1,
      },
      update: {
        units: { increment: 1 },
      },
    }),
    prisma.donorProfile.updateMany({
      where: { userId: appointment.donorId },
      data: { lastDonationDate: new Date() },
    }),
  ]);

  await prisma.donationReward.create({
    data: {
      donationId: donation.id,
      donorId: appointment.donorId,
      healthInstituteId: authentication.user.healthInstituteId,
      points: REWARD_POINTS_PER_DONATION,
      status: "PENDING",
    },
  });

  await logAudit({
    actorId: authentication.user.id,
    action: "DONATION_RECORDED",
    targetType: "Donation",
    targetId: donation.id,
    metadata: { donorId: appointment.donorId, bloodGroup, volumeMl },
  });

  await notifyUser({
    userId: appointment.donorId,
    type: "DONATION",
    title: "Thank you for donating",
    message: `Your donation has been recorded. You've earned ${REWARD_POINTS_PER_DONATION} reward points, pending validation by the institute.`,
    link: "/rewards",
  });

  return NextResponse.json({ donation }, { status: 201 });
}
