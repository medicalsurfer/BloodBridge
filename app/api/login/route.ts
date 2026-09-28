import { NextRequest, NextResponse } from "next/server";
import { clientIp, LIMITS, rateLimit } from "@/src/lib/rate-limit";
import bcrypt from "bcryptjs";
import { getUserByEmail } from "../../../src/lib/prisma";
import { logAudit } from "../../../src/lib/audit";
// Shared with Google sign-in, so both doors issue the same session.
import {
  createSessionToken,
  getRedirectPath,
  setSessionCookie,
} from "../../../src/lib/session";

function isAllowedEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const domain = normalizedEmail.split("@")[1];

  return domain === "gmail.com" || domain === "icloud.com";
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

    const limited =
      rateLimit(`login:ip:${clientIp(request)}`, LIMITS.login.limit * 3, LIMITS.login.windowMs) ??
      rateLimit(`login:email:${normalizedEmail}`, LIMITS.login.limit, LIMITS.login.windowMs);
    if (limited) return limited;

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

    const token = await createSessionToken(user);

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

    setSessionCookie(response, token);

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