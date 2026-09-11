"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Droplet,
  FlaskConical,
  LayoutDashboard,
  Minus,
  Plus,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import {
  KpiCard,
  TrendAreaChart,
  WeekdayBarChart,
  RadialGauge,
  BreakdownBar,
  DashboardCard,
  bucketByDay,
  weekdayCounts,
} from "@/src/components/dashboard/DashboardWidgets";

const PRIMARY_RED = "oklch(27.1% 0.105 12.094)";
const LOW_STOCK_THRESHOLD = 5;

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

const priorityStyles: Record<RecommendationPriority, string> = {
  CRITICAL: "bg-red-50 text-red-700",
  HIGH: "bg-orange-50 text-orange-700",
  MEDIUM: "bg-amber-50 text-amber-700",
  LOW: "bg-slate-100 text-slate-600",
  OK: "bg-emerald-50 text-emerald-700",
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

  async function loadAll() {
    setLoading(true);
    setError("");

    try {
      const [appointmentsRes, donationsRes, inventoryRes, aiRes] = await Promise.all([
        fetch("/api/lab-tech/appointments", { credentials: "include", cache: "no-store" }),
        fetch("/api/lab-tech/donations", { credentials: "include", cache: "no-store" }),
        fetch("/api/lab-tech/inventory", { credentials: "include", cache: "no-store" }),
        fetch("/api/lab-tech/ai-recommendations", { credentials: "include", cache: "no-store" }),
      ]);

      const [appointmentsData, donationsData, inventoryData, aiData] = await Promise.all([
        appointmentsRes.json().catch(() => ({})),
        donationsRes.json().catch(() => ({})),
        inventoryRes.json().catch(() => ({})),
        aiRes.json().catch(() => ({})),
      ]);

      if (!appointmentsRes.ok) throw new Error(appointmentsData.error ?? "Unable to load appointments.");
      if (!donationsRes.ok) throw new Error(donationsData.error ?? "Unable to load donations.");
      if (!inventoryRes.ok) throw new Error(inventoryData.error ?? "Unable to load inventory.");

      setPendingAppointments(appointmentsData.appointments ?? []);
      setDonations(donationsData.donations ?? []);
      setInventory(inventoryData.inventory ?? []);

      if (aiRes.ok) {
        const priorityOrder: RecommendationPriority[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "OK"];
        const recommendations: Recommendation[] = aiData.recommendations ?? [];
        const sorted = [...recommendations].sort(
          (a, b) => priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority),
        );
        setTopRecommendation(sorted[0] ?? null);
        setAiSummary(aiData.aiSummary ?? null);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load your workspace.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

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
      void loadAll();
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

  return (
    <main className="h-screen overflow-hidden bg-slate-100 p-4">
      <section className="mx-auto flex h-full max-w-375 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

        <header className="flex shrink-0 flex-col gap-4 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div style={{ backgroundColor: PRIMARY_RED }} className="flex h-10 w-10 items-center justify-center rounded-xl text-white">
              <FlaskConical size={19} />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-950">BloodBridge</p>
              <p className="text-[10px] text-slate-400">Laboratory workspace</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-bold text-slate-800">Laboratory technician</p>
              <p className="mt-0.5 text-[10px] text-slate-400">Processing &amp; inventory</p>
            </div>
            <div style={{ backgroundColor: PRIMARY_RED }} className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white">
              LT
            </div>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">

          <aside className="w-full shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-4 lg:w-[230px]">
            <nav className="space-y-2">
              <NavButton
                label="Dashboard"
                icon={<LayoutDashboard size={18} />}
                active={activeTab === "dashboard"}
                onClick={() => setActiveTab("dashboard")}
              />
              <NavButton
                label="Processing"
                icon={<FlaskConical size={18} />}
                active={activeTab === "processing"}
                onClick={() => setActiveTab("processing")}
              />
              <NavItem href="/portal/lab-technician/ai-recommendations" label="AI recommendations" icon={<Sparkles size={18} />} />
            </nav>

            <div className="mt-8 border-t border-slate-100 pt-5">
              <p className="px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Account</p>
              <div className="mt-3 space-y-2">
                <Link href="/api/logout" className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-red-700 transition hover:bg-red-50">
                  <LogoutIcon />
                  Sign out
                </Link>
              </div>
            </div>
          </aside>

          <section className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 p-6 lg:p-8">

            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-red-950">
                  <Activity size={13} strokeWidth={2.5} />
                  {activeTab === "dashboard" ? "Laboratory dashboard" : "Donation processing"}
                </p>
                <h1 className="mt-2 text-3xl font-bold text-slate-950">
                  {activeTab === "dashboard" ? "Overview" : "Processing workspace"}
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                  {activeTab === "dashboard"
                    ? "Track processing performance and inventory health at a glance."
                    : "Record completed donations and keep verified inventory available to the care team."}
                </p>
              </div>

              <button onClick={loadAll} className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
                <RefreshCw size={15} />
                Refresh
              </button>
            </div>

            {error && <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
            {notice && <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</p>}

            {activeTab === "dashboard" ? (
              <>
                <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <KpiCard label="Pending donations" value={unrecordedAppointments.length.toString()} delta="Awaiting record" trend="flat" icon={<FlaskConical size={18} />} />
                  <KpiCard label="Total inventory" value={totalUnits.toString()} delta="Units in stock" trend="flat" icon={<Droplet size={18} />} />
                  <KpiCard label="Recorded donations" value={donations.length.toString()} delta="Most recent 100" trend="flat" icon={<Activity size={18} />} />
                  <KpiCard
                    label="Low stock groups"
                    value={lowStockGroups.toString()}
                    delta={lowStockGroups > 0 ? `Below ${LOW_STOCK_THRESHOLD} units` : "All groups healthy"}
                    trend={lowStockGroups > 0 ? "down" : "up"}
                    icon={<AlertTriangle size={18} />}
                  />
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
                    <div style={{ backgroundColor: PRIMARY_RED }} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white">
                      <Sparkles size={18} />
                    </div>

                    <div className="min-w-0">
                      {topRecommendation ? (
                        <>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-bold text-slate-900">
                              {bloodGroupLabels[topRecommendation.bloodGroup]} needs attention
                            </p>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${priorityStyles[topRecommendation.priority]}`}>
                              {topRecommendation.priority}
                            </span>
                          </div>
                          <p className="mt-1 text-xs leading-5 text-slate-500">{topRecommendation.message}</p>
                        </>
                      ) : (
                        <p className="text-xs leading-5 text-slate-500">
                          {loading ? "Analysing your inventory..." : "Stock levels look healthy across all blood groups."}
                        </p>
                      )}

                      {aiSummary && (
                        <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">{aiSummary}</p>
                      )}
                    </div>
                  </div>
                </DashboardCard>
              </>
            ) : (
              <>
                <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-950">Blood inventory</h2>
                  {loading ? (
                    <p className="mt-6 text-sm text-slate-500">Loading inventory...</p>
                  ) : (
                    <div className="mt-5 grid gap-3 sm:grid-cols-4">
                      {inventory.map((row) => (
                        <div key={row.bloodGroup} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-red-700">{bloodGroupLabels[row.bloodGroup]}</p>
                          <p className="mt-2 text-2xl font-black text-slate-950">{row.units}</p>
                          <p className="text-xs text-slate-500">units</p>
                          <div className="mt-3 flex gap-2">
                            <button
                              onClick={() => adjustInventory(row.bloodGroup, -1)}
                              disabled={actionId === row.bloodGroup || row.units === 0}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
                            >
                              <Minus size={14} />
                            </button>
                            <button
                              onClick={() => adjustInventory(row.bloodGroup, 1)}
                              disabled={actionId === row.bloodGroup}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                  <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-950">Donations to record</h2>
                    {loading ? (
                      <p className="mt-6 text-sm text-slate-500">Loading appointments...</p>
                    ) : unrecordedAppointments.length === 0 ? (
                      <p className="mt-6 rounded-xl bg-slate-50 p-6 text-sm text-slate-500">No completed appointments awaiting a record.</p>
                    ) : (
                      <div className="mt-5 divide-y divide-slate-100">
                        {unrecordedAppointments.map((appointment) => (
                          <div key={appointment.id} className="py-4">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                              <div>
                                <p className="font-semibold text-slate-900">
                                  {appointment.donor.firstName} {appointment.donor.lastName}
                                  {appointment.donor.donorProfile?.bloodGroup && (
                                    <span className="ml-2 text-sm text-slate-500">
                                      {bloodGroupLabels[appointment.donor.donorProfile.bloodGroup]}
                                    </span>
                                  )}
                                </p>
                                <p className="mt-1 text-sm text-slate-500">
                                  {formatDate(appointment.appointmentDate)} at {appointment.appointmentTime}
                                </p>
                              </div>
                              {recordingId !== appointment.id && (
                                <button
                                  onClick={() => startRecording(appointment.id)}
                                  className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                                >
                                  Record donation
                                </button>
                              )}
                            </div>

                            {recordingId === appointment.id && (
                              <form onSubmit={submitRecord} className="mt-4 space-y-3 rounded-xl bg-slate-50 p-4">
                                <input
                                  required
                                  type="number"
                                  min={1}
                                  value={recordForm.volumeMl}
                                  onChange={(event) => setRecordForm({ ...recordForm, volumeMl: event.target.value })}
                                  placeholder="Volume (mL)"
                                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                />
                                <input
                                  value={recordForm.bloodPackId}
                                  onChange={(event) => setRecordForm({ ...recordForm, bloodPackId: event.target.value })}
                                  placeholder="Blood pack ID (optional)"
                                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                />
                                <textarea
                                  value={recordForm.notes}
                                  onChange={(event) => setRecordForm({ ...recordForm, notes: event.target.value })}
                                  placeholder="Notes (optional)"
                                  rows={2}
                                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                />
                                <div className="flex gap-2">
                                  <button
                                    disabled={submittingRecord}
                                    className="rounded-lg bg-red-800 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-900 disabled:opacity-50"
                                  >
                                    {submittingRecord ? "Saving..." : "Save record"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setRecordingId(null)}
                                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </form>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-950">Recent donations</h2>
                    {loading ? (
                      <p className="mt-6 text-sm text-slate-500">Loading donations...</p>
                    ) : donations.length === 0 ? (
                      <p className="mt-6 rounded-xl bg-slate-50 p-6 text-sm text-slate-500">No donations recorded yet.</p>
                    ) : (
                      <div className="mt-5 divide-y divide-slate-100">
                        {donations.map((donation) => (
                          <div key={donation.id} className="py-4">
                            <p className="font-semibold text-slate-900">
                              {donation.donor.firstName} {donation.donor.lastName}
                              <span className="ml-2 text-sm text-slate-500">{bloodGroupLabels[donation.bloodGroup]}</span>
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              {formatDate(donation.donatedAt)} · {donation.volumeMl}mL
                              {donation.bloodPackId ? ` · Pack ${donation.bloodPackId}` : ""}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              </>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function NavItem({
  href,
  label,
  icon,
  active = false,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      style={active ? { backgroundColor: PRIMARY_RED } : undefined}
      className={`flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${
        active ? "text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

function NavButton({
  label,
  icon,
  active = false,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={active ? { backgroundColor: PRIMARY_RED } : undefined}
      className={`flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold transition ${
        active ? "text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      {icon}
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
