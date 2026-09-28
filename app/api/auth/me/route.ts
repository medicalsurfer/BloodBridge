import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "../../../../src/lib/prisma";
import { MIN_DAYS_BETWEEN_DONATIONS } from "../../../../src/lib/eligibility";

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

  // Same interval the eligibility check enforces.
  nextDate.setDate(nextDate.getDate() + MIN_DAYS_BETWEEN_DONATIONS);

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

    // Verified on its own, so only a genuine token problem is reported as an
    // expired session. Anything failing later is a server fault, not the
    // visitor's session, and saying otherwise sends people to log in again
    // for no reason.
    let payload;

    try {
      ({ payload } = await jwtVerify(token, secret));
    } catch {
      return NextResponse.json(
        {
          error: "Invalid or expired session.",
        },
        {
          status: 401,
        }
      );
    }

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
        healthInstitute: { select: { name: true, city: true } },

        appointments: {
          where: {
            status: { in: ["SCHEDULED", "CONFIRMED"] },

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

    // Count Donation records, not completed appointments. The two diverge:
    // a walk-in donation has no appointment, and a completed appointment does
    // not prove blood was collected. The donation record is what institute
    // staff actually sign off, and it is the figure /api/donations, the staff
    // donor directory and the free-consultation entitlement all use — so this
    // must agree with them or the donor and the reception desk see different
    // numbers for the same entitlement.
    const completedDonations =
      user.role === "DONOR"
        ? await prisma.donation.count({ where: { donorId: user.id } })
        : 0;

    /*
      The snapshot beside the assistant, for staff.

      It used to be donor-only, so a lab technician who opened the assistant
      got an empty column where a donor sees their own figures. These are the
      two a technician acts on — what is short, and what is waiting to be
      recorded — and they are only queried for the role that uses them.
    */
    const labSnapshot =
      user.role === "LAB_TECHNICIAN" && user.healthInstituteId
        ? await (async () => {
            const [lowest, awaitingRecord] = await Promise.all([
              prisma.bloodInventory.findFirst({
                where: { healthInstituteId: user.healthInstituteId! },
                orderBy: { units: "asc" },
                select: { bloodGroup: true, units: true },
              }),
              prisma.appointment.count({
                where: {
                  healthInstituteId: user.healthInstituteId!,
                  status: "COMPLETED",
                  donation: { is: null },
                },
              }),
            ]);

            return {
              lowestStock: lowest
                ? { bloodGroup: formatBloodGroup(lowest.bloodGroup), units: lowest.units }
                : null,
              awaitingRecord,
            };
          })()
        : null;

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

      // Staff and admins: who they work for, and what their own screen needs.
      institute: user.healthInstitute
        ? { name: user.healthInstitute.name, city: user.healthInstitute.city }
        : null,

      labSnapshot,

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
        error:
          "We could not load your account just now. Please try again; if it keeps happening, the server log has the details.",
      },
      {
        status: 500,
      }
    );
  }
}