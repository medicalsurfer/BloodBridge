import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { jwtVerify } from "jose";
import { prisma } from "../../../../src/lib/prisma";
import { sendInstituteAdminInvitationEmail } from "../../../../src/lib/mail";
import { logAudit } from "../../../../src/lib/audit";

const authSecret = process.env.AUTH_SECRET;

if (!authSecret) {
  throw new Error(
    "AUTH_SECRET is not defined in the environment variables."
  );
}

const secret = new TextEncoder().encode(authSecret);

async function getSystemAdmin(request: NextRequest) {
  const token = request.cookies.get("bloodbridge_session")?.value;

  if (!token) {
    return null;
  }

  const { payload } = await jwtVerify(token, secret);
  const userId = payload.userId;

  if (!userId || typeof userId !== "string") {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isActive: true },
  });

  return user?.role === "SYSTEM_ADMIN" && user.isActive ? user : null;
}

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

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getSystemAdmin(request);

    if (!currentUser) {
      return NextResponse.json(
        { error: "Only system administrators can invite institute admins." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const firstName = String(body.firstName ?? "").trim();
    const lastName = String(body.lastName ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const healthInstituteId = String(body.healthInstituteId ?? "").trim();

    if (
      !firstName ||
      !lastName ||
      !email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !healthInstituteId
    ) {
      return NextResponse.json(
        { error: "First name, last name, email, and health institute are required." },
        { status: 400 },
      );
    }

    const healthInstitute = await prisma.healthInstitute.findUnique({
      where: { id: healthInstituteId },
      select: { id: true, name: true, isActive: true },
    });

    if (!healthInstitute || !healthInstitute.isActive) {
      return NextResponse.json(
        { error: "Select an active health institute." },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { role: true, isActive: true },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          error: `That email address is already registered as ${existingUser.role.toLowerCase().replaceAll("_", " ")}.`,
        },
        { status: 409 },
      );
    }

    const temporaryPassword = randomBytes(9).toString("base64url");
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        passwordHash: await bcrypt.hash(temporaryPassword, 12),
        role: "HEALTH_INSTITUTE_ADMIN",
        isActive: true,
        healthInstituteId,
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

    try {
      await sendInstituteAdminInvitationEmail({
        recipient: user.email,
        firstName: user.firstName,
        temporaryPassword,
        instituteName: healthInstitute.name,
      });
    } catch (emailError) {
      await prisma.user.delete({ where: { id: user.id } });
      throw emailError;
    }

    await logAudit({
      actorId: currentUser.id,
      action: "USER_CREATED",
      targetType: "User",
      targetId: user.id,
      metadata: { role: "HEALTH_INSTITUTE_ADMIN", healthInstituteId },
    });

    return NextResponse.json({ user, emailSent: true }, { status: 201 });
  } catch (error) {
    console.error("INVITE INSTITUTE ADMIN API ERROR:", error);

    const errorMessage =
      error instanceof Error &&
      (error.message.startsWith("Email delivery is not configured") ||
        error.message.startsWith("Gmail rejected the SMTP credentials"))
        ? error.message
        : "Unable to send the institute administrator invitation.";

    return NextResponse.json({ error: errorMessage }, { status: 503 });
  }
}