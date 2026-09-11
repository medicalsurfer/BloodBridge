import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "../../../../../src/lib/prisma";
import { logAudit } from "../../../../../src/lib/audit";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const authSecret = process.env.AUTH_SECRET;

if (!authSecret) {
  throw new Error(
    "AUTH_SECRET is not defined in the environment variables."
  );
}

const secret = new TextEncoder().encode(authSecret);

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const token =
      request.cookies.get("bloodbridge_session")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 }
      );
    }

    const { payload } = await jwtVerify(
      token,
      secret
    );

    const currentUserId = payload.userId;

    if (
      !currentUserId ||
      typeof currentUserId !== "string"
    ) {
      return NextResponse.json(
        { error: "Invalid session." },
        { status: 401 }
      );
    }

    const currentUser =
      await prisma.user.findUnique({
        where: {
          id: currentUserId,
        },
        select: {
          id: true,
          role: true,
          isActive: true,
        },
      });

    if (!currentUser) {
      return NextResponse.json(
        { error: "Current user not found." },
        { status: 404 }
      );
    }

    if (!currentUser.isActive) {
      return NextResponse.json(
        { error: "Your account is inactive." },
        { status: 403 }
      );
    }

    if (currentUser.role !== "SYSTEM_ADMIN") {
      return NextResponse.json(
        {
          error:
            "You are not authorised to manage users.",
        },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    if (id === currentUserId) {
      return NextResponse.json(
        {
          error:
            "You cannot deactivate your own account.",
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    if (typeof body.isActive !== "boolean") {
      return NextResponse.json(
        {
          error:
            "isActive must be a boolean.",
        },
        { status: 400 }
      );
    }

    const existingUser =
      await prisma.user.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
        },
      });

    if (!existingUser) {
      return NextResponse.json(
        {
          error: "User not found.",
        },
        { status: 404 }
      );
    }

    const user = await prisma.user.update({
      where: {
        id,
      },

      data: {
        isActive: body.isActive,
      },

      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    await logAudit({
      actorId: currentUserId,
      action: "USER_UPDATED",
      targetType: "User",
      targetId: user.id,
      metadata: { isActive: user.isActive },
    });

    return NextResponse.json(
      {
        user,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "UPDATE USER API ERROR:",
      error
    );

    return NextResponse.json(
      {
        error: "Unable to update user.",
      },
      {
        status: 500,
      }
    );
  }
}