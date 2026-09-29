"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  PageHeader,
  StatGrid,
  Stat,
  Panel,
  Row,
  RowTitle,
  RowMeta,
  Pill,
  EmptyState,
  type PillTone,
} from "@/src/components/ui/Page";
import { Droplet } from "lucide-react";

type BloodGroup =
  | "A_POSITIVE"
  | "A_NEGATIVE"
  | "B_POSITIVE"
  | "B_NEGATIVE"
  | "AB_POSITIVE"
  | "AB_NEGATIVE"
  | "O_POSITIVE"
  | "O_NEGATIVE";

type Urgency = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

type BloodRequestItem = {
  id: string;
  bloodGroup: BloodGroup;
  unitsNeeded: number;
  urgency: Urgency;
  notes: string | null;
  createdAt: string;
  canDonate: boolean | null;
  healthInstitute: {
    id: string;
    name: string;
    city: string;
    region: string | null;
    address: string | null;
  };
};

const bloodGroupLabels: Record<BloodGroup, string> = {
  A_POSITIVE: "A+",
  A_NEGATIVE: "A-",
  B_POSITIVE: "B+",
  B_NEGATIVE: "B-",
  AB_POSITIVE: "AB+",
  AB_NEGATIVE: "AB-",
  O_POSITIVE: "O+",
  O_NEGATIVE: "O-",
};

const urgencyTones: Record<Urgency, PillTone> = {
  LOW: "neutral",
  MEDIUM: "warn",
  HIGH: "warn",
  CRITICAL: "critical",
};

