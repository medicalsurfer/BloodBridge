import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getAuthenticatedDonor } from "@/src/lib/auth";

export async function GET(request: NextRequest) {
  const authentication = await getAuthenticatedDonor(request);

  if (!authentication.user) {
    return NextResponse.json(
      { error: authentication.error },
      { status: authentication.status },
    );
  }

  const rewards = await prisma.donationReward.findMany({
    where: { donorId: authentication.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      healthInstitute: { select: { name: true, city: true } },
      donation: { select: { donatedAt: true, bloodGroup: true } },
    },
  });

  const totals = rewards.reduce(
    (acc, reward) => {
      if (reward.status === "VALIDATED") acc.validatedPoints += reward.points;
      if (reward.status === "PENDING") acc.pendingPoints += reward.points;
      return acc;
    },
    { validatedPoints: 0, pendingPoints: 0 },
  );

  return NextResponse.json(
    { rewards, ...totals },
    { status: 200, headers: { "Cache-Control": "private, no-store" } },
  );
}
