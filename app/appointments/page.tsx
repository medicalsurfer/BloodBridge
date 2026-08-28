"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

const PRIMARY_RED = "oklch(27.1% 0.105 12.094)";

type AppointmentStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED";

type Appointment = {
  id: string;
  appointmentDate: string;
  appointmentTime: string;
  notes: string | null;
  status: AppointmentStatus;
  createdAt: string;
  healthInstitute: {
    id: string;
    name: string;
    city: string;
    region: string | null;
    address: string | null;
  };
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

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);

  const [rescheduleAppointment, setRescheduleAppointment] =
    useState<Appointment | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [rescheduleError, setRescheduleError] = useState("");

  const today = new Date().toISOString().split("T")[0];

  async function loadAppointments() {
    try {
      setLoading(true);
      setPageError("");

      const response = await fetch("/api/appointments", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to load your appointments.",
        );
      }

      setAppointments(data.appointments ?? []);
    } catch (error) {
      console.error("LOAD APPOINTMENTS ERROR:", error);
      setPageError(
        error instanceof Error
          ? error.message
          : "Unable to load your appointments.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(loadAppointments);
  }, []);

  const upcomingAppointments = useMemo(
    () =>
      appointments.filter(
        (appointment) => appointment.status === "SCHEDULED",
      ),
    [appointments],
  );

  const appointmentHistory = useMemo(
    () =>
      appointments.filter(
        (appointment) => appointment.status !== "SCHEDULED",
      ),
    [appointments],
  );

  async function cancelAppointment(appointment: Appointment) {
    const confirmed = window.confirm(
      `Cancel your appointment at ${appointment.healthInstitute.name} on ${formatDate(
        appointment.appointmentDate,
      )} at ${appointment.appointmentTime}?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionId(appointment.id);

      const response = await fetch(
        `/api/appointments/${appointment.id}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "CANCELLED",
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to cancel appointment.",
        );
      }

      await loadAppointments();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Unable to cancel appointment.",
      );
    } finally {
      setActionId(null);
    }
  }

  function openReschedule(appointment: Appointment) {
    setRescheduleAppointment(appointment);
    setNewDate(toDateInputValue(appointment.appointmentDate));
    setNewTime(appointment.appointmentTime);
    setRescheduleError("");
  }

  function closeReschedule() {
    setRescheduleAppointment(null);
    setNewDate("");
    setNewTime("");
    setRescheduleError("");
  }

  async function submitReschedule(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!rescheduleAppointment) {
      return;
    }

    if (!newDate) {
      setRescheduleError("Please select a new appointment date.");
      return;
    }

    if (!newTime) {
      setRescheduleError("Please select a new appointment time.");
      return;
    }

    if (newDate < today) {
      setRescheduleError(
        "The appointment date cannot be in the past.",
      );
      return;
    }

    try {
      setActionId(rescheduleAppointment.id);
      setRescheduleError("");

      const response = await fetch(
        `/api/appointments/${rescheduleAppointment.id}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            appointmentDate: newDate,
            appointmentTime: newTime,
            status: "SCHEDULED",
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to reschedule appointment.",
        );
      }

      closeReschedule();
      await loadAppointments();
    } catch (error) {
      setRescheduleError(
        error instanceof Error
          ? error.message
          : "Unable to reschedule appointment.",
      );
    } finally {
      setActionId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4">
      <section className="mx-auto max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <header className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
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

          <div className="flex gap-3">
            <Link
              href="/home"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Back to home
            </Link>

            <Link
              href="/appointments/book"
              style={{ backgroundColor: PRIMARY_RED }}
              className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-xs font-semibold text-white transition hover:brightness-125"
            >
              Book appointment
            </Link>
          </div>
        </header>

        <div className="bg-slate-50/70 px-6 py-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-950">
              Blood donation
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-950">
              My Appointments
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              View your donation appointments, reschedule upcoming
              bookings or cancel an appointment you can no longer attend.
            </p>
          </div>

          {pageError && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
              {pageError}
            </div>
          )}

          <section className="mt-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Upcoming appointments
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Your currently scheduled donation appointments.
                </p>
              </div>

              {!loading && (
                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm">
                  {upcomingAppointments.length} scheduled
                </span>
              )}
            </div>

            {loading ? (
              <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
                Loading appointments...
              </div>
            ) : upcomingAppointments.length === 0 ? (
              <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-950">
                  <CalendarIcon />
                </div>

                <p className="mt-4 text-sm font-bold text-slate-800">
                  No upcoming appointments
                </p>

                <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-slate-500">
                  You do not currently have a scheduled blood donation
                  appointment.
                </p>

                <Link
                  href="/appointments/book"
                  style={{ backgroundColor: PRIMARY_RED }}
                  className="mt-5 inline-flex h-10 items-center justify-center rounded-xl px-4 text-xs font-semibold text-white"
                >
                  Book an appointment
                </Link>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {upcomingAppointments.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    loading={actionId === appointment.id}
                    onCancel={() => cancelAppointment(appointment)}
                    onReschedule={() => openReschedule(appointment)}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="mt-10">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Appointment history
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Completed and cancelled donation appointments.
              </p>
            </div>

            {!loading && appointmentHistory.length === 0 ? (
              <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
                No appointment history yet.
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {appointmentHistory.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    loading={false}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </section>

      {rescheduleAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-950">
                  Reschedule
                </p>

                <h2 className="mt-2 text-xl font-bold text-slate-950">
                  Change appointment
                </h2>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {rescheduleAppointment.healthInstitute.name}
                </p>
              </div>

              <button
                type="button"
                onClick={closeReschedule}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={submitReschedule}
              className="mt-6 space-y-5"
            >
              <div>
                <label className="mb-2 block text-xs font-bold text-slate-700">
                  New date
                </label>

                <input
                  type="date"
                  min={today}
                  value={newDate}
                  onChange={(event) => {
                    setNewDate(event.target.value);
                    setRescheduleError("");
                  }}
                  className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm text-slate-700 outline-none focus:border-red-950"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-slate-700">
                  New time
                </label>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {appointmentTimes.map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => {
                        setNewTime(time);
                        setRescheduleError("");
                      }}
                      className={`h-10 rounded-xl border text-xs font-semibold ${
                        newTime === time
                          ? "border-red-950 bg-red-950 text-white"
                          : "border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>

              {rescheduleError && (
                <div className="rounded-xl bg-red-50 p-3 text-xs font-medium text-red-700">
                  {rescheduleError}
                </div>
              )}

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={closeReschedule}
                  className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-600"
                >
                  Keep current appointment
                </button>

                <button
                  type="submit"
                  disabled={actionId === rescheduleAppointment.id}
                  style={{ backgroundColor: PRIMARY_RED }}
                  className="h-10 rounded-xl px-4 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {actionId === rescheduleAppointment.id
                    ? "Updating..."
                    : "Confirm reschedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

function AppointmentCard({
  appointment,
  loading,
  onCancel,
  onReschedule,
}: {
  appointment: Appointment;
  loading: boolean;
  onCancel?: () => void;
  onReschedule?: () => void;
}) {
  const scheduled = appointment.status === "SCHEDULED";

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-950">
            <HospitalIcon />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                {appointment.healthInstitute.name}
              </h3>

              <StatusBadge status={appointment.status} />
            </div>

            <p className="mt-2 text-xs text-slate-500">
              {appointment.healthInstitute.city}
              {appointment.healthInstitute.region
                ? `, ${appointment.healthInstitute.region}`
                : ""}
            </p>

            {appointment.healthInstitute.address && (
              <p className="mt-1 text-xs text-slate-400">
                {appointment.healthInstitute.address}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:min-w-70">
          <Detail
            label="Date"
            value={formatDate(appointment.appointmentDate)}
          />

          <Detail
            label="Time"
            value={appointment.appointmentTime}
          />
        </div>

        {scheduled && onCancel && onReschedule && (
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={onReschedule}
              disabled={loading}
              className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Reschedule
            </button>

            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="h-10 rounded-xl bg-red-50 px-4 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
            >
              {loading ? "Updating..." : "Cancel"}
            </button>
          </div>
        )}
      </div>

      {appointment.notes && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Notes
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            {appointment.notes}
          </p>
        </div>
      )}
    </article>
  );
}

function StatusBadge({ status }: { status: AppointmentStatus }) {
  if (status === "SCHEDULED") {
    return (
      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">
        Scheduled
      </span>
    );
  }

  if (status === "COMPLETED") {
    return (
      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
        Completed
      </span>
    );
  }

  return (
    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">
      Cancelled
    </span>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-800">
        {value}
      </p>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function toDateInputValue(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
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
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M4 10h16" />
    </svg>
  );
}