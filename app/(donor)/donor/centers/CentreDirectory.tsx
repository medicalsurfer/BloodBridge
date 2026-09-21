"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState } from "@/src/components/ui/Page";

export type DirectoryCentre = {
  id: string;
  name: string;
  email: string | null;
  phoneNumber: string | null;
  address: string | null;
  city: string;
  region: string | null;
  openRequests: number;
  needsMyType: boolean;
  topUrgency: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | null;
  myDonations: number;
};

type Filter = "all" | "needed" | "myType" | "visited";

const URGENCY_LABEL: Record<NonNullable<DirectoryCentre["topUrgency"]>, string> = {
  LOW: "Low need",
  MEDIUM: "Moderate need",
  HIGH: "High need",
  CRITICAL: "Critical need",
};

export function CentreDirectory({
  centres,
  hasBloodGroup,
  homeCity,
}: {
  centres: DirectoryCentre[];
  hasBloodGroup: boolean;
  homeCity: string | null;
}) {
  const cities = useMemo(
    () => Array.from(new Set(centres.map((centre) => centre.city))).sort(),
    [centres],
  );

  const [query, setQuery] = useState("");
  const [city, setCity] = useState(() =>
    homeCity && cities.includes(homeCity) ? homeCity : "",
  );
  const [filter, setFilter] = useState<Filter>("all");

  const filters: { id: Filter; label: string; count: number }[] = [
    { id: "all", label: "All centres", count: centres.length },
    { id: "needed", label: "Need blood now", count: centres.filter((c) => c.openRequests > 0).length },
    ...(hasBloodGroup
      ? [{ id: "myType" as const, label: "Need my type", count: centres.filter((c) => c.needsMyType).length }]
      : []),
    { id: "visited", label: "Visited", count: centres.filter((c) => c.myDonations > 0).length },
  ];

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return centres
      .filter((centre) => !city || centre.city === city)
      .filter((centre) => {
        if (filter === "needed") return centre.openRequests > 0;
        if (filter === "myType") return centre.needsMyType;
        if (filter === "visited") return centre.myDonations > 0;
        return true;
      })
      .filter(
        (centre) =>
          !needle ||
          [centre.name, centre.city, centre.region, centre.address]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(needle)),
      )
      // Centres that need the donor's type first, then any open need, then by name.
      .sort(
        (a, b) =>
          Number(b.needsMyType) - Number(a.needsMyType) ||
          Number(b.openRequests > 0) - Number(a.openRequests > 0) ||
          a.name.localeCompare(b.name),
      );
  }, [centres, city, filter, query]);

  const isFiltered = Boolean(query || city || filter !== "all");

  return (
    <section>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 md:flex-row">
          <label className="relative flex-1">
            <span className="sr-only">Search centres</span>
            <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400">
              <SearchIcon />
            </span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, city or address"
              className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-[13.5px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-950 focus:ring-4 focus:ring-red-950/10"
            />
          </label>

          <label className="md:w-56">
            <span className="sr-only">Filter by city</span>
            <select
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-[13.5px] text-slate-900 outline-none transition focus:border-red-950 focus:ring-4 focus:ring-red-950/10"
            >
              <option value="">All cities</option>
              {cities.map((name) => (
                <option key={name} value={name}>
                  {name}
                  {name === homeCity ? " (your city)" : ""}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3.5 flex flex-wrap gap-2" role="group" aria-label="Filter centres">
          {filters.map((option) => {
            const active = filter === option.id;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(option.id)}
                className={`inline-flex h-8 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition ${
                  active
                    ? "border-red-950 bg-red-950 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                }`}
              >
                {option.label}
                <span
                  className={`rounded-md px-1.5 py-px text-[10.5px] tabular-nums ${
                    active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {option.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 mb-3 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500" aria-live="polite">
          Showing <span className="font-semibold text-slate-800 tabular-nums">{visible.length}</span>{" "}
          of {centres.length} {centres.length === 1 ? "centre" : "centres"}
        </p>

        {isFiltered && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setCity("");
              setFilter("all");
            }}
            className="text-xs font-semibold text-red-900 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <EmptyState
            title={centres.length === 0 ? "No donation centres available" : "No centres match"}
            description={
              centres.length === 0
                ? "There are currently no active healthcare institutions accepting donations."
                : "Try a different search, city or filter."
            }
          />
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {visible.map((centre) => (
            <CentreCard key={centre.id} centre={centre} />
          ))}
        </ul>
      )}
    </section>
  );
}

function CentreCard({ centre }: { centre: DirectoryCentre }) {
  const urgent = centre.topUrgency === "HIGH" || centre.topUrgency === "CRITICAL";
  const location = [centre.address, centre.city, centre.region].filter(Boolean).join(", ");

  return (
    <li
      className={`flex flex-col overflow-hidden rounded-2xl border bg-white transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-200/70 ${
        centre.needsMyType ? "border-red-200" : "border-slate-200"
      }`}
    >
      {centre.needsMyType && (
        <div className="flex items-center gap-2 bg-red-950 px-5 py-2 text-[11px] font-semibold text-white">
          <DropIcon />
          Needs your blood type
        </div>
      )}

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start gap-3.5">
          <div
            aria-hidden
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-base font-bold text-red-900"
          >
            {centre.name.charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-bold leading-snug text-slate-950">{centre.name}</h3>
            <p className="mt-1 flex items-start gap-1.5 text-xs leading-5 text-slate-500">
              <span className="mt-[3px]">
                <PinIcon />
              </span>
              {location}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {centre.openRequests > 0 ? (
            <Tag tone={urgent ? "danger" : "warn"}>
              {centre.openRequests} open {centre.openRequests === 1 ? "request" : "requests"}
              {centre.topUrgency && ` · ${URGENCY_LABEL[centre.topUrgency]}`}
            </Tag>
          ) : (
            <Tag tone="neutral">No open requests</Tag>
          )}

          {centre.myDonations > 0 && (
            <Tag tone="good">
              You donated here {centre.myDonations}×
            </Tag>
          )}
        </div>

        {(centre.phoneNumber || centre.email) && (
          <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-4 text-xs">
            {centre.phoneNumber && (
              <a
                href={`tel:${centre.phoneNumber.replace(/\s+/g, "")}`}
                className="flex items-center gap-2 text-slate-600 hover:text-red-900"
              >
                <PhoneIcon />
                {centre.phoneNumber}
              </a>
            )}
            {centre.email && (
              <a
                href={`mailto:${centre.email}`}
                className="flex items-center gap-2 truncate text-slate-600 hover:text-red-900"
              >
                <MailIcon />
                <span className="truncate">{centre.email}</span>
              </a>
            )}
          </div>
        )}

        <div className="mt-auto flex gap-2 pt-5">
          <Link
            href={`/appointments/book?instituteId=${centre.id}`}
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-red-950 px-4 text-xs font-semibold text-white transition hover:brightness-125"
          >
            Book here
            <ArrowIcon />
          </Link>
          <Link
            href="/chat"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Message
          </Link>
        </div>
      </div>
    </li>
  );
}

function Tag({
  tone,
  children,
}: {
  tone: "neutral" | "warn" | "danger" | "good";
  children: React.ReactNode;
}) {
  const tones = {
    neutral: "bg-slate-100 text-slate-500",
    warn: "bg-amber-50 text-amber-800",
    danger: "bg-red-50 text-red-800",
    good: "bg-emerald-50 text-emerald-700",
  };

  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  "aria-hidden": true,
} as const;

function SearchIcon() {
  return (
    <svg {...iconProps} className="h-4 w-4">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg {...iconProps} className="h-3 w-3 shrink-0">
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 1 1 14 0C19 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg {...iconProps} className="h-3.5 w-3.5 shrink-0 text-slate-400">
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg {...iconProps} className="h-3.5 w-3.5 shrink-0 text-slate-400">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function DropIcon() {
  return (
    <svg {...iconProps} className="h-3.5 w-3.5">
      <path d="M12 3.5c2.8 3.8 7 8.9 7 12.5a7 7 0 1 1-14 0c0-3.6 4.2-8.7 7-12.5Z" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg {...iconProps} className="h-4 w-4">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}
