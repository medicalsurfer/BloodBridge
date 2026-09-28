import { canDonateTo, type BloodGroupValue } from "./blood-compatibility";
import { MIN_DAYS_BETWEEN_DONATIONS } from "./eligibility";

/*
  Smart donor matching: given a blood group the laboratory is short of, which
  donors are worth contacting, and why.

  The ranking encodes three judgements a blood bank makes and a plain
  "compatible donors" list does not:

  1. An exact group match outranks a compatible one. O- can be given to
     anyone, which is exactly why it should not be spent covering an A+
     shortage — calling in universal donors for a group that has its own
     supply trades away the stock hardest to replace.

  2. A donor who cannot donate yet is not a candidate today. The 56-day
     interval is the same rule the booking flow enforces, so a donor is only
     suggested once they are clear of it, or close enough to be worth booking.

  3. A donor already booked in is not worth contacting. They are coming.

  Every score carries the reasons that produced it, so staff can see why
  someone was suggested rather than being handed a ranked list to trust.
*/

export type DonorCandidate = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  city: string | null;
  bloodGroup: BloodGroupValue;
  lastDonationDate: Date | null;
  /** Completed donations this donor has given at the asking institute. */
  donationsHere: number;
  hasUpcomingAppointment: boolean;
};

export type MatchedDonor = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  city: string | null;
  bloodGroup: BloodGroupValue;
  /** True when this donor's group is the one actually needed. */
  exactMatch: boolean;
  daysSinceLastDonation: number | null;
  /** 0 when they can donate today, otherwise days until the interval clears. */
  daysUntilEligible: number;
  donationsHere: number;
  score: number;
  reasons: string[];
};

/** Donors more than this many days from eligibility are not worth calling yet. */
export const MATCH_LOOKAHEAD_DAYS = 14;

/** A donor idle this long is worth re-engaging. */
const LAPSED_DAYS = 120;

export const DEFAULT_MATCH_LIMIT = 8;

function daysBetween(from: Date, to: Date) {
  const start = new Date(from);
  const end = new Date(to);

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export function matchDonors({
  needed,
  candidates,
  instituteCity = null,
  today = new Date(),
  limit = DEFAULT_MATCH_LIMIT,
}: {
  needed: BloodGroupValue;
  candidates: DonorCandidate[];
  instituteCity?: string | null;
  today?: Date;
  limit?: number;
}): MatchedDonor[] {
  const matched: MatchedDonor[] = [];

  for (const candidate of candidates) {
    // Already coming in; contacting them again is noise.
    if (candidate.hasUpcomingAppointment) continue;

    // Their blood has to be transfusable into the group we are short of.
    if (!canDonateTo(candidate.bloodGroup, needed)) continue;

    const daysSince = candidate.lastDonationDate
      ? daysBetween(candidate.lastDonationDate, today)
      : null;

    const daysUntilEligible =
      daysSince === null ? 0 : Math.max(0, MIN_DAYS_BETWEEN_DONATIONS - daysSince);

    if (daysUntilEligible > MATCH_LOOKAHEAD_DAYS) continue;

    const exactMatch = candidate.bloodGroup === needed;
    const reasons: string[] = [];
    let score = 0;

    if (exactMatch) {
      score += 25;
      reasons.push("Exact group match");
    } else {
      // Kept low on purpose: see the note at the top of this file.
      score += 5;
      reasons.push(`Compatible donor — ${label(candidate.bloodGroup)} can give to ${label(needed)}`);
    }

    if (daysUntilEligible === 0) {
      score += 40;
      reasons.push(
        daysSince === null
          ? "No donation on record — eligible now"
          : `Last donated ${daysSince} days ago — eligible now`,
      );
    } else {
      score += 15;
      reasons.push(`Eligible in ${daysUntilEligible} day${daysUntilEligible === 1 ? "" : "s"}`);
    }

    if (candidate.donationsHere > 0) {
      score += Math.min(candidate.donationsHere, 5) * 3;
      reasons.push(
        `Donated here ${candidate.donationsHere} time${candidate.donationsHere === 1 ? "" : "s"}`,
      );
    }

    if (instituteCity && candidate.city && sameCity(candidate.city, instituteCity)) {
      score += 10;
      reasons.push(`Based in ${candidate.city}`);
    }

    if (daysSince !== null && daysSince >= LAPSED_DAYS) {
      score += 5;
      reasons.push("Has not donated in a while");
    }

    matched.push({
      id: candidate.id,
      name: `${candidate.firstName} ${candidate.lastName}`.trim(),
      email: candidate.email,
      phoneNumber: candidate.phoneNumber,
      city: candidate.city,
      bloodGroup: candidate.bloodGroup,
      exactMatch,
      daysSinceLastDonation: daysSince,
      daysUntilEligible,
      donationsHere: candidate.donationsHere,
      score,
      reasons,
    });
  }

  return matched
    .sort((a, b) => b.score - a.score || a.daysUntilEligible - b.daysUntilEligible)
    .slice(0, limit);
}

function sameCity(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** "O_NEGATIVE" as "O-", for anything a person reads. */
export function label(bloodGroup: BloodGroupValue) {
  const [abo, rh] = bloodGroup.split("_");
  return `${abo}${rh === "POSITIVE" ? "+" : "-"}`;
}
