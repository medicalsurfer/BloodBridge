import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getAuthenticatedInstituteAdmin } from "@/src/lib/auth";

// Dashboard summary for the institute admin's own health institute:
// donation activity for the trend chart, inventory for the breakdown bar,
// and a handful of headline counts. Everything is scoped to the admin's
// healthInstituteId so admins only ever see their own institute's data.
export async function GET(request: NextRequest) {
  const authentication = await getAuthenticatedInstituteAdmin(request);

  if (!authentication.user) {
    return NextResponse.json(
      { error: authentication.error },
      { status: authentication.status },
    );
  }

  const healthInstituteId = authentication.user.healthInstituteId;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sixtyDaysAgo = new Date(today);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const [
    recentDonations,
    inventory,
    upcomingAppointmentsCount,
    pendingRewardsCount,
    validatedRewardsCount,
    totalDonationsCount,
    openBloodRequestsCount,
  ] = await Promise.all([
    prisma.donation.findMany({
      where: {
        healthInstituteId,
        donatedAt: { gte: sixtyDaysAgo },
      },
      select: { id: true, donatedAt: true, bloodGroup: true, volumeMl: true },
      orderBy: { donatedAt: "desc" },
      take: 500,
    }),

    prisma.bloodInventory.findMany({
      where: { healthInstituteId },
      select: { bloodGroup: true, units: true },
    }),

    prisma.appointment.count({
      where: {
        healthInstituteId,
        status: { in: ["SCHEDULED", "CONFIRMED"] },
        appointmentDate: { gte: today },
      },
    }),

    prisma.donationReward.count({
      where: { healthInstituteId, status: "PENDING" },
    }),

    prisma.donationReward.count({
      where: { healthInstituteId, status: "VALIDATED" },
    }),

    prisma.donation.count({ where: { healthInstituteId } }),

    prisma.bloodRequest.count({
      where: { healthInstituteId, status: "OPEN" },
    }),
  ]);

  return NextResponse.json(
    {
      recentDonations,
      inventory,
      upcomingAppointmentsCount,
      pendingRewardsCount,
      validatedRewardsCount,
      totalDonationsCount,
      openBloodRequestsCount,
    },
    { status: 200, headers: { "Cache-Control": "private, no-store" } },
  );
}
