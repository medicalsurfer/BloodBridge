import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getAuthenticatedDonor } from "@/src/lib/auth";
import { evaluateEligibility, type EligibilityAnswers } from "@/src/lib/eligibility";

const requiredFields: (keyof EligibilityAnswers)[] = [
  "feelingWell",
  "weight",
  "currentIllness",
  "medicalCondition",
  "medication",
  "pregnancyStatus",
  "recentProcedure",
  "infectionRisk",
];

export async function GET(request: NextRequest) {
  const authentication = await getAuthenticatedDonor(request);

  if (!authentication.user) {
    return NextResponse.json(
      { error: authentication.error },
      { status: authentication.status },
    );
  }

  const donorProfile = await prisma.donorProfile.findUnique({
    where: { userId: authentication.user.id },
    select: { eligibilityStatus: true, lastDonationDate: true },
  });

  return NextResponse.json(
    {
      eligibilityStatus: donorProfile?.eligibilityStatus ?? false,
      lastDonationDate: donorProfile?.lastDonationDate ?? null,
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

  await prisma.donorProfile.upsert({
    where: { userId: authentication.user.id },
    create: {
      userId: authentication.user.id,
      eligibilityStatus: result.eligible,
    },
    update: {
      eligibilityStatus: result.eligible,
    },
  });

  return NextResponse.json(result, { status: 200 });
}
