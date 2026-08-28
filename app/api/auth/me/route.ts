import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "../../../../src/lib/prisma";

const authSecret = process.env.AUTH_SECRET;

if (!authSecret) {
  throw new Error(
    "AUTH_SECRET is not defined in the environment variables."
  );
}

const secret = new TextEncoder().encode(authSecret);

function formatBloodGroup(
  bloodGroup:
    | "A_POSITIVE"
    | "A_NEGATIVE"
    | "B_POSITIVE"
    | "B_NEGATIVE"
    | "AB_POSITIVE"
    | "AB_NEGATIVE"
    | "O_POSITIVE"
    | "O_NEGATIVE"
    | null
    | undefined
) {
  const bloodGroups = {
    A_POSITIVE: "A+",
    A_NEGATIVE: "A-",
    B_POSITIVE: "B+",
    B_NEGATIVE: "B-",
    AB_POSITIVE: "AB+",
    AB_NEGATIVE: "AB-",
    O_POSITIVE: "O+",
    O_NEGATIVE: "O-",
  };

  if (!bloodGroup) {
    return "Not set";
  }

  return bloodGroups[bloodGroup];
}

function getNextEligibleDate(
  lastDonationDate: Date | null | undefined
) {
  if (!lastDonationDate) {
    return "Eligible now";
  }

  const nextDate = new Date(lastDonationDate);

  // Temporary 12-week donation interval.
  nextDate.setDate(nextDate.getDate() + 84);

  return nextDate.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export async function GET(request: NextRequest) {
  try {
    const token =
      request.cookies.get("bloodbridge_session")?.value;

    if (!token) {
      return NextResponse.json(
        {
          error: "Not authenticated.",
        },
        {
          status: 401,
        }
      );
    }

    const { payload } = await jwtVerify(
      token,
      secret
    );

    const userId = payload.userId;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        {
          error: "Invalid session.",
        },
        {
          status: 401,
        }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },

      include: {
        donorProfile: true,

        appointments: {
          where: {
            status: "SCHEDULED",

            appointmentDate: {
              gte: new Date(),
            },
          },

          include: {
            healthInstitute: true,
          },

          orderBy: {
            appointmentDate: "asc",
          },

          take: 1,
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          error: "User not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        {
          error: "This account is inactive.",
        },
        {
          status: 403,
        }
      );
    }

    const completedDonations =
      user.role === "DONOR"
        ? await prisma.appointment.count({
            where: {
              donorId: user.id,
              status: "COMPLETED",
            },
          })
        : 0;

    const donorProfile =
  user.role === "DONOR"
    ? user.donorProfile
    : null;

const upcomingAppointment =
  user.role === "DONOR" &&
  user.appointments.length > 0
    ? user.appointments[0]
    : null;

   return NextResponse.json(
  {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      role: user.role,
       isActive: user.isActive,

     bloodGroup:
        user.role === "DONOR"
          ? formatBloodGroup(
              donorProfile?.bloodGroup
            )
          : null,

        eligibilityStatus:
        user.role === "DONOR"
          ? donorProfile?.eligibilityStatus ??
            false
          : null,
          
       nextEligibleDate:
        user.role === "DONOR"
          ? getNextEligibleDate(
              donorProfile?.lastDonationDate
            )
          : null,

      donations:
        user.role === "DONOR" ? completedDonations : null,

      livesImpacted:
        user.role === "DONOR" ? completedDonations * 3 : null,

      upcomingAppointment:
        upcomingAppointment
          ? {
              id: upcomingAppointment.id,
              appointmentDate:
                upcomingAppointment.appointmentDate,
              appointmentTime:
                upcomingAppointment.appointmentTime,
              status:
                upcomingAppointment.status,
              notes:
                upcomingAppointment.notes,

              healthInstitute: {
                id:
                  upcomingAppointment
                    .healthInstitute.id,
                name:
                  upcomingAppointment
                    .healthInstitute.name,
                city:
                  upcomingAppointment
                    .healthInstitute.city,
                region:
                  upcomingAppointment
                    .healthInstitute.region,
              },
            }
          : null,
    },
  },
  {
    status: 200,
    headers: {
      "Cache-Control": "private, no-store",
    },
  }
);

  } catch (error) {
    console.error(
      "CURRENT USER API ERROR:",
      error
    );

    return NextResponse.json(
      {
        error: "Invalid or expired session.",
      },
      {
        status: 401,
      }
    );
  }
}