import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../src/lib/prisma";

export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const { id } = await context.params;
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