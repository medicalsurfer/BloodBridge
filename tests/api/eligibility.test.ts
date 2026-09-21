jest.mock("@/src/lib/prisma", () => require("../helpers/prisma-mock").prismaMockModule);

import { GET, POST } from "@/app/api/eligibility/route";
import {
  ELIGIBILITY_VALID_FOR_MS,
  MIN_DAYS_BETWEEN_DONATIONS,
  type EligibilityAnswers,
} from "@/src/lib/eligibility";
import { prisma, resetPrismaMock } from "../helpers/prisma-mock";
import {
  makeAuthenticatedRequest,
  makeRequest,
  makeStaff,
  makeUser,
  type TestUser,
} from "../helpers/fixtures";

/*
  The donor screening endpoint (FR-10), which the standalone "Check
  eligibility" page and the eligibility step of "Book donation appointment"
  both post to.

  The rules themselves are covered in tests/lib/eligibility.test.ts. What
  matters here is the endpoint around them: that only a signed-in donor
  reaches it, that required answers are enforced server-side rather than
  trusted from the client, that the screening is recorded together with the
  profile flag, and that a reusable result is only ever a fresh pass.
*/

const donor = makeUser();

function answers(overrides: Partial<EligibilityAnswers> = {}) {
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

function daysAgo(days: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date;
}

function isoDaysAgo(days: number) {
  const date = daysAgo(days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

/** Signed in as `user`, posting `body` to the endpoint. */
async function post(body: unknown, user: TestUser = donor) {
  prisma.user.findUnique.mockResolvedValue(user);

  return POST(
    await makeAuthenticatedRequest(user, {
      url: "http://localhost/api/eligibility",
      method: "POST",
      body,
    }),
  );
}

async function get(user: TestUser = donor) {
  prisma.user.findUnique.mockResolvedValue(user);

  return GET(
    await makeAuthenticatedRequest(user, { url: "http://localhost/api/eligibility" }),
  );
}

beforeEach(() => {
  resetPrismaMock();

  // The screening write: the route reads createdAt back off the record.
  prisma.eligibilityAssessment.create.mockImplementation(async ({ data }: never) => ({
    id: "asm_1",
    createdAt: new Date("2026-06-15T09:00:00.000Z"),
    ...(data as object),
  }));
});

describe("POST /api/eligibility", () => {
  describe("access", () => {
    it("refuses an unauthenticated request with 401", async () => {
      const response = await POST(
        makeRequest({ url: "http://localhost/api/eligibility", method: "POST", body: answers() }),
      );

      expect(response.status).toBe(401);
      expect(prisma.eligibilityAssessment.create).not.toHaveBeenCalled();
    });

    it("refuses a staff account with 403", async () => {
      const response = await post(answers(), makeStaff("MEDICAL_STAFF"));

      expect(response.status).toBe(403);
      expect(prisma.eligibilityAssessment.create).not.toHaveBeenCalled();
    });
  });

  describe("input validation", () => {
    it.each([
      "feelingWell",
      "weight",
      "currentIllness",
      "medicalCondition",
      "medication",
      "pregnancyStatus",
      "recentProcedure",
      "infectionRisk",
      "hasDonatedBefore",
    ])("rejects a submission missing %s", async (field) => {
      const response = await post(answers({ [field]: "" }));

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        error: "Please answer all required questions before submitting.",
      });
    });

    it("rejects a body that is not an object", async () => {
      const response = await post("just a string");

      expect(response.status).toBe(400);
    });

    it("rejects a body that is not JSON at all", async () => {
      prisma.user.findUnique.mockResolvedValue(donor);

      const response = await POST(
        await makeAuthenticatedRequest(donor, {
          url: "http://localhost/api/eligibility",
          method: "POST",
          body: "{ not json",
        }),
      );

      expect(response.status).toBe(400);
    });

    it("requires the date when the donor says they have donated before", async () => {
      const response = await post(answers({ hasDonatedBefore: "YES", lastDonationDate: "" }));

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        error: "Please provide the date of your last donation.",
      });
    });

    it.each([
      ["a non-numeric weight", "seventy"],
      ["zero", "0"],
      ["a negative weight", "-70"],
    ])("rejects %s with a clear message", async (_label, weight) => {
      const response = await post(answers({ weight }));

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({ error: "Please enter a valid weight." });
    });

    it("rejects a last donation date in the future", async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await post(
        answers({
          hasDonatedBefore: "YES",
          lastDonationDate: tomorrow.toISOString().slice(0, 10),
        }),
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        error: "The last donation date cannot be in the future.",
      });
    });

    it("stores nothing when the submission is rejected", async () => {
      await post(answers({ weight: "" }));

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.donorProfile.upsert).not.toHaveBeenCalled();
    });
  });

  describe("a donor who passes screening", () => {
    it("returns the eligible result", async () => {
      const response = await post(answers());

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        status: "ELIGIBLE",
        eligible: true,
        reasons: [],
      });
    });

    it("records the screening against the signed-in donor", async () => {
      await post(answers());

      expect(prisma.eligibilityAssessment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          donorId: donor.id,
          status: "ELIGIBLE",
          eligible: true,
        }),
      });
    });

    it("keeps the submitted answers with the screening record", async () => {
      await post(answers({ weight: "82" }));

      const [[{ data }]] = prisma.eligibilityAssessment.create.mock.calls as [[{ data: never }]];

      expect((data as { answers: EligibilityAnswers }).answers).toMatchObject({ weight: "82" });
    });

    it("updates the profile flag in the same transaction as the screening", async () => {
      await post(answers());

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.donorProfile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: donor.id },
          update: { eligibilityStatus: true },
        }),
      );
    });

    it("marks the result reusable, with an expiry a day out", async () => {
      const response = await post(answers());
      const body = await response.json();

      expect(body.assessment.reusable).toBe(true);
      expect(new Date(body.assessment.expiresAt).getTime()).toBe(
        new Date(body.assessment.createdAt).getTime() + ELIGIBILITY_VALID_FOR_MS,
      );
    });
  });

  describe("a donor who is deferred", () => {
    it("returns the deferral with its reasons", async () => {
      const response = await post(answers({ currentIllness: "YES" }));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toMatchObject({ status: "TEMPORARILY_DEFERRED", eligible: false });
      expect(body.reasons.length).toBeGreaterThan(0);
    });

    it("still records the screening, with the profile flag set false", async () => {
      await post(answers({ currentIllness: "YES" }));

      expect(prisma.eligibilityAssessment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ eligible: false }),
      });
      expect(prisma.donorProfile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: { eligibilityStatus: false } }),
      );
    });

    it("never marks a failed screening reusable", async () => {
      const response = await post(answers({ medicalCondition: "YES" }));

      await expect(response.json()).resolves.toMatchObject({
        status: "MEDICAL_REVIEW",
        assessment: { reusable: false },
      });
    });

    it("defers on the recorded donation date even when the donor reports none", async () => {
      // The profile's date is authoritative: a donor cannot clear the 8-week
      // interval by answering "no" to having donated before.
      prisma.donorProfile.findUnique.mockResolvedValue({ lastDonationDate: daysAgo(5) });

      const response = await post(answers({ hasDonatedBefore: "NO", lastDonationDate: "" }));

      await expect(response.json()).resolves.toMatchObject({
        eligible: false,
        daysRemaining: MIN_DAYS_BETWEEN_DONATIONS - 5,
      });
    });

    it("uses the self-reported date when it is the more recent", async () => {
      prisma.donorProfile.findUnique.mockResolvedValue({ lastDonationDate: daysAgo(90) });

      const response = await post(
        answers({ hasDonatedBefore: "YES", lastDonationDate: isoDaysAgo(2) }),
      );

      await expect(response.json()).resolves.toMatchObject({
        eligible: false,
        daysRemaining: MIN_DAYS_BETWEEN_DONATIONS - 2,
      });
    });
  });
});

