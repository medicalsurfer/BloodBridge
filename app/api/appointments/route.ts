import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getAuthenticatedDonor } from "@/src/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const authentication = await getAuthenticatedDonor(request);

    if (!authentication.user) {
      return NextResponse.json(
        { error: authentication.error },
        { status: authentication.status },
      );
    }

    const appointments = await prisma.appointment.findMany({
      where: {
        donorId: authentication.user.id,
      },
      orderBy: {
        appointmentDate: "asc",
      },
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

    return NextResponse.json(
      {
        appointments,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("FETCH APPOINTMENTS ERROR:", error);

    return NextResponse.json(
      {
        error: "Unable to fetch appointments.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authentication = await getAuthenticatedDonor(request);

    if (!authentication.user) {
      return NextResponse.json(
        { error: authentication.error },
        { status: authentication.status },
      );
    }

    const body = await request.json();

    const {
      healthInstituteId,
      appointmentDate,
      appointmentTime,
      notes,
    } = body;

    if (!healthInstituteId) {
      return NextResponse.json(
        {
          error: "Health institute is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!appointmentDate) {
      return NextResponse.json(
        {
          error: "Appointment date is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!appointmentTime) {
      return NextResponse.json(
        {
          error: "Appointment time is required.",
        },
        {
          status: 400,
        }
      );
    }

    const institute = await prisma.healthInstitute.findFirst({
      where: {
        id: healthInstituteId,
        status: "ACTIVE",
        isActive: true,
      },
    });

    if (!institute) {
      return NextResponse.json(
        {
          error: "The selected donation centre is not available.",
        },
        {
          status: 400,
        }
      );
    }

    const appointment = await prisma.appointment.create({
      data: {
        donorId: authentication.user.id,
        healthInstituteId,
        appointmentDate: new Date(
          `${appointmentDate}T00:00:00`
        ),
        appointmentTime,
        notes: notes?.trim() || null,
        status: "SCHEDULED",
      },
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

    return NextResponse.json(
      {
        message: "Appointment booked successfully.",
        appointment,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error("CREATE APPOINTMENT ERROR:", error);

    return NextResponse.json(
      {
        error: "Unable to book appointment.",
      },
      {
        status: 500,
      }
    );
  }
}