import { NextRequest, NextResponse } from "next/server";
import { clientIp, LIMITS, rateLimit } from "@/src/lib/rate-limit";

import bcrypt from "bcryptjs";

import { createUser, getUserByEmail } from "../../../src/lib/prisma";
import { logAudit } from "../../../src/lib/audit";

function isAllowedEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const domain = normalizedEmail.split("@")[1];

  return domain === "gmail.com" || domain === "icloud.com";
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(`register:${clientIp(request)}`, LIMITS.register.limit, LIMITS.register.windowMs);
  if (limited) return limited;

  const body = await request.json().catch(() => ({}));

  const { firstName, lastName, email, password, phone } = body;

  if (!firstName || !lastName || !email || !password) {
    return NextResponse.json(
      { error: "Missing required fields." },
      { status: 400 }
    );
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  if (!isAllowedEmail(normalizedEmail)) {
    return NextResponse.json(
      {
        error: "Only Gmail and iCloud email addresses are allowed.",
      },
      { status: 400 }
    );
  }

  const existingUser = await getUserByEmail(normalizedEmail);

  if (existingUser) {
    return NextResponse.json(
      { error: "Email is already registered." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await createUser({
    firstName: String(firstName).trim(),
    lastName: String(lastName).trim(),
    email: normalizedEmail,
    passwordHash,
    phoneNumber: phone ? String(phone).trim() : null,
  });

  await logAudit({
    actorId: user.id,
    action: "USER_REGISTERED",
    targetType: "User",
    targetId: user.id,
    metadata: { email: user.email },
  });

  return NextResponse.json(
    {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
    },
    { status: 201 }
  );
}