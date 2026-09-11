import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../src/lib/prisma";
import { getAuthenticatedDonor } from "../../../src/lib/auth";

export async function GET(request: NextRequest) {
  const authentication = await getAuthenticatedDonor(request);

  if (!authentication.user) {
    return NextResponse.json(
      { error: authentication.error },
      { status: authentication.status },
    );
  }

  try {
    const [donations, cancelledAppointments] = await Promise.all([
      prisma.donation.findMany({
        where: { donorId: authentication.user.id },
        orderBy: { donatedAt: "desc" },
        include: {
          healthInstitute: { select: { name: true, city: true, region: true } },
        },
      }),
      prisma.appointment.findMany({
        where: { donorId: authentication.user.id, status: "CANCELLED" },
        orderBy: { appointmentDate: "desc" },
        include: {
          healthInstitute: { select: { name: true, city: true, region: true } },
        },
      }),
    ]);

    const completedEntries = donations.map((donation) => ({
      id: donation.id,
      hospital: donation.healthInstitute.name,
      location: donation.healthInstitute.region
        ? `${donation.healthInstitute.city}, ${donation.healthInstitute.region}`
        : donation.healthInstitute.city,
      date: donation.donatedAt.toISOString().split("T")[0],
      time: donation.donatedAt.toISOString().split("T")[1]?.slice(0, 5) ?? "",
      bloodType: formatBloodGroup(donation.bloodGroup),
      volumeMl: donation.volumeMl,
      status: "COMPLETED" as const,
      bloodPackId: donation.bloodPackId ?? undefined,
      notes: donation.notes,
    }));

    const cancelledEntries = cancelledAppointments.map((appointment) => ({
      id: appointment.id,
      hospital: appointment.healthInstitute.name,
      location: appointment.healthInstitute.region
        ? `${appointment.healthInstitute.city}, ${appointment.healthInstitute.region}`
        : appointment.healthInstitute.city,
      date: appointment.appointmentDate.toISOString().split("T")[0],
      time: appointment.appointmentTime,
      bloodType: formatBloodGroup(null),
      volumeMl: null,
      status: "CANCELLED" as const,
      notes: appointment.notes,
    }));

    const allEntries = [...completedEntries, ...cancelledEntries].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    return NextResponse.json({ donations: allEntries }, { status: 200 });
  } catch (error) {
    console.error("FETCH DONATIONS ERROR:", error);
    return NextResponse.json(
      { error: "Unable to load donation history." },
      { status: 500 },
    );
  }
}

function formatBloodGroup(bloodGroup: string | null | undefined) {
  const labels: Record<string, string> = {
    A_POSITIVE: "A+",
    A_NEGATIVE: "A-",
    B_POSITIVE: "B+",
    B_NEGATIVE: "B-",
    AB_POSITIVE: "AB+",
    AB_NEGATIVE: "AB-",
    O_POSITIVE: "O+",
    O_NEGATIVE: "O-",
  };

  return bloodGroup ? labels[bloodGroup] ?? "Not set" : "Not set";
}
