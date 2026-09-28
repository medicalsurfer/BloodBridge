import { Suspense } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CircleAlert,
  CircleCheck,
  Eye,
  Mail,
  Phone,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { getAuthenticatedUserFromToken } from "@/src/lib/auth";
import { generateAiSummary } from "@/src/lib/ai-recommendations";
import { label as groupLabel } from "@/src/lib/donor-matching";
import { BloodBag } from "@/src/components/ui/BloodBag";
import { gatherLabInsights, type LabInsights } from "@/src/lib/lab-insights";
import { groupsNeedingAction } from "@/src/lib/shortage-forecast";

/*
  The laboratory's stock screen: what you have, what is running out, and who
  to call about it.

  Rendered on the server, so the figures are on screen in the first response
  with no spinner. Only the assistant's paragraph streams in behind a Suspense
  boundary, because it waits on the language model and nothing else should.

  Every number is computed in src/lib/shortage-forecast.ts and
  src/lib/donor-matching.ts from this institute's own records.
*/

type Forecast = LabInsights["forecast"][number];
type Risk = Forecast["risk"];

/*
  Status, from the design system's own tokens so it follows light and dark.
  Colour fills the bag; the label beside it carries an icon and a word, so the
  state never depends on colour alone.
*/
const RISK = {
  CRITICAL: {
    word: "Critical",
    mark: "var(--color-crimson)",
    ink: "text-red-800",
    chip: "border-red-200 bg-red-50",
    Icon: AlertTriangle,
  },
  HIGH: {
    word: "Running low",
    mark: "var(--bb-high)",
    ink: "text-orange-800",
    chip: "border-orange-200 bg-orange-50",
    Icon: CircleAlert,
  },
  WATCH: {
    word: "Keep an eye",
    mark: "var(--bb-warning)",
    ink: "text-amber-800",
    chip: "border-amber-200 bg-amber-50",
    Icon: Eye,
  },
  STABLE: {
    word: "Healthy",
    mark: "var(--bb-success)",
    ink: "text-emerald-800",
    chip: "border-emerald-200 bg-emerald-50",
    Icon: CircleCheck,
  },
} as const satisfies Record<Risk, unknown>;

/** The status line under each bag, in words rather than jargon. */
function plainStatus(group: Forecast) {
  if (group.unitsOnHand === 0) return "Nothing on the shelf";

  if (group.method === "cover" && group.daysOfCover !== null) {
    const days = Math.floor(group.daysOfCover);
    if (days <= 1) return "Runs out today";
    return `About ${days} days left`;
  }

  if (group.openDemand > group.unitsOnHand) return "Less than is asked for";

  return group.risk === "STABLE" ? "Comfortable" : "Below the usual level";
}

function GroupTile({ group, fullMark }: { group: Forecast; fullMark: number }) {
  const { word, ink, chip, Icon } = RISK[group.risk];

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 sm:p-5">
      <BloodBag
        units={group.unitsOnHand}
        fullMark={fullMark}
        color={RISK[group.risk].mark}
        label={group.bloodGroup}
      />

      <div className="min-w-0">
        <p className="font-display text-2xl leading-none font-semibold tracking-[-0.02em] text-slate-950 tabular-nums">
          {groupLabel(group.bloodGroup)}
        </p>

        <p className="mt-2 text-sm font-semibold text-slate-800 tabular-nums">
          {group.unitsOnHand} unit{group.unitsOnHand === 1 ? "" : "s"}
        </p>

        <p className="mt-0.5 text-xs leading-5 text-slate-500">{plainStatus(group)}</p>

        <span
          className={`mt-2.5 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${chip} ${ink}`}
        >
          <Icon size={12} strokeWidth={2.5} aria-hidden />
          {word}
        </span>
      </div>
    </div>
  );
}

