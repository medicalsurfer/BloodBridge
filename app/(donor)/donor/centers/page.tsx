import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthenticatedUserFromToken } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { PageHeader, PrimaryLink, StatGrid, Stat } from "@/src/components/ui/Page";
import { CentreDirectory, type DirectoryCentre } from "./CentreDirectory";
import { ACTIVE_INSTITUTE } from "@/src/lib/institutes";

export const dynamic = "force-dynamic";

const URGENCY_RANK = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 } as const;

export default async function DonationCentresPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("bloodbridge_session")?.value;

  if (!token) {
    redirect("/login");
  }

  const authentication = await getAuthenticatedUserFromToken(token);

  if (!authentication.user || authentication.user.role !== "DONOR") {
    redirect("/home");
  }

  const donorId = authentication.user.id;

  const [centres, donorProfile, donationCounts] = await Promise.all([
    prisma.healthInstitute.findMany({
      where: ACTIVE_INSTITUTE,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        address: true,
        city: true,
        region: true,
        bloodRequests: {
          where: { status: "OPEN" },
          select: { bloodGroup: true, urgency: true },
        },
      },
    }),
    prisma.donorProfile.findUnique({
      where: { userId: donorId },
      select: { bloodGroup: true, city: true },
    }),
    prisma.donation.groupBy({
      by: ["healthInstituteId"],
      where: { donorId },
      _count: { _all: true },
    }),
  ]);

  const donatedAt = new Map(
    donationCounts.map((row) => [row.healthInstituteId, row._count._all]),
  );
  const bloodGroup = donorProfile?.bloodGroup ?? null;

  const directory: DirectoryCentre[] = centres.map((centre) => {
    const topUrgency = centre.bloodRequests.reduce<keyof typeof URGENCY_RANK | null>(
      (top, request) =>
        !top || URGENCY_RANK[request.urgency] > URGENCY_RANK[top] ? request.urgency : top,
      null,
    );

    return {
      id: centre.id,
      name: centre.name,
      email: centre.email,
      phoneNumber: centre.phoneNumber,
      address: centre.address,
      city: centre.city,
      region: centre.region,
      openRequests: centre.bloodRequests.length,
      needsMyType: bloodGroup
        ? centre.bloodRequests.some((request) => request.bloodGroup === bloodGroup)
        : false,
      topUrgency,
      myDonations: donatedAt.get(centre.id) ?? 0,
    };
  });

  const cities = new Set(directory.map((centre) => centre.city)).size;
  const withRequests = directory.filter((centre) => centre.openRequests > 0).length;
  const needingMyType = directory.filter((centre) => centre.needsMyType).length;
  const visited = directory.filter((centre) => centre.myDonations > 0).length;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Donation centres"
        title="Where you can donate"
        description="Every participating institution accepting donations right now. Centres that currently need your blood type are marked, so you can go where you help most."
        actions={<PrimaryLink href="/appointments/book">Book donation</PrimaryLink>}
      />

      <div className="mt-7 mb-8">
        <StatGrid>
          <Stat
            label="Active centres"
            value={String(directory.length)}
            foot={`Across ${cities} ${cities === 1 ? "city" : "cities"}`}
          />
          <Stat
            label="Need blood now"
            value={String(withRequests)}
            foot="With open requests"
            tone={withRequests > 0 ? "warn" : "default"}
          />
          <Stat
            label="Need your type"
            value={bloodGroup ? String(needingMyType) : "–"}
            foot={bloodGroup ? "Requesting your blood group" : "Add your blood group to profile"}
            tone={needingMyType > 0 ? "good" : "default"}
          />
          <Stat
            label="Visited"
            value={String(visited)}
            foot="Centres you've donated at"
          />
        </StatGrid>
      </div>

      <CentreDirectory
        centres={directory}
        hasBloodGroup={Boolean(bloodGroup)}
        homeCity={donorProfile?.city ?? null}
      />
    </div>
  );
}
