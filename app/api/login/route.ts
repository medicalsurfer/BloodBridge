import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { getUserByEmail } from "../../../src/lib/prisma";
import { logAudit } from "../../../src/lib/audit";

const authSecret = process.env.AUTH_SECRET;

if (!authSecret) {
  throw new Error("AUTH_SECRET is not defined in the environment variables.");
}

const secret = new TextEncoder().encode(authSecret);

function isAllowedEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const domain = normalizedEmail.split("@")[1];

  return domain === "gmail.com" || domain === "icloud.com";
}

function getRedirectPath(role: string) {
  const redirectPaths: Record<string, string> = {
    DONOR: "/home",
    MEDICAL_STAFF: "/portal/medical-staff",
    LAB_TECHNICIAN: "/portal/lab-technician",
    HEALTH_INSTITUTE_ADMIN: "/portal/institute-admin",
    SYSTEM_ADMIN: "/system-admin",
  };

  return redirectPaths[role] ?? "/home";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        {
          error: "Email and password are required.",
        },
        {
          status: 400,
        }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    if (!isAllowedEmail(normalizedEmail)) {
      return NextResponse.json(
        {
          error: "Only Gmail and iCloud email addresses are allowed.",
        },
        {
          status: 400,
        }
      );
    }

    const user = await getUserByEmail(normalizedEmail);

    if (!user) {
      return NextResponse.json(
        {
          error: "Invalid email or password.",
        },
        {
          status: 401,
        }
      );
    }

    const isValidPassword = await bcrypt.compare(
      String(password),
      user.passwordHash
    );

    if (!isValidPassword) {
      return NextResponse.json(
        {
          error: "Invalid email or password.",
        },
        {
          status: 401,
        }
      );
    }

    const token = await new SignJWT({
      userId: user.id,
      role: user.role,
    })
      .setProtectedHeader({
        alg: "HS256",
      })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secret);

    const response = NextResponse.json(
      {
        message: "Login successful.",
        redirectTo: getRedirectPath(user.role),
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      },
      {
        status: 200,
      }
    );

    response.cookies.set({
      name: "bloodbridge_session",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    await logAudit({
      actorId: user.id,
      action: "USER_LOGGED_IN",
      targetType: "User",
      targetId: user.id,
    });

    return response;
  } catch (error) {
    console.error("LOGIN API ERROR:", error);

    return NextResponse.json(
      {
        error: "Internal server error.",
      },
      {
        status: 500,
      }
    );
  }
}