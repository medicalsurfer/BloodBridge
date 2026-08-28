import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "../../../../src/lib/prisma";

const authSecret = process.env.AUTH_SECRET;

if (!authSecret) {
  throw new Error(
    "AUTH_SECRET is not defined in the environment variables."
  );
}

const secret = new TextEncoder().encode(authSecret);

export async function GET(request: NextRequest) {
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

    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: "desc",
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

    return NextResponse.json(
      {
        users,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "LOAD USERS API ERROR:",
      error
    );

    return NextResponse.json(
      {
        error: "Unable to load platform users.",
      },
      {
        status: 500,
      }
    );
  }
}