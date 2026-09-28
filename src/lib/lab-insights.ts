import { prisma } from "./prisma";
import {
  buildRuleBasedRecommendations,
  type BloodGroup,
  type BloodGroupRecommendation,
} from "./ai-recommendations";
import { compatibleDonorGroups, isBloodGroup, type BloodGroupValue } from "./blood-compatibility";
import {
  DEFAULT_MATCH_LIMIT,
  matchDonors,
  type DonorCandidate,
  type MatchedDonor,
} from "./donor-matching";
import {
  FORECAST_HORIZON_DAYS,
  HISTORY_WINDOW_DAYS,
  WIDER_WINDOW_DAYS,
  buildShortageForecast,
  groupsNeedingAction,
  shortfallDate,
  type GroupForecast,
} from "./shortage-forecast";

/*
  Everything the laboratory's decision-support screen is built from, gathered
  once.

  It lives here rather than in the route handler because two callers need it:
  the page renders it on the server, and /api/lab-tech/ai-recommendations
  serves the same payload to anything else that asks. Two copies of these
  queries would drift, and only one would get corrected.

  The AI summary is deliberately NOT part of this. It is a network call to the
  model with a long timeout, and a page that waited for it would show nothing
  at all until the model answered. The figures are computed here; the wording
  is fetched separately and can arrive late, or never.
*/

