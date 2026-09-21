import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getAuthenticatedInstituteAdmin } from "@/src/lib/auth";
import { notifyUser } from "@/src/lib/notifications";
import { logAudit } from "@/src/lib/audit";
import { id as isValidId } from "@/src/lib/input";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const authentication = await getAuthenticatedInstituteAdmin(request);

  if (!authentication.user) {
    return NextResponse.json(
      { error: authentication.error },
      { status: authentication.status },
    );
  }

  try {
    const { id: rawId } = await context.params;
    const id = isValidId(rawId);

    if (!id) {
      return NextResponse.json({ error: "Invalid identifier." }, { status: 400 });
    }
    const body = await request.json();
    const decision = body.status as "VALIDATED" | "REJECTED";

    if (decision !== "VALIDATED" && decision !== "REJECTED") {
      return NextResponse.json(
        { error: "A decision of VALIDATED or REJECTED is required." },
        { status: 400 },
      );
    }

    const reward = await prisma.donationReward.findFirst({
      where: { id, healthInstituteId: authentication.user.healthInstituteId },
    });

    if (!reward) {
      return NextResponse.json({ error: "Reward not found." }, { status: 404 });
    }

    if (reward.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only pending rewards can be validated or rejected." },
        { status: 400 },
      );
    }

    const updated = await prisma.donationReward.update({
      where: { id: reward.id },
      data: {
        status: decision,
        validatedById: authentication.user.id,
        validatedAt: new Date(),
      },
    });

    await logAudit({
      actorId: authentication.user.id,
      action: decision === "VALIDATED" ? "REWARD_VALIDATED" : "REWARD_REJECTED",
      targetType: "DonationReward",
      targetId: updated.id,
      metadata: { donorId: updated.donorId, points: updated.points },
    });

    await notifyUser({
      userId: updated.donorId,
      type: "REWARD",
      title: decision === "VALIDATED" ? "Reward validated" : "Reward not approved",
      message:
        decision === "VALIDATED"
          ? `Your ${updated.points} reward points have been validated by the institute.`
          : `Your reward for a recent donation could not be validated. Contact the institute for details.`,
      link: "/rewards",
    });

    return NextResponse.json({ reward: updated });
  } catch (error) {
    console.error("VALIDATE REWARD ERROR:", error);
    return NextResponse.json(
      { error: "Unable to update reward." },
      { status: 500 },
    );
  }
}
