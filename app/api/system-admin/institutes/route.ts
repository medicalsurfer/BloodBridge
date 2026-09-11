import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../src/lib/prisma";
import { getAuthenticatedUser } from "../../../../src/lib/auth";
import { logAudit } from "../../../../src/lib/audit";

async function requireSystemAdmin(request: NextRequest) {
  const authentication = await getAuthenticatedUser(request);

  if (
    !authentication.user ||
    authentication.user.role !== "SYSTEM_ADMIN"
  ) {
    return null;
  }

  return authentication.user;
}

export async function GET(request: NextRequest) {
  const admin = await requireSystemAdmin(request);

  if (!admin) {
    return NextResponse.json(
      { error: "Only system administrators can view health institutes." },
      { status: 403 },
    );
  }

  try {
    const institutes = await prisma.healthInstitute.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(
      {
        institutes,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("HEALTH INSTITUTE FETCH ERROR:", error);

    return NextResponse.json(
      {
        error: "Unable to fetch health institutes.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(request: NextRequest) {
  const admin = await requireSystemAdmin(request);

  if (!admin) {
    return NextResponse.json(
      { error: "Only system administrators can create health institutes." },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const city =
      typeof body.city === "string"
        ? body.city.trim()
        : "";

    if (!name || !city) {
      return NextResponse.json(
        {
          error: "Institute name and city are required.",
        },
        {
          status: 400,
        },
      );
    }

    const email =
      typeof body.email === "string" && body.email.trim()
        ? body.email.trim().toLowerCase()
        : null;

    const phoneNumber =
      typeof body.phoneNumber === "string" && body.phoneNumber.trim()
        ? body.phoneNumber.trim()
        : null;

    const address =
      typeof body.address === "string" && body.address.trim()
        ? body.address.trim()
        : null;

    const region =
      typeof body.region === "string" && body.region.trim()
        ? body.region.trim()
        : null;

    const institute = await prisma.healthInstitute.create({
      data: {
        name,
        city,
        email,
        phoneNumber,
        address,
        region,
        status: "ACTIVE",
        isActive: true,
      },
    });

    await logAudit({
      actorId: admin.id,
      action: "INSTITUTE_CREATED",
      targetType: "HealthInstitute",
      targetId: institute.id,
      metadata: { name: institute.name, city: institute.city },
    });

    return NextResponse.json(
      {
        message: "Health institute created successfully.",
        institute,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error("HEALTH INSTITUTE CREATE ERROR:", error);

    return NextResponse.json(
      {
        error: "Unable to create health institute.",
      },
      {
        status: 500,
      },
    );
  }
}