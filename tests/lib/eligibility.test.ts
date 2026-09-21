import {
  ELIGIBILITY_VALID_FOR_MS,
  MIN_DAYS_BETWEEN_DONATIONS,
  assessmentExpiresAt,
  evaluateEligibility,
  isAssessmentFresh,
  type EligibilityAnswers,
} from "@/src/lib/eligibility";

/*
  The donor screening questionnaire (FR-10). This is the gate in front of
  every booking, so each deferral rule gets its own case, and the precedence
  between a temporary deferral and a medical review is pinned down.
*/

/** A donor who passes every check. Each test overrides only what it is about. */
function answers(overrides: Partial<EligibilityAnswers> = {}): EligibilityAnswers {
  return {
    feelingWell: "YES",
    weight: "70",
    currentIllness: "NO",
    medicalCondition: "NO",
    medication: "NO",
    pregnancyStatus: "NO",
    hasDonatedBefore: "NO",
    lastDonationDate: "",
    recentProcedure: "NO",
    infectionRisk: "NO",
    ...overrides,
  };
}

/** YYYY-MM-DD for `days` ago, in local time - the format the form submits. */
function daysAgo(days: number): string {
  const date = dateDaysAgo(days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function dateDaysAgo(days: number): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date;
}

describe("evaluateEligibility", () => {
  describe("a healthy first-time donor", () => {
    it("is eligible with no reasons", () => {
      expect(evaluateEligibility(answers())).toEqual({
        status: "ELIGIBLE",
        eligible: true,
        reasons: [],
        daysRemaining: 0,
      });
    });
  });

  describe("temporary deferrals", () => {
    it.each([
      ["not feeling well", { feelingWell: "NO" }, /not currently feeling well/i],
      ["a current illness", { currentIllness: "YES" }, /fever, infection/i],
      ["pregnancy", { pregnancyStatus: "YES" }, /pregnant/i],
      ["being underweight", { weight: "49" }, /50 kg/i],
    ])("defers a donor reporting %s", (_label, override, expected) => {
      const result = evaluateEligibility(answers(override));

      expect(result.status).toBe("TEMPORARILY_DEFERRED");
      expect(result.eligible).toBe(false);
      expect(result.reasons).toEqual(expect.arrayContaining([expect.stringMatching(expected)]));
    });

    it("accepts a donor at exactly the 50 kg threshold", () => {
      expect(evaluateEligibility(answers({ weight: "50" })).eligible).toBe(true);
    });

    it.each([
      ["a non-numeric weight", "seventy"],
      ["an empty weight", ""],
      ["zero", "0"],
      ["a negative weight", "-70"],
    ])("defers on %s rather than treating it as valid", (_label, weight) => {
      const result = evaluateEligibility(answers({ weight }));

      expect(result.status).toBe("TEMPORARILY_DEFERRED");
      expect(result.reasons).toEqual(
        expect.arrayContaining([expect.stringMatching(/valid weight is required/i)]),
      );
    });

    it("collects every applicable reason, not just the first", () => {
      const result = evaluateEligibility(
        answers({ feelingWell: "NO", currentIllness: "YES", weight: "45" }),
      );

      expect(result.reasons).toHaveLength(3);
    });
  });

  describe("the 8-week donation interval", () => {
    it("is 56 days", () => {
      expect(MIN_DAYS_BETWEEN_DONATIONS).toBe(56);
    });

    it("defers a donor who gave blood 10 days ago, with the days remaining", () => {
      const result = evaluateEligibility(
        answers({ hasDonatedBefore: "YES", lastDonationDate: daysAgo(10) }),
      );

      expect(result.status).toBe("TEMPORARILY_DEFERRED");
      expect(result.daysRemaining).toBe(MIN_DAYS_BETWEEN_DONATIONS - 10);
      expect(result.reasons).toEqual(
        expect.arrayContaining([expect.stringMatching(/10 days ago/)]),
      );
    });

    it("still defers on the 55th day", () => {
      const result = evaluateEligibility(
        answers({ hasDonatedBefore: "YES", lastDonationDate: daysAgo(55) }),
      );

      expect(result.eligible).toBe(false);
      expect(result.daysRemaining).toBe(1);
    });

    it("clears the donor on the 56th day", () => {
      const result = evaluateEligibility(
        answers({ hasDonatedBefore: "YES", lastDonationDate: daysAgo(56) }),
      );

      expect(result.status).toBe("ELIGIBLE");
      expect(result.daysRemaining).toBe(0);
    });

    it("writes the singular form for a one-day-old donation", () => {
      const result = evaluateEligibility(
        answers({ hasDonatedBefore: "YES", lastDonationDate: daysAgo(1) }),
      );

      expect(result.reasons[0]).toMatch(/was 1 day ago/);
    });

    it("writes the singular form when exactly one day remains", () => {
      const result = evaluateEligibility(
        answers({ hasDonatedBefore: "YES", lastDonationDate: daysAgo(55) }),
      );

      expect(result.reasons[0]).toMatch(/in 1 day\./);
    });
  });

  describe("the recorded donation date overrides what the donor reports", () => {
    it("uses the recorded date when it is more recent than the self-reported one", () => {
      const result = evaluateEligibility(
        answers({ hasDonatedBefore: "YES", lastDonationDate: daysAgo(90) }),
        dateDaysAgo(5),
      );

      expect(result.eligible).toBe(false);
      expect(result.daysRemaining).toBe(MIN_DAYS_BETWEEN_DONATIONS - 5);
    });

    it("keeps the self-reported date when it is the more recent of the two", () => {
      const result = evaluateEligibility(
        answers({ hasDonatedBefore: "YES", lastDonationDate: daysAgo(5) }),
        dateDaysAgo(90),
      );

      expect(result.eligible).toBe(false);
      expect(result.daysRemaining).toBe(MIN_DAYS_BETWEEN_DONATIONS - 5);
    });

    it("applies the recorded date even when the donor reports no previous donation", () => {
      const result = evaluateEligibility(answers({ hasDonatedBefore: "NO" }), dateDaysAgo(3));

      expect(result.eligible).toBe(false);
      expect(result.daysRemaining).toBe(MIN_DAYS_BETWEEN_DONATIONS - 3);
    });

    it("ignores a null recorded date", () => {
      expect(evaluateEligibility(answers(), null).eligible).toBe(true);
    });
  });

  describe("medical review", () => {
    it.each([
      ["a medical condition", { medicalCondition: "YES" }, /medical condition/i],
      ["medication", { medication: "YES" }, /medication/i],
      ["a recent procedure", { recentProcedure: "YES" }, /surgery, a blood transfusion/i],
      ["an infection risk", { infectionRisk: "YES" }, /exposure to an infection/i],
    ])("routes a donor reporting %s to review", (_label, override, expected) => {
      const result = evaluateEligibility(answers(override));

      expect(result.status).toBe("MEDICAL_REVIEW");
      expect(result.eligible).toBe(false);
      expect(result.reasons).toEqual(expect.arrayContaining([expect.stringMatching(expected)]));
    });

    it("reports a temporary deferral ahead of a medical review, keeping both reasons", () => {
      const result = evaluateEligibility(answers({ currentIllness: "YES", medication: "YES" }));

      expect(result.status).toBe("TEMPORARILY_DEFERRED");
      expect(result.reasons).toHaveLength(2);
      expect(result.reasons[0]).toMatch(/fever, infection/i);
    });
  });

  describe("answers outside the expected vocabulary", () => {
    it("treats anything other than an explicit NO to feeling well as fine", () => {
      // The form only ever submits YES/NO; a blank must not silently defer.
      expect(evaluateEligibility(answers({ feelingWell: "" })).eligible).toBe(true);
    });

    it("treats anything other than an explicit YES to a risk question as fine", () => {
      expect(evaluateEligibility(answers({ infectionRisk: "maybe" })).eligible).toBe(true);
    });
  });
});

describe("assessment freshness", () => {
  it("is valid for 24 hours", () => {
    expect(ELIGIBILITY_VALID_FOR_MS).toBe(24 * 60 * 60 * 1000);
  });

  it("accepts an assessment taken a moment ago", () => {
    expect(isAssessmentFresh(new Date())).toBe(true);
  });

  it("accepts an assessment just inside the window", () => {
    expect(isAssessmentFresh(new Date(Date.now() - ELIGIBILITY_VALID_FOR_MS + 60_000))).toBe(true);
  });

  it("rejects an assessment just outside the window", () => {
    expect(isAssessmentFresh(new Date(Date.now() - ELIGIBILITY_VALID_FOR_MS - 1))).toBe(false);
  });

  it("accepts an ISO string as well as a Date", () => {
    expect(isAssessmentFresh(new Date().toISOString())).toBe(true);
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["an unparseable string", "not-a-date"],
  ])("rejects %s rather than letting the donor skip screening", (_label, value) => {
    expect(isAssessmentFresh(value)).toBe(false);
  });

  it("expires exactly 24 hours after the assessment was taken", () => {
    const taken = new Date("2026-03-01T09:30:00.000Z");

    expect(assessmentExpiresAt(taken).toISOString()).toBe("2026-03-02T09:30:00.000Z");
    expect(assessmentExpiresAt(taken.toISOString()).getTime()).toBe(
      taken.getTime() + ELIGIBILITY_VALID_FOR_MS,
    );
  });
});
