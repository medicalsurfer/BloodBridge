import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../src/lib/prisma";
import { getAuthenticatedDonor } from "../../../src/lib/auth";
import { canDonateTo } from "../../../src/lib/blood-compatibility";
import { AT_ACTIVE_INSTITUTE } from "../../../src/lib/institutes";

export async function GET(request: NextRequest) {
  const authentication = await getAuthenticatedDonor(request);

  if (!authentication.user) {
    return NextResponse.json({ error: authentication.error }, { status: authentication.status });
  }

  const [requests, profile] = await Promise.all([
    prisma.bloodRequest.findMany({
    where: { status: "OPEN", ...AT_ACTIVE_INSTITUTE },
    orderBy: [{ urgency: "desc" }, { createdAt: "desc" }],
    include: {
      healthInstitute: {
        select: { id: true, name: true, city: true, region: true, address: true },
      },
    },
    }),
    prisma.donorProfile.findUnique({
      where: { userId: authentication.user.id },
      select: { bloodGroup: true },
    }),
  ]);

  const donorBloodGroup = profile?.bloodGroup ?? null;

  // FR-15: flag the requests this donor's blood can help with, and list those first.
  const annotated = requests
    .map((bloodRequest) => ({
      ...bloodRequest,
      canDonate: donorBloodGroup ? canDonateTo(donorBloodGroup, bloodRequest.bloodGroup) : null,
    }))
    .sort((a, b) => Number(b.canDonate === true) - Number(a.canDonate === true));

  return NextResponse.json({ requests: annotated, donorBloodGroup });
}
