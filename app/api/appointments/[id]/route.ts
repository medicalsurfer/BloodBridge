import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../src/lib/prisma";
import { getAuthenticatedDonor } from "../../../../src/lib/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const authentication = await getAuthenticatedDonor(request);

  if (!authentication.user) {
    return NextResponse.json(
      { error: authentication.error },
      { status: authentication.status },
    );
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    const appointment = await prisma.appointment.findFirst({
      where: {
        id,
        donorId: authentication.user.id,
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found." },
        { status: 404 },
      );
    }

    if (appointment.status !== "SCHEDULED") {
      return NextResponse.json(
        { error: "Only scheduled appointments can be changed." },
        { status: 400 },
      );
    }

    const data: {
      status?: "SCHEDULED" | "CANCELLED";
      appointmentDate?: Date;
      appointmentTime?: string;
    } = {};

    if (body.status === "CANCELLED" || body.status === "SCHEDULED") {
      data.status = body.status;
    }

    if (typeof body.appointmentDate === "string") {
      const date = new Date(`${body.appointmentDate}T00:00:00`);

      if (Number.isNaN(date.getTime())) {
        return NextResponse.json(
          { error: "Invalid appointment date." },
          { status: 400 },
        );
      }

      data.appointmentDate = date;
    }

    if (typeof body.appointmentTime === "string" && body.appointmentTime) {
      data.appointmentTime = body.appointmentTime;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No valid appointment changes supplied." },
        { status: 400 },
      );
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointment.id },
      data,
      include: {
        healthInstitute: {
          select: {
            id: true,
            name: true,
            city: true,
            region: true,
            address: true,
          },
        },
      },
    });

    return NextResponse.json({ appointment: updatedAppointment });
  } catch (error) {
    console.error("UPDATE APPOINTMENT ERROR:", error);
    return NextResponse.json(
      { error: "Unable to update appointment." },
      { status: 500 },
    );
  }
}