/** Initials for the donor avatar — two letters, never more. */
function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/*
  The assistant's paragraph, in its own async component so the Suspense
  boundary streams: the figures are already on screen while the model is being
  waited on, and if it never answers the page is unaffected.
*/
async function AssistantNote({ insights }: { insights: LabInsights }) {
  const summary = await generateAiSummary(
    insights.recommendations,
    insights.instituteName ?? "your institute",
    groupsNeedingAction(insights.forecast).map(
      (group) => `${groupLabel(group.bloodGroup)}: ${group.message}`,
    ),
  );

  if (summary) {
    return <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">{summary}</p>;
  }

  return (
    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
      The assistant is not reachable right now. Everything above is unaffected — it is calculated
      here, not written by the assistant.
    </p>
  );
}

export default async function AiRecommendationsPage({
  searchParams,
}: {
  searchParams: Promise<{ matchFor?: string }>;
}) {
  const cookieStore = await cookies();
  const authentication = await getAuthenticatedUserFromToken(
    cookieStore.get("bloodbridge_session")?.value ?? "",
  );

  // The layout already guards this route; this narrows the type and gives us
  // the institute whose stock we are reporting on.
  if (!authentication.user?.healthInstituteId) redirect("/login");

  const { matchFor } = await searchParams;

  const insights = await gatherLabInsights({
    healthInstituteId: authentication.user.healthInstituteId,
    matchFor,
  });

  const { forecast, matches, instituteName } = insights;
  const atRisk = forecast.filter((group) => group.risk !== "STABLE");
  const lead = atRisk[0] ?? null;
  const selected = insights.matchFor;

  // One scale for every bag: the fullest group tops them all out.
  const fullMark = Math.max(10, ...forecast.map((group) => group.unitsOnHand));
  const totalUnits = forecast.reduce((sum, group) => sum + group.unitsOnHand, 0);

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header className="flex flex-wrap items-end justify-between gap-5">
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Your blood stock
            </h1>

            <p className="mt-2.5 max-w-2xl text-sm leading-6 text-slate-600">
              {instituteName ? `${instituteName} · ` : ""}
              <span className="font-semibold text-slate-800 tabular-nums">{totalUnits} units</span>{" "}
              on the shelf across {forecast.length} blood groups.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={
                selected
                  ? `/portal/lab-technician/ai-recommendations?matchFor=${selected}`
                  : "/portal/lab-technician/ai-recommendations"
              }
              prefetch={false}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-red-300 hover:text-red-800"
            >
              <RefreshCw size={16} />
              Refresh
            </Link>

            <Link
              href="/portal/lab-technician"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-red-300 hover:text-red-800"
            >
              <ArrowLeft size={16} />
              Workspace
            </Link>
          </div>
        </header>

        {/* WHAT NEEDS YOU FIRST */}
        {lead ? (
          <section className="overflow-hidden rounded-2xl border border-red-200 bg-red-50">
            <div className="flex flex-wrap items-center gap-5 p-5 sm:p-6">
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-white"
                style={{ backgroundColor: RISK[lead.risk].mark }}
              >
                <span className="font-display text-xl font-semibold tabular-nums">
                  {groupLabel(lead.bloodGroup)}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold tracking-[0.12em] text-red-800 uppercase">
                  Needs you first
                </p>

                <p className="mt-1.5 text-lg leading-6 font-semibold text-slate-950">
                  {plainStatus(lead)} — {groupLabel(lead.bloodGroup)}
                </p>

                <p className="mt-1.5 max-w-xl text-sm leading-6 text-slate-700">{lead.message}</p>
              </div>

              {matches.length > 0 && (
                <a
                  href="#donors"
                  className="inline-flex items-center gap-2 rounded-xl bg-red-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-900"
                >
                  See {matches.length} donor{matches.length === 1 ? "" : "s"} to call
                </a>
              )}
            </div>
          </section>
        ) : (
          <section className="flex items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
            <CircleCheck size={22} className="shrink-0 text-emerald-700" aria-hidden />
            <div>
              <p className="font-semibold text-slate-950">Everything is healthy today</p>
              <p className="mt-0.5 text-sm text-slate-700">
                No blood group needs attention, so there is nobody to call.
              </p>
            </div>
          </section>
        )}

        {/* THE EIGHT GROUPS */}
        <section>
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-display text-xl font-semibold text-slate-950">
              Every group at a glance
            </h2>
            <p className="text-xs text-slate-500 tabular-nums">
              Bags fill against {fullMark} units, the fullest group
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {forecast.map((group) => (
              <GroupTile key={group.bloodGroup} group={group} fullMark={fullMark} />
            ))}
          </div>
        </section>

        {/* DONORS TO CALL */}
        <section id="donors" className="scroll-mt-6">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-display text-xl font-semibold text-slate-950">Donors to call</h2>

            {atRisk.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {atRisk.map((group) => {
                  const isSelected = group.bloodGroup === selected;

                  return (
                    <Link
                      key={group.bloodGroup}
                      href={`/portal/lab-technician/ai-recommendations?matchFor=${group.bloodGroup}#donors`}
                      aria-current={isSelected ? "true" : undefined}
                      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition tabular-nums ${
                        isSelected
                          ? "border-red-900 bg-red-950 text-white"
                          : "border-slate-300 bg-white text-slate-700 hover:border-red-300 hover:text-red-800"
                      }`}
                    >
                      <span
                        aria-hidden
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: RISK[group.risk].mark }}
                      />
                      {groupLabel(group.bloodGroup)}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {!selected ? (
            <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm leading-6 text-slate-600">
              Nothing needs attention, so there is nobody to call today.
            </p>
          ) : matches.length === 0 ? (
            <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm leading-6 text-slate-600">
              Nobody can give {groupLabel(selected)} right now. Everyone compatible has either
              donated in the last 56 days or is already booked in.
            </p>
          ) : (
            <>
              <p className="mb-4 text-sm text-slate-600">
                Ranked for <span className="font-semibold">{groupLabel(selected)}</span>. Donors
                already booked in are left out, and an exact match comes before a universal donor.
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                {matches.map((match) => (
                  <div
                    key={match.id}
                    className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
                  >
                    <div className="flex items-start gap-3.5">
                      <span
                        aria-hidden
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                          match.exactMatch
                            ? "bg-red-950 text-white"
                            : "border border-slate-300 bg-slate-50 text-slate-700"
                        }`}
                      >
                        {initials(match.name)}
                      </span>

                      <div className="min-w-0">
                        <p className="font-semibold text-slate-950">{match.name}</p>

                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                          <span className="font-semibold text-slate-700 tabular-nums">
                            {groupLabel(match.bloodGroup)}
                          </span>
                          {match.exactMatch ? (
                            <span>exact match</span>
                          ) : (
                            <span>compatible</span>
                          )}
                          {match.city && <span>· {match.city}</span>}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {match.reasons.slice(0, 3).map((reason) => (
                        <span
                          key={reason}
                          className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] leading-4 font-medium text-slate-600"
                        >
                          {reason}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={`mailto:${match.email}`}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-red-300 hover:text-red-800"
                      >
                        <Mail size={14} />
                        Email
                      </a>

                      {match.phoneNumber && (
                        <a
                          href={`tel:${match.phoneNumber}`}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                          <Phone size={14} />
                          Call
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        {/* THE ASSISTANT'S NOTE */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <Sparkles size={16} className="mt-0.5 shrink-0 text-red-800" aria-hidden />

            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-slate-900">A note from the assistant</h2>

              <Suspense
                fallback={
                  <div aria-busy="true" aria-label="Writing a summary" className="mt-2 max-w-2xl">
                    <div className="bbSkeleton h-3.5 w-full" />
                    <div className="bbSkeleton mt-2.5 h-3.5 w-[92%]" />
                    <div className="bbSkeleton mt-2.5 h-3.5 w-[64%]" />
                  </div>
                }
              >
                <AssistantNote insights={insights} />
              </Suspense>

              <p className="mt-3 text-xs leading-5 text-slate-500">
                Every figure on this page is worked out from your own records. Only this paragraph
                is written by the assistant, and the laboratory decides.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
