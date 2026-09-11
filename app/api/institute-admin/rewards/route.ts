import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getAuthenticatedInstituteAdmin } from "@/src/lib/auth";

export async function GET(request: NextRequest) {
  const authentication = await getAuthenticatedInstituteAdmin(request);

  if (!authentication.user) {
    return NextResponse.json(
      { error: authentication.error },
      { status: authentication.status },
    );
  }

  const statusFilter = new URL(request.url).searchParams.get("status");
  const status =
    statusFilter === "PENDING" || statusFilter === "VALIDATED" || statusFilter === "REJECTED"
      ? statusFilter
      : undefined;

  const rewards = await prisma.donationReward.findMany({
    where: {
      healthInstituteId: authentication.user.healthInstituteId,
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      donor: { select: { firstName: true, lastName: true, email: true } },
      donation: { select: { donatedAt: true, bloodGroup: true, volumeMl: true } },
      validatedBy: { select: { firstName: true, lastName: true } },
    },
  });

  return NextResponse.json({ rewards });
}
