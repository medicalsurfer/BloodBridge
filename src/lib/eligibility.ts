export type EligibilityAnswers = {
  feelingWell: string;
  weight: string;
  currentIllness: string;
  medicalCondition: string;
  medication: string;
  pregnancyStatus: string;
  lastDonationDate: string;
  recentProcedure: string;
  infectionRisk: string;
};

export type EligibilityStatus = "ELIGIBLE" | "TEMPORARILY_DEFERRED" | "MEDICAL_REVIEW";

export const MIN_DAYS_BETWEEN_DONATIONS = 56; // 8 weeks

export type EligibilityResult = {
  status: EligibilityStatus;
  eligible: boolean;
  reasons: string[];
  daysRemaining: number;
};

function daysSince(date: Date): number {
  const reference = new Date(date);
  const today = new Date();

  reference.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return Math.floor((today.getTime() - reference.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * The authoritative eligibility check that backs both the standalone
 * "Check eligibility" page and the eligibility step inside "Book donation
 * appointment". This runs server-side (the "DBMS query" step in the
 * booking flow) so a donor can't influence the outcome from the client.
 *
 * `knownLastDonationDate` is the donor's actual last recorded donation
 * (from a lab technician recording a completed donation) - when present,
 * it is authoritative over whatever the donor self-reports in the form,
 * since a donor could otherwise misremember or misreport that date.
 */
export function evaluateEligibility(
  answers: EligibilityAnswers,
  knownLastDonationDate?: Date | null,
): EligibilityResult {
  const weight = Number(answers.weight);
  const temporaryDeferralReasons: string[] = [];
  const medicalReviewReasons: string[] = [];

  if (Number.isNaN(weight) || weight <= 0) {
    temporaryDeferralReasons.push("A valid weight is required to assess eligibility.");
  } else if (weight < 50) {
    temporaryDeferralReasons.push(
      "Your weight is below the preliminary minimum donation threshold of 50 kg.",
    );
  }

  if (answers.feelingWell === "NO") {
    temporaryDeferralReasons.push("You indicated that you are not currently feeling well.");
  }

  if (answers.currentIllness === "YES") {
    temporaryDeferralReasons.push("You currently have a fever, infection, or other illness.");
  }

  if (answers.pregnancyStatus === "YES") {
    temporaryDeferralReasons.push(
      "You are currently pregnant or have recently given birth.",
    );
  }

  // The later of the two dates (self-reported vs. the actual recorded
  // donation, if any) is the more restrictive/authoritative one.
  let effectiveLastDonation: Date | null = null;

  if (answers.lastDonationDate) {
    effectiveLastDonation = new Date(`${answers.lastDonationDate}T00:00:00`);
  }

  if (knownLastDonationDate) {
    if (!effectiveLastDonation || knownLastDonationDate > effectiveLastDonation) {
      effectiveLastDonation = knownLastDonationDate;
    }
  }

  let daysRemaining = 0;

  if (effectiveLastDonation) {
    const since = daysSince(effectiveLastDonation);
    daysRemaining = Math.max(0, MIN_DAYS_BETWEEN_DONATIONS - since);

    if (daysRemaining > 0) {
      temporaryDeferralReasons.push(
        `Your last blood donation was ${since} day${since === 1 ? "" : "s"} ago. You must wait at least ${MIN_DAYS_BETWEEN_DONATIONS} days (8 weeks) between whole blood donations, so you can donate again in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}.`,
      );
    }
  }

  if (answers.medicalCondition === "YES") {
    medicalReviewReasons.push(
      "You reported a medical condition that may affect blood donation eligibility.",
    );
  }

  if (answers.medication === "YES") {
    medicalReviewReasons.push(
      "You are currently taking medication that should be reviewed by healthcare staff.",
    );
  }

  if (answers.recentProcedure === "YES") {
    medicalReviewReasons.push(
      "You recently had surgery, a blood transfusion, tattoo, or piercing.",
    );
  }

  if (answers.infectionRisk === "YES") {
    medicalReviewReasons.push(
      "You reported a possible recent exposure to an infection that could be transmitted through blood.",
    );
  }

  if (temporaryDeferralReasons.length > 0) {
    return {
      status: "TEMPORARILY_DEFERRED",
      eligible: false,
      reasons: [...temporaryDeferralReasons, ...medicalReviewReasons],
      daysRemaining,
    };
  }

  if (medicalReviewReasons.length > 0) {
    return {
      status: "MEDICAL_REVIEW",
      eligible: false,
      reasons: medicalReviewReasons,
      daysRemaining,
    };
  }

  return {
    status: "ELIGIBLE",
    eligible: true,
    reasons: [],
    daysRemaining,
  };
}
