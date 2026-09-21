import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../src/lib/prisma";
import { getAuthenticatedDonor } from "../../../../src/lib/auth";
import { notifyUser } from "../../../../src/lib/notifications";
import { logAudit } from "../../../../src/lib/audit";
import { SLOT_CAPACITY, validateSchedule } from "../../../../src/lib/appointment-slots";
import { getDonationWindow, tooSoonMessage } from "../../../../src/lib/donation-window";
import { getActiveInstitute } from "../../../../src/lib/institutes";
import { id as isValidId } from "../../../../src/lib/input";

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
    const { id: rawId } = await context.params;
    const id = isValidId(rawId);

    if (!id) {
      return NextResponse.json({ error: "Invalid identifier." }, { status: 400 });
    }
    const body = await request.json().catch(() => ({}));
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

    if (appointment.status === "COMPLETED" || appointment.status === "CANCELLED") {
      return NextResponse.json(
        { error: "This appointment can no longer be changed." },
        { status: 400 },
      );
    }

    const data: {
      status?: "CANCELLED";
      appointmentDate?: Date;
      appointmentTime?: string;
      healthInstituteId?: string;
    } = {};

    // Allowed transitions for a donor: SCHEDULED -> CANCELLED, or a new date/time.
    if (body.status === "CANCELLED") {
      data.status = "CANCELLED";
    } else if (
      body.appointmentDate !== undefined ||
      body.appointmentTime !== undefined ||
      body.healthInstituteId !== undefined
    ) {
      const schedule = validateSchedule(
        body.appointmentDate ?? appointment.appointmentDate.toLocaleDateString("en-CA"),
        body.appointmentTime ?? appointment.appointmentTime,
      );

      if (schedule.error !== undefined) {
        return NextResponse.json({ error: schedule.error }, { status: 400 });
      }

      // A donor may move the appointment to another centre, which must itself
      // be registered and active - as must the current one if they keep it.
      const instituteId = isValidId(body.healthInstituteId ?? appointment.healthInstituteId);

      if (!instituteId) {
        return NextResponse.json({ error: "Invalid donation centre." }, { status: 400 });
      }

      const institute = await getActiveInstitute(instituteId);

      if (!institute) {
        return NextResponse.json(
          {
            error:
              instituteId === appointment.healthInstituteId
                ? "That donation centre is no longer available. Please cancel this appointment and book at another centre."
                : "The donation centre you selected is not available.",
          },
          { status: 400 },
        );
      }

      const donationWindow = await getDonationWindow(authentication.user.id);

      if (donationWindow.earliestNextDonation && schedule.date < donationWindow.earliestNextDonation) {
        return NextResponse.json(
          {
            error: tooSoonMessage(donationWindow.earliestNextDonation),
            earliestNextDonation: donationWindow.earliestNextDonation,
          },
          { status: 403 },
        );
      }

      const bookedInSlot = await prisma.appointment.count({
        where: {
          id: { not: appointment.id },
          healthInstituteId: instituteId,
          status: { in: ["SCHEDULED", "CONFIRMED"] },
          appointmentDate: schedule.date,
          appointmentTime: schedule.time,
        },
      });

      if (bookedInSlot >= SLOT_CAPACITY) {
        return NextResponse.json(
          { error: "That time slot is full at this centre. Please choose another time." },
          { status: 409 },
        );
      }

      data.appointmentDate = schedule.date;
      data.appointmentTime = schedule.time;
      data.healthInstituteId = instituteId;
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

    if (data.status === "CANCELLED") {
      await notifyUser({
        userId: authentication.user.id,
        type: "APPOINTMENT",
        title: "Appointment cancelled",
        message: `Your donation appointment at ${updatedAppointment.healthInstitute.name} has been cancelled.`,
        link: "/appointments",
      });

      await logAudit({
        actorId: authentication.user.id,
        action: "APPOINTMENT_CANCELLED",
        targetType: "Appointment",
        targetId: updatedAppointment.id,
      });
    } else if (data.appointmentDate || data.appointmentTime || data.healthInstituteId) {
      await notifyUser({
        userId: authentication.user.id,
        type: "APPOINTMENT",
        title: "Appointment rescheduled",
        message: `Your donation appointment at ${updatedAppointment.healthInstitute.name} has been moved to ${updatedAppointment.appointmentDate.toLocaleDateString(
          "en-GB",
          { day: "numeric", month: "long", year: "numeric" }
        )} at ${updatedAppointment.appointmentTime}.`,
        link: "/appointments",
      });

      await logAudit({
        actorId: authentication.user.id,
        action: "APPOINTMENT_RESCHEDULED",
        targetType: "Appointment",
        targetId: updatedAppointment.id,
        metadata: {
          appointmentDate: data.appointmentDate?.toISOString(),
          appointmentTime: data.appointmentTime,
          healthInstituteId: data.healthInstituteId,
        },
      });
    }

    return NextResponse.json({ appointment: updatedAppointment });
  } catch (error) {
    console.error("UPDATE APPOINTMENT ERROR:", error);
    return NextResponse.json(
      { error: "Unable to update appointment." },
      { status: 500 },
    );
  }
}
