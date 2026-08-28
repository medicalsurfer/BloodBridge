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
    const appointments = await prisma.appointment.findMany({
      where: {
        donorId: authentication.user.id,
        status: {
          in: ["COMPLETED", "CANCELLED"],
        },
      },
      orderBy: { appointmentDate: "desc" },
      include: {
        healthInstitute: {
          select: {
            name: true,
            city: true,
            region: true,
          },
        },
        donor: {
          select: {
            donorProfile: {
              select: { bloodGroup: true },
            },
          },
        },
      },
    });

    const donations = appointments.map((appointment) => ({
      id: appointment.id,
      hospital: appointment.healthInstitute.name,
      location: appointment.healthInstitute.region
        ? `${appointment.healthInstitute.city}, ${appointment.healthInstitute.region}`
        : appointment.healthInstitute.city,
      date: appointment.appointmentDate.toISOString(),
      time: appointment.appointmentTime,
      bloodType: formatBloodGroup(appointment.donor.donorProfile?.bloodGroup),
      volumeMl: appointment.status === "COMPLETED" ? 450 : null,
      status: appointment.status,
      notes: appointment.notes,
    }));

    return NextResponse.json({ donations }, { status: 200 });
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
