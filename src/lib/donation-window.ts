import { prisma } from "./prisma";
import { MIN_DAYS_BETWEEN_DONATIONS } from "./eligibility";

/*
  When a donor may next give blood. A donation appointment cannot be booked
  before this date: the mandatory interval since the donor's last donation
  must have passed by the day of the visit (FR-11, FR-19).

  Both sources are consulted and the later one wins: the donation records a
  lab technician entered, and the lastDonationDate on the donor profile (which
  a donor can report themselves, and which may be more recent than anything
  recorded at a participating institute).
*/

export type DonationWindow = {
  lastDonation: Date | null;
  /** Null when the donor has no recorded donation, or the interval has passed. */
  earliestNextDonation: Date | null;
};

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export async function getDonationWindow(donorId: string): Promise<DonationWindow> {
  const [latestDonation, profile] = await Promise.all([
    prisma.donation.findFirst({
      where: { donorId },
      orderBy: { donatedAt: "desc" },
      select: { donatedAt: true },
    }),
    prisma.donorProfile.findUnique({
      where: { userId: donorId },
      select: { lastDonationDate: true },
    }),
  ]);

  const dates = [latestDonation?.donatedAt, profile?.lastDonationDate].filter(
    (date): date is Date => date instanceof Date,
  );

  if (dates.length === 0) {
    return { lastDonation: null, earliestNextDonation: null };
  }

  const lastDonation = new Date(Math.max(...dates.map((date) => date.getTime())));
  const earliest = startOfDay(lastDonation);
  earliest.setDate(earliest.getDate() + MIN_DAYS_BETWEEN_DONATIONS);

  return {
    lastDonation,
    earliestNextDonation: earliest > startOfDay(new Date()) ? earliest : null,
  };
}

/** Message shown when a requested appointment date falls inside the interval. */
export function tooSoonMessage(earliestNextDonation: Date) {
  const formatted = earliestNextDonation.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return `You must wait ${MIN_DAYS_BETWEEN_DONATIONS} days between donations. You can book a donation from ${formatted} onwards.`;
}
