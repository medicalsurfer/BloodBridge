"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

const PRIMARY_RED = "oklch(27.1% 0.105 12.094)";

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

const appointmentTimes = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "14:00",
  "15:00",
  "16:00",
];

export default function BookDonationPage() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loadingHospitals, setLoadingHospitals] = useState(true);

  const [form, setForm] = useState<BookingForm>({
    hospitalId: "",
    appointmentDate: "",
    appointmentTime: "",
    notes: "",
  });

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
        setError(
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

  function updateForm(field: keyof BookingForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setError("");
    setSubmitted(false);
  }

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

    const selectedDate = new Date(`${form.appointmentDate}T00:00:00`);
    const currentDate = new Date(`${today}T00:00:00`);

    if (selectedDate < currentDate) {
      setError("The appointment date cannot be in the past.");
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
                Blood donation
              </p>

              <h1 className="mt-2 text-2xl font-bold text-slate-950">
                Book a donation appointment
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Select a hospital, choose an available date and time, then
                confirm your appointment.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-8">
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

                <input
                  type="date"
                  value={form.appointmentDate}
                  min={today}
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
                style={{ backgroundColor: PRIMARY_RED }}
                className="flex h-12 w-full items-center justify-center rounded-xl text-sm font-semibold text-white transition hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Booking..." : "Confirm appointment"}
              </button>
            </form>
          </section>

          <aside className="space-y-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                Appointment summary
              </p>

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
            </div>

            {submitted && (
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <CheckIcon />
                </div>

                <p className="mt-4 text-lg font-bold text-emerald-700">
                  Appointment confirmed
                </p>

                <p className="mt-2 text-xs leading-5 text-emerald-700">
                  Your donation appointment has been saved successfully.
                </p>

                <div className="mt-4 rounded-2xl bg-white/70 p-4">
                  <p className="text-xs font-semibold text-slate-800">
                    {selectedHospital?.name}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {formatDate(form.appointmentDate)} at{" "}
                    {form.appointmentTime}
                  </p>
                </div>

                <Link
                  href="/appointments"
                  className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-emerald-700 px-4 text-xs font-semibold text-white"
                >
                  View my appointments
                </Link>
              </div>
            )}

            <div
              style={{ backgroundColor: PRIMARY_RED }}
              className="rounded-3xl p-5 text-white"
            >
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-100">
                Before your appointment
              </p>

              <p className="mt-3 text-sm font-bold">
                Prepare for your donation.
              </p>

              <div className="mt-4 space-y-3">
                <PreparationItem text="Bring a valid form of identification." />

                <PreparationItem text="Inform healthcare staff if your health has changed since your eligibility assessment." />

                <PreparationItem text="Arrive a few minutes before your scheduled appointment." />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold text-slate-900">
                Preliminary eligibility
              </p>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Your eligibility will be reviewed again by healthcare staff
                before blood is collected.
              </p>

              <Link
                href="/eligibility"
                className="mt-4 inline-flex text-xs font-bold text-red-950"
              >
                Review eligibility
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function StepNumber({
  number,
}: {
  number: string;
}) {
  return (
    <div
      style={{ backgroundColor: PRIMARY_RED }}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
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
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
          completed
            ? "bg-emerald-100 text-emerald-700"
            : "bg-slate-100 text-slate-400"
        }`}
      >
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </p>

        <p
          className={`mt-1 truncate text-xs font-semibold ${
            completed
              ? "text-slate-800"
              : "text-slate-400"
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