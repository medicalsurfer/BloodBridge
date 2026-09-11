import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getAuthenticatedLabTechnician } from "@/src/lib/auth";
import {
  buildRuleBasedRecommendations,
  generateAiSummary,
  type BloodGroup,
} from "@/src/lib/ai-recommendations";

export async function GET(request: NextRequest) {
  const authentication = await getAuthenticatedLabTechnician(request);

  if (!authentication.user) {
    return NextResponse.json(
      { error: authentication.error },
      { status: authentication.status },
    );
  }

  const healthInstituteId = authentication.user.healthInstituteId;

  const [institute, inventory, openRequests, recentDonations] = await Promise.all([
    prisma.healthInstitute.findUnique({
      where: { id: healthInstituteId },
      select: { name: true },
    }),
    prisma.bloodInventory.findMany({
      where: { healthInstituteId },
      select: { bloodGroup: true, units: true },
    }),
    prisma.bloodRequest.findMany({
      where: { healthInstituteId, status: "OPEN" },
      select: { bloodGroup: true, unitsNeeded: true },
    }),
    prisma.donation.findMany({
      where: {
        healthInstituteId,
        donatedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      select: { bloodGroup: true },
    }),
  ]);

  const openDemandByGroup: Partial<Record<BloodGroup, number>> = {};

  for (const request of openRequests) {
    const key = request.bloodGroup as BloodGroup;
    openDemandByGroup[key] = (openDemandByGroup[key] ?? 0) + request.unitsNeeded;
  }

  const recentDonationsByGroup: Partial<Record<BloodGroup, number>> = {};

  for (const donation of recentDonations) {
    const key = donation.bloodGroup as BloodGroup;
    recentDonationsByGroup[key] = (recentDonationsByGroup[key] ?? 0) + 1;
  }

  const recommendations = buildRuleBasedRecommendations({
    inventory: inventory.map((row) => ({ bloodGroup: row.bloodGroup as BloodGroup, units: row.units })),
    openDemandByGroup,
    recentDonationsByGroup,
  });

  const aiSummary = await generateAiSummary(recommendations, institute?.name ?? "your institute");

  return NextResponse.json(
    { recommendations, aiSummary, aiConfigured: Boolean(process.env.AI_API_KEY) },
    { status: 200, headers: { "Cache-Control": "private, no-store" } },
  );
}
