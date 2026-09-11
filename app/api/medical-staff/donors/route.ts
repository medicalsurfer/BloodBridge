import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../src/lib/prisma";
import { getAuthenticatedMedicalStaff } from "../../../../src/lib/auth";

export async function GET(request: NextRequest) {
  const authentication = await getAuthenticatedMedicalStaff(request);

  if (!authentication.user) {
    return NextResponse.json({ error: authentication.error }, { status: authentication.status });
  }

  const search = new URL(request.url).searchParams.get("search")?.trim() ?? "";
  const bloodGroupFilter = new URL(request.url).searchParams.get("bloodGroup");

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
      ...(bloodGroupFilter ? { donorProfile: { bloodGroup: bloodGroupFilter as never } } : {}),
    },
    orderBy: { createdAt: "desc" },
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
    },
    take: 200,
  });

  return NextResponse.json({ donors });
}
