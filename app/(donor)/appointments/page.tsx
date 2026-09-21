"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { APPOINTMENT_TIMES } from "@/src/lib/appointment-slots";
import {
  PageHeader,
  PrimaryLink,
  StatGrid,
  Stat,
  Eyebrow,
  EmptyState,
} from "@/src/components/ui/Page";

const PRIMARY_RED = "oklch(27.1% 0.105 12.094)";

type AppointmentStatus = "SCHEDULED" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

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

const appointmentTimes = APPOINTMENT_TIMES;

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);

  const [notice, setNotice] = useState("");
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [centres, setCentres] = useState<{ id: string; name: string; city: string }[]>([]);

  const [rescheduleAppointment, setRescheduleAppointment] =
    useState<Appointment | null>(null);
  const [newCentreId, setNewCentreId] = useState("");
  const [newDate, setNewDate] = useState("");
  const [earliestNextDonation, setEarliestNextDonation] = useState<string | null>(null);
  const [newTime, setNewTime] = useState("");
  const [rescheduleError, setRescheduleError] = useState("");

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setCancelTarget(null);
      setRescheduleAppointment(null);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const today = new Date().toISOString().split("T")[0];
  // Donations are spaced by a mandatory interval, so a reschedule can't move
  // an appointment earlier than the donor's next eligible date either.
  const earliestBookableDate =
    earliestNextDonation && earliestNextDonation > today ? earliestNextDonation : today;

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

      const eligibility = await fetch("/api/eligibility", { credentials: "include", cache: "no-store" })
        .then((response) => (response.ok ? response.json() : null))
        .catch(() => null);

      const centreList = await fetch("/api/institutes", { credentials: "include", cache: "no-store" })
        .then((response) => (response.ok ? response.json() : null))
        .catch(() => null);

      if (centreList?.institutes) {
        setCentres(centreList.institutes.map((c: { id: string; name: string; city: string }) => c));
      }

      if (eligibility?.earliestNextDonation) {
        setEarliestNextDonation(new Date(eligibility.earliestNextDonation).toISOString().split("T")[0]);
      }
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

  // Both states are live bookings: SCHEDULED is waiting for the centre to
  // approve it, CONFIRMED has been approved.
  const scheduled = useMemo(
    () =>
      appointments.filter(
        (appointment) => appointment.status === "SCHEDULED" || appointment.status === "CONFIRMED",
      ),
    [appointments],
  );

  // A scheduled visit whose date has passed still needs managing: the donor can
  // move it to a new date or cancel it, so it is listed separately rather than
  // sitting in "Upcoming" as if it were still ahead of them.
  const upcomingAppointments = useMemo(
    () => scheduled.filter((appointment) => toDateInputValue(appointment.appointmentDate) >= today),
    [scheduled, today],
  );

  const pastDueAppointments = useMemo(
    () => scheduled.filter((appointment) => toDateInputValue(appointment.appointmentDate) < today),
    [scheduled, today],
  );

  const appointmentHistory = useMemo(
    () =>
      appointments.filter(
        (appointment) => appointment.status === "COMPLETED" || appointment.status === "CANCELLED",
      ),
    [appointments],
  );

  async function cancelAppointment(appointment: Appointment) {
    try {
      setActionId(appointment.id);
      setPageError("");

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

      setCancelTarget(null);
      setNotice(
        `Your appointment at ${appointment.healthInstitute.name} on ${formatDate(
          appointment.appointmentDate,
        )} has been cancelled.`,
      );
      await loadAppointments();
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Unable to cancel appointment.",
      );
      setCancelTarget(null);
    } finally {
      setActionId(null);
    }
  }

  function openReschedule(appointment: Appointment) {
    setRescheduleAppointment(appointment);
    setNewCentreId(appointment.healthInstitute.id);
    setNewDate(toDateInputValue(appointment.appointmentDate));
    setNewTime(appointment.appointmentTime);
    setRescheduleError("");
  }

  function closeReschedule() {
    setRescheduleAppointment(null);
    setNewCentreId("");
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

    if (newDate < earliestBookableDate && newDate >= today) {
      setRescheduleError(
        `You must wait between donations. The earliest date you can choose is ${new Date(
          `${earliestBookableDate}T00:00:00`,
        ).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.`,
      );
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
            healthInstituteId: newCentreId || rescheduleAppointment.healthInstitute.id,
            appointmentDate: newDate,
            appointmentTime: newTime,
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
      setNotice(
        `Your appointment has been moved to ${formatDate(newDate)} at ${newTime}${
          data.appointment?.healthInstitute?.name
            ? ` at ${data.appointment.healthInstitute.name}`
            : ""
        }.`,
      );
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

  const completedCount = appointmentHistory.filter(
    (appointment) => appointment.status === "COMPLETED",
  ).length;
  const nextAppointment = upcomingAppointments[0];

  return (
    <>
      <div className="mx-auto max-w-6xl">
        <PageHeader
          eyebrow="Blood donation"
          title="Appointments"
          description="Review your scheduled visits, reschedule when plans change, or cancel one you can no longer attend."
          actions={<PrimaryLink href="/appointments/book">Book appointment</PrimaryLink>}
        />

        {pageError && (
          <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            {pageError}
          </p>
        )}

        {notice && (
          <div
            role="status"
            className="mt-6 flex items-start justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3"
          >
            <p className="text-sm font-medium text-emerald-800">{notice}</p>
            <button
              type="button"
              onClick={() => setNotice("")}
              aria-label="Dismiss"
              className="text-sm font-bold text-emerald-700"
            >
              ×
            </button>
          </div>
        )}

        <div className="mt-7">
          <StatGrid>
            <Stat
              label="Scheduled"
              value={loading ? "—" : String(upcomingAppointments.length)}
              foot="Upcoming visits"
            />
            <Stat
              label="Next visit"
              value={
                nextAppointment
                  ? new Date(nextAppointment.appointmentDate).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })
                  : "None"
              }
              foot={
                nextAppointment
                  ? `${nextAppointment.appointmentTime} · ${nextAppointment.healthInstitute.name}`
                  : "Nothing booked"
              }
            />
            <Stat
              label="Completed"
              value={loading ? "—" : String(completedCount)}
              foot="Donations attended"
              tone={completedCount > 0 ? "good" : "default"}
            />
            <Stat
              label="History"
              value={loading ? "—" : String(appointmentHistory.length)}
              foot="Past appointments"
            />
          </StatGrid>
        </div>

        <div className="mt-8 space-y-6">
          <section>
            <div className="flex items-end justify-between gap-3">
              <div>
                <Eyebrow>Upcoming</Eyebrow>
                <h2 className="mt-1.5 text-lg font-bold tracking-[-0.01em] text-slate-950">
                  Scheduled appointments
                </h2>
              </div>
            </div>

            {loading ? (
              <p className="mt-4 rounded-2xl border border-slate-200 bg-white px-6 py-8 text-center text-sm text-slate-500">
                Loading appointments…
              </p>
            ) : upcomingAppointments.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title="No upcoming appointments"
                  description="You do not currently have a scheduled blood donation appointment."
                  action={<PrimaryLink href="/appointments/book">Book an appointment</PrimaryLink>}
                />
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {upcomingAppointments.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    loading={actionId === appointment.id}
                    onCancel={() => setCancelTarget(appointment)}
                    onReschedule={() => openReschedule(appointment)}
                  />
                ))}
              </div>
            )}
          </section>

          {pastDueAppointments.length > 0 && (
            <section>
              <div>
                <Eyebrow>Needs attention</Eyebrow>
                <h2 className="mt-1.5 text-lg font-bold tracking-[-0.01em] text-slate-950">
                  Past appointment dates
                </h2>
                <p className="mt-1.5 text-sm text-slate-500">
                  These visits are still marked as scheduled but their date has passed. Move them to a
                  new date, or cancel them.
                </p>
              </div>

              <div className="mt-4 space-y-4">
                {pastDueAppointments.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    loading={actionId === appointment.id}
                    pastDue
                    onCancel={() => setCancelTarget(appointment)}
                    onReschedule={() => openReschedule(appointment)}
                  />
                ))}
              </div>
            </section>
          )}

          <section>
            <div>
              <Eyebrow>Archive</Eyebrow>
              <h2 className="mt-1.5 text-lg font-bold tracking-[-0.01em] text-slate-950">
                Appointment history
              </h2>
            </div>

            {!loading && appointmentHistory.length === 0 ? (
              <div className="mt-4">
                <EmptyState title="No appointment history yet" />
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {appointmentHistory.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    loading={false}
                    bookAgainHref={`/appointments/book?instituteId=${appointment.healthInstitute.id}`}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {cancelTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
        >
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-950">Cancel appointment</p>

            <h2 id="cancel-title" className="mt-2 text-xl font-bold text-slate-950">
              Cancel this appointment?
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              {cancelTarget.healthInstitute.name} on {formatDate(cancelTarget.appointmentDate)} at{" "}
              {cancelTarget.appointmentTime}. You can book a new appointment at any time.
            </p>

            <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-5">
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-600"
              >
                Keep appointment
              </button>

              <button
                type="button"
                onClick={() => cancelAppointment(cancelTarget)}
                disabled={actionId === cancelTarget.id}
                className="h-10 rounded-xl bg-red-950 px-4 text-xs font-semibold text-white disabled:opacity-50"
              >
                {actionId === cancelTarget.id ? "Cancelling…" : "Yes, cancel it"}
              </button>
            </div>
          </div>
        </div>
      )}

      {rescheduleAppointment && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reschedule-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
        >
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-950">
                  Reschedule
                </p>

                <h2 id="reschedule-title" className="mt-2 text-xl font-bold text-slate-950">
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
                <label htmlFor="reschedule-centre" className="mb-2 block text-xs font-bold text-slate-700">
                  Donation centre
                </label>

                <select
                  id="reschedule-centre"
                  value={newCentreId}
                  onChange={(event) => {
                    setNewCentreId(event.target.value);
                    setRescheduleError("");
                  }}
                  className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm text-slate-700 outline-none focus:border-red-950"
                >
                  {centres.length === 0 && (
                    <option value={rescheduleAppointment.healthInstitute.id}>
                      {rescheduleAppointment.healthInstitute.name}
                    </option>
                  )}

                  {centres.map((centre) => (
                    <option key={centre.id} value={centre.id}>
                      {centre.name} — {centre.city}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="reschedule-date" className="mb-2 block text-xs font-bold text-slate-700">
                  New date
                </label>

                <input
                  id="reschedule-date"
                  type="date"
                  min={earliestBookableDate}
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
    </>
  );
}

function AppointmentCard({
  appointment,
  loading,
  onCancel,
  onReschedule,
  pastDue = false,
  bookAgainHref,
}: {
  appointment: Appointment;
  loading: boolean;
  onCancel?: () => void;
  onReschedule?: () => void;
  pastDue?: boolean;
  bookAgainHref?: string;
}) {
  const scheduled = appointment.status === "SCHEDULED" || appointment.status === "CONFIRMED";

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-950">
            <HospitalIcon />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                {appointment.healthInstitute.name}
              </h3>

              <StatusBadge status={appointment.status} />

              {pastDue && (
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                  Date passed
                </span>
              )}
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

        <div className="grid shrink-0 gap-4 sm:grid-cols-2 lg:w-72">
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
          <div className="flex shrink-0 flex-wrap justify-end gap-2 lg:w-52">
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

        {bookAgainHref && (
          <div className="flex shrink-0 justify-end lg:w-52">
            <Link
              href={bookAgainHref}
              className="flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Book again here
            </Link>
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
      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
        Awaiting confirmation
      </span>
    );
  }

  if (status === "CONFIRMED") {
    return (
      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">
        Confirmed
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
  // A plain YYYY-MM-DD would be read as UTC midnight and could render as the
  // previous day west of Greenwich, so pin it to local time.
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value);

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
