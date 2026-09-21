import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../src/lib/prisma";
import { getAuthenticatedMedicalStaff } from "../../../../src/lib/auth";
import { notifyUser } from "../../../../src/lib/notifications";
import { logAudit } from "../../../../src/lib/audit";
import { SLOT_CAPACITY, validateSchedule } from "../../../../src/lib/appointment-slots";
import { getDonationWindow, tooSoonMessage } from "../../../../src/lib/donation-window";
import { id as validId, oneOf } from "../../../../src/lib/input";

const donorSelect = {
  firstName: true,
  lastName: true,
  email: true,
  phoneNumber: true,
  donorProfile: { select: { bloodGroup: true } },
} as const;

export async function GET(request: NextRequest) {
  const authentication = await getAuthenticatedMedicalStaff(request);

  if (!authentication.user) {
    return NextResponse.json({ error: authentication.error }, { status: authentication.status });
  }

  const appointments = await prisma.appointment.findMany({
    where: { healthInstituteId: authentication.user.healthInstituteId },
    orderBy: { appointmentDate: "asc" },
    include: { donor: { select: donorSelect } },
  });

  return NextResponse.json({ appointments });
}

/*
  Staff appointment management (FR-24): approve a booking a donor made, move it
  to another date/time, mark the visit completed, or cancel it. Open states are
  SCHEDULED (awaiting approval) and CONFIRMED (approved); COMPLETED and
  CANCELLED are final, so nothing can be changed afterwards.
*/
export async function PATCH(request: NextRequest) {
  const authentication = await getAuthenticatedMedicalStaff(request);

  if (!authentication.user) {
    return NextResponse.json({ error: authentication.error }, { status: authentication.status });
  }

  const body = await request.json().catch(() => ({}));
  const id = validId(body.id);
  const status = oneOf(body.status, ["CONFIRMED", "COMPLETED", "CANCELLED"] as const);
  const isReschedule = body.appointmentDate !== undefined || body.appointmentTime !== undefined;

  if (!id || (!status && !isReschedule)) {
    return NextResponse.json(
      { error: "An appointment id and either a new status or a new date and time are required." },
      { status: 400 },
    );
  }

  const existing = await prisma.appointment.findFirst({
    where: { id, healthInstituteId: authentication.user.healthInstituteId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Appointment not found." }, { status: 404 });
  }

  if (existing.status === "COMPLETED" || existing.status === "CANCELLED") {
    return NextResponse.json(
      { error: `This appointment is already ${existing.status.toLowerCase()}.` },
      { status: 400 },
    );
  }

  const data: {
    status?: "CONFIRMED" | "COMPLETED" | "CANCELLED";
    appointmentDate?: Date;
    appointmentTime?: string;
  } = {};

  if (isReschedule) {
    const schedule = validateSchedule(
      body.appointmentDate ?? existing.appointmentDate.toLocaleDateString("en-CA"),
      body.appointmentTime ?? existing.appointmentTime,
    );

    if (schedule.error !== undefined) {
      return NextResponse.json({ error: schedule.error }, { status: 400 });
    }

    // The donor's mandatory interval since their last donation still applies.
    const donationWindow = await getDonationWindow(existing.donorId);

    if (donationWindow.earliestNextDonation && schedule.date < donationWindow.earliestNextDonation) {
      return NextResponse.json(
        { error: `This donor cannot give blood that soon. ${tooSoonMessage(donationWindow.earliestNextDonation)}` },
        { status: 409 },
      );
    }

    const bookedInSlot = await prisma.appointment.count({
      where: {
        id: { not: existing.id },
        healthInstituteId: existing.healthInstituteId,
        status: { in: ["SCHEDULED", "CONFIRMED"] },
        appointmentDate: schedule.date,
        appointmentTime: schedule.time,
      },
    });

    if (bookedInSlot >= SLOT_CAPACITY) {
      return NextResponse.json(
        { error: "That time slot is already full. Please choose another time." },
        { status: 409 },
      );
    }

    data.appointmentDate = schedule.date;
    data.appointmentTime = schedule.time;
  }

  if (status) data.status = status;

  const appointment = await prisma.appointment.update({
    where: { id },
    data,
    include: {
      donor: { select: donorSelect },
      healthInstitute: { select: { name: true } },
    },
  });

  const date = appointment.appointmentDate.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const centre = appointment.healthInstitute.name;

  const notice =
    data.status === "COMPLETED"
      ? { title: "Appointment completed", message: `Thank you for visiting ${centre} on ${date}.` }
      : data.status === "CANCELLED"
        ? {
            title: "Appointment cancelled by the centre",
            message: `${centre} cancelled your appointment on ${date}. You can book a new one at any time.`,
          }
        : data.status === "CONFIRMED" && isReschedule
          ? {
              title: "Appointment confirmed for a new time",
              message: `${centre} confirmed your donation for ${date} at ${appointment.appointmentTime}.`,
            }
          : data.status === "CONFIRMED"
            ? {
                title: "Appointment confirmed",
                message: `${centre} confirmed your donation on ${date} at ${appointment.appointmentTime}.`,
              }
            : {
                title: "Appointment moved",
                message: `${centre} moved your donation to ${date} at ${appointment.appointmentTime}.`,
              };

  await notifyUser({
    userId: appointment.donorId,
    type: "APPOINTMENT",
    title: notice.title,
    message: notice.message,
    link: "/appointments",
  });

  await logAudit({
    actorId: authentication.user.id,
    action:
      data.status === "COMPLETED"
        ? "APPOINTMENT_COMPLETED"
        : data.status === "CANCELLED"
          ? "APPOINTMENT_CANCELLED"
          : data.status === "CONFIRMED"
            ? "APPOINTMENT_CONFIRMED"
            : "APPOINTMENT_RESCHEDULED",
    targetType: "Appointment",
    targetId: id,
    metadata: {
      by: "MEDICAL_STAFF",
      ...(isReschedule
        ? { appointmentDate: data.appointmentDate?.toISOString(), appointmentTime: data.appointmentTime }
        : {}),
    },
  });

  return NextResponse.json({ appointment });
}
