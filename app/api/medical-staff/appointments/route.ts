import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../src/lib/prisma";
import { getAuthenticatedMedicalStaff } from "../../../../src/lib/auth";

export async function GET(request: NextRequest) {
  const authentication = await getAuthenticatedMedicalStaff(request);

  if (!authentication.user) {
    return NextResponse.json({ error: authentication.error }, { status: authentication.status });
  }

  const appointments = await prisma.appointment.findMany({
    where: { healthInstituteId: authentication.user.healthInstituteId },
    orderBy: { appointmentDate: "asc" },
    include: {
      donor: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
          donorProfile: { select: { bloodGroup: true } },
        },
      },
    },
  });

  return NextResponse.json({ appointments });
}

export async function PATCH(request: NextRequest) {
  const authentication = await getAuthenticatedMedicalStaff(request);

  if (!authentication.user) {
    return NextResponse.json({ error: authentication.error }, { status: authentication.status });
  }

  const body = await request.json();
  const id = String(body.id ?? "");
  const status = body.status as "COMPLETED" | "CANCELLED";

  if (!id || (status !== "COMPLETED" && status !== "CANCELLED")) {
    return NextResponse.json({ error: "An appointment id and valid status are required." }, { status: 400 });
  }

  const existing = await prisma.appointment.findFirst({
    where: { id, healthInstituteId: authentication.user.healthInstituteId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Appointment not found." }, { status: 404 });
  }

  const appointment = await prisma.appointment.update({
    where: { id },
    data: { status },
    include: {
      donor: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
          donorProfile: { select: { bloodGroup: true } },
        },
      },
    },
  });

  return NextResponse.json({ appointment });
}