export type LabInsights = {
  instituteName: string | null;
  instituteCity: string | null;
  forecast: (GroupForecast & { shortfallDate: string | null })[];
  /** The group donor matching ran for, or null when nothing needs attention. */
  matchFor: BloodGroupValue | null;
  matches: MatchedDonor[];
  recommendations: BloodGroupRecommendation[];
  windowDays: number;
  horizonDays: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Midnight today — appointments from here on are still ahead of us. */
function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

/** Donors who could cover `needed`, with what ranking them requires. */
async function loadDonorCandidates(
  needed: BloodGroupValue,
  healthInstituteId: string,
): Promise<DonorCandidate[]> {
  const donors = await prisma.user.findMany({
    where: {
      role: "DONOR",
      isActive: true,
      donorProfile: { is: { bloodGroup: { in: compatibleDonorGroups(needed) } } },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phoneNumber: true,
      donorProfile: { select: { bloodGroup: true, city: true, lastDonationDate: true } },
      donations: {
        where: { healthInstituteId },
        select: { donatedAt: true },
        orderBy: { donatedAt: "desc" },
      },
      appointments: {
        where: {
          status: { in: ["SCHEDULED", "CONFIRMED"] },
          appointmentDate: { gte: startOfToday() },
        },
        select: { id: true },
        take: 1,
      },
    },
    // A ceiling, so a large donor base cannot turn this screen into a slow query.
    take: 400,
  });

  return donors.flatMap((donor) => {
    const bloodGroup = donor.donorProfile?.bloodGroup;
    if (!bloodGroup || !isBloodGroup(bloodGroup)) return [];

    // The profile's own date and the recorded donations can disagree; the
    // later of the two is what the 56-day interval must be measured from.
    const recorded = donor.donations[0]?.donatedAt ?? null;
    const reported = donor.donorProfile?.lastDonationDate ?? null;
    const lastDonationDate =
      recorded && reported ? (recorded > reported ? recorded : reported) : (recorded ?? reported);

    return [
      {
        id: donor.id,
        firstName: donor.firstName,
        lastName: donor.lastName,
        email: donor.email,
        phoneNumber: donor.phoneNumber,
        city: donor.donorProfile?.city ?? null,
        bloodGroup,
        lastDonationDate,
        donationsHere: donor.donations.length,
        hasUpcomingAppointment: donor.appointments.length > 0,
      },
    ];
  });
}

export async function gatherLabInsights({
  healthInstituteId,
  matchFor,
}: {
  healthInstituteId: string;
  /** A group to match donors for; defaults to whichever is most at risk. */
  matchFor?: string | null;
}): Promise<LabInsights> {
  const now = Date.now();
  /*
    Fetch over the widest window the forecast might use, not the narrowest:
    buildShortageForecast widens per group when the recent window is empty,
    and it can only widen into rows it was given.
  */
  const widestWindowDays = Math.max(HISTORY_WINDOW_DAYS, ...WIDER_WINDOW_DAYS);
  const windowStart = new Date(now - widestWindowDays * DAY_MS);
  const horizonEnd = new Date(now + FORECAST_HORIZON_DAYS * DAY_MS);

  const [institute, inventory, openRequests, requestHistory, donationHistory, scheduled] =
    await Promise.all([
      prisma.healthInstitute.findUnique({
        where: { id: healthInstituteId },
        select: { name: true, city: true },
      }),
      prisma.bloodInventory.findMany({
        where: { healthInstituteId },
        select: { bloodGroup: true, units: true },
      }),
      prisma.bloodRequest.findMany({
        where: { healthInstituteId, status: "OPEN" },
        select: { bloodGroup: true, unitsNeeded: true },
      }),
      prisma.bloodRequest.findMany({
        where: { healthInstituteId, createdAt: { gte: windowStart } },
        select: { bloodGroup: true, unitsNeeded: true, createdAt: true },
      }),
      prisma.donation.findMany({
        where: { healthInstituteId, donatedAt: { gte: windowStart } },
        select: { bloodGroup: true, donatedAt: true },
      }),
      prisma.appointment.findMany({
        where: {
          healthInstituteId,
          status: { in: ["SCHEDULED", "CONFIRMED"] },
          appointmentDate: { gte: startOfToday(), lte: horizonEnd },
        },
        select: { donor: { select: { donorProfile: { select: { bloodGroup: true } } } } },
      }),
    ]);

  const onlyKnownGroups = <T extends { bloodGroup: string }>(rows: T[]) =>
    rows.filter((row) => isBloodGroup(row.bloodGroup)) as (T & { bloodGroup: BloodGroupValue })[];

  const forecast = buildShortageForecast({
    inventory: onlyKnownGroups(inventory),
    openRequests: onlyKnownGroups(openRequests),
    requestHistory: onlyKnownGroups(requestHistory),
    donationHistory: onlyKnownGroups(donationHistory),
    scheduled: scheduled.map((appointment) => {
      const group = appointment.donor?.donorProfile?.bloodGroup;
      return { bloodGroup: isBloodGroup(group) ? group : null };
    }),
  });

  // Matching runs for one group: eight donor queries to render one screen
  // would be slow, and a technician acts on one shortage at a time.
  const actionable = groupsNeedingAction(forecast);
  const target: BloodGroupValue | null = isBloodGroup(matchFor)
    ? matchFor
    : (actionable[0]?.bloodGroup ?? null);

  const matches = target
    ? matchDonors({
        needed: target,
        candidates: await loadDonorCandidates(target, healthInstituteId),
        instituteCity: institute?.city ?? null,
        limit: DEFAULT_MATCH_LIMIT,
      })
    : [];

  const openDemandByGroup: Partial<Record<BloodGroup, number>> = {};
  for (const row of openRequests) {
    const key = row.bloodGroup as BloodGroup;
    openDemandByGroup[key] = (openDemandByGroup[key] ?? 0) + row.unitsNeeded;
  }

  const recentDonationsByGroup: Partial<Record<BloodGroup, number>> = {};
  for (const row of donationHistory) {
    const key = row.bloodGroup as BloodGroup;
    recentDonationsByGroup[key] = (recentDonationsByGroup[key] ?? 0) + 1;
  }

  return {
    instituteName: institute?.name ?? null,
    instituteCity: institute?.city ?? null,
    forecast: forecast.map((group) => ({
      ...group,
      shortfallDate: shortfallDate(group)?.toISOString() ?? null,
    })),
    matchFor: target,
    matches,
    recommendations: buildRuleBasedRecommendations({
      inventory: inventory.map((row) => ({
        bloodGroup: row.bloodGroup as BloodGroup,
        units: row.units,
      })),
      openDemandByGroup,
      recentDonationsByGroup,
    }),
    windowDays: HISTORY_WINDOW_DAYS,
    horizonDays: FORECAST_HORIZON_DAYS,
  };
}
