"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { APPOINTMENT_TIMES } from "@/src/lib/appointment-slots";
import Link from "next/link";
import EligibilityFormFields, {
  emptyEligibilityAnswers,
  requiredEligibilityFieldsMissing,
  type EligibilityAnswers,
} from "@/src/components/EligibilityFormFields";
import { PageHeader, Panel, Eyebrow } from "@/src/components/ui/Page";

type Hospital = {
  id: string;
  name: string;
  location: string;
  availability: string;
};

type BookingForm = {
  hospitalId: string;
  appointmentDate: string;
  appointmentTime: string;
  notes: string;
};

type AuthUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
};

type EligibilityApiResult = {
  status: "ELIGIBLE" | "TEMPORARILY_DEFERRED" | "MEDICAL_REVIEW";
  eligible: boolean;
  reasons: string[];
  daysRemaining: number;
};

// A screening already on file, as reported by GET /api/eligibility.
type StoredAssessment = {
  status: "ELIGIBLE" | "TEMPORARILY_DEFERRED" | "MEDICAL_REVIEW";
  eligible: boolean;
  reasons: string[];
  daysRemaining: number;
  createdAt: string;
  expiresAt: string;
  fresh: boolean;
  reusable: boolean;
};

type Step = "eligibility" | "booking";

const appointmentTimes = APPOINTMENT_TIMES;

