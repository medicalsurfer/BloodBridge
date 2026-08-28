import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../src/lib/prisma";
import { getAuthenticatedDonor } from "../../../src/lib/auth";

export async function getUserProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      donorProfile: true,
    },
  });
}

export async function upsertDonorProfile(
  userId: string,
  data: {
    dateOfBirth?: Date | null;
    gender?: "MALE" | "FEMALE" | null;
    bloodGroup?:
      | "A_POSITIVE"
      | "A_NEGATIVE"
      | "B_POSITIVE"
      | "B_NEGATIVE"
      | "AB_POSITIVE"
      | "AB_NEGATIVE"
      | "O_POSITIVE"
      | "O_NEGATIVE"
      | null;
    address?: string | null;
    city?: string | null;
    lastDonationDate?: Date | null;
  }
) {
  return prisma.donorProfile.upsert({
    where: {
      userId,
    },
    update: data,
    create: {
      userId,
      ...data,
    },
  });
}

function normalizeDate(value: unknown) {
  if (!value || typeof value !== "string") {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

export async function GET(request: NextRequest) {
  const authentication = await getAuthenticatedDonor(request);

  if (!authentication.user) {
    return NextResponse.json(
      { error: authentication.error },
      { status: authentication.status },
    );
  }

  try {
    const user = await getUserProfile(authentication.user.id);

    if (!user) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    if (!user.isActive || user.role !== "DONOR") {
      return NextResponse.json(
        { error: "This account is not authorized to access donor profile data." },
        { status: 403 },
      );
    }

    return NextResponse.json(
      {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        donorProfile: user.donorProfile,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("PROFILE GET ERROR:", error);

    return NextResponse.json(
      { error: "Invalid or expired session." },
      { status: 401 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const authentication = await getAuthenticatedDonor(request);

  if (!authentication.user) {
    return NextResponse.json(
      { error: authentication.error },
      { status: authentication.status },
    );
  }

  try {
    const body = await request.json();

    const currentUser = await prisma.user.findUnique({
      where: { id: authentication.user.id },
      select: { isActive: true, role: true },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (!currentUser.isActive || currentUser.role !== "DONOR") {
      return NextResponse.json(
        { error: "This account is not authorized to update donor profile data." },
        { status: 403 },
      );
    }

    const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
    const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
    const phoneNumber = typeof body.phoneNumber === "string" ? body.phoneNumber.trim() : "";

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: "First name and last name are required." },
        { status: 400 }
      );
    }

    const donorProfileData: {
      dateOfBirth: Date | null;
      gender: "MALE" | "FEMALE" | null;
      bloodGroup:
        | "A_POSITIVE"
        | "A_NEGATIVE"
        | "B_POSITIVE"
        | "B_NEGATIVE"
        | "AB_POSITIVE"
        | "AB_NEGATIVE"
        | "O_POSITIVE"
        | "O_NEGATIVE"
        | null;
      address: string | null;
      city: string | null;
      lastDonationDate: Date | null;
    } = {
      dateOfBirth: normalizeDate(body.dateOfBirth),
      gender:
        body.gender === "MALE" || body.gender === "FEMALE"
          ? body.gender
          : null,
      bloodGroup:
        [
          "A_POSITIVE",
          "A_NEGATIVE",
          "B_POSITIVE",
          "B_NEGATIVE",
          "AB_POSITIVE",
          "AB_NEGATIVE",
          "O_POSITIVE",
          "O_NEGATIVE",
        ].includes(body.bloodGroup)
          ? body.bloodGroup
          : null,
      address:
        typeof body.address === "string" && body.address.trim().length > 0
          ? body.address.trim()
          : null,
      city:
        typeof body.city === "string" && body.city.trim().length > 0
          ? body.city.trim()
          : null,
      lastDonationDate: normalizeDate(body.lastDonationDate),
    };

    const updatedUser = await prisma.user.update({
      where: { id: authentication.user.id },
      data: {
        firstName,
        lastName,
        phoneNumber: phoneNumber || null,
      },
    });

    await upsertDonorProfile(authentication.user.id, donorProfileData);

    return NextResponse.json(
      {
        message: "Profile updated successfully.",
        user: {
          id: updatedUser.id,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          email: updatedUser.email,
          phoneNumber: updatedUser.phoneNumber,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("PROFILE PUT ERROR:", error);

    return NextResponse.json(
      { error: "Unable to update profile." },
      { status: 500 }
    );
  }
}