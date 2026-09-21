jest.mock("@/src/lib/prisma", () => require("../helpers/prisma-mock").prismaMockModule);

import { getDonationWindow, tooSoonMessage } from "@/src/lib/donation-window";
import { MIN_DAYS_BETWEEN_DONATIONS } from "@/src/lib/eligibility";
import { prisma, resetPrismaMock } from "../helpers/prisma-mock";

/*
  When a donor may next give blood (FR-11, FR-19). Two sources feed this - the
  donations a lab technician recorded, and the date on the donor's own profile
  - and the later of the two has to win, so each combination gets a case.
*/

const DONOR_ID = "usr_donor_1";

function daysAgo(days: number) {
  const date = new Date();
  date.setHours(9, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date;
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

/** Arranges what each of the two sources reports. */
function given({
  recordedDonation = null,
  profileDate = null,
}: { recordedDonation?: Date | null; profileDate?: Date | null } = {}) {
  prisma.donation.findFirst.mockResolvedValue(
    recordedDonation ? { donatedAt: recordedDonation } : null,
  );
  prisma.donorProfile.findUnique.mockResolvedValue(
    profileDate === null ? null : { lastDonationDate: profileDate },
  );
}

beforeEach(() => {
  resetPrismaMock();
});

describe("getDonationWindow", () => {
  it("returns an open window for a donor who has never donated", async () => {
    given();

    expect(await getDonationWindow(DONOR_ID)).toEqual({
      lastDonation: null,
      earliestNextDonation: null,
    });
  });

  it("queries only the donor's own records", async () => {
    given();

    await getDonationWindow(DONOR_ID);

    expect(prisma.donation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { donorId: DONOR_ID } }),
    );
    expect(prisma.donorProfile.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: DONOR_ID } }),
    );
  });

  it("takes the most recent recorded donation", async () => {
    given({ recordedDonation: daysAgo(10) });

    const window = await getDonationWindow(DONOR_ID);

    expect(prisma.donation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { donatedAt: "desc" } }),
    );
    expect(window.lastDonation).toEqual(daysAgo(10));
  });

  it("opens the window 56 days after the last donation", async () => {
    given({ recordedDonation: daysAgo(10) });

    const expected = startOfToday();
    expected.setDate(expected.getDate() - 10 + MIN_DAYS_BETWEEN_DONATIONS);

    expect((await getDonationWindow(DONOR_ID)).earliestNextDonation).toEqual(expected);
  });

  it("reports the window from the start of the day, not the hour of the donation", async () => {
    given({ recordedDonation: daysAgo(1) });

    const { earliestNextDonation } = await getDonationWindow(DONOR_ID);

    expect(earliestNextDonation!.getHours()).toBe(0);
    expect(earliestNextDonation!.getMinutes()).toBe(0);
  });

  it("closes the window once the interval has fully passed", async () => {
    given({ recordedDonation: daysAgo(MIN_DAYS_BETWEEN_DONATIONS) });

    const window = await getDonationWindow(DONOR_ID);

    expect(window.earliestNextDonation).toBeNull();
    expect(window.lastDonation).not.toBeNull();
  });

  it("still holds the donor on the day before the interval ends", async () => {
    given({ recordedDonation: daysAgo(MIN_DAYS_BETWEEN_DONATIONS - 1) });

    expect((await getDonationWindow(DONOR_ID)).earliestNextDonation).not.toBeNull();
  });

  describe("when the two sources disagree", () => {
    it("uses the profile date when it is the more recent", async () => {
      given({ recordedDonation: daysAgo(80), profileDate: daysAgo(3) });

      expect((await getDonationWindow(DONOR_ID)).lastDonation).toEqual(daysAgo(3));
    });

    it("uses the recorded donation when it is the more recent", async () => {
      given({ recordedDonation: daysAgo(3), profileDate: daysAgo(80) });

      expect((await getDonationWindow(DONOR_ID)).lastDonation).toEqual(daysAgo(3));
    });

    it("defers the donor whenever either source is inside the interval", async () => {
      given({ recordedDonation: daysAgo(200), profileDate: daysAgo(1) });

      expect((await getDonationWindow(DONOR_ID)).earliestNextDonation).not.toBeNull();
    });
  });

  describe("partial records", () => {
    it("works from the profile alone when no donation was ever recorded", async () => {
      given({ profileDate: daysAgo(5) });

      expect((await getDonationWindow(DONOR_ID)).lastDonation).toEqual(daysAgo(5));
    });

    it("works from the donation alone when the profile has no date", async () => {
      given({ recordedDonation: daysAgo(5), profileDate: null });

      expect((await getDonationWindow(DONOR_ID)).lastDonation).toEqual(daysAgo(5));
    });

    it("treats a profile with a null date as no date at all", async () => {
      prisma.donation.findFirst.mockResolvedValue(null);
      prisma.donorProfile.findUnique.mockResolvedValue({ lastDonationDate: null });

      expect(await getDonationWindow(DONOR_ID)).toEqual({
        lastDonation: null,
        earliestNextDonation: null,
      });
    });
  });
});

describe("tooSoonMessage", () => {
  it("names the day the donor can book from", () => {
    expect(tooSoonMessage(new Date(2026, 5, 15))).toBe(
      "You must wait 56 days between donations. You can book a donation from Monday, 15 June 2026 onwards.",
    );
  });

  it("always states the interval", () => {
    expect(tooSoonMessage(new Date(2026, 0, 1))).toMatch(
      new RegExp(`wait ${MIN_DAYS_BETWEEN_DONATIONS} days`),
    );
  });
});
