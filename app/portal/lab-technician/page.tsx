"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { FlaskConical, LayoutDashboard, Minus, Plus, RefreshCw, Sparkles } from "lucide-react";
import {
  TrendAreaChart,
  WeekdayBarChart,
  RadialGauge,
  BreakdownBar,
  DashboardCard,
  bucketByDay,
  weekdayCounts,
} from "@/src/components/dashboard/DashboardWidgets";
import { PortalShell, type PortalNavGroup } from "@/src/components/dashboard/PortalShell";
import { BloodBag, STOCK_STYLES, stockLevel } from "@/src/components/ui/BloodBag";
import {
  PageHeader,
  StatGrid,
  Stat,
  Panel,
  Row,
  RowTitle,
  RowMeta,
  Pill,
  Eyebrow,
  EmptyState,
  type PillTone,
} from "@/src/components/ui/Page";

const PRIMARY_RED = "oklch(27.1% 0.105 12.094)";
const LOW_STOCK_THRESHOLD = 5;

// One field and one stepper style for the whole workspace.
const fieldClass =
  "h-11 w-full rounded-xl border border-slate-300 px-3.5 text-[13.5px] transition focus:border-slate-500 focus:outline-none";

const stepperClass =
  "flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:bg-slate-50 disabled:opacity-40";

type BloodGroup =
  | "A_POSITIVE"
  | "A_NEGATIVE"
  | "B_POSITIVE"
  | "B_NEGATIVE"
  | "AB_POSITIVE"
  | "AB_NEGATIVE"
  | "O_POSITIVE"
  | "O_NEGATIVE";

type PendingAppointment = {
  id: string;
  appointmentDate: string;
  appointmentTime: string;
  donor: {
    firstName: string;
    lastName: string;
    email: string;
    donorProfile: { bloodGroup: BloodGroup | null } | null;
  };
  donation: { id: string } | null;
};

type DonationItem = {
  id: string;
  bloodGroup: BloodGroup;
  volumeMl: number;
  bloodPackId: string | null;
  donatedAt: string;
  donor: { firstName: string; lastName: string; email: string };
};

type InventoryRow = {
  bloodGroup: BloodGroup;
  units: number;
  updatedAt: string | null;
};

type RecommendationPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "OK";

