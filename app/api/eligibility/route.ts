import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getAuthenticatedDonor } from "@/src/lib/auth";
import {
  evaluateEligibility,
  isAssessmentFresh,
  assessmentExpiresAt,
  type EligibilityAnswers,
} from "@/src/lib/eligibility";
import { getDonationWindow } from "@/src/lib/donation-window";

const requiredFields: (keyof EligibilityAnswers)[] = [
  "feelingWell",
  "weight",
  "currentIllness",
  "medicalCondition",
  "medication",
  "pregnancyStatus",
  "recentProcedure",
  "infectionRisk",
  "hasDonatedBefore",
];

export async function GET(request: NextRequest) {
  const authentication = await getAuthenticatedDonor(request);

  if (!authentication.user) {
    return NextResponse.json(
      { error: authentication.error },
      { status: authentication.status },
    );
  }

  const [donorProfile, latestAssessment, donationWindow] = await Promise.all([
    prisma.donorProfile.findUnique({
      where: { userId: authentication.user.id },
      select: { eligibilityStatus: true, lastDonationDate: true },
    }),
    prisma.eligibilityAssessment.findFirst({
      where: { donorId: authentication.user.id },
      orderBy: { createdAt: "desc" },
    }),
    getDonationWindow(authentication.user.id),
  ]);

  const fresh = isAssessmentFresh(latestAssessment?.createdAt);

  return NextResponse.json(
    {
      eligibilityStatus: donorProfile?.eligibilityStatus ?? false,
      lastDonationDate: donorProfile?.lastDonationDate ?? null,

      // The earliest date a donation appointment may be booked for, or null
      // when the donor is already past the interval.
      earliestNextDonation: donationWindow.earliestNextDonation,

      // The booking flow reads this to decide whether it can skip its own
      // copy of the questionnaire.
      assessment: latestAssessment
        ? {
            status: latestAssessment.status,
            eligible: latestAssessment.eligible,
            reasons: latestAssessment.reasons,
            daysRemaining: latestAssessment.daysRemaining,
            createdAt: latestAssessment.createdAt,
            expiresAt: assessmentExpiresAt(latestAssessment.createdAt),
            fresh,
            // Only a fresh *pass* lets the donor skip ahead.
            reusable: fresh && latestAssessment.eligible,
          }
        : null,
    },
    { status: 200, headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function POST(request: NextRequest) {
  const authentication = await getAuthenticatedDonor(request);

  if (!authentication.user) {
    return NextResponse.json(
      { error: authentication.error },
      { status: authentication.status },
    );
  }

  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "A valid eligibility form is required." }, { status: 400 });
  }

  const answers: EligibilityAnswers = {
    feelingWell: String(body.feelingWell ?? ""),
    weight: String(body.weight ?? ""),
    currentIllness: String(body.currentIllness ?? ""),
    medicalCondition: String(body.medicalCondition ?? ""),
    medication: String(body.medication ?? ""),
    pregnancyStatus: String(body.pregnancyStatus ?? ""),
    hasDonatedBefore: String(body.hasDonatedBefore ?? ""),
    lastDonationDate: String(body.lastDonationDate ?? ""),
    recentProcedure: String(body.recentProcedure ?? ""),
    infectionRisk: String(body.infectionRisk ?? ""),
  };

  const missingField = requiredFields.some((field) => answers[field].trim() === "");

  if (missingField) {
    return NextResponse.json(
      { error: "Please answer all required questions before submitting." },
      { status: 400 },
    );
  }

  // A donor who says they have donated before must supply the date: without
  // it the 8-week interval cannot be checked, and a blank would be read as
  // "never donated". The client enforces this too; the server does not trust
  // the client.
  if (answers.hasDonatedBefore === "YES" && answers.lastDonationDate.trim() === "") {
    return NextResponse.json(
      { error: "Please provide the date of your last donation." },
      { status: 400 },
    );
  }

  const weight = Number(answers.weight);

  if (Number.isNaN(weight) || weight <= 0) {
    return NextResponse.json({ error: "Please enter a valid weight." }, { status: 400 });
  }

  if (answers.lastDonationDate) {
    const submittedDate = new Date(`${answers.lastDonationDate}T00:00:00`);

    if (submittedDate > new Date()) {
      return NextResponse.json(
        { error: "The last donation date cannot be in the future." },
        { status: 400 },
      );
    }
  }

  const donorProfile = await prisma.donorProfile.findUnique({
    where: { userId: authentication.user.id },
    select: { lastDonationDate: true },
  });

  const result = evaluateEligibility(answers, donorProfile?.lastDonationDate ?? null);

  // The screening is recorded as a clinical event, and the profile's summary
  // flag is updated from it. The flag alone cannot express *when* the donor
  // was screened, which is what makes a result safe to reuse or not.
  const [assessment] = await prisma.$transaction([
    prisma.eligibilityAssessment.create({
      data: {
        donorId: authentication.user.id,
        status: result.status,
        eligible: result.eligible,
        reasons: result.reasons,
        daysRemaining: result.daysRemaining,
        answers,
      },
    }),
    prisma.donorProfile.upsert({
      where: { userId: authentication.user.id },
      create: {
        userId: authentication.user.id,
        eligibilityStatus: result.eligible,
      },
      update: {
        eligibilityStatus: result.eligible,
      },
    }),
  ]);

  return NextResponse.json(
    {
      ...result,
      assessment: {
        createdAt: assessment.createdAt,
        expiresAt: assessmentExpiresAt(assessment.createdAt),
        reusable: result.eligible,
      },
    },
    { status: 200 },
  );
}
