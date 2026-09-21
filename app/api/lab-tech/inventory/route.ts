import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../src/lib/prisma";
import { getAuthenticatedLabTechnician } from "../../../../src/lib/auth";
import { logAudit } from "../../../../src/lib/audit";

const bloodGroups = [
  "A_POSITIVE",
  "A_NEGATIVE",
  "B_POSITIVE",
  "B_NEGATIVE",
  "AB_POSITIVE",
  "AB_NEGATIVE",
  "O_POSITIVE",
  "O_NEGATIVE",
] as const;

export async function GET(request: NextRequest) {
  const authentication = await getAuthenticatedLabTechnician(request);

  if (!authentication.user) {
    return NextResponse.json({ error: authentication.error }, { status: authentication.status });
  }

  const rows = await prisma.bloodInventory.findMany({
    where: { healthInstituteId: authentication.user.healthInstituteId },
  });

  const inventory = bloodGroups.map((bloodGroup) => {
    const existing = rows.find((row) => row.bloodGroup === bloodGroup);
    return {
      bloodGroup,
      units: existing?.units ?? 0,
      updatedAt: existing?.updatedAt ?? null,
    };
  });

  return NextResponse.json({ inventory });
}

export async function PATCH(request: NextRequest) {
  const authentication = await getAuthenticatedLabTechnician(request);

  if (!authentication.user) {
    return NextResponse.json({ error: authentication.error }, { status: authentication.status });
  }

  const body = await request.json().catch(() => ({}));
  const bloodGroup = body.bloodGroup as (typeof bloodGroups)[number];
  const delta = Number(body.delta);

  if (!bloodGroups.includes(bloodGroup)) {
    return NextResponse.json({ error: "A valid blood group is required." }, { status: 400 });
  }

  if (!Number.isInteger(delta) || delta === 0) {
    return NextResponse.json({ error: "Delta must be a non-zero whole number." }, { status: 400 });
  }

  const existing = await prisma.bloodInventory.findUnique({
    where: {
      healthInstituteId_bloodGroup: {
        healthInstituteId: authentication.user.healthInstituteId,
        bloodGroup,
      },
    },
  });

  if (delta < 0 && (existing?.units ?? 0) + delta < 0) {
    return NextResponse.json({ error: "Not enough units in stock to remove that many." }, { status: 400 });
  }

  const updated = await prisma.bloodInventory.upsert({
    where: {
      healthInstituteId_bloodGroup: {
        healthInstituteId: authentication.user.healthInstituteId,
        bloodGroup,
      },
    },
    create: {
      healthInstituteId: authentication.user.healthInstituteId,
      bloodGroup,
      units: Math.max(0, delta),
    },
    update: {
      units: { increment: delta },
    },
  });

  await logAudit({
    actorId: authentication.user.id,
    action: "INVENTORY_ADJUSTED",
    targetType: "BloodInventory",
    targetId: updated.id,
    metadata: { bloodGroup, delta, units: updated.units },
  });

  return NextResponse.json({ inventory: updated });
}
