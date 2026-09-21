import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../src/lib/prisma";
import { getAuthenticatedUser } from "../../../../../src/lib/auth";
import { logAudit } from "../../../../../src/lib/audit";
import { id as isValidId } from "@/src/lib/input";

export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  const authentication = await getAuthenticatedUser(request);

  if (
    !authentication.user ||
    authentication.user.role !== "SYSTEM_ADMIN"
  ) {
    return NextResponse.json(
      {
        error: "Only system administrators can update institute status.",
      },
      {
        status: 403,
      }
    );
  }

  try {
    const { id: rawId } = await context.params;
    const id = isValidId(rawId);

    if (!id) {
      return NextResponse.json({ error: "Invalid identifier." }, { status: 400 });
    }
    const body = await request.json();

    if (typeof body.isActive !== "boolean") {
      return NextResponse.json(
        {
          error: "isActive must be true or false.",
        },
        {
          status: 400,
        }
      );
    }

    const institute = await prisma.healthInstitute.update({
      where: {
        id,
      },
      data: {
        isActive: body.isActive,
        status: body.isActive ? "ACTIVE" : "INACTIVE",
      },
    });

    await logAudit({
      actorId: authentication.user.id,
      action: "INSTITUTE_STATUS_CHANGED",
      targetType: "HealthInstitute",
      targetId: institute.id,
      metadata: { isActive: institute.isActive, status: institute.status },
    });

    return NextResponse.json({
      message: body.isActive
        ? "Institute activated successfully."
        : "Institute deactivated successfully.",
      institute,
    });
  } catch (error) {
    console.error("INSTITUTE STATUS UPDATE ERROR:", error);

    return NextResponse.json(
      {
        error: "Unable to update institute status.",
      },
      {
        status: 500,
      }
    );
  }
}