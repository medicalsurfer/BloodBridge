import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getAuthenticatedDonor } from "@/src/lib/auth";
import { notifyUser } from "@/src/lib/notifications";
import { logAudit } from "@/src/lib/audit";
import { sendAppointmentConfirmationEmail } from "@/src/lib/mail";
import { isAssessmentFresh } from "@/src/lib/eligibility";
import { SLOT_CAPACITY, validateSchedule } from "@/src/lib/appointment-slots";
import { getDonationWindow, tooSoonMessage } from "@/src/lib/donation-window";
import { getActiveInstitute } from "@/src/lib/institutes";
import { sendSms } from "@/src/lib/sms";
import { text as boundedText } from "@/src/lib/input";

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

    const body = await request.json().catch(() => ({}));

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

    const schedule = validateSchedule(appointmentDate, appointmentTime);

    if (schedule.error !== undefined) {
      return NextResponse.json({ error: schedule.error }, { status: 400 });
    }

    const institute = await getActiveInstitute(String(healthInstituteId ?? ""));

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

    // Second verification gate (matches the "book donation appointment"
    // activity diagram): a donor cannot book unless the DBMS-recorded
    // eligibility check has already passed. The donor must complete the
    // eligibility questionnaire (POST /api/eligibility) first.
    //
    // The recorded assessment is what is checked, not the profile's summary
    // boolean: that flag says only that the donor passed *at some point*, so
    // on its own it would let a screening from months ago authorise today's
    // booking. The client reuses a stored result to skip the form, and this
    // is the gate that makes that safe.
    const latestAssessment = await prisma.eligibilityAssessment.findFirst({
      where: { donorId: authentication.user.id },
      orderBy: { createdAt: "desc" },
      select: { eligible: true, createdAt: true },
    });

    if (!latestAssessment || !latestAssessment.eligible) {
      return NextResponse.json(
        {
          error:
            "Please complete and pass the eligibility check before booking an appointment.",
          eligibilityRequired: true,
        },
        { status: 403 },
      );
    }

    if (!isAssessmentFresh(latestAssessment.createdAt)) {
      return NextResponse.json(
        {
          error:
            "Your eligibility check has expired. Please complete it again before booking an appointment.",
          eligibilityRequired: true,
          eligibilityExpired: true,
        },
        { status: 403 },
      );
    }

    // Third gate: the mandatory interval since the last donation must have
    // passed by the appointment date, no matter how recent the eligibility
    // screening is (a donor could pass the check and donate on the same day).
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

    const [upcoming, bookedInSlot] = await Promise.all([
      prisma.appointment.findFirst({
        where: {
          donorId: authentication.user.id,
          status: { in: ["SCHEDULED", "CONFIRMED"] },
          appointmentDate: { gte: new Date(new Date().toDateString()) },
        },
        select: { id: true },
      }),
      prisma.appointment.count({
        where: {
          healthInstituteId,
          status: { in: ["SCHEDULED", "CONFIRMED"] },
          appointmentDate: schedule.date,
          appointmentTime: schedule.time,
        },
      }),
    ]);

    if (upcoming) {
      return NextResponse.json(
        {
          error:
            "You already have an upcoming appointment. Reschedule or cancel it before booking another.",
        },
        { status: 409 },
      );
    }

    if (bookedInSlot >= SLOT_CAPACITY) {
      return NextResponse.json(
        { error: "That time slot is full at this centre. Please choose another time." },
        { status: 409 },
      );
    }

    const appointment = await prisma.appointment.create({
      data: {
        donorId: authentication.user.id,
        healthInstituteId,
        appointmentDate: schedule.date,
        appointmentTime: schedule.time,
        notes: boundedText(notes, 1000) || null,
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

    const formattedDate = appointment.appointmentDate.toLocaleDateString(
      "en-GB",
      { day: "numeric", month: "long", year: "numeric" }
    );

    await notifyUser({
      userId: authentication.user.id,
      type: "APPOINTMENT",
      title: "Appointment booked",
      message: `Your donation appointment at ${appointment.healthInstitute.name} on ${formattedDate} at ${appointment.appointmentTime} is confirmed.`,
      link: "/appointments",
    });

    await logAudit({
      actorId: authentication.user.id,
      action: "APPOINTMENT_BOOKED",
      targetType: "Appointment",
      targetId: appointment.id,
      metadata: { healthInstituteId, appointmentDate, appointmentTime },
    });

    try {
      await sendAppointmentConfirmationEmail({
        recipient: authentication.user.email,
        firstName: authentication.user.firstName,
        instituteName: appointment.healthInstitute.name,
        appointmentDate: formattedDate,
        appointmentTime: appointment.appointmentTime,
      });
    } catch (mailError) {
      console.error("APPOINTMENT CONFIRMATION EMAIL ERROR:", mailError);
    }

    await sendSms(
      [authentication.user.phoneNumber],
      `BloodBridge: your donation appointment at ${appointment.healthInstitute.name} is confirmed for ${formattedDate} at ${appointment.appointmentTime}.`,
    );

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