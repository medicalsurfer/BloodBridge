import {
  DONATIONS_PER_CONSULTATION,
  describeConsultationProgress,
  getConsultationProgress,
} from "@/src/lib/consultation";

/*
  The free-consultation entitlement: one consultation per three completed
  donations. The same numbers appear on the donor dashboard, the donation
  history and the staff donor list, so the cycle boundaries (2 -> 3 -> 4) get
  explicit cases, as does the wording shown at each point.
*/

describe("getConsultationProgress", () => {
  it("grants one consultation per three donations", () => {
    expect(DONATIONS_PER_CONSULTATION).toBe(3);
  });

  it.each([
    [0, { earned: 0, progressInCycle: 0, remaining: 3, percentInCycle: 0 }],
    [1, { earned: 0, progressInCycle: 1, remaining: 2, percentInCycle: 33 }],
    [2, { earned: 0, progressInCycle: 2, remaining: 1, percentInCycle: 67 }],
    [3, { earned: 1, progressInCycle: 0, remaining: 3, percentInCycle: 0 }],
    [4, { earned: 1, progressInCycle: 1, remaining: 2, percentInCycle: 33 }],
    [6, { earned: 2, progressInCycle: 0, remaining: 3, percentInCycle: 0 }],
    [10, { earned: 3, progressInCycle: 1, remaining: 2, percentInCycle: 33 }],
  ])("reports the cycle correctly for %i completed donations", (completed, expected) => {
    expect(getConsultationProgress(completed)).toEqual({
      completedDonations: completed,
      ...expected,
    });
  });

  describe("counts that should never reach a progress bar", () => {
    it("floors a fractional count", () => {
      expect(getConsultationProgress(2.9)).toMatchObject({
        completedDonations: 2,
        progressInCycle: 2,
      });
    });

    it("treats a negative count as zero", () => {
      expect(getConsultationProgress(-5)).toMatchObject({
        completedDonations: 0,
        earned: 0,
        percentInCycle: 0,
      });
    });
  });

  it("keeps the percentage within 0-100", () => {
    for (let completed = 0; completed <= 30; completed += 1) {
      const { percentInCycle } = getConsultationProgress(completed);

      expect(percentInCycle).toBeGreaterThanOrEqual(0);
      expect(percentInCycle).toBeLessThanOrEqual(100);
    }
  });

  it("keeps earned consultations consistent with the donation count", () => {
    for (let completed = 0; completed <= 30; completed += 1) {
      const progress = getConsultationProgress(completed);

      expect(progress.earned * DONATIONS_PER_CONSULTATION + progress.progressInCycle).toBe(
        completed,
      );
    }
  });
});

describe("describeConsultationProgress", () => {
  const describe_ = (completed: number) =>
    describeConsultationProgress(getConsultationProgress(completed));

  it("invites a donor with no donations to complete three", () => {
    expect(describe_(0)).toBe("Complete 3 donations to earn a free consultation.");
  });

  it("counts down the remaining donations, in the plural", () => {
    expect(describe_(1)).toBe("2 more donations until your next free consultation.");
  });

  it("uses the singular when one donation is left", () => {
    expect(describe_(2)).toBe("1 more donation until your next free consultation.");
  });

  it("announces a single earned consultation in the singular", () => {
    expect(describe_(3)).toBe(
      "You have earned 1 free consultation. Ask any participating institute to redeem one.",
    );
  });

  it("announces several earned consultations in the plural", () => {
    expect(describe_(9)).toMatch(/earned 3 free consultations/);
  });
});
