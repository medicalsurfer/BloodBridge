import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getAuthenticatedDonor } from "@/src/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const authentication = await getAuthenticatedDonor(request);

    if (!authentication.user) {
      return NextResponse.json(
        { error: authentication.error },
        { status: authentication.status },
      );
    }

    const institutes = await prisma.healthInstitute.findMany({
      where: {
        status: "ACTIVE",
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        address: true,
        city: true,
        region: true,
      },
    });

    return NextResponse.json(
      { institutes },
      { status: 200 }
    );
  } catch (error) {
    console.error("FETCH ACTIVE INSTITUTES ERROR:", error);

    return NextResponse.json(
      { error: "Unable to fetch donation centres." },
      { status: 500 }
    );
  }
}