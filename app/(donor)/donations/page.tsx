"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PageHeader,
  PrimaryLink,
  StatGrid,
  Stat,
  Panel,
  RowTitle,
  RowMeta,
  Pill,
  Eyebrow,
  EmptyState,
} from "@/src/components/ui/Page";
import {
  DONATIONS_PER_CONSULTATION,
  describeConsultationProgress,
  getConsultationProgress,
} from "@/src/lib/consultation";

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

const filterLabels: Record<Filter, string> = {
  ALL: "All",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  MISSED: "Missed",
};

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

  const consultation = getConsultationProgress(completedDonations.length);

  return (
    <>
      <div className="mx-auto max-w-6xl">
        <PageHeader
          eyebrow="Donation records"
          title="Donation history"
          description="Every recorded donation, its outcome and the details confirmed by healthcare staff."
          actions={<PrimaryLink href="/appointments/book">Book donation</PrimaryLink>}
        />

        <div className="mt-7">
          <StatGrid>
            <Stat
              label="Total donations"
              value={String(completedDonations.length)}
              foot="Completed donations"
            />
            <Stat
              label="Blood donated"
              value={`${totalBloodDonated.toLocaleString()} ml`}
              foot="Recorded volume"
            />
            <Stat
              label="Last donation"
              value={lastDonation ? formatShortDate(lastDonation.date) : "None"}
              foot={lastDonation ? lastDonation.hospital : "No record available"}
            />
            <Stat
              label="Free consultations"
              value={String(consultation.earned)}
              foot={
                consultation.earned > 0
                  ? "Earned — redeem at any institute"
                  : `${consultation.remaining} more donation${consultation.remaining === 1 ? "" : "s"} to earn one`
              }
              tone={consultation.earned > 0 ? "good" : "default"}
            />
          </StatGrid>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
            {error}
          </div>
        )}

        <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_320px]">
          <Panel
            label={`${filteredDonations.length} record${filteredDonations.length === 1 ? "" : "s"}`}
            padded={false}
            action={
              // Segmented control: one enclosure, so the filters read as a
              // single instrument rather than four loose buttons.
              <div className="flex rounded-lg border border-slate-300 p-0.5">
                {(["ALL", "COMPLETED", "CANCELLED", "MISSED"] as const).map((value) => (
                  <FilterButton
                    key={value}
                    label={filterLabels[value]}
                    active={filter === value}
                    onClick={() => setFilter(value)}
                  />
                ))}
              </div>
            }
          >
            <div className="mt-5 border-t border-slate-100">
              {loading ? (
                <p className="px-6 py-8 text-sm text-slate-500">Loading donation history…</p>
              ) : filteredDonations.length > 0 ? (
                filteredDonations.map((donation) => (
                  <button
                    key={donation.id}
                    type="button"
                    onClick={() => setSelectedDonation(donation)}
                    className="group block w-full border-b border-slate-100 px-6 py-4 text-left transition last:border-b-0 hover:bg-slate-50"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-4">
                        <div
                          aria-hidden
                          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                            donation.status === "COMPLETED"
                              ? "bg-emerald-50 text-emerald-700"
                              : donation.status === "CANCELLED"
                                ? "bg-red-50 text-red-800"
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
                            <RowTitle>{donation.hospital}</RowTitle>
                            <StatusBadge status={donation.status} />
                          </div>

                          <RowMeta>{donation.location}</RowMeta>

                          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-[11px] text-slate-500">
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

                      <div className="flex items-center gap-5 pl-13 sm:pl-0">
                        <div className="text-right">
                          <Eyebrow>Volume</Eyebrow>

                          <p className="mt-1.5 text-[13.5px] font-semibold tabular-nums text-slate-900">
                            {donation.volumeMl ? `${donation.volumeMl} ml` : "N/A"}
                          </p>
                        </div>

                        <div
                          aria-hidden
                          className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500"
                        >
                          <ChevronRightIcon />
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-6">
                  <EmptyState
                    title="No donation records found"
                    description="There are no donation records matching the selected filter."
                  />
                </div>
              )}
            </div>
          </Panel>

          <aside className="space-y-6">
            <Panel
              label="Free consultation"
              action={
                consultation.earned > 0 ? (
                  <Pill tone="good">
                    {consultation.earned} earned
                  </Pill>
                ) : undefined
              }
            >
              {/*
                The cycle is drawn as three discrete segments rather than one
                continuous bar: the entitlement is granted per whole donation,
                so a half-filled bar would misstate where the donor stands.
              */}
              <div
                className="mt-5 flex gap-1.5"
                role="progressbar"
                aria-valuenow={consultation.progressInCycle}
                aria-valuemin={0}
                aria-valuemax={DONATIONS_PER_CONSULTATION}
                aria-label="Donations towards your next free consultation"
              >
                {Array.from({ length: DONATIONS_PER_CONSULTATION }).map((_, index) => (
                  <span
                    key={index}
                    className={`h-2 flex-1 rounded-full transition-colors duration-500 ${
                      index < consultation.progressInCycle
                        ? "bg-gradient-to-r from-crimson to-garnet"
                        : "bg-slate-200"
                    }`}
                  />
                ))}
              </div>

              <p className="mt-3.5 text-[13px] font-semibold text-slate-900">
                {consultation.progressInCycle} of {DONATIONS_PER_CONSULTATION} donations
                <span className="ml-1.5 font-normal text-slate-500">in this cycle</span>
              </p>

              <p className="mt-2 text-xs leading-5 text-slate-600">
                {describeConsultationProgress(consultation)}
              </p>

              <p className="mt-4 border-t border-slate-100 pt-4 text-[11px] leading-5 text-slate-500">
                Every participating health institute grants one free medical consultation for every{" "}
                {DONATIONS_PER_CONSULTATION} completed donations.{" "}
                <Link
                  href="/privacy#free-consultation"
                  className="font-semibold text-garnet underline-offset-4 hover:underline"
                >
                  Read the policy
                </Link>
              </p>
            </Panel>

            <div className="rounded-2xl bg-red-950 p-6 text-white">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-red-200">
                Next step
              </p>

              <p className="mt-3 text-sm font-bold">Ready to donate again?</p>

              <p className="mt-2 text-xs leading-5 text-red-100/85">
                Complete your eligibility check before scheduling your next donation appointment.
              </p>

              <Link
                href="/eligibility"
                className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-white px-4 text-xs font-semibold text-red-950 transition hover:bg-red-50"
              >
                Check eligibility
              </Link>
            </div>

            <Panel label="About your history">
              <p className="mt-3 text-xs leading-5 text-slate-600">
                Completed donations appear here after healthcare staff confirm that blood was
                successfully collected.
              </p>
            </Panel>
          </aside>
        </div>
      </div>

      {selectedDonation && (
        <DonationDetailsModal
          donation={selectedDonation}
          onClose={() => setSelectedDonation(null)}
        />
      )}
    </>
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
      aria-pressed={active}
      className={`rounded-md px-3 py-1.5 text-[11px] font-semibold transition ${
        active ? "bg-red-950 text-white" : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {label}
    </button>
  );
}

function StatusBadge({ status }: { status: DonationStatus }) {
  if (status === "COMPLETED") return <Pill tone="good">Completed</Pill>;
  if (status === "CANCELLED") return <Pill tone="critical">Cancelled</Pill>;

  return <Pill tone="warn">Missed</Pill>;
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

      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="min-w-0">
            <Eyebrow>Donation details</Eyebrow>

            <h2 className="mt-2 text-xl font-bold tracking-[-0.02em] text-slate-950">
              {donation.hospital}
            </h2>

            <p className="mt-1.5 font-mono text-[11px] text-slate-500">{donation.id}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close donation details"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition hover:bg-slate-200"
          >
            <XIcon />
          </button>
        </div>

        <div className="mt-5">
          <StatusBadge status={donation.status} />
        </div>

        <div className="mt-5 grid gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-2">
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
          <div className="mt-5 rounded-xl border border-slate-200 p-4">
            <Eyebrow>Notes</Eyebrow>

            <p className="mt-2 text-xs leading-5 text-slate-600">{donation.notes}</p>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-6 h-11 w-full rounded-xl bg-red-950 text-[13px] font-semibold text-white transition hover:brightness-125"
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
    <div className="bg-white px-4 py-3.5">
      <Eyebrow>{label}</Eyebrow>

      <p className="mt-1.5 text-[13.5px] font-semibold text-slate-900">{value}</p>
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

