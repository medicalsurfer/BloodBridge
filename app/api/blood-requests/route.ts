import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../src/lib/prisma";
import { getAuthenticatedDonor } from "../../../src/lib/auth";

export async function GET(request: NextRequest) {
  const authentication = await getAuthenticatedDonor(request);

  if (!authentication.user) {
    return NextResponse.json({ error: authentication.error }, { status: authentication.status });
  }

  const requests = await prisma.bloodRequest.findMany({
    where: { status: "OPEN" },
    orderBy: [{ urgency: "desc" }, { createdAt: "desc" }],
    include: {
      healthInstitute: {
        select: { id: true, name: true, city: true, region: true, address: true },
      },
    },
  });

  return NextResponse.json({ requests });
}
