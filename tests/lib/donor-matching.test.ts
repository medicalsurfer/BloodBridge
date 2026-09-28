import {
  MATCH_LOOKAHEAD_DAYS,
  label,
  matchDonors,
  type DonorCandidate,
} from "@/src/lib/donor-matching";
import { MIN_DAYS_BETWEEN_DONATIONS } from "@/src/lib/eligibility";
import { BLOOD_GROUPS, type BloodGroupValue } from "@/src/lib/blood-compatibility";

/*
  Smart donor matching.

  Two rules carry clinical weight and are tested hardest: nobody incompatible
  is ever suggested, and nobody inside the 56-day interval is suggested as
  available today. The ranking on top of that is a judgement call, so the
  tests state what it is meant to prefer rather than pinning exact scores.
*/

let counter = 0;

function donor(overrides: Partial<DonorCandidate> = {}): DonorCandidate {
  counter += 1;

  return {
    id: `usr_${counter}`,
    firstName: "Ada",
    lastName: `Donor${counter}`,
    email: `donor${counter}@gmail.com`,
    phoneNumber: "+237650000000",
    city: "Yaoundé",
    bloodGroup: "O_NEGATIVE",
    lastDonationDate: null,
    donationsHere: 0,
    hasUpcomingAppointment: false,
    ...overrides,
  };
}

