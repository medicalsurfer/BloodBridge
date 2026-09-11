import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../src/lib/prisma";
import { getAuthenticatedLabTechnician } from "../../../../src/lib/auth";

export async function GET(request: NextRequest) {
  const authentication = await getAuthenticatedLabTechnician(request);

  if (!authentication.user) {
    return NextResponse.json({ error: authentication.error }, { status: authentication.status });
  }

  const appointments = await prisma.appointment.findMany({
    where: {
      healthInstituteId: authentication.user.healthInstituteId,
      status: "COMPLETED",
    },
    orderBy: { appointmentDate: "desc" },
    include: {
      donor: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          donorProfile: { select: { bloodGroup: true } },
        },
      },
      donation: { select: { id: true } },
    },
  });

  return NextResponse.json({ appointments });
}
