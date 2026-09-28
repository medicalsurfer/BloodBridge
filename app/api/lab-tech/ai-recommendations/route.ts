import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedLabTechnician } from "@/src/lib/auth";
import { generateAiSummary } from "@/src/lib/ai-recommendations";
import { label } from "@/src/lib/donor-matching";
import { gatherLabInsights } from "@/src/lib/lab-insights";
import { groupsNeedingAction } from "@/src/lib/shortage-forecast";

/*
  The laboratory's decision-support payload, for anything that wants it over
  HTTP. The screen itself renders the same data on the server (see
  app/portal/lab-technician/ai-recommendations/page.tsx); both go through
  gatherLabInsights, so there is one set of queries and one set of rules.
*/
export async function GET(request: NextRequest) {
  const authentication = await getAuthenticatedLabTechnician(request);

  if (!authentication.user) {
    return NextResponse.json(
      { error: authentication.error },
      { status: authentication.status },
    );
  }

  const insights = await gatherLabInsights({
    healthInstituteId: authentication.user.healthInstituteId,
    matchFor: request.nextUrl.searchParams.get("matchFor"),
  });

  // The model is given the sentences the forecast already produced, so it is
  // rephrasing arithmetic rather than being asked to predict anything.
  const aiSummary = await generateAiSummary(
    insights.recommendations,
    insights.instituteName ?? "your institute",
    groupsNeedingAction(insights.forecast).map(
      (group) => `${label(group.bloodGroup)}: ${group.message}`,
    ),
  );

  return NextResponse.json(
    {
      ...insights,
      aiSummary,
      aiConfigured: Boolean(process.env.AI_API_KEY || process.env.AI_BASE_URL),
    },
    { status: 200, headers: { "Cache-Control": "private, no-store" } },
  );
}