const urgencyLabels: Record<Urgency, string> = {
  LOW: "Low urgency",
  MEDIUM: "Medium urgency",
  HIGH: "High urgency",
  CRITICAL: "Critical",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<BloodRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [donorBloodGroup, setDonorBloodGroup] = useState<BloodGroup | null>(null);
  const [matchingOnly, setMatchingOnly] = useState(false);

  useEffect(() => {
    fetch("/api/blood-requests", { credentials: "include", cache: "no-store" })
      .then((response) => response.json().then((data) => ({ response, data })))
      .then(({ response, data }) => {
        if (!response.ok) throw new Error(data.error ?? "Unable to load blood requests.");
        setRequests(data.requests ?? []);
        setDonorBloodGroup(data.donorBloodGroup ?? null);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load blood requests."))
      .finally(() => setLoading(false));
  }, []);

  const criticalCount = requests.filter((r) => r.urgency === "CRITICAL").length;
  const unitsNeeded = requests.reduce((total, r) => total + r.unitsNeeded, 0);
  const matchingCount = requests.filter((r) => r.canDonate).length;
  const visibleRequests = matchingOnly ? requests.filter((r) => r.canDonate) : requests;

  return (
    <div className="mx-auto max-w-6xl">
        <PageHeader
          eyebrow="Blood requests"
          title="Where blood is needed"
          description="Open requests raised by participating health institutes. Respond to one to book a donation there."
        />

        <div className="mt-7 mb-8">
          <StatGrid>
            <Stat
              label="Open requests"
              value={loading ? "—" : String(requests.length)}
              foot="Currently active"
            />
            <Stat
              label="Critical"
              value={loading ? "—" : String(criticalCount)}
              foot={criticalCount > 0 ? "Needs urgent donors" : "None right now"}
              tone={criticalCount > 0 ? "critical" : "default"}
            />
            <Stat
              label="You can help"
              value={loading ? "—" : donorBloodGroup ? String(matchingCount) : "—"}
              foot={
                donorBloodGroup
                  ? `Compatible with your ${bloodGroupLabels[donorBloodGroup]} blood`
                  : "Add your blood group to your profile"
              }
              tone={matchingCount > 0 ? "good" : "default"}
            />
            <Stat
              label="Units needed"
              value={loading ? "—" : String(unitsNeeded)}
              foot="Across all requests"
            />
          </StatGrid>
        </div>

        {error && <p className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

        <Panel
          label="Open requests"
          padded={false}
          action={
            donorBloodGroup ? (
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                <input
                  type="checkbox"
                  checked={matchingOnly}
                  onChange={(event) => setMatchingOnly(event.target.checked)}
                />
                Only requests I can help with
              </label>
            ) : (
              <Link href="/profile" className="text-xs font-semibold text-red-900 hover:underline">
                Add your blood group to see matches
              </Link>
            )
          }
        >
          <div className="mt-5 border-t border-slate-100">
            {loading ? (
              <p className="px-6 py-8 text-sm text-slate-500">Loading blood requests…</p>
            ) : visibleRequests.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title={matchingOnly ? "No requests match your blood type" : "No active blood requests"}
                  description="When a health institute raises a request, it appears here so you can respond."
                />
              </div>
            ) : donorBloodGroup ? (
              /*
                The API already lists matching requests first; the two groups
                make that order visible, so a donor sees at a glance which
                requests are theirs to answer and where that list ends.
              */
              <>
                <RequestGroup
                  title="You can help with these"
                  hint={`Compatible with your ${bloodGroupLabels[donorBloodGroup]} blood`}
                  tone="match"
                  requests={visibleRequests.filter((request) => request.canDonate)}
                  emptyText="None of the open requests match your blood group right now."
                  renderRow={renderRequest}
                />
                {!matchingOnly && (
                  <RequestGroup
                    title="Other open requests"
                    hint="Your blood group isn't compatible, but others may be able to help"
                    tone="other"
                    requests={visibleRequests.filter((request) => !request.canDonate)}
                    renderRow={renderRequest}
                  />
                )}
              </>
            ) : (
              visibleRequests.map(renderRequest)
            )}
          </div>
        </Panel>
    </div>
  );

  function renderRequest(request: BloodRequestItem) {
    return (
                <Row key={request.id}>
                  <div className="flex min-w-0 gap-4">
                    <div
                      aria-hidden
                      className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-800"
                    >
                      <Droplet size={17} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <RowTitle>
                          {bloodGroupLabels[request.bloodGroup]} · {request.unitsNeeded} unit
                          {request.unitsNeeded > 1 ? "s" : ""} needed
                        </RowTitle>
                        <Pill tone={urgencyTones[request.urgency]}>{urgencyLabels[request.urgency]}</Pill>
                        {request.canDonate && <Pill tone="good">Your blood can help</Pill>}
                      </div>

                      <RowMeta>
                        {request.healthInstitute.name} ·{" "}
                        {[request.healthInstitute.address, request.healthInstitute.city]
                          .filter(Boolean)
                          .join(", ")}
                      </RowMeta>

                      {request.notes && (
                        <p className="mt-2 max-w-xl text-xs leading-5 text-slate-600">{request.notes}</p>
                      )}

                      <p className="mt-2 text-[11px] text-slate-400">
                        Posted {formatDate(request.createdAt)}
                      </p>
                    </div>
                  </div>

                  <Link
                    href={`/appointments/book?instituteId=${request.healthInstitute.id}`}
                    className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-red-950 px-4 text-xs font-semibold text-white transition hover:brightness-125"
                  >
                    Respond · Book donation
                  </Link>
                </Row>
    );
  }
}

/** One labelled group of requests, with a count, inside the requests panel. */
function RequestGroup({
  title,
  hint,
  tone,
  requests,
  emptyText,
  renderRow,
}: {
  title: string;
  hint: string;
  tone: "match" | "other";
  requests: BloodRequestItem[];
  emptyText?: string;
  renderRow: (request: BloodRequestItem) => ReactNode;
}) {
  if (requests.length === 0 && !emptyText) return null;

  return (
    <section aria-label={title}>
      <div
        className={`flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 px-6 py-3 ${
          tone === "match" ? "bg-emerald-50" : "bg-slate-50"
        }`}
      >
        <h2 className="flex items-center gap-2 font-sans text-[13px] font-semibold text-slate-800">
          <span
            aria-hidden
            className={`h-2 w-2 rounded-full ${tone === "match" ? "bg-emerald-600" : "bg-slate-400"}`}
          />
          {title}
          <span className="font-normal text-slate-500">({requests.length})</span>
        </h2>
        <p className="text-xs text-slate-500">{hint}</p>
      </div>

      {requests.length === 0 ? (
        <p className="px-6 py-5 text-sm text-slate-500">{emptyText}</p>
      ) : (
        requests.map(renderRow)
      )}
    </section>
  );
}
