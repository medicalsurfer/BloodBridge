"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

const PRIMARY_RED = "oklch(27.1% 0.105 12.094)";
const MIN_DAYS_BETWEEN_DONATIONS = 56; // 8 weeks

type Answers = {
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

type EligibilityResult =
  | "eligible"
  | "temporarilyDeferred"
  | "medicalReview"
  | null;

export default function EligibilityPage() {
  const [answers, setAnswers] = useState<Answers>({
    feelingWell: "",
    weight: "",
    currentIllness: "",
    medicalCondition: "",
    medication: "",
    pregnancyStatus: "",
    lastDonationDate: "",
    recentProcedure: "",
    infectionRisk: "",
  });

  const [result, setResult] = useState<EligibilityResult>(null);
  const [reasons, setReasons] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  function updateAnswer(field: keyof Answers, value: string) {
    setAnswers((current) => ({
      ...current,
      [field]: value,
    }));

    setResult(null);
    setReasons([]);
    setMessage("");
  }

  // Returns the number of whole days that have passed since the given date.
  function getDaysSince(date: string): number | null {
    if (!date) {
      return null;
    }

    const lastDonation = new Date(date);
    const today = new Date();

    lastDonation.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const differenceInMilliseconds = today.getTime() - lastDonation.getTime();

    return Math.floor(differenceInMilliseconds / (1000 * 60 * 60 * 24));
  }

  // Returns how many days remain until the donor is eligible again (0 if eligible now/no prior donation).
  function getDaysRemaining(date: string): number {
    const daysSince = getDaysSince(date);

    if (daysSince === null) {
      return 0;
    }

    const remaining = MIN_DAYS_BETWEEN_DONATIONS - daysSince;

    return remaining > 0 ? remaining : 0;
  }

  function isLastDonationDateAcceptable(date: string) {
    return getDaysRemaining(date) === 0;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const weight = Number(answers.weight);

    const requiredAnswers = [
      answers.feelingWell,
      answers.weight,
      answers.currentIllness,
      answers.medicalCondition,
      answers.medication,
      answers.pregnancyStatus,
      answers.recentProcedure,
      answers.infectionRisk,
    ];

    const hasMissingAnswer = requiredAnswers.some(
      (answer) => answer.trim() === "",
    );

    if (hasMissingAnswer) {
      setResult(null);
      setReasons([]);
      setMessage("Please answer all required questions.");
      return;
    }

    if (Number.isNaN(weight) || weight <= 0) {
      setResult(null);
      setReasons([]);
      setMessage("Please enter a valid weight.");
      return;
    }

    const temporaryDeferralReasons: string[] = [];
    const medicalReviewReasons: string[] = [];

    if (weight < 50) {
      temporaryDeferralReasons.push(
        "Your weight is below the preliminary minimum donation threshold of 50 kg.",
      );
    }

    if (answers.feelingWell === "NO") {
      temporaryDeferralReasons.push(
        "You indicated that you are not currently feeling well.",
      );
    }

    if (answers.currentIllness === "YES") {
      temporaryDeferralReasons.push(
        "You currently have a fever, infection, or other illness.",
      );
    }

    if (answers.pregnancyStatus === "YES") {
      temporaryDeferralReasons.push(
        "You are currently pregnant or have recently given birth.",
      );
    }

    if (answers.lastDonationDate) {
      const daysSince = getDaysSince(answers.lastDonationDate);

      if (daysSince !== null && daysSince < 0) {
        setResult(null);
        setReasons([]);
        setMessage("The last donation date cannot be in the future.");
        return;
      }

      const daysRemaining = getDaysRemaining(answers.lastDonationDate);

      if (daysRemaining > 0) {
        temporaryDeferralReasons.push(
          `Your previous blood donation was ${daysSince} day${
            daysSince === 1 ? "" : "s"
          } ago. You must wait at least ${MIN_DAYS_BETWEEN_DONATIONS} days (8 weeks) between whole blood donations, so you can donate again in ${daysRemaining} day${
            daysRemaining === 1 ? "" : "s"
          }.`,
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

    const allReasons = [
      ...temporaryDeferralReasons,
      ...medicalReviewReasons,
    ];

    if (temporaryDeferralReasons.length > 0) {
      setResult("temporarilyDeferred");
      setReasons(allReasons);
      setMessage(
        "Your answers identified factors that currently affect your preliminary eligibility.",
      );
      return;
    }

    if (medicalReviewReasons.length > 0) {
      setResult("medicalReview");
      setReasons(medicalReviewReasons);
      setMessage(
        "Your answers identified factors that require review by healthcare staff before donation.",
      );
      return;
    }

    setResult("eligible");
    setReasons([]);
    setMessage(
      "Based on the information provided, no preliminary eligibility concerns were identified.",
    );
  }

  const weight = Number(answers.weight);
  const daysRemaining = getDaysRemaining(answers.lastDonationDate);

  const eligibilityFactors = [
    {
      label: "Weight and general health",
      ok:
        answers.feelingWell === "YES" &&
        answers.weight !== "" &&
        !Number.isNaN(weight) &&
        weight >= 50,
    },
    {
      label: "Current illness or infection",
      ok: answers.currentIllness === "NO",
    },
    {
      label: "Medical conditions and medication",
      ok:
        answers.medicalCondition === "NO" &&
        answers.medication === "NO",
    },
    {
      label: "Pregnancy and recent childbirth",
      ok: answers.pregnancyStatus === "NO",
    },
    {
      label: "Previous blood donation",
      ok: isLastDonationDateAcceptable(answers.lastDonationDate),
      note:
        daysRemaining > 0
          ? `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left until eligible`
          : undefined,
    },
    {
      label: "Recent medical procedures",
      ok: answers.recentProcedure === "NO",
    },
    {
      label: "Blood transmitted infection risk",
      ok: answers.infectionRisk === "NO",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-100 p-4">
      <section className="mx-auto max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <header className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <Link href="/home" className="flex items-center gap-3">
            <div
              style={{ backgroundColor: PRIMARY_RED }}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
            >
              <BloodDropIcon />
            </div>

            <div>
              <p className="text-lg font-bold text-slate-950">
                BloodBridge
              </p>

              <p className="text-[10px] text-slate-400">
                Intelligent Blood Donation Platform
              </p>
            </div>
          </Link>

          <Link
            href="/home"
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Back to home
          </Link>
        </header>

        <div className="grid gap-8 bg-slate-50/70 px-6 py-8 lg:grid-cols-[1.3fr_0.7fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-950">
                Donor eligibility
              </p>

              <h1 className="mt-2 text-2xl font-bold text-slate-950">
                Check your eligibility
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Answer the questions below before booking your next blood
                donation.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-7 space-y-7">
              <Question
                label="Are you currently feeling well?"
                value={answers.feelingWell}
                onChange={(value) =>
                  updateAnswer("feelingWell", value)
                }
              />

              <WeightInput
                value={answers.weight}
                onChange={(value) =>
                  updateAnswer("weight", value)
                }
              />

              <Question
                label="Do you currently have a fever, infection, or other illness?"
                value={answers.currentIllness}
                onChange={(value) =>
                  updateAnswer("currentIllness", value)
                }
              />

              <Question
                label="Do you have a medical condition that may affect your ability to donate blood?"
                value={answers.medicalCondition}
                onChange={(value) =>
                  updateAnswer("medicalCondition", value)
                }
              />

              <Question
                label="Are you currently taking any medication?"
                value={answers.medication}
                onChange={(value) =>
                  updateAnswer("medication", value)
                }
              />

              <Question
                label="Are you currently pregnant or have you recently given birth?"
                value={answers.pregnancyStatus}
                onChange={(value) =>
                  updateAnswer("pregnancyStatus", value)
                }
              />

              <DonationDateInput
                value={answers.lastDonationDate}
                onChange={(value) =>
                  updateAnswer("lastDonationDate", value)
                }
                daysRemaining={daysRemaining}
              />

              <Question
                label="Have you recently had surgery, a blood transfusion, tattoo, or piercing?"
                value={answers.recentProcedure}
                onChange={(value) =>
                  updateAnswer("recentProcedure", value)
                }
              />

              <Question
                label="Have you had any recent exposure that may increase the risk of an infection transmitted through blood?"
                value={answers.infectionRisk}
                onChange={(value) =>
                  updateAnswer("infectionRisk", value)
                }
              />

              {message && !result && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm font-medium text-red-700">
                    {message}
                  </p>
                </div>
              )}

              <button
                type="submit"
                style={{ backgroundColor: PRIMARY_RED }}
                className="flex h-12 w-full items-center justify-center rounded-xl text-sm font-semibold text-white transition hover:brightness-125"
              >
                Check eligibility
              </button>
            </form>
          </section>

          <aside className="space-y-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                Assessment status
              </p>

              {!result && (
                <div className="mt-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                    <AssessmentIcon />
                  </div>

                  <p className="mt-4 text-lg font-bold text-slate-900">
                    Not assessed
                  </p>

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Complete the questionnaire and submit it to receive your
                    preliminary eligibility result.
                  </p>
                </div>
              )}

              {result === "eligible" && (
                <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <CheckIcon />
                  </div>

                  <p className="mt-4 text-lg font-bold text-emerald-700">
                    You appear eligible
                  </p>

                  <p className="mt-2 text-xs leading-5 text-emerald-700">
                    {message}
                  </p>

                  <Link
                    href="/appointments/book"
                    className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-emerald-700 px-4 text-xs font-semibold text-white transition hover:bg-emerald-800"
                  >
                    Book donation
                  </Link>
                </div>
              )}

              {result === "temporarilyDeferred" && (
                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                    <ClockIcon />
                  </div>

                  <p className="mt-4 text-lg font-bold text-amber-700">
                    Temporarily deferred
                  </p>

                  <p className="mt-2 text-xs leading-5 text-amber-700">
                    {message}
                  </p>

                  {daysRemaining > 0 && (
                    <div className="mt-4 rounded-xl bg-amber-100 px-4 py-3">
                      <p className="text-2xl font-bold text-amber-800">
                        {daysRemaining}
                      </p>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                        day{daysRemaining === 1 ? "" : "s"} until you can
                        donate again
                      </p>
                    </div>
                  )}

                  {reasons.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-bold text-amber-800">
                        Factors identified
                      </p>

                      <ul className="mt-2 space-y-2">
                        {reasons.map((reason, index) => (
                          <li
                            key={index}
                            className="flex gap-2 text-xs leading-5 text-amber-700"
                          >
                            <span className="mt-1.75 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-600" />
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {result === "medicalReview" && (
                <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                    <MedicalIcon />
                  </div>

                  <p className="mt-4 text-lg font-bold text-blue-700">
                    Medical review required
                  </p>

                  <p className="mt-2 text-xs leading-5 text-blue-700">
                    {message}
                  </p>

                  {reasons.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-bold text-blue-800">
                        Factors requiring review
                      </p>

                      <ul className="mt-2 space-y-2">
                        {reasons.map((reason, index) => (
                          <li
                            key={index}
                            className="flex gap-2 text-xs leading-5 text-blue-700"
                          >
                            <span className="mt-1.75 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                  Eligibility factors
                </p>

                {result && (
                  <span className="text-[11px] font-semibold text-slate-400">
                    Assessment summary
                  </span>
                )}
              </div>

              <div className="mt-5 space-y-4">
                {eligibilityFactors.map((factor) => (
                  <EligibilityItem
                    key={factor.label}
                    text={factor.label}
                    ok={factor.ok}
                    assessed={result !== null}
                    note={factor.note}
                  />
                ))}
              </div>
            </div>

            <div
              style={{ backgroundColor: PRIMARY_RED }}
              className="rounded-3xl p-5 text-white"
            >
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-100">
                Important
              </p>

              <p className="mt-3 text-sm font-bold">
                This is a preliminary check.
              </p>

              <p className="mt-2 text-xs leading-5 text-red-100/80">
                Final eligibility must be confirmed by qualified healthcare
                staff before blood donation.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function Question({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-800">
        {label}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onChange("YES")}
          className={`h-11 rounded-xl border text-sm font-semibold transition ${
            value === "YES"
              ? "border-red-950 bg-red-950 text-white"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          Yes
        </button>

        <button
          type="button"
          onClick={() => onChange("NO")}
          className={`h-11 rounded-xl border text-sm font-semibold transition ${
            value === "NO"
              ? "border-red-950 bg-red-950 text-white"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          No
        </button>
      </div>
    </div>
  );
}

function WeightInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label
        htmlFor="weight"
        className="block text-sm font-semibold text-slate-800"
      >
        What is your current weight?
      </label>

      <p className="mt-1 text-xs text-slate-500">
        Enter your weight in kilograms.
      </p>

      <div className="relative mt-3">
        <input
          id="weight"
          type="number"
          min="1"
          max="300"
          step="0.1"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Example: 70"
          className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-14 text-sm text-slate-800 outline-none focus:border-red-950"
        />

        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500">
          kg
        </span>
      </div>
    </div>
  );
}

function DonationDateInput({
  value,
  onChange,
  daysRemaining,
}: {
  value: string;
  onChange: (value: string) => void;
  daysRemaining: number;
}) {
  const today = new Date().toISOString().split("T")[0];

  return (
    <div>
      <label
        htmlFor="lastDonationDate"
        className="block text-sm font-semibold text-slate-800"
      >
        When did you last donate blood?
      </label>

      <p className="mt-1 text-xs text-slate-500">
        Leave this blank if you have never donated blood. A minimum of 8
        weeks (56 days) is required between whole blood donations.
      </p>

      <input
        id="lastDonationDate"
        type="date"
        value={value}
        max={today}
        onChange={(event) => onChange(event.target.value)}
        className="mt-3 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-red-950"
      />

      {value && daysRemaining > 0 && (
        <p className="mt-2 text-xs font-semibold text-amber-700">
          {daysRemaining} day{daysRemaining === 1 ? "" : "s"} left before you
          can donate again.
        </p>
      )}

      {value && daysRemaining === 0 && (
        <p className="mt-2 text-xs font-semibold text-emerald-700">
          You have met the 8-week interval and are eligible to donate again
          based on this date.
        </p>
      )}
    </div>
  );
}

function EligibilityItem({
  text,
  ok,
  assessed,
  note,
}: {
  text: string;
  ok: boolean;
  assessed: boolean;
  note?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      {!assessed ? (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <MinusIcon />
        </div>
      ) : ok ? (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <CheckSmallIcon />
        </div>
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-700">
          <XIcon />
        </div>
      )}

      <div>
        <p
          className={`text-xs font-semibold ${
            !assessed
              ? "text-slate-500"
              : ok
                ? "text-emerald-700"
                : "text-red-700"
          }`}
        >
          {text}
        </p>

        <p className="mt-0.5 text-[11px] text-slate-400">
          {!assessed
            ? "Not assessed"
            : ok
              ? "No issue identified"
              : note ?? "Requires attention"}
        </p>
      </div>
    </div>
  );
}

function BloodDropIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M12 3.5c2.8 3.8 7 8.9 7 12.5a7 7 0 1 1-14 0c0-3.6 4.2-8.7 7-12.5Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        d="m5 12 4 4L19 6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckSmallIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path
        d="m6 12 4 4 8-8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path
        d="M7 7l10 10M17 7 7 17"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path d="M7 12h10" strokeLinecap="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2.5 2" strokeLinecap="round" />
    </svg>
  );
}

function MedicalIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M7 12h10" strokeLinecap="round" />
    </svg>
  );
}

function AssessmentIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M8 4h8M9 3h6v3H9z" />
      <path d="M7 5H5.5A1.5 1.5 0 0 0 4 6.5v13A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5v-13A1.5 1.5 0 0 0 18.5 5H17" />
      <path
        d="m8 13 2 2 5-5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}