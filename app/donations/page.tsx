"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const PRIMARY_RED = "oklch(27.1% 0.105 12.094)";

type DonationStatus = "COMPLETED" | "CANCELLED" | "MISSED";

type Donation = {
  id: string;
  hospital: string;
  location: string;
  date: string;
  time: string;
  bloodType: string;
  volumeMl: number | null;
  status: DonationStatus;
  bloodPackId?: string;
  notes?: string;
};

type Filter = "ALL" | DonationStatus;

export default function DonationHistoryPage() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [selectedDonation, setSelectedDonation] =
    useState<Donation | null>(null);

  useEffect(() => {
    async function loadDonations() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/donations", {
          credentials: "include",
          cache: "no-store",
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load donation history.");
        }

        setDonations(data.donations ?? []);
      } catch (loadError) {
        console.error("LOAD DONATIONS ERROR:", loadError);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load donation history.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadDonations();
  }, []);

  const completedDonations = donations.filter(
    (donation) => donation.status === "COMPLETED",
  );

  const totalBloodDonated = completedDonations.reduce(
    (total, donation) => total + (donation.volumeMl ?? 0),
    0,
  );

  const lastDonation = completedDonations
    .slice()
    .sort(
      (a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime(),
    )[0];

  const filteredDonations =
    filter === "ALL"
      ? donations
      : donations.filter((donation) => donation.status === filter);

  return (
    <main className="min-h-screen bg-slate-100 p-4">
      <section className="mx-auto max-w-375 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
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

          <div className="flex items-center gap-3">
            <Link
              href="/appointments/book"
              style={{ backgroundColor: PRIMARY_RED }}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-xs font-semibold text-white transition hover:brightness-125"
            >
              <PlusIcon />
              Book donation
            </Link>

            <Link
              href="/home"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Back to home
            </Link>
          </div>
        </header>

        <div className="bg-slate-50/70 px-6 py-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-950">
                Donation records
              </p>

              <h1 className="mt-2 text-3xl font-bold text-slate-950">
                Donation history
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Review your previous blood donations, appointment outcomes
                and donation details.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Donor blood type
              </p>

              <div className="mt-1 flex items-center gap-2">
                <BloodDropSmallIcon />
                <p className="text-xl font-bold text-red-950">
                  {donations[0]?.bloodType ?? "Not set"}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={<HistoryIcon />}
              label="Total donations"
              value={String(completedDonations.length)}
              helper="Completed donations"
            />

            <StatCard
              icon={<BloodDropSmallIcon />}
              label="Blood donated"
              value={`${totalBloodDonated.toLocaleString()} ml`}
              helper="Recorded volume"
            />

            <StatCard
              icon={<CalendarIcon />}
              label="Last donation"
              value={
                lastDonation
                  ? formatShortDate(lastDonation.date)
                  : "No donation"
              }
              helper={
                lastDonation
                  ? lastDonation.hospital
                  : "No record available"
              }
            />

            <StatCard
              icon={<HeartIcon />}
              label="Potential impact"
              value={`${completedDonations.length * 3}`}
              helper="Estimated lives supported"
            />
          </div>

          {error && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_320px]">
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Donation records
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      {filteredDonations.length} record
                      {filteredDonations.length === 1 ? "" : "s"} found
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <FilterButton
                      label="All"
                      active={filter === "ALL"}
                      onClick={() => setFilter("ALL")}
                    />

                    <FilterButton
                      label="Completed"
                      active={filter === "COMPLETED"}
                      onClick={() => setFilter("COMPLETED")}
                    />

                    <FilterButton
                      label="Cancelled"
                      active={filter === "CANCELLED"}
                      onClick={() => setFilter("CANCELLED")}
                    />

                    <FilterButton
                      label="Missed"
                      active={filter === "MISSED"}
                      onClick={() => setFilter("MISSED")}
                    />
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="px-6 py-16 text-center text-sm text-slate-500">
                  Loading donation history...
                </div>
              ) : filteredDonations.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {filteredDonations.map((donation) => (
                    <button
                      key={donation.id}
                      type="button"
                      onClick={() =>
                        setSelectedDonation(donation)
                      }
                      className="group flex w-full flex-col gap-4 p-5 text-left transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-start gap-4">
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                            donation.status === "COMPLETED"
                              ? "bg-emerald-50 text-emerald-700"
                              : donation.status === "CANCELLED"
                                ? "bg-red-50 text-red-700"
                                : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {donation.status === "COMPLETED" ? (
                            <CheckIcon />
                          ) : donation.status === "CANCELLED" ? (
                            <XIcon />
                          ) : (
                            <ClockIcon />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-bold text-slate-900">
                              {donation.hospital}
                            </p>

                            <StatusBadge
                              status={donation.status}
                            />
                          </div>

                          <p className="mt-1 text-xs text-slate-500">
                            {donation.location}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                            <span className="flex items-center gap-1.5">
                              <CalendarSmallIcon />
                              {formatDate(donation.date)}
                            </span>

                            <span className="flex items-center gap-1.5">
                              <ClockSmallIcon />
                              {donation.time}
                            </span>

                            <span className="flex items-center gap-1.5">
                              <BloodDropTinyIcon />
                              {donation.bloodType}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-6 pl-16 sm:pl-0">
                        <div className="text-right">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            Volume
                          </p>

                          <p className="mt-1 text-sm font-bold text-slate-800">
                            {donation.volumeMl
                              ? `${donation.volumeMl} ml`
                              : "N/A"}
                          </p>
                        </div>

                        <div className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-500">
                          <ChevronRightIcon />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                    <HistoryIcon />
                  </div>

                  <p className="mt-4 text-sm font-bold text-slate-800">
                    No donation records found
                  </p>

                  <p className="mt-2 max-w-sm text-xs leading-5 text-slate-500">
                    There are no donation records matching the selected
                    filter.
                  </p>
                </div>
              )}
            </section>

            <aside className="space-y-5">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                  Donation progress
                </p>

                <div className="mt-5 flex items-end justify-between">
                  <div>
                    <p className="text-3xl font-bold text-slate-950">
                      {completedDonations.length}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      completed donations
                    </p>
                  </div>

                  <div
                    style={{ color: PRIMARY_RED }}
                    className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50"
                  >
                    <HeartIcon />
                  </div>
                </div>

                <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    style={{
                      backgroundColor: PRIMARY_RED,
                      width: `${Math.min(
                        (completedDonations.length / 5) * 100,
                        100,
                      )}%`,
                    }}
                    className="h-full rounded-full"
                  />
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                  <span>
                    {completedDonations.length}/5 donations
                  </span>

                  <span>
                    {Math.round(
                      Math.min(
                        (completedDonations.length / 5) * 100,
                        100,
                      ),
                    )}
                    %
                  </span>
                </div>
              </div>

              <div
                style={{ backgroundColor: PRIMARY_RED }}
                className="rounded-3xl p-5 text-white"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                  <BloodDropIcon />
                </div>

                <p className="mt-4 text-lg font-bold">
                  Ready to donate again?
                </p>

                <p className="mt-2 text-xs leading-5 text-red-100/80">
                  Complete your eligibility check before scheduling your
                  next donation appointment.
                </p>

                <Link
                  href="/eligibility"
                  className="mt-5 inline-flex h-10 items-center justify-center rounded-xl bg-white px-4 text-xs font-bold text-red-950 transition hover:bg-red-50"
                >
                  Check eligibility
                </Link>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-bold text-slate-900">
                  About your history
                </p>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Completed donations appear here after healthcare staff
                  confirm that blood was successfully collected.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {selectedDonation && (
        <DonationDetailsModal
          donation={selectedDonation}
          onClose={() => setSelectedDonation(null)}
        />
      )}
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
  helper,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
            {label}
          </p>

          <p className="mt-3 text-2xl font-bold text-slate-950">
            {value}
          </p>

          <p className="mt-1 truncate text-xs text-slate-500">
            {helper}
          </p>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-950">
          {icon}
        </div>
      </div>
    </div>
  );
}

function FilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={active ? { backgroundColor: PRIMARY_RED } : undefined}
      className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
        active
          ? "text-white"
          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}

function StatusBadge({
  status,
}: {
  status: DonationStatus;
}) {
  if (status === "COMPLETED") {
    return (
      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
        Completed
      </span>
    );
  }

  if (status === "CANCELLED") {
    return (
      <span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-red-700">
        Cancelled
      </span>
    );
  }

  return (
    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
      Missed
    </span>
  );
}

function DonationDetailsModal({
  donation,
  onClose,
}: {
  donation: Donation;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <button
        type="button"
        aria-label="Close donation details"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />

      <div className="relative z-10 w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
              Donation details
            </p>

            <h2 className="mt-2 text-xl font-bold text-slate-950">
              {donation.hospital}
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              {donation.id}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200"
          >
            <XIcon />
          </button>
        </div>

        <div className="mt-5">
          <StatusBadge status={donation.status} />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <DetailItem
            label="Donation date"
            value={formatDate(donation.date)}
          />

          <DetailItem
            label="Appointment time"
            value={donation.time}
          />

          <DetailItem
            label="Blood type"
            value={donation.bloodType}
          />

          <DetailItem
            label="Volume collected"
            value={
              donation.volumeMl
                ? `${donation.volumeMl} ml`
                : "Not recorded"
            }
          />

          <DetailItem
            label="Location"
            value={donation.location}
          />

          <DetailItem
            label="Blood pack ID"
            value={donation.bloodPackId ?? "Not applicable"}
          />
        </div>

        {donation.notes && (
          <div className="mt-5 rounded-2xl bg-slate-50 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
              Notes
            </p>

            <p className="mt-2 text-xs leading-5 text-slate-600">
              {donation.notes}
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          style={{ backgroundColor: PRIMARY_RED }}
          className="mt-6 h-11 w-full rounded-xl text-sm font-semibold text-white"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-sm font-semibold text-slate-800">
        {value}
      </p>
    </div>
  );
}

function formatDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function formatShortDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);

  return new Intl.DateTimeFormat("en-GB", {
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

function BloodDropSmallIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M12 4c2.5 3.4 5.5 7.3 5.5 10.2a5.5 5.5 0 0 1-11 0C6.5 11.3 9.5 7.4 12 4Z" />
    </svg>
  );
}

function BloodDropTinyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 4c2.5 3.4 5.5 7.3 5.5 10.2a5.5 5.5 0 0 1-11 0C6.5 11.3 9.5 7.4 12 4Z" />
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
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M4 10h16" />
    </svg>
  );
}

function CalendarSmallIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="4" y="5" width="16" height="15" rx="2" />
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

function ClockSmallIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="8" />
      <path
        d="M12 8v4l3 2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M4 12a8 8 0 1 0 2.3-5.7L4 8.5"
        strokeLinecap="round"
      />
      <path
        d="M4 4v4.5h4.5M12 8v4l3 2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M20.8 5.8a5 5 0 0 0-7.1 0L12 7.5l-1.7-1.7a5 5 0 0 0-7.1 7.1L12 21l8.8-8.1a5 5 0 0 0 0-7.1Z"
        strokeLinecap="round"
        strokeLinejoin="round"
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
      strokeWidth="2.3"
    >
      <path
        d="m5 12 4 4L19 6"
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
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        d="M7 7l10 10M17 7 7 17"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        d="m9 6 6 6-6 6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        d="M12 5v14M5 12h14"
        strokeLinecap="round"
      />
    </svg>
  );
}