export default function BookDonationPage() {
  // Step 1: eligibility form -> POST /api/eligibility -> gate.
  // Step 2: hospital/date/time booking form -> POST /api/appointments -> gate.
  // This mirrors the Donor / System / DBMS activity diagram exactly.
  const [step, setStep] = useState<Step>("eligibility");

  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loadingHospitals, setLoadingHospitals] = useState(true);

  const [form, setForm] = useState<BookingForm>({
    hospitalId: "",
    appointmentDate: "",
    appointmentTime: "",
    notes: "",
  });

  const [eligibilityAnswers, setEligibilityAnswers] = useState<EligibilityAnswers>(
    emptyEligibilityAnswers,
  );
  const [eligibilityError, setEligibilityError] = useState("");
  const [eligibilitySubmitting, setEligibilitySubmitting] = useState(false);
  const [eligibilityResult, setEligibilityResult] = useState<EligibilityApiResult | null>(
    null,
  );

  // A screening completed on /eligibility (or earlier here) is reused rather
  // than asked again. Starts null so the form is not flashed before we know.
  const [reusedAssessment, setReusedAssessment] = useState<StoredAssessment | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(true);
  // Earliest date the donation interval allows, from GET /api/eligibility.
  const [earliestNextDonation, setEarliestNextDonation] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    async function loadCurrentUser() {
      try {
        setLoadingUser(true);

        const response = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok || !data.user) {
          throw new Error(
            data.error || "You must be signed in to book an appointment.",
          );
        }

        setUser(data.user);
      } catch (error) {
        console.error("CURRENT USER LOAD ERROR:", error);
        setEligibilityError(
          error instanceof Error
            ? error.message
            : "Unable to identify the signed-in donor.",
        );
      } finally {
        setLoadingUser(false);
      }
    }

    loadCurrentUser();
  }, []);

  useEffect(() => {
    // Look for a screening already on file. A fresh pass sends the donor
    // straight to the booking step; anything else leaves the form in place.
    async function loadExistingAssessment() {
      try {
        const response = await fetch("/api/eligibility", {
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) return;

        const data = await response.json();
        const assessment: StoredAssessment | null = data.assessment ?? null;

        if (data.earliestNextDonation) {
          setEarliestNextDonation(new Date(data.earliestNextDonation).toISOString().split("T")[0]);
        }

        if (assessment?.reusable) {
          setReusedAssessment(assessment);
          setEligibilityResult({
            status: assessment.status,
            eligible: assessment.eligible,
            reasons: assessment.reasons,
            daysRemaining: assessment.daysRemaining,
          });
          setStep("booking");
        }
      } catch {
        // A failure here only means the donor fills the form as before.
      } finally {
        setCheckingExisting(false);
      }
    }

    loadExistingAssessment();
  }, []);

  useEffect(() => {
    async function loadHospitals() {
      try {
        setLoadingHospitals(true);

        const response = await fetch("/api/institutes", {
          credentials: "include",
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Unable to load donation centres.",
          );
        }

        const activeHospitals: Hospital[] = data.institutes.map(
          (institute: {
            id: string;
            name: string;
            city: string;
            region: string | null;
          }) => ({
            id: institute.id,
            name: institute.name,
            location: institute.region
              ? `${institute.city}, ${institute.region}`
              : institute.city,
            availability: "Appointments available",
          }),
        );

        setHospitals(activeHospitals);

        const instituteId = new URLSearchParams(
          window.location.search,
        ).get("instituteId");

        if (
          instituteId &&
          activeHospitals.some(
            (hospital) => hospital.id === instituteId,
          )
        ) {
          setForm((current) => ({
            ...current,
            hospitalId: instituteId,
          }));
        }
      } catch (error) {
        console.error("DONATION CENTRES LOAD ERROR:", error);
        setError("Unable to load donation centres.");
      } finally {
        setLoadingHospitals(false);
      }
    }

    loadHospitals();
  }, []);

  const selectedHospital = useMemo(
    () => hospitals.find((hospital) => hospital.id === form.hospitalId),
    [form.hospitalId, hospitals],
  );

  const today = new Date().toISOString().split("T")[0];
  // A donation cannot be booked before the interval since the last one has passed.
  const earliestBookableDate =
    earliestNextDonation && earliestNextDonation > today ? earliestNextDonation : today;

  function updateForm(field: keyof BookingForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setError("");
    setSubmitted(false);
  }

  function updateEligibilityAnswer(field: keyof EligibilityAnswers, value: string) {
    setEligibilityAnswers((current) => ({
      ...current,
      [field]: value,
    }));

    setEligibilityError("");
  }

  // Step 1: "Fill out eligibility form" -> client conformity check -> "Send
  // eligibility query" -> DBMS executes -> "Send query result" -> "Verify
  // result". Only a passing result advances to the booking step.
  async function handleEligibilitySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      setEligibilityError("You must be signed in to book an appointment.");
      return;
    }

    if (user.role !== "DONOR") {
      setEligibilityError("Only donor accounts can book donation appointments.");
      return;
    }

    if (requiredEligibilityFieldsMissing(eligibilityAnswers)) {
      setEligibilityError("Please answer all required questions before continuing.");
      return;
    }

    const weight = Number(eligibilityAnswers.weight);

    if (Number.isNaN(weight) || weight <= 0) {
      setEligibilityError("Please enter a valid weight.");
      return;
    }

    if (eligibilityAnswers.lastDonationDate) {
      const submittedDate = new Date(
        `${eligibilityAnswers.lastDonationDate}T00:00:00`,
      );

      if (submittedDate > new Date()) {
        setEligibilityError("The last donation date cannot be in the future.");
        return;
      }
    }

    try {
      setEligibilitySubmitting(true);
      setEligibilityError("");
      setEligibilityResult(null);

      const response = await fetch("/api/eligibility", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eligibilityAnswers),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to verify eligibility.");
      }

      setEligibilityResult(data);

      if (data.eligible) {
        setStep("booking");
      }
    } catch (error) {
      console.error("ELIGIBILITY CHECK ERROR:", error);

      setEligibilityError(
        error instanceof Error
          ? error.message
          : "Unable to verify eligibility.",
      );
    } finally {
      setEligibilitySubmitting(false);
    }
  }

  // Step 2: "Fill out booking form" -> client conformity check -> "Send
  // booking request" -> DBMS save -> "Verify result". The server re-checks
  // eligibility as a second gate (defence in depth) in case it changed or
  // expired between steps; if it rejects, we send the donor back to Step 1.
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      setError("You must be signed in to book an appointment.");
      return;
    }

    if (user.role !== "DONOR") {
      setError("Only donor accounts can book donation appointments.");
      return;
    }

    if (!form.hospitalId) {
      setError("Please select a hospital.");
      return;
    }

    if (!form.appointmentDate) {
      setError("Please select an appointment date.");
      return;
    }

    if (!form.appointmentTime) {
      setError("Please select an appointment time.");
      return;
    }

    if (form.appointmentDate < today) {
      setError("The appointment date cannot be in the past.");
      return;
    }

    if (form.appointmentDate < earliestBookableDate) {
      setError(
        `You must wait between donations. The earliest date you can book is ${formatDate(earliestBookableDate)}.`,
      );
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSubmitted(false);

      const response = await fetch("/api/appointments", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          healthInstituteId: form.hospitalId,
          appointmentDate: form.appointmentDate,
          appointmentTime: form.appointmentTime,
          notes: form.notes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.eligibilityRequired) {
          setStep("eligibility");
          setEligibilityError(
            data.error ||
              "Please complete the eligibility check before booking an appointment.",
          );
          return;
        }

        throw new Error(
          data.error || "Unable to book appointment.",
        );
      }

      setSubmitted(true);
    } catch (error) {
      console.error("APPOINTMENT BOOKING ERROR:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to book appointment.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Until we know whether a screening is already on file, show neither step —
  // otherwise the questionnaire appears for a moment and is then replaced,
  // which reads as a glitch and invites the donor to start answering it.
  if (checkingExisting) {
    return (
      <div className="mx-auto max-w-6xl">
        <PageHeader
          eyebrow="Book a donation"
          title="Book a donation"
          description="Checking whether you have already completed an eligibility screening…"
        />

        <div className="mt-7 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="h-2 w-40 animate-pulse rounded-full bg-slate-200" />
          <div className="mt-4 h-2 w-64 animate-pulse rounded-full bg-slate-100" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-6xl">
        <PageHeader
          eyebrow="Book a donation"
          title={step === "eligibility" ? "Eligibility check" : "Booking details"}
          description={
            step === "eligibility"
              ? "Answer these questions so we can verify you are eligible to donate before choosing a hospital and time."
              : reusedAssessment
                ? "You have already been screened, so this step is done. Select a hospital, choose an available date and time, then confirm your appointment."
                : "You passed the eligibility check. Select a hospital, choose an available date and time, then confirm your appointment."
          }
        />

        <ol className="mt-7 flex items-center gap-3">
          <StepPill
            number={1}
            label="Eligibility check"
            active={step === "eligibility"}
            done={step === "booking"}
          />
          <div className="h-px flex-1 bg-slate-200" />
          <StepPill number={2} label="Booking details" active={step === "booking"} done={false} />
        </ol>

        {/* When a stored screening is what got the donor here, say so plainly
            and let them redo it — a reused clinical result should never be
            silent, and health can change between the two pages. */}
        {step === "booking" && reusedAssessment && (
          <div
            className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4"
            style={{ animation: "var(--animate-rise)" }}
          >
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-emerald-900">
                Using your existing eligibility check
              </p>

              <p className="mt-1 text-xs leading-5 text-emerald-800">
                Screened {formatAssessmentTime(reusedAssessment.createdAt)} · valid until{" "}
                {formatAssessmentTime(reusedAssessment.expiresAt)}. If your health has changed
                since then, run the check again.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setReusedAssessment(null);
                setEligibilityResult(null);
                setEligibilityAnswers(emptyEligibilityAnswers);
                setStep("eligibility");
              }}
              className="inline-flex h-9 shrink-0 items-center rounded-lg border border-emerald-300 bg-white px-4 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
            >
              Run the check again
            </button>
          </div>
        )}

        <div className="mt-7 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          {step === "eligibility" ? (
            <Panel label="Step 1 of 2 · Screening">
              <form onSubmit={handleEligibilitySubmit} className="mt-6 space-y-8">
                <EligibilityFormFields
                  answers={eligibilityAnswers}
                  onChange={updateEligibilityAnswer}
                />

                {eligibilityError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 text-red-700">
                        <AlertIcon />
                      </div>

                      <p className="text-sm font-medium text-red-700">
                        {eligibilityError}
                      </p>
                    </div>
                  </div>
                )}

                {eligibilityResult && !eligibilityResult.eligible && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-bold text-amber-800">
                      {eligibilityResult.status === "MEDICAL_REVIEW"
                        ? "Medical review required"
                        : "Temporarily deferred"}
                    </p>

                    <ul className="mt-2 space-y-1 text-xs leading-5 text-amber-700">
                      {eligibilityResult.reasons.map((reason, index) => (
                        <li key={index}>• {reason}</li>
                      ))}
                    </ul>

                    <p className="mt-3 text-xs leading-5 text-amber-700">
                      You cannot book a donation appointment right now. Please
                      check back once this is resolved, or contact a health
                      institute directly if you have questions.
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={eligibilitySubmitting || loadingUser}
                  className="flex h-12 w-full items-center justify-center rounded-xl bg-red-950 text-[13px] font-semibold text-white transition hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {eligibilitySubmitting
                    ? "Checking eligibility…"
                    : "Check eligibility & continue"}
                </button>
              </form>
            </Panel>
          ) : (
            <Panel label="Step 2 of 2 · Appointment">
              <button
                type="button"
                onClick={() => setStep("eligibility")}
                className="mt-4 inline-flex items-center text-xs font-semibold text-red-950 underline-offset-4 hover:underline"
              >
                ← Back to eligibility check
              </button>

              <form onSubmit={handleSubmit} className="mt-7 space-y-8">
                <div>
                  <div className="flex items-center gap-3">
                    <StepNumber number="1" />

                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        Select hospital
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Choose where you would like to donate blood.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {loadingHospitals ? (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                        Loading donation centres...
                      </div>
                    ) : hospitals.length === 0 ? (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                        <p className="text-sm font-bold text-amber-800">
                          No active donation centres available
                        </p>

                        <p className="mt-1 text-xs leading-5 text-amber-700">
                          There are currently no active health institutes available for donation appointments.
                        </p>
                      </div>
                    ) : (
                      hospitals.map((hospital) => {
                        const selected =
                          form.hospitalId === hospital.id;

                        return (
                        <button
                          key={hospital.id}
                          type="button"
                          onClick={() =>
                            updateForm("hospitalId", hospital.id)
                          }
                          className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${
                            selected
                              ? "border-red-950 bg-red-50"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-4">
                            <div
                              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                                selected
                                  ? "bg-red-950 text-white"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              <HospitalIcon />
                            </div>

                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-900">
                                {hospital.name}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {hospital.location}
                              </p>

                              <p
                                className={`mt-1 text-[11px] font-semibold ${
                                  hospital.availability ===
                                  "Limited availability"
                                    ? "text-amber-600"
                                    : "text-emerald-600"
                                }`}
                              >
                                {hospital.availability}
                              </p>
                            </div>
                          </div>

                          <div
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                              selected
                                ? "border-red-950 bg-red-950 text-white"
                                : "border-slate-300 text-transparent"
                            }`}
                          >
                            <CheckSmallIcon />
                          </div>
                        </button>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-7">
                  <div className="flex items-center gap-3">
                    <StepNumber number="2" />

                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        Choose a date
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Select the day you want to donate.
                      </p>
                    </div>
                  </div>

                  {earliestNextDonation && earliestNextDonation > today && (
                    <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
                      You donated recently, so the earliest date you can book is{" "}
                      <span className="font-semibold">{formatDate(earliestNextDonation)}</span>.
                    </p>
                  )}

                  <input
                    type="date"
                    value={form.appointmentDate}
                    min={earliestBookableDate}
                    onChange={(event) =>
                      updateForm(
                        "appointmentDate",
                        event.target.value,
                      )
                    }
                    className="mt-5 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-red-950 focus:ring-1 focus:ring-red-950"
                  />
                </div>

                <div className="border-t border-slate-100 pt-7">
                  <div className="flex items-center gap-3">
                    <StepNumber number="3" />

                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        Select appointment time
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Choose your preferred appointment time.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {appointmentTimes.map((time) => {
                      const selected =
                        form.appointmentTime === time;

                      return (
                        <button
                          key={time}
                          type="button"
                          onClick={() =>
                            updateForm("appointmentTime", time)
                          }
                          className={`h-11 rounded-xl border text-sm font-semibold transition ${
                            selected
                              ? "border-red-950 bg-red-950 text-white"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-7">
                  <div className="flex items-center gap-3">
                    <StepNumber number="4" />

                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        Additional information
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Add any information you would like healthcare staff
                        to know.
                      </p>
                    </div>
                  </div>

                  <textarea
                    value={form.notes}
                    onChange={(event) =>
                      updateForm("notes", event.target.value)
                    }
                    rows={4}
                    maxLength={500}
                    placeholder="Optional notes"
                    className="mt-5 w-full resize-none rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-red-950 focus:ring-1 focus:ring-red-950"
                  />

                  <p className="mt-2 text-right text-[11px] text-slate-400">
                    {form.notes.length}/500
                  </p>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 text-red-700">
                        <AlertIcon />
                      </div>

                      <p className="text-sm font-medium text-red-700">
                        {error}
                      </p>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={
                    loadingHospitals ||
                    loadingUser ||
                    submitting ||
                    hospitals.length === 0 ||
                    !user
                  }
                  className="flex h-12 w-full items-center justify-center rounded-xl bg-red-950 text-[13px] font-semibold text-white transition hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Booking…" : "Confirm appointment"}
                </button>
              </form>
            </Panel>
          )}

          <aside className="space-y-6">
            {step === "booking" && (
              <Panel label="Appointment summary">
                <div className="mt-5 space-y-5">
                  <SummaryItem
                    icon={<HospitalIcon />}
                    label="Hospital"
                    value={
                      selectedHospital
                        ? selectedHospital.name
                        : "Not selected"
                    }
                    completed={Boolean(selectedHospital)}
                  />

                  <SummaryItem
                    icon={<CalendarIcon />}
                    label="Date"
                    value={
                      form.appointmentDate
                        ? formatDate(form.appointmentDate)
                        : "Not selected"
                    }
                    completed={Boolean(form.appointmentDate)}
                  />

                  <SummaryItem
                    icon={<ClockIcon />}
                    label="Time"
                    value={
                      form.appointmentTime || "Not selected"
                    }
                    completed={Boolean(form.appointmentTime)}
                  />
                </div>
              </Panel>
            )}

            {submitted && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
                <div
                  aria-hidden
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700"
                >
                  <CheckIcon />
                </div>

                <p className="mt-4 text-[15px] font-bold text-emerald-800">Appointment confirmed</p>

                <p className="mt-2 text-xs leading-5 text-emerald-800">
                  Your donation appointment has been saved successfully.
                </p>

                <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-4">
                  <p className="text-[13px] font-semibold text-slate-900">
                    {selectedHospital?.name}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {formatDate(form.appointmentDate)} at {form.appointmentTime}
                  </p>
                </div>

                <Link
                  href="/appointments"
                  className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-emerald-700 px-4 text-xs font-semibold text-white transition hover:bg-emerald-800"
                >
                  View my appointments
                </Link>
              </div>
            )}

            <div className="rounded-2xl bg-red-950 p-6 text-white">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-red-200">
                Before your appointment
              </p>

              <p className="mt-3 text-sm font-bold">Prepare for your donation.</p>

              <div className="mt-4 space-y-3">
                <PreparationItem text="Bring a valid form of identification." />

                <PreparationItem text="Inform healthcare staff if your health has changed since your eligibility assessment." />

                <PreparationItem text="Arrive a few minutes before your scheduled appointment." />
              </div>
            </div>

            <Panel label={step === "eligibility" ? "Why we ask" : "Eligibility confirmed"}>
              <p className="mt-3 text-xs leading-5 text-slate-600">
                {step === "eligibility"
                  ? "These questions are checked against health guidelines and your donation history before you can pick a hospital and time. Your eligibility will be reviewed again by healthcare staff before blood is collected."
                  : "You passed the eligibility check for this booking. Healthcare staff will review it again before blood is collected."}
              </p>
            </Panel>
          </aside>
        </div>
      </div>
    </>
  );
}

function formatAssessmentTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "recently";

  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  if (sameDay) return `today at ${time}`;

  return `${date.toLocaleDateString(undefined, { day: "numeric", month: "short" })} at ${time}`;
}