type Recommendation = {
  bloodGroup: BloodGroup;
  units: number;
  openDemand: number;
  priority: RecommendationPriority;
  message: string;
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

const bloodGroupColors: Record<BloodGroup, string> = {
  A_POSITIVE: "oklch(27.1% 0.105 12.094)",
  A_NEGATIVE: "oklch(45% 0.16 20)",
  B_POSITIVE: "oklch(60% 0.15 40)",
  B_NEGATIVE: "oklch(70% 0.15 70)",
  AB_POSITIVE: "oklch(60% 0.12 250)",
  AB_NEGATIVE: "oklch(65% 0.1 200)",
  O_POSITIVE: "oklch(55% 0.02 260)",
  O_NEGATIVE: "oklch(75% 0.02 260)",
};

const priorityTones: Record<RecommendationPriority, PillTone> = {
  CRITICAL: "critical",
  HIGH: "warn",
  MEDIUM: "warn",
  LOW: "neutral",
  OK: "good",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function LabTechnicianPortalPage() {
  const [pendingAppointments, setPendingAppointments] = useState<PendingAppointment[]>([]);
  const [donations, setDonations] = useState<DonationItem[]>([]);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [topRecommendation, setTopRecommendation] = useState<Recommendation | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  /*
    The assistant has its own loading flag.

    It used to share `loading` with everything else, because all four requests
    were awaited together in one Promise.all. Three of them return in
    milliseconds; the fourth waits for the language model to write a
    paragraph, which takes seconds on a warm model and much longer on a cold
    one. The effect was that the inventory — already fetched, already in hand
    — sat behind a spinner until the model had finished writing.
  */
  const [insightLoading, setInsightLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);

  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [recordForm, setRecordForm] = useState({ volumeMl: "450", bloodPackId: "", notes: "" });
  const [submittingRecord, setSubmittingRecord] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "processing">("dashboard");

  const unrecordedAppointments = useMemo(
    () => pendingAppointments.filter((appointment) => !appointment.donation),
    [pendingAppointments],
  );

  const totalUnits = useMemo(() => inventory.reduce((sum, row) => sum + row.units, 0), [inventory]);

  /*
    One scale for every bag: the fullest group tops them all out, with a floor
    so a nearly empty shelf does not make two units look like a full bag.
  */
  const fullBag = useMemo(
    () => Math.max(10, ...inventory.map((row) => row.units)),
    [inventory],
  );
  const lowStockGroups = useMemo(
    () => inventory.filter((row) => row.units < LOW_STOCK_THRESHOLD).length,
    [inventory],
  );

  const processedCount = pendingAppointments.length - unrecordedAppointments.length;
  const processingRate =
    pendingAppointments.length === 0
      ? 100
      : Math.round((processedCount / pendingAppointments.length) * 100);

  const donationTrend = useMemo(
    () => bucketByDay(donations.map((donation) => donation.donatedAt), 14),
    [donations],
  );

  const donationsByWeekday = useMemo(
    () => weekdayCounts(donations.map((donation) => donation.donatedAt)),
    [donations],
  );

  const inventoryBreakdown = useMemo(
    () =>
      inventory
        .filter((row) => row.units > 0)
        .map((row) => ({
          label: bloodGroupLabels[row.bloodGroup],
          value: row.units,
          color: bloodGroupColors[row.bloodGroup],
        }))
        .sort((a, b) => b.value - a.value),
    [inventory],
  );

  /*
    The assistant's read on the stock. Fetched on its own, never awaited with
    the rest, so a slow model delays nothing but its own card.
  */
  const applyInsights = useCallback(async (request: Promise<Response | null>) => {
    try {
      const response = await request;

      if (!response?.ok) return;

      const data = await response.json().catch(() => ({}));
      const priorityOrder: RecommendationPriority[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "OK"];
      const recommendations: Recommendation[] = data.recommendations ?? [];
      const sorted = [...recommendations].sort(
        (a, b) => priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority),
      );

      setTopRecommendation(sorted[0] ?? null);
      setAiSummary(data.aiSummary ?? null);
    } catch {
      // The workspace works without it; the card says so.
    } finally {
      setInsightLoading(false);
    }
  }, []);

  /*
    Sets no state before its first await: `loading` and `insightLoading`
    both start true, so the mount fetch has nothing to announce. A spinner
    raised synchronously from inside an effect is the cascading render that
    react-hooks/set-state-in-effect exists to prevent — `refresh` below
    raises the flags for the reloads a person asks for.
  */
  const loadAll = useCallback(async () => {
    /*
      The assistant's request goes out now, alongside the other three, but is
      read at the end: its answer waits on the language model, and nothing on
      this screen should. Starting the fetch here rather than calling a
      state-setting function keeps the effect's synchronous path free of
      setState, which is what react-hooks/set-state-in-effect asks for.
    */
    const insightsRequest = fetch("/api/lab-tech/ai-recommendations", {
      credentials: "include",
      cache: "no-store",
    }).catch(() => null);

    try {
      const [appointmentsRes, donationsRes, inventoryRes] = await Promise.all([
        fetch("/api/lab-tech/appointments", { credentials: "include", cache: "no-store" }),
        fetch("/api/lab-tech/donations", { credentials: "include", cache: "no-store" }),
        fetch("/api/lab-tech/inventory", { credentials: "include", cache: "no-store" }),
      ]);

      const [appointmentsData, donationsData, inventoryData] = await Promise.all([
        appointmentsRes.json().catch(() => ({})),
        donationsRes.json().catch(() => ({})),
        inventoryRes.json().catch(() => ({})),
      ]);

      if (!appointmentsRes.ok) throw new Error(appointmentsData.error ?? "Unable to load appointments.");
      if (!donationsRes.ok) throw new Error(donationsData.error ?? "Unable to load donations.");
      if (!inventoryRes.ok) throw new Error(inventoryData.error ?? "Unable to load inventory.");

      setPendingAppointments(appointmentsData.appointments ?? []);
      setDonations(donationsData.donations ?? []);
      setInventory(inventoryData.inventory ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load your workspace.");
    } finally {
      setLoading(false);
    }

    // Read once the rest of the workspace is on screen.
    void applyInsights(insightsRequest);
  }, [applyInsights]);

  /** A reload the user asked for, which does announce itself. */
  const refresh = useCallback(() => {
    setLoading(true);
    setInsightLoading(true);
    setError("");
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  function startRecording(appointmentId: string) {
    setRecordingId(appointmentId);
    setRecordForm({ volumeMl: "450", bloodPackId: "", notes: "" });
    setError("");
    setNotice("");
  }

  async function submitRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!recordingId) return;

    setSubmittingRecord(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/lab-tech/donations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: recordingId,
          volumeMl: Number(recordForm.volumeMl),
          bloodPackId: recordForm.bloodPackId,
          notes: recordForm.notes,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to record donation.");
      }

      setDonations((current) => [data.donation, ...current]);
      setPendingAppointments((current) =>
        current.map((appointment) =>
          appointment.id === recordingId ? { ...appointment, donation: { id: data.donation.id } } : appointment,
        ),
      );
      setNotice("Donation recorded and added to inventory.");
      setRecordingId(null);
      refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to record donation.");
    } finally {
      setSubmittingRecord(false);
    }
  }

  async function adjustInventory(bloodGroup: BloodGroup, delta: number) {
    setActionId(bloodGroup);
    setError("");

    try {
      const response = await fetch("/api/lab-tech/inventory", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bloodGroup, delta }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to adjust inventory.");
      }

      setInventory((current) =>
        current.map((row) => (row.bloodGroup === bloodGroup ? { ...row, units: data.inventory.units } : row)),
      );
    } catch (adjustError) {
      setError(adjustError instanceof Error ? adjustError.message : "Unable to adjust inventory.");
    } finally {
      setActionId(null);
    }
  }

  useEffect(() => {
    function applyHash() {
      setActiveTab(window.location.hash === "#processing" ? "processing" : "dashboard");
    }

    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  const labNav: PortalNavGroup[] = [
    {
      label: "Workspace",
      links: [
        {
          href: "#dashboard",
          label: "Dashboard",
          icon: <LayoutDashboard size={16} />,
        },
        {
          href: "#processing",
          label: "Processing",
          icon: <FlaskConical size={16} />,
        },
        {
          href: "/portal/lab-technician/ai-recommendations",
          label: "AI recommendations",
          icon: <Sparkles size={16} />,
        },
      ],
    },
  ];

  return (
    <PortalShell
      brandHref="/portal/lab-technician"
      title="Laboratory workspace"
      subtitle="Donation processing and blood inventory"
      navGroups={labNav}
      activeHref={activeTab === "dashboard" ? "#dashboard" : "#processing"}
      onNavigate={(href) => {
        setActiveTab(href === "#processing" ? "processing" : "dashboard");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
      accountName="Laboratory technician"
      accountRole="Processing & inventory"
    >
          <div className="mx-auto max-w-7xl">

            <PageHeader
              eyebrow={activeTab === "dashboard" ? "Laboratory dashboard" : "Donation processing"}
              title={activeTab === "dashboard" ? "Overview" : "Processing workspace"}
              description={
                activeTab === "dashboard"
                  ? "Track processing performance and inventory health at a glance."
                  : "Record completed donations and keep verified inventory available to the care team."
              }
              actions={
                <>
                  <div className="flex rounded-xl border border-slate-300 p-0.5">
                    <TabButton
                      label="Dashboard"
                      active={activeTab === "dashboard"}
                      onClick={() => setActiveTab("dashboard")}
                    />
                    <TabButton
                      label="Processing"
                      active={activeTab === "processing"}
                      onClick={() => setActiveTab("processing")}
                    />
                  </div>

                  <button
                    onClick={refresh}
                    className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-300 px-5 text-[13px] font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                  >
                    <RefreshCw size={15} />
                    Refresh
                  </button>
                </>
              }
            />

            {error && <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
            {notice && <p className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}

            {activeTab === "dashboard" ? (
              <>
                <div className="mt-7">
                  <StatGrid>
                    <Stat
                      label="Pending donations"
                      value={unrecordedAppointments.length.toString()}
                      foot="Awaiting record"
                      tone={unrecordedAppointments.length > 0 ? "warn" : "default"}
                    />
                    <Stat
                      label="Total inventory"
                      value={totalUnits.toString()}
                      foot="Units in stock"
                    />
                    <Stat
                      label="Recorded donations"
                      value={donations.length.toString()}
                      foot="Most recent 100"
                    />
                    <Stat
                      label="Low stock groups"
                      value={lowStockGroups.toString()}
                      foot={
                        lowStockGroups > 0
                          ? `Below ${LOW_STOCK_THRESHOLD} units`
                          : "All groups healthy"
                      }
                      tone={lowStockGroups > 0 ? "critical" : "good"}
                    />
                  </StatGrid>
                </div>

                <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_340px]">
                  <DashboardCard title="Donations recorded" action={<span className="text-[11px] font-semibold text-slate-400">Last 14 days</span>}>
                    <TrendAreaChart data={donationTrend} color={PRIMARY_RED} emptyLabel="No donations recorded yet." />
                  </DashboardCard>

                  <DashboardCard title="Busiest processing day">
                    <WeekdayBarChart data={donationsByWeekday} color={PRIMARY_RED} />
                    <p className="mt-3 text-[11px] leading-5 text-slate-400">Based on the most recent 100 donations.</p>
                  </DashboardCard>
                </div>

                <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_340px]">
                  <DashboardCard title="Blood inventory mix">
                    {inventoryBreakdown.length === 0 ? (
                      <p className="text-xs text-slate-400">No inventory recorded yet.</p>
                    ) : (
                      <BreakdownBar segments={inventoryBreakdown} />
                    )}
                  </DashboardCard>

                  <div className="space-y-6">
                    <DashboardCard>
                      <RadialGauge
                        percent={processingRate}
                        label="Donation processing rate"
                        sublabel={`${processedCount} of ${pendingAppointments.length} recorded`}
                        color={PRIMARY_RED}
                      />
                    </DashboardCard>
                  </div>
                </div>

                <DashboardCard
                  className="mt-6"
                  title="AI assistant"
                  action={
                    <Link href="/portal/lab-technician/ai-recommendations" className="text-[11px] font-bold text-red-950">
                      View all
                    </Link>
                  }
                >
                  <div className="flex items-start gap-4">
                    <div
                      aria-hidden
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-950 text-white"
                    >
                      <Sparkles size={17} />
                    </div>

                    <div className="min-w-0">
                      {topRecommendation ? (
                        <>
                          <div className="flex flex-wrap items-center gap-2">
                            <RowTitle>
                              {bloodGroupLabels[topRecommendation.bloodGroup]} needs attention
                            </RowTitle>
                            <Pill tone={priorityTones[topRecommendation.priority]}>
                              {topRecommendation.priority}
                            </Pill>
                          </div>
                          <p className="mt-1.5 text-xs leading-5 text-slate-600">
                            {topRecommendation.message}
                          </p>
                        </>
                      ) : insightLoading ? (
                        <div aria-busy="true" aria-label="Reading stock levels">
                          <div className="bbSkeleton h-3.5 w-40" />
                          <div className="bbSkeleton mt-2 h-3 w-56" />
                        </div>
                      ) : (
                        <p className="text-xs leading-5 text-slate-600">
                          Stock levels look healthy across all blood groups.
                        </p>
                      )}

                      {/*
                        The written summary lands after the priority above it,
                        since it waits on the model rather than on the figures.
                      */}
                      {insightLoading ? (
                        <div
                          aria-busy="true"
                          aria-label="Drafting a summary"
                          className="mt-3 rounded-xl border border-slate-200 p-3"
                        >
                          <div className="bbSkeleton h-3 w-full" />
                          <div className="bbSkeleton mt-2 h-3 w-[85%]" />
                          <div className="bbSkeleton mt-2 h-3 w-[60%]" />
                        </div>
                      ) : (
                        aiSummary && (
                          <p className="mt-3 rounded-xl border border-slate-200 p-3 text-xs leading-5 text-slate-600">
                            {aiSummary}
                          </p>
                        )
                      )}
                    </div>
                  </div>
                </DashboardCard>
              </>
            ) : (
              <>
                <div className="mt-7">
                  <Panel label="Blood inventory">
                    {loading ? (
                      /*
                        Eight tiles at the size the real ones occupy, so the
                        grid does not reflow when the figures arrive.
                      */
                      <div
                        aria-busy="true"
                        aria-label="Loading blood inventory"
                        className="mt-5 grid gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-4"
                      >
                        {Array.from({ length: 8 }, (_, index) => (
                          <div key={index} className="bg-white px-5 py-5">
                            <div className="bbSkeleton h-2.5 w-10" />
                            <div className="bbSkeleton mt-3 h-[26px] w-14" />
                            <div className="bbSkeleton mt-3 h-2.5 w-20" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      /*
                        Each group is a bag filled to what is on the shelf,
                        against the fullest group as the top of every bag — so
                        a glance across the row is a glance across the stock.
                        The colour says whether that amount is a problem, and
                        the word underneath says it again for anyone who does
                        not read the colour.
                      */
                      <div className="mt-5 grid gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
                        {inventory.map((row) => {
                          const level = stockLevel(row.units);
                          const style = STOCK_STYLES[level];

                          return (
                            <div key={row.bloodGroup} className="bg-white px-5 py-5">
                              <div className="flex items-start gap-3.5">
                                <BloodBag
                                  units={row.units}
                                  fullMark={fullBag}
                                  color={style.mark}
                                  label={row.bloodGroup}
                                  className="h-[60px] w-10"
                                />

                                <div className="min-w-0">
                                  <Eyebrow>{bloodGroupLabels[row.bloodGroup]}</Eyebrow>

                                  <p
                                    className={`mt-1.5 text-[26px] leading-none font-bold tracking-[-0.02em] tabular-nums ${
                                      level === "healthy" ? "text-slate-950" : style.ink
                                    }`}
                                  >
                                    {row.units}
                                  </p>

                                  <p className="mt-1.5 text-xs text-slate-500">
                                    unit{row.units === 1 ? "" : "s"}
                                  </p>
                                </div>
                              </div>

                              <div className="mt-3.5 flex items-center justify-between gap-2">
                                <span
                                  className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${style.ink}`}
                                >
                                  <span
                                    aria-hidden
                                    className="h-1.5 w-1.5 rounded-full"
                                    style={{ backgroundColor: style.mark }}
                                  />
                                  {style.word}
                                </span>

                                <div className="flex gap-2">
                                  <button
                                    onClick={() => adjustInventory(row.bloodGroup, -1)}
                                    disabled={actionId === row.bloodGroup || row.units === 0}
                                    aria-label={`Remove one ${bloodGroupLabels[row.bloodGroup]} unit`}
                                    className={stepperClass}
                                  >
                                    <Minus size={14} />
                                  </button>
                                  <button
                                    onClick={() => adjustInventory(row.bloodGroup, 1)}
                                    disabled={actionId === row.bloodGroup}
                                    aria-label={`Add one ${bloodGroupLabels[row.bloodGroup]} unit`}
                                    className={stepperClass}
                                  >
                                    <Plus size={14} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Panel>
                </div>

                <div id="processing" className="mt-6 grid gap-6 lg:grid-cols-2">
                  <Panel label="Donations to record" padded={false}>
                    <div className="mt-5 border-t border-slate-100">
                      {loading ? (
                        <div aria-busy="true" aria-label="Loading appointments">
                          {Array.from({ length: 3 }, (_, index) => (
                            <div
                              key={index}
                              className="border-b border-slate-100 px-6 py-4 last:border-b-0"
                            >
                              <div className="bbSkeleton h-3.5 w-48" />
                              <div className="bbSkeleton mt-2 h-3 w-64" />
                            </div>
                          ))}
                        </div>
                      ) : unrecordedAppointments.length === 0 ? (
                        <div className="p-6">
                          <EmptyState
                            title="Nothing awaiting a record"
                            description="Completed appointments without a donation record appear here."
                          />
                        </div>
                      ) : (
                        unrecordedAppointments.map((appointment) => (
                          <div
                            key={appointment.id}
                            className="border-b border-slate-100 px-6 py-4 last:border-b-0"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-4">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <RowTitle>
                                    {appointment.donor.firstName} {appointment.donor.lastName}
                                  </RowTitle>

                                  {appointment.donor.donorProfile?.bloodGroup && (
                                    <Pill tone="critical">
                                      {bloodGroupLabels[appointment.donor.donorProfile.bloodGroup]}
                                    </Pill>
                                  )}
                                </div>

                                <RowMeta>
                                  {formatDate(appointment.appointmentDate)} at{" "}
                                  {appointment.appointmentTime}
                                </RowMeta>
                              </div>

                              {recordingId !== appointment.id && (
                                <button
                                  onClick={() => startRecording(appointment.id)}
                                  className="inline-flex h-9 shrink-0 items-center rounded-lg bg-red-950 px-4 text-xs font-semibold text-white transition hover:brightness-125"
                                >
                                  Record donation
                                </button>
                              )}
                            </div>

                            {recordingId === appointment.id && (
                              <form
                                onSubmit={submitRecord}
                                className="mt-4 space-y-3 rounded-xl border border-slate-200 p-4"
                              >
                                <label htmlFor="rec-volume" className="sr-only">
                                  Volume in millilitres
                                </label>
                                <input
                                  id="rec-volume"
                                  required
                                  type="number"
                                  min={1}
                                  value={recordForm.volumeMl}
                                  onChange={(event) =>
                                    setRecordForm({ ...recordForm, volumeMl: event.target.value })
                                  }
                                  placeholder="Volume (mL)"
                                  className={fieldClass}
                                />

                                <label htmlFor="rec-pack" className="sr-only">
                                  Blood pack ID
                                </label>
                                <input
                                  id="rec-pack"
                                  value={recordForm.bloodPackId}
                                  onChange={(event) =>
                                    setRecordForm({ ...recordForm, bloodPackId: event.target.value })
                                  }
                                  placeholder="Blood pack ID (optional)"
                                  className={fieldClass}
                                />

                                <label htmlFor="rec-notes" className="sr-only">
                                  Notes
                                </label>
                                <textarea
                                  id="rec-notes"
                                  value={recordForm.notes}
                                  onChange={(event) =>
                                    setRecordForm({ ...recordForm, notes: event.target.value })
                                  }
                                  placeholder="Notes (optional)"
                                  rows={2}
                                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-[13.5px] transition focus:border-slate-500 focus:outline-none"
                                />

                                <div className="flex gap-2">
                                  <button
                                    disabled={submittingRecord}
                                    className="inline-flex h-10 items-center rounded-lg bg-red-950 px-4 text-xs font-semibold text-white transition hover:brightness-125 disabled:opacity-50"
                                  >
                                    {submittingRecord ? "Saving…" : "Save record"}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setRecordingId(null)}
                                    className="inline-flex h-10 items-center rounded-lg border border-slate-300 px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </form>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </Panel>

                  <Panel label="Recent donations" padded={false}>
                    <div className="mt-5 border-t border-slate-100">
                      {loading ? (
                        <div aria-busy="true" aria-label="Loading donations">
                          {Array.from({ length: 3 }, (_, index) => (
                            <div
                              key={index}
                              className="border-b border-slate-100 px-6 py-4 last:border-b-0"
                            >
                              <div className="bbSkeleton h-3.5 w-48" />
                              <div className="bbSkeleton mt-2 h-3 w-64" />
                            </div>
                          ))}
                        </div>
                      ) : donations.length === 0 ? (
                        <div className="p-6">
                          <EmptyState
                            title="No donations recorded yet"
                            description="Records you save appear here, newest first."
                          />
                        </div>
                      ) : (
                        donations.map((donation) => (
                          <Row key={donation.id}>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <RowTitle>
                                  {donation.donor.firstName} {donation.donor.lastName}
                                </RowTitle>
                                <Pill tone="critical">{bloodGroupLabels[donation.bloodGroup]}</Pill>
                              </div>

                              <RowMeta>
                                {formatDate(donation.donatedAt)} · {donation.volumeMl} mL
                                {donation.bloodPackId ? ` · Pack ${donation.bloodPackId}` : ""}
                              </RowMeta>
                            </div>
                          </Row>
                        ))
                      )}
                    </div>
                  </Panel>
                </div>
              </>
            )}
          </div>
    </PortalShell>
  );
}

function TabButton({
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
      className={`rounded-lg px-4 text-[11px] font-semibold transition ${
        active ? "bg-red-950 text-white" : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {label}
    </button>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M10 5H5v14h5" />
      <path d="M14 8l4 4-4 4M18 12H9" />
    </svg>
  );
}