describe("GET /api/eligibility", () => {
  it("refuses an unauthenticated request with 401", async () => {
    const response = await GET(makeRequest({ url: "http://localhost/api/eligibility" }));

    expect(response.status).toBe(401);
  });

  it("refuses a staff account with 403", async () => {
    expect((await get(makeStaff("LAB_TECHNICIAN"))).status).toBe(403);
  });

  it("reports no assessment for a donor who has never been screened", async () => {
    const response = await get();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      eligibilityStatus: false,
      lastDonationDate: null,
      assessment: null,
    });
  });

  it("is never cached, since it describes one donor", async () => {
    const response = await get();

    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("lets the booking flow reuse a fresh pass", async () => {
    prisma.eligibilityAssessment.findFirst.mockResolvedValue({
      status: "ELIGIBLE",
      eligible: true,
      reasons: [],
      daysRemaining: 0,
      createdAt: new Date(Date.now() - 60 * 60 * 1000),
    });

    await expect((await get()).json()).resolves.toMatchObject({
      assessment: { fresh: true, reusable: true },
    });
  });

  it("does not let a stale pass be reused", async () => {
    prisma.eligibilityAssessment.findFirst.mockResolvedValue({
      status: "ELIGIBLE",
      eligible: true,
      reasons: [],
      daysRemaining: 0,
      createdAt: new Date(Date.now() - ELIGIBILITY_VALID_FOR_MS - 1000),
    });

    await expect((await get()).json()).resolves.toMatchObject({
      assessment: { fresh: false, reusable: false },
    });
  });

  it("does not let a fresh failure be reused", async () => {
    prisma.eligibilityAssessment.findFirst.mockResolvedValue({
      status: "TEMPORARILY_DEFERRED",
      eligible: false,
      reasons: ["You currently have a fever, infection, or other illness."],
      daysRemaining: 0,
      createdAt: new Date(),
    });

    await expect((await get()).json()).resolves.toMatchObject({
      assessment: { fresh: true, reusable: false },
    });
  });

  it("reads the most recent screening", async () => {
    await get();

    expect(prisma.eligibilityAssessment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { donorId: donor.id },
        orderBy: { createdAt: "desc" },
      }),
    );
  });

  it("reports the earliest next donation date for a donor inside the interval", async () => {
    prisma.donation.findFirst.mockResolvedValue({ donatedAt: daysAgo(10) });

    const body = await (await get()).json();
    const expected = daysAgo(10 - MIN_DAYS_BETWEEN_DONATIONS);

    expect(new Date(body.earliestNextDonation)).toEqual(expected);
  });

  it("reports no next-donation date once the interval has passed", async () => {
    prisma.donation.findFirst.mockResolvedValue({
      donatedAt: daysAgo(MIN_DAYS_BETWEEN_DONATIONS + 1),
    });

    await expect((await get()).json()).resolves.toMatchObject({ earliestNextDonation: null });
  });
});
