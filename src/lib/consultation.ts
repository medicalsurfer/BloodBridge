/*
  BloodBridge free-consultation entitlement.

  Platform policy: every participating health institute grants a donor one
  free medical consultation for every three completed donations. The rule is
  stated in the privacy and policy page and must read the same everywhere it
  is shown — donor dashboard, donation history, and the staff donor list — so
  it lives here rather than being re-derived per screen.

  Only COMPLETED donations count. A cancelled or missed appointment is not a
  donation, and counting it would promise an entitlement the institute has no
  record of.
*/

export const DONATIONS_PER_CONSULTATION = 3;

export type ConsultationProgress = {
  /** Completed donations the entitlement is calculated from. */
  completedDonations: number;
  /** Total free consultations earned across all time. */
  earned: number;
  /** Completed donations inside the current cycle (0 … 2). */
  progressInCycle: number;
  /** Donations still needed to earn the next consultation (1 … 3). */
  remaining: number;
  /** Whole-number percentage through the current cycle, for progress bars. */
  percentInCycle: number;
};

export function getConsultationProgress(completedDonations: number): ConsultationProgress {
  // Guard against negatives and fractional counts reaching a progress bar.
  const completed = Math.max(0, Math.floor(completedDonations));

  const earned = Math.floor(completed / DONATIONS_PER_CONSULTATION);
  const progressInCycle = completed % DONATIONS_PER_CONSULTATION;

  return {
    completedDonations: completed,
    earned,
    progressInCycle,
    remaining: DONATIONS_PER_CONSULTATION - progressInCycle,
    percentInCycle: Math.round((progressInCycle / DONATIONS_PER_CONSULTATION) * 100),
  };
}

/** Short sentence for the donor: what the counter means right now. */
export function describeConsultationProgress(progress: ConsultationProgress): string {
  if (progress.completedDonations === 0) {
    return `Complete ${DONATIONS_PER_CONSULTATION} donations to earn a free consultation.`;
  }

  if (progress.progressInCycle === 0) {
    return `You have earned ${progress.earned} free consultation${
      progress.earned === 1 ? "" : "s"
    }. Ask any participating institute to redeem one.`;
  }

  return `${progress.remaining} more donation${
    progress.remaining === 1 ? "" : "s"
  } until your next free consultation.`;
}