function daysAgo(days: number) {
  const date = new Date();
  date.setHours(9, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date;
}

describe("matchDonors", () => {
  describe("who is never suggested", () => {
    it("leaves out donors whose blood cannot be given to the group needed", () => {
      const matches = matchDonors({
        needed: "O_NEGATIVE",
        candidates: [
          donor({ bloodGroup: "A_POSITIVE" }),
          donor({ bloodGroup: "AB_NEGATIVE" }),
          donor({ bloodGroup: "O_POSITIVE" }),
        ],
      });

      // O- can only receive from O-.
      expect(matches).toEqual([]);
    });

    it("never suggests an incompatible donor for any group", () => {
      for (const needed of BLOOD_GROUPS) {
        const matches = matchDonors({
          needed,
          candidates: BLOOD_GROUPS.map((bloodGroup) => donor({ bloodGroup })),
          limit: 50,
        });

        for (const match of matches) {
          // Rh-positive blood must never be offered for an Rh-negative patient.
          if (needed.endsWith("NEGATIVE")) {
            expect(match.bloodGroup.endsWith("NEGATIVE")).toBe(true);
          }
        }
      }
    });

    it("leaves out a donor who is already booked in", () => {
      const matches = matchDonors({
        needed: "O_NEGATIVE",
        candidates: [donor({ hasUpcomingAppointment: true })],
      });

      expect(matches).toEqual([]);
    });

    it("leaves out a donor too deep inside the 56-day interval to call yet", () => {
      const matches = matchDonors({
        needed: "O_NEGATIVE",
        candidates: [donor({ lastDonationDate: daysAgo(10) })],
      });

      expect(matches).toEqual([]);
    });
  });

  describe("the 56-day interval", () => {
    it("treats a donor who has never donated as available now", () => {
      const [match] = matchDonors({
        needed: "O_NEGATIVE",
        candidates: [donor({ lastDonationDate: null })],
      });

      expect(match.daysUntilEligible).toBe(0);
      expect(match.daysSinceLastDonation).toBeNull();
      expect(match.reasons).toEqual(expect.arrayContaining(["No donation on record — eligible now"]));
    });

    it("treats a donor exactly at the interval as available now", () => {
      const [match] = matchDonors({
        needed: "O_NEGATIVE",
        candidates: [donor({ lastDonationDate: daysAgo(MIN_DAYS_BETWEEN_DONATIONS) })],
      });

      expect(match.daysUntilEligible).toBe(0);
    });

    it("counts the days remaining for a donor who is nearly clear", () => {
      const [match] = matchDonors({
        needed: "O_NEGATIVE",
        candidates: [donor({ lastDonationDate: daysAgo(MIN_DAYS_BETWEEN_DONATIONS - 5) })],
      });

      expect(match.daysUntilEligible).toBe(5);
      expect(match.reasons).toEqual(expect.arrayContaining(["Eligible in 5 days"]));
    });

    it("includes a donor at the edge of the lookahead but not past it", () => {
      const justInside = donor({
        lastDonationDate: daysAgo(MIN_DAYS_BETWEEN_DONATIONS - MATCH_LOOKAHEAD_DAYS),
      });
      const justOutside = donor({
        lastDonationDate: daysAgo(MIN_DAYS_BETWEEN_DONATIONS - MATCH_LOOKAHEAD_DAYS - 1),
      });

      const matches = matchDonors({
        needed: "O_NEGATIVE",
        candidates: [justInside, justOutside],
      });

      expect(matches.map((match) => match.id)).toEqual([justInside.id]);
    });
  });

  describe("ranking", () => {
    it("puts an available donor above one who is not eligible yet", () => {
      const available = donor({ id: "available", lastDonationDate: daysAgo(90) });
      const soon = donor({ id: "soon", lastDonationDate: daysAgo(50) });

      const matches = matchDonors({ needed: "O_NEGATIVE", candidates: [soon, available] });

      expect(matches.map((match) => match.id)).toEqual(["available", "soon"]);
    });

    it("prefers an exact group match over a universal donor", () => {
      // The point of the rule: do not spend O- covering a group that has its
      // own supply, because O- is the hardest stock to replace.
      const exact = donor({ id: "exact", bloodGroup: "A_POSITIVE" });
      const universal = donor({ id: "universal", bloodGroup: "O_NEGATIVE" });

      const matches = matchDonors({
        needed: "A_POSITIVE",
        candidates: [universal, exact],
      });

      expect(matches[0].id).toBe("exact");
      expect(matches[0].exactMatch).toBe(true);
      expect(matches[1].exactMatch).toBe(false);
    });

    it("explains a compatible match in terms a reader can check", () => {
      const [match] = matchDonors({
        needed: "A_POSITIVE",
        candidates: [donor({ bloodGroup: "O_NEGATIVE" })],
      });

      expect(match.reasons).toEqual(
        expect.arrayContaining(["Compatible donor — O- can give to A+"]),
      );
    });

    it("prefers a donor who has given here before", () => {
      const regular = donor({ id: "regular", donationsHere: 4, lastDonationDate: daysAgo(90) });
      const stranger = donor({ id: "stranger", donationsHere: 0, lastDonationDate: daysAgo(90) });

      const matches = matchDonors({ needed: "O_NEGATIVE", candidates: [stranger, regular] });

      expect(matches[0].id).toBe("regular");
      expect(matches[0].reasons).toEqual(expect.arrayContaining(["Donated here 4 times"]));
    });

    it("prefers a donor in the institute's own city", () => {
      const local = donor({ id: "local", city: "Yaoundé" });
      const distant = donor({ id: "distant", city: "Douala" });

      const matches = matchDonors({
        needed: "O_NEGATIVE",
        candidates: [distant, local],
        instituteCity: "Yaoundé",
      });

      expect(matches[0].id).toBe("local");
      expect(matches[0].reasons).toEqual(expect.arrayContaining(["Based in Yaoundé"]));
    });

    it("matches a city regardless of spacing and case", () => {
      const [match] = matchDonors({
        needed: "O_NEGATIVE",
        candidates: [donor({ city: "  yaoundé " })],
        instituteCity: "Yaoundé",
      });

      expect(match.reasons.some((reason) => reason.startsWith("Based in"))).toBe(true);
    });

    it("gives every suggestion a reason", () => {
      const matches = matchDonors({
        needed: "O_NEGATIVE",
        candidates: [donor(), donor({ donationsHere: 2 }), donor({ lastDonationDate: daysAgo(200) })],
      });

      for (const match of matches) {
        expect(match.reasons.length).toBeGreaterThan(0);
      }
    });

    it("flags a lapsed donor as worth re-engaging", () => {
      const [match] = matchDonors({
        needed: "O_NEGATIVE",
        candidates: [donor({ lastDonationDate: daysAgo(200) })],
      });

      expect(match.reasons).toEqual(expect.arrayContaining(["Has not donated in a while"]));
    });
  });

  describe("the shape of the result", () => {
    it("returns at most the requested number of donors", () => {
      const matches = matchDonors({
        needed: "O_NEGATIVE",
        candidates: Array.from({ length: 30 }, () => donor()),
        limit: 5,
      });

      expect(matches).toHaveLength(5);
    });

    it("returns what outreach needs to make contact", () => {
      const [match] = matchDonors({ needed: "O_NEGATIVE", candidates: [donor()] });

      expect(match).toMatchObject({
        name: expect.stringContaining("Ada"),
        email: expect.stringContaining("@"),
        phoneNumber: expect.any(String),
        bloodGroup: "O_NEGATIVE",
      });
    });

    it("returns an empty list rather than failing when nobody fits", () => {
      expect(matchDonors({ needed: "O_NEGATIVE", candidates: [] })).toEqual([]);
    });
  });
});

describe("label", () => {
  it.each([
    ["O_NEGATIVE", "O-"],
    ["O_POSITIVE", "O+"],
    ["AB_POSITIVE", "AB+"],
    ["A_NEGATIVE", "A-"],
  ])("writes %s as %s", (group, expected) => {
    expect(label(group as BloodGroupValue)).toBe(expected);
  });
});
