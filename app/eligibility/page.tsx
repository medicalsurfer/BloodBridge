"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import EligibilityFormFields, {
  emptyEligibilityAnswers,
  getDaysRemaining,
  type EligibilityAnswers,
} from "@/src/components/EligibilityFormFields";

const PRIMARY_RED = "oklch(27.1% 0.105 12.094)";

type EligibilityResult = "eligible" | "temporarilyDeferred" | "medicalReview" | null;

const statusToResult: Record<string, EligibilityResult> = {
  ELIGIBLE: "eligible",
  TEMPORARILY_DEFERRED: "temporarilyDeferred",
  MEDICAL_REVIEW: "medicalReview",
};

export default function EligibilityPage() {
  const [answers, setAnswers] = useState<EligibilityAnswers>(emptyEligibilityAnswers);
  const [result, setResult] = useState<EligibilityResult>(null);
  const [reasons, setReasons] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function updateAnswer(field: keyof EligibilityAnswers, value: string) {
    setAnswers((current) => ({ ...current, [field]: value }));
    setResult(null);
    setReasons([]);
    setMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Verify form conformity before sending anything to the server.
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

    if (requiredAnswers.some((answer) => answer.trim() === "")) {
      setResult(null);
      setReasons([]);
      setMessage("Please answer all required questions.");
      return;
    }

    const weight = Number(answers.weight);

    if (Number.isNaN(weight) || weight <= 0) {
      setResult(null);
      setReasons([]);
      setMessage("Please enter a valid weight.");
      return;
    }

    if (answers.lastDonationDate) {
      const submittedDate = new Date(`${answers.lastDonationDate}T00:00:00`);

      if (submittedDate > new Date()) {
        setResult(null);
        setReasons([]);
        setMessage("The last donation date cannot be in the future.");
        return;
      }
    }

    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/eligibility", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(answers),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to check eligibility right now.");
      }

      const mappedResult = statusToResult[data.status] ?? null;
      setResult(mappedResult);
      setReasons(data.reasons ?? []);
      setMessage(
        mappedResult === "eligible"
          ? "Based on the information provided, no preliminary eligibility concerns were identified."
          : mappedResult === "temporarilyDeferred"
            ? "Your answers identified factors that currently affect your preliminary eligibility."
            : "Your answers identified factors that require review by healthcare staff before donation.",
      );
    } catch (submitError) {
      setResult(null);
      setReasons([]);
      setMessage(
        submitError instanceof Error
          ? submitError.message
          : "Unable to check eligibility right now.",
      );
    } finally {
      setSubmitting(false);
    }
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
      ok: answers.medicalCondition === "NO" && answers.medication === "NO",
    },
    {
      label: "Pregnancy and recent childbirth",
      ok: answers.pregnancyStatus === "NO",
    },
    {
      label: "Previous blood donation",
      ok: getDaysRemaining(answers.lastDonationDate) === 0,
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
      <section className="mx-auto max-w-375 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <header className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <Link href="/home" className="flex items-center gap-3">
            <div style={{ backgroundColor: PRIMARY_RED }} className="flex h-10 w-10 items-center justify-center rounded-xl text-white">
              <BloodDropIcon />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-950">BloodBridge</p>
              <p className="text-[10px] text-slate-400">Intelligent Blood Donation Platform</p>
            </div>
          </Link>

          <Link href="/home" className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">
            Back to home
          </Link>
        </header>

        <div className="grid gap-8 bg-slate-50/70 px-6 py-8 lg:grid-cols-[1.3fr_0.7fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-950">Donor eligibility</p>
              <h1 className="mt-2 text-2xl font-bold text-slate-950">Check your eligibility</h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Answer the questions below before booking your next blood donation.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-7 space-y-7">
              <EligibilityFormFields answers={answers} onChange={updateAnswer} />

              {message && !result && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm font-medium text-red-700">{message}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                style={{ backgroundColor: PRIMARY_RED }}
                className="flex h-12 w-full items-center justify-center rounded-xl text-sm font-semibold text-white transition hover:brightness-125 disabled:opacity-60"
              >
                {submitting ? "Checking eligibility..." : "Check eligibility"}
              </button>
            </form>
          </section>

          <aside className="space-y-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Assessment status</p>

              {!result && (
                <div className="mt-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                    <AssessmentIcon />
                  </div>
                  <p className="mt-4 text-lg font-bold text-slate-900">Not assessed</p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Complete the questionnaire and submit it to receive your preliminary
                    eligibility result.
                  </p>
                </div>
              )}

              {result === "eligible" && (
                <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <CheckIcon />
                  </div>
                  <p className="mt-4 text-lg font-bold text-emerald-700">You appear eligible</p>
                  <p className="mt-2 text-xs leading-5 text-emerald-700">{message}</p>
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
                  <p className="mt-4 text-lg font-bold text-amber-700">Temporarily deferred</p>
                  <p className="mt-2 text-xs leading-5 text-amber-700">{message}</p>

                  {daysRemaining > 0 && (
                    <div className="mt-4 rounded-xl bg-amber-100 px-4 py-3">
                      <p className="text-2xl font-bold text-amber-800">{daysRemaining}</p>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                        day{daysRemaining === 1 ? "" : "s"} until you can donate again
                      </p>
                    </div>
                  )}

                  {reasons.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-bold text-amber-800">Factors identified</p>
                      <ul className="mt-2 space-y-2">
                        {reasons.map((reason, index) => (
                          <li key={index} className="flex gap-2 text-xs leading-5 text-amber-700">
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
                  <p className="mt-4 text-lg font-bold text-blue-700">Medical review required</p>
                  <p className="mt-2 text-xs leading-5 text-blue-700">{message}</p>

                  {reasons.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-bold text-blue-800">Factors requiring review</p>
                      <ul className="mt-2 space-y-2">
                        {reasons.map((reason, index) => (
                          <li key={index} className="flex gap-2 text-xs leading-5 text-blue-700">
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
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Eligibility factors</p>
                {result && <span className="text-[11px] font-semibold text-slate-400">Assessment summary</span>}
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

            <div style={{ backgroundColor: PRIMARY_RED }} className="rounded-3xl p-5 text-white">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-100">Important</p>
              <p className="mt-3 text-sm font-bold">This is a preliminary check.</p>
              <p className="mt-2 text-xs leading-5 text-red-100/80">
                Final eligibility must be confirmed by qualified healthcare staff before blood
                donation.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
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
            !assessed ? "text-slate-500" : ok ? "text-emerald-700" : "text-red-700"
          }`}
        >
          {text}
        </p>
        <p className="mt-0.5 text-[11px] text-slate-400">
          {!assessed ? "Not assessed" : ok ? "No issue identified" : note ?? "Requires attention"}
        </p>
      </div>
    </div>
  );
}

function BloodDropIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3.5c2.8 3.8 7 8.9 7 12.5a7 7 0 1 1-14 0c0-3.6 4.2-8.7 7-12.5Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m5 12 4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckSmallIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="m6 12 4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M7 7l10 10M17 7 7 17" strokeLinecap="round" />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M7 12h10" strokeLinecap="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2.5 2" strokeLinecap="round" />
    </svg>
  );
}

function MedicalIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M7 12h10" strokeLinecap="round" />
    </svg>
  );
}

function AssessmentIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M8 4h8M9 3h6v3H9z" />
      <path d="M7 5H5.5A1.5 1.5 0 0 0 4 6.5v13A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5v-13A1.5 1.5 0 0 0 18.5 5H17" />
      <path d="m8 13 2 2 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
