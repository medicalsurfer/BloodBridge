import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../src/lib/prisma";
import { getAuthenticatedMedicalStaff } from "../../../../src/lib/auth";
import { compatibleDonorGroups, isBloodGroup, type BloodGroupValue } from "../../../../src/lib/blood-compatibility";
import { text } from "../../../../src/lib/input";

export async function GET(request: NextRequest) {
  const authentication = await getAuthenticatedMedicalStaff(request);

  if (!authentication.user) {
    return NextResponse.json({ error: authentication.error }, { status: authentication.status });
  }

  const params = new URL(request.url).searchParams;
  const search = text(params.get("search"), 100);
  const bloodGroup = params.get("bloodGroup");
  // Recipient group: return donors whose blood that patient can receive (FR-23).
  const compatibleWith = params.get("compatibleWith");
  const eligibleOnly = params.get("eligibleOnly") === "1";

  let groups: BloodGroupValue[] | null = null;

  if (compatibleWith) {
    if (!isBloodGroup(compatibleWith)) {
      return NextResponse.json({ error: "Unknown blood group." }, { status: 400 });
    }
    groups = compatibleDonorGroups(compatibleWith);
  } else if (bloodGroup) {
    if (!isBloodGroup(bloodGroup)) {
      return NextResponse.json({ error: "Unknown blood group." }, { status: 400 });
    }
    groups = [bloodGroup];
  }

  const donors = await prisma.user.findMany({
    where: {
      role: "DONOR",
      isActive: true,
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(groups || eligibleOnly
        ? {
            donorProfile: {
              is: {
                ...(groups ? { bloodGroup: { in: groups } } : {}),
                ...(eligibleOnly ? { eligibilityStatus: true } : {}),
              },
            },
          }
        : {}),
    },
    orderBy: [{ donorProfile: { eligibilityStatus: "desc" } }, { createdAt: "desc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phoneNumber: true,
      donorProfile: {
        select: {
          bloodGroup: true,
          city: true,
          lastDonationDate: true,
          eligibilityStatus: true,
        },
      },
      // Staff need the completed-donation count to honour the platform's
      // free-consultation entitlement (one per three donations).
      _count: { select: { donations: true } },
    },
    take: 200,
  });

  return NextResponse.json({
    donors: donors.map(({ _count, ...donor }) => ({
      ...donor,
      donationsCount: _count.donations,
    })),
  });
}