function StepPill({
  number,
  label,
  active,
  done,
}: {
  number: number;
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <li className="flex items-center gap-2.5" aria-current={active ? "step" : undefined}>
      <div
        aria-hidden
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold tabular-nums ${
          active || done ? "bg-red-950 text-white" : "bg-slate-200 text-slate-600"
        }`}
      >
        {done ? <CheckSmallIcon /> : number}
      </div>

      <p
        className={`text-[10.5px] font-semibold uppercase tracking-[0.09em] ${
          active ? "text-slate-900" : "text-slate-500"
        }`}
      >
        {label}
      </p>
    </li>
  );
}

function StepNumber({ number }: { number: string }) {
  return (
    <div
      aria-hidden
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-950 text-[11px] font-semibold tabular-nums text-white"
    >
      {number}
    </div>
  );
}

function SummaryItem({
  icon,
  label,
  value,
  completed,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  completed: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        aria-hidden
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          completed ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"
        }`}
      >
        {icon}
      </div>

      <div className="min-w-0">
        <Eyebrow>{label}</Eyebrow>

        <p
          className={`mt-1 truncate text-[13px] font-semibold ${
            completed ? "text-slate-900" : "text-slate-400"
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function PreparationItem({
  text,
}: {
  text: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15">
        <CheckSmallIcon />
      </div>

      <p className="text-xs leading-5 text-red-100/90">
        {text}
      </p>
    </div>
  );
}

function formatDate(date: string) {
  if (!date) {
    return "";
  }

  const [year, month, day] = date.split("-").map(Number);

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}


function HospitalIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M5 21V6h14v15" />
      <path d="M3 21h18" />
      <path d="M9 10h6M12 7v6" />
      <path d="M8 21v-4h8v4" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect
        x="4"
        y="5"
        width="16"
        height="15"
        rx="2"
      />
      <path d="M8 3v4M16 3v4M4 10h16" />
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
      <path
        d="M12 8v4l3 2"
        strokeLinecap="round"
      />
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
      strokeWidth="2.2"
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
      className="h-3 w-3"
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

function AlertIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="9" />
      <path
        d="M12 8v5M12 16h.01"
        strokeLinecap="round"
      />
    </svg>
  );
}
