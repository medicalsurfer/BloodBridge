"use client";

import { FormEvent, useState } from "react";
import EligibilityFormFields, {
  emptyEligibilityAnswers,
  getDaysRemaining,
  requiredEligibilityFieldsMissing,
  type EligibilityAnswers,
} from "@/src/components/EligibilityFormFields";
import { PageHeader, StatGrid, Stat, Panel, PrimaryLink } from "@/src/components/ui/Page";

type EligibilityResult = "eligible" | "temporarilyDeferred" | "medicalReview" | null;

const resultLabels: Record<Exclude<EligibilityResult, null>, string> = {
  eligible: "Eligible",
  temporarilyDeferred: "Deferred",
  medicalReview: "Review",
};

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

    // Verify form conformity before sending anything to the server. This uses
    // the shared helper so this page and the booking flow enforce exactly the
    // same rules — including that "have you donated before? yes" requires a
    // date.
    if (requiredEligibilityFieldsMissing(answers)) {
      setResult(null);
      setReasons([]);
      setMessage(
        answers.hasDonatedBefore === "YES" && !answers.lastDonationDate
          ? "Please enter the date of your last donation."
          : "Please answer all required questions.",
      );
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
          : answers.hasDonatedBefore === "NO"
            ? "First-time donor"
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

  const clearedCount = result ? eligibilityFactors.filter((factor) => factor.ok).length : 0;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Donor eligibility"
        title="Check your eligibility"
        description="A preliminary screening questionnaire. Answer every question before booking your next donation — final eligibility is always confirmed on site by healthcare staff."
      />

      <div className="mt-7 mb-8">
        <StatGrid>
          <Stat
            label="Assessment"
            value={result ? resultLabels[result] : "Not assessed"}
            foot={result ? "Preliminary result" : "Submit the form below"}
            tone={
              result === "eligible"
                ? "good"
                : result === "temporarilyDeferred"
                  ? "warn"
                  : result === "medicalReview"
                    ? "critical"
                    : "default"
            }
          />
          <Stat
            label="Factors cleared"
            value={result ? `${clearedCount}/${eligibilityFactors.length}` : "—"}
            foot="Screening criteria met"
            tone={result && clearedCount === eligibilityFactors.length ? "good" : "default"}
          />
          <Stat
            label="Deferral window"
            value={daysRemaining > 0 ? String(daysRemaining) : "0"}
            foot={daysRemaining > 0 ? "Days until you can donate" : "No waiting period"}
            tone={daysRemaining > 0 ? "warn" : "good"}
          />
          <Stat
            label="Factors flagged"
            value={result ? String(reasons.length) : "—"}
            foot={result && reasons.length > 0 ? "Need review" : "None identified"}
            tone={reasons.length > 0 ? "warn" : "default"}
          />
        </StatGrid>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <Panel label="Screening questionnaire">
          <form onSubmit={handleSubmit} className="mt-6 space-y-7">
            <EligibilityFormFields answers={answers} onChange={updateAnswer} />

            {message && !result && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm font-medium text-red-800">{message}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-red-950 text-sm font-semibold text-white transition hover:brightness-125 disabled:opacity-60"
            >
              {submitting ? "Checking eligibility…" : "Check eligibility"}
            </button>
          </form>
        </Panel>

        <aside className="space-y-6">
          <Panel label="Assessment status">
            {!result && (
              <div className="mt-5">
                <div
                  aria-hidden
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500"
                >
                  <AssessmentIcon />
                </div>
                <p className="mt-4 text-[15px] font-bold text-slate-900">Not assessed</p>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Complete the questionnaire and submit it to receive your preliminary eligibility
                  result.
                </p>
              </div>
            )}

            {result === "eligible" && (
              <div className="mt-5">
                <div
                  aria-hidden
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700"
                >
                  <CheckIcon />
                </div>
                <p className="mt-4 text-[15px] font-bold text-emerald-700">You appear eligible</p>
                <p className="mt-2 text-xs leading-5 text-slate-600">{message}</p>
                <div className="mt-4">
                  <PrimaryLink href="/appointments/book">Book donation</PrimaryLink>
                </div>
              </div>
            )}

            {result === "temporarilyDeferred" && (
              <div className="mt-5">
                <div
                  aria-hidden
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700"
                >
                  <ClockIcon />
                </div>
                <p className="mt-4 text-[15px] font-bold text-amber-700">Temporarily deferred</p>
                <p className="mt-2 text-xs leading-5 text-slate-600">{message}</p>

                {daysRemaining > 0 && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="text-[26px] font-bold leading-none tabular-nums text-amber-800">
                      {daysRemaining}
                    </p>
                    <p className="mt-2 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-amber-700">
                      day{daysRemaining === 1 ? "" : "s"} until you can donate again
                    </p>
                  </div>
                )}

                <ReasonList title="Factors identified" reasons={reasons} />
              </div>
            )}

            {result === "medicalReview" && (
              <div className="mt-5">
                <div
                  aria-hidden
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-800"
                >
                  <MedicalIcon />
                </div>
                <p className="mt-4 text-[15px] font-bold text-red-800">Medical review required</p>
                <p className="mt-2 text-xs leading-5 text-slate-600">{message}</p>

                <ReasonList title="Factors requiring review" reasons={reasons} />
              </div>
            )}
          </Panel>

          <Panel
            label="Eligibility factors"
            action={
              result ? <span className="text-[11px] text-slate-400">Assessment summary</span> : undefined
            }
          >
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
          </Panel>

          <div className="rounded-2xl bg-red-950 p-6 text-white">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-red-200">
              Important
            </p>
            <p className="mt-3 text-sm font-bold">This is a preliminary check.</p>
            <p className="mt-2 text-xs leading-5 text-red-100/85">
              Final eligibility must be confirmed by qualified healthcare staff before blood
              donation.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ReasonList({ title, reasons }: { title: string; reasons: string[] }) {
  if (reasons.length === 0) return null;

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-slate-500">
        {title}
      </p>

      <ul className="mt-2.5 space-y-2">
        {reasons.map((reason, index) => (
          <li key={index} className="flex gap-2.5 text-xs leading-5 text-slate-600">
            <span aria-hidden className="mt-1.75 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
            <span>{reason}</span>
          </li>
        ))}
      </ul>
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
        <div aria-hidden className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-400">
          <MinusIcon />
        </div>
      ) : ok ? (
        <div aria-hidden className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
          <CheckSmallIcon />
        </div>
      ) : (
        <div aria-hidden className="flex h-7 w-7 items-center justify-center rounded-md bg-red-50 text-red-800">
          <XIcon />
        </div>
      )}

      <div>
        <p
          className={`text-xs font-semibold ${
            !assessed ? "text-slate-500" : ok ? "text-slate-900" : "text-red-800"
          }`}
        >
          {text}
        </p>
        <p className="mt-0.5 text-[11px] text-slate-500">
          {!assessed ? "Not assessed" : ok ? "No issue identified" : note ?? "Requires attention"}
        </p>
      </div>
    </div>
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
