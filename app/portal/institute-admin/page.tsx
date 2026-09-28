"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  MessageCircle,
  Droplet,
  LayoutDashboard,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  ShieldCheck,
  Users,
  UserPlus,
  XCircle,
} from "lucide-react";
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
} from "@/src/components/ui/Page";

const PRIMARY_RED = "oklch(27.1% 0.105 12.094)";

const fieldClass =
  "h-11 w-full rounded-xl border border-slate-300 px-3.5 text-[13.5px] transition focus:border-slate-500 focus:outline-none";

type Staff = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "MEDICAL_STAFF" | "LAB_TECHNICIAN";
  isActive: boolean;
};

type Institute = {
  name: string;
  city: string;
  region: string | null;
  address: string | null;
  email: string | null;
  phoneNumber: string | null;
};

type StaffResponse = { staff?: Staff[]; institute?: Institute; error?: string };
type InviteResponse = { staff?: Staff; emailSent?: boolean; error?: string };

type BloodGroup =
  | "A_POSITIVE"
  | "A_NEGATIVE"
  | "B_POSITIVE"
  | "B_NEGATIVE"
  | "AB_POSITIVE"
  | "AB_NEGATIVE"
  | "O_POSITIVE"
  | "O_NEGATIVE";

type StatsResponse = {
  recentDonations?: { id: string; donatedAt: string; bloodGroup: BloodGroup; volumeMl: number }[];
  inventory?: { bloodGroup: BloodGroup; units: number }[];
  upcomingAppointmentsCount?: number;
  pendingRewardsCount?: number;
  validatedRewardsCount?: number;
  totalDonationsCount?: number;
  openBloodRequestsCount?: number;
  error?: string;
};

const roleLabels = {
  MEDICAL_STAFF: "Medical staff",
  LAB_TECHNICIAN: "Laboratory technician",
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

type Section = "dashboard" | "team" | "rewards";

type RewardStatus = "PENDING" | "VALIDATED" | "REJECTED";

type RewardItem = {
  id: string;
  points: number;
  status: RewardStatus;
  createdAt: string;
  donor: { firstName: string; lastName: string; email: string };
  donation: { donatedAt: string; bloodGroup: string; volumeMl: number } | null;
  validatedBy: { firstName: string; lastName: string } | null;
};

const rewardBloodGroupLabels: Record<string, string> = {
  A_POSITIVE: "A+",
  A_NEGATIVE: "A-",
  B_POSITIVE: "B+",
  B_NEGATIVE: "B-",
  AB_POSITIVE: "AB+",
  AB_NEGATIVE: "AB-",
  O_POSITIVE: "O+",
  O_NEGATIVE: "O-",
};

function formatRewardDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function InstituteAdminPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [institute, setInstitute] = useState<Institute | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "MEDICAL_STAFF" as Staff["role"],
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [activeSection, setActiveSection] = useState<Section>("dashboard");
  const [confirmRemoval, setConfirmRemoval] = useState<Staff | null>(null);

  // Reward validation, handled in place so the admin never leaves the workspace.
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [rewardFilter, setRewardFilter] = useState<RewardStatus | "ALL">("PENDING");
  const [rewardsLoading, setRewardsLoading] = useState(true);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const activeStaff = staff.filter((member) => member.isActive).length;

  function goToSection(section: Section) {
    setActiveSection(section);
    // Keep the URL in step, so the sidebar highlight and a copied link match.
    window.history.replaceState(null, "", `#${section}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setConfirmRemoval(null);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Keep the section in step with the URL hash, so the sidebar links, a shared
  // link like /portal/institute-admin#team and the browser Back button agree.
  useEffect(() => {
    function applyHash() {
      const hash = window.location.hash.replace("#", "");
      setActiveSection(hash === "team" || hash === "rewards" ? hash : "dashboard");
    }

    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  useEffect(() => {
    loadStaff();
    loadStats();
  }, []);

  async function loadStaff() {
    const response = await fetch("/api/institute-admin/staff", {
      credentials: "include",
      cache: "no-store",
    });
    const data: StaffResponse = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(data.error ?? "Unable to load staff.");
    } else {
      setStaff(data.staff ?? []);
      setInstitute(data.institute ?? null);
    }
    setLoading(false);
  }

  const loadRewards = useCallback(async () => {
    setRewardsLoading(true);

    const query = rewardFilter === "ALL" ? "" : `?status=${rewardFilter}`;
    const response = await fetch(`/api/institute-admin/rewards${query}`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(data.error ?? "Unable to load rewards.");
    } else {
      setRewards(data.rewards ?? []);
    }

    setRewardsLoading(false);
  }, [rewardFilter]);

  useEffect(() => {
    void loadRewards();
  }, [loadRewards]);

  async function decideReward(id: string, status: "VALIDATED" | "REJECTED") {
    setDecidingId(id);
    setError("");
    setNotice("");

    const response = await fetch(`/api/institute-admin/rewards/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(data.error ?? "Unable to update reward.");
    } else {
      setNotice(status === "VALIDATED" ? "Reward validated." : "Reward rejected.");
      // Refresh in place rather than navigating anywhere.
      await Promise.all([loadRewards(), loadStats()]);
    }

    setDecidingId(null);
  }

  async function loadStats() {
    const response = await fetch("/api/institute-admin/stats", {
      credentials: "include",
      cache: "no-store",
    });
    const data: StatsResponse = await response.json().catch(() => ({}));

    if (response.ok) {
      setStats(data);
    }
  }

  async function inviteStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setNotice("");

    const response = await fetch("/api/institute-admin/staff", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data: InviteResponse = await response
      .json()
      .catch(() => ({}));

    if (!response.ok || !data.staff || !data.emailSent) {
      setError(data.error ?? "Unable to invite staff member.");
    } else {
      setStaff((current) => [data.staff!, ...current]);
      setNotice(`Invitation sent to ${data.staff.email}.`);
      setForm({ firstName: "", lastName: "", email: "", role: "MEDICAL_STAFF" });
    }
    setSubmitting(false);
  }

  async function deleteStaff(member: Staff) {
    setConfirmRemoval(null);
    setRemovingId(member.id);
    setError("");
    setNotice("");
    const response = await fetch(`/api/institute-admin/staff?id=${member.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data: StaffResponse = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(data.error ?? "Unable to delete staff member.");
    } else {
      setStaff((current) => current.map((item) => item.id === member.id ? { ...item, isActive: false } : item));
      setNotice(`${member.firstName} ${member.lastName} was deactivated.`);
    }
    setRemovingId(null);
  }

  const donationTrend = useMemo(
    () => bucketByDay((stats?.recentDonations ?? []).map((donation) => donation.donatedAt), 14),
    [stats],
  );

  const donationsByWeekday = useMemo(
    () => weekdayCounts((stats?.recentDonations ?? []).map((donation) => donation.donatedAt)),
    [stats],
  );

  const donationsLast30 = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    return (stats?.recentDonations ?? []).filter(
      (donation) => new Date(donation.donatedAt) >= cutoff,
    ).length;
  }, [stats]);

  const inventoryBreakdown = useMemo(
    () =>
      (stats?.inventory ?? [])
        .filter((row) => row.units > 0)
        .map((row) => ({
          label: bloodGroupLabels[row.bloodGroup],
          value: row.units,
          color: bloodGroupColors[row.bloodGroup],
        }))
        .sort((a, b) => b.value - a.value),
    [stats],
  );

  const staffActiveRate = staff.length === 0 ? 0 : Math.round((activeStaff / staff.length) * 100);

  const instituteNav: PortalNavGroup[] = [
    {
      label: "Workspace",
      links: [
        { href: "#dashboard", label: "Dashboard", icon: <LayoutDashboard size={16} /> },
        { href: "#team", label: "Team", icon: <Users size={16} /> },
        { href: "#rewards", label: "Donation rewards", icon: <ShieldCheck size={16} /> },
        { href: "/portal/chat", label: "Donor chat", icon: <MessageCircle size={16} /> },
      ],
    },
    {
      label: "Account",
      links: [
        {
          href: "/portal/institute-admin/profile",
          label: "My profile",
          icon: <Users size={16} />,
        },
      ],
    },
  ];

  return (
    <PortalShell
      brandHref="/portal/institute-admin"
      title="Institute workspace"
      subtitle={institute?.name ?? "Institute administration"}
      navGroups={instituteNav}
      activeHref={`#${activeSection}`}
      onNavigate={(href) => goToSection(href.replace("#", "") as Section)}
      accountName={institute?.name ?? "Institute administrator"}
      accountRole="Institute admin"
      accountHref="/portal/institute-admin/profile"
    >
          <div className="mx-auto max-w-7xl">

            {activeSection === "rewards" ? (
              <>
                <PageHeader
                  eyebrow="Donation rewards"
                  title="Validate donation rewards"
                  description="Confirm reward points earned by donors at your institute before they are credited."
                  actions={
                    <>
                      <button
                        type="button"
                        onClick={() => goToSection("dashboard")}
                        className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-300 px-5 text-[13px] font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                      >
                        <LayoutDashboard size={15} />
                        Dashboard
                      </button>

                      <button
                        type="button"
                        onClick={() => void loadRewards()}
                        className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-300 px-5 text-[13px] font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                      >
                        <RefreshCw size={15} />
                        Refresh
                      </button>
                    </>
                  }
                />

                {error && <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
                {notice && (
                  <p className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>
                )}

                <div className="mt-7 flex flex-wrap gap-2">
                  {(["PENDING", "VALIDATED", "REJECTED", "ALL"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setRewardFilter(option)}
                      className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                        rewardFilter === option
                          ? "bg-red-950 text-white"
                          : "border border-slate-300 bg-white text-slate-700 hover:border-red-300"
                      }`}
                    >
                      {option === "ALL" ? "All" : option.charAt(0) + option.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>

                <div className="mt-6">
                  <Panel label="Reward requests" padded={false}>
                    <div className="mt-5 border-t border-slate-100">
                      {rewardsLoading ? (
                        <p className="px-6 py-8 text-sm text-slate-500">Loading rewards...</p>
                      ) : rewards.length === 0 ? (
                        <div className="p-6">
                          <EmptyState
                            title="Nothing to show for this filter"
                            description="Rewards appear here once a lab technician records a donation at your institute."
                          />
                        </div>
                      ) : (
                        rewards.map((reward) => (
                          <Row key={reward.id}>
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
                                    {reward.donor.firstName} {reward.donor.lastName}
                                  </RowTitle>
                                  <Pill tone="good">+{reward.points} points</Pill>
                                </div>

                                <RowMeta>{reward.donor.email}</RowMeta>

                                {reward.donation && (
                                  <p className="mt-1.5 text-[11px] text-slate-400">
                                    {rewardBloodGroupLabels[reward.donation.bloodGroup] ??
                                      reward.donation.bloodGroup}{" "}
                                    - {reward.donation.volumeMl}ml -{" "}
                                    {formatRewardDate(reward.donation.donatedAt)}
                                  </p>
                                )}

                                {reward.validatedBy && (
                                  <p className="mt-1 text-[11px] text-slate-400">
                                    Decided by {reward.validatedBy.firstName} {reward.validatedBy.lastName}
                                  </p>
                                )}
                              </div>
                            </div>

                            {reward.status === "PENDING" ? (
                              <div className="flex shrink-0 gap-2">
                                <button
                                  type="button"
                                  disabled={decidingId === reward.id}
                                  onClick={() => decideReward(reward.id, "VALIDATED")}
                                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                                >
                                  <CheckCircle2 size={14} />
                                  {decidingId === reward.id ? "Saving..." : "Validate"}
                                </button>

                                <button
                                  type="button"
                                  disabled={decidingId === reward.id}
                                  onClick={() => decideReward(reward.id, "REJECTED")}
                                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                                >
                                  <XCircle size={14} />
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <Pill tone={reward.status === "VALIDATED" ? "good" : "neutral"}>
                                {reward.status === "VALIDATED" ? "Validated" : "Rejected"}
                              </Pill>
                            )}
                          </Row>
                        ))
                      )}
                    </div>
                  </Panel>
                </div>
              </>
            ) : activeSection === "dashboard" ? (
              <>
                <PageHeader
                  eyebrow="Institute dashboard"
                  title={institute?.name ?? "Institute workspace"}
                  description="Keep your clinical team coordinated and your donation centre ready for every visit."
                  actions={
                    <>
                      <button
                        type="button"
                        onClick={() => goToSection("team")}
                        className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-300 px-5 text-[13px] font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                      >
                        <Users size={15} />
                        Manage team
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          loadStaff();
                          loadStats();
                        }}
                        className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-300 px-5 text-[13px] font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                      >
                        <RefreshCw size={15} />
                        Refresh
                      </button>
                    </>
                  }
                />

                <div className="mt-7">
                  <StatGrid>
                    <Stat
                      label="Team members"
                      value={staff.length.toString()}
                      foot={`${activeStaff} active`}
                    />
                    <Stat
                      label="Donations (30 days)"
                      value={donationsLast30.toString()}
                      foot={`${stats?.totalDonationsCount ?? 0} all time`}
                    />
                    <Stat
                      label="Upcoming appointments"
                      value={(stats?.upcomingAppointmentsCount ?? 0).toString()}
                      foot="Scheduled"
                    />
                    <Stat
                      label="Pending rewards"
                      value={(stats?.pendingRewardsCount ?? 0).toString()}
                      foot={`${stats?.validatedRewardsCount ?? 0} validated`}
                      tone={(stats?.pendingRewardsCount ?? 0) > 0 ? "warn" : "default"}
                    />
                  </StatGrid>
                </div>

                <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_340px]">
                  <DashboardCard
                    title="Donation activity"
                    action={<span className="text-[11px] font-semibold text-slate-400">Last 14 days</span>}
                  >
                    <TrendAreaChart data={donationTrend} color={PRIMARY_RED} emptyLabel="No donations recorded yet." />
                  </DashboardCard>

                  <DashboardCard title="Busiest donation day">
                    <WeekdayBarChart data={donationsByWeekday} color={PRIMARY_RED} />
                    <p className="mt-3 text-[11px] leading-5 text-slate-400">Donations recorded in the last 60 days.</p>
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

                  <DashboardCard>
                    <RadialGauge
                      percent={staffActiveRate}
                      label="Team active rate"
                      sublabel={`${activeStaff} of ${staff.length} staff active`}
                      color={PRIMARY_RED}
                    />
                  </DashboardCard>
                </div>

                {institute && (
                  <div className="mt-6 rounded-2xl bg-red-950 p-6 text-white">
                    <div className="flex flex-wrap items-start justify-between gap-5">
                      <div className="flex gap-4">
                        <div
                          aria-hidden
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 on-garnet"
                        >
                          <Building2 size={18} />
                        </div>

                        <div className="min-w-0">
                          <p className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-red-200">
                            Assigned institute
                          </p>

                          <h2 className="mt-2 text-xl font-bold tracking-[-0.02em]">
                            {institute.name}
                          </h2>

                          <div className="mt-3 space-y-1.5 text-xs on-garnet">
                            <p className="flex items-center gap-2">
                              <MapPin size={13} aria-hidden />
                              {[institute.address, institute.city, institute.region]
                                .filter(Boolean)
                                .join(", ")}
                            </p>

                            <p className="flex flex-wrap items-center gap-x-5 gap-y-1">
                              <span className="inline-flex items-center gap-2">
                                <Mail size={13} aria-hidden />
                                {institute.email || "No institute email"}
                              </span>
                              <span className="inline-flex items-center gap-2">
                                <Phone size={13} aria-hidden />
                                {institute.phoneNumber || "No phone number"}
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>

                      <span className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-emerald-400/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-200">
                        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                        Operational
                      </span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <PageHeader
                  eyebrow="Team"
                  title="Manage your clinical team"
                  description="Invite medical staff and laboratory technicians, and manage who has access."
                  actions={
                    <>
                      <button
                        type="button"
                        onClick={() => goToSection("dashboard")}
                        className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-300 px-5 text-[13px] font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                      >
                        <LayoutDashboard size={15} />
                        Dashboard
                      </button>

                      <button
                        type="button"
                        onClick={loadStaff}
                        className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-300 px-5 text-[13px] font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                      >
                        <RefreshCw size={15} />
                        Refresh
                      </button>
                    </>
                  }
                />

                {error && <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
                {notice && (
                  <p className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>
                )}

                <div id="team" className="mt-7 grid gap-6 lg:grid-cols-[360px_1fr]">
                  <Panel label="Build your team">
                    <h2 className="mt-3 text-[15px] font-bold text-slate-950">Invite staff</h2>

                    <p className="mt-2 text-xs leading-5 text-slate-600">
                      Credentials are delivered securely by email.
                    </p>

                    <form onSubmit={inviteStaff} className="mt-5 space-y-3">
                      <label htmlFor="inv-first" className="sr-only">
                        First name
                      </label>
                      <input
                        id="inv-first"
                        required
                        value={form.firstName}
                        onChange={(event) => setForm({ ...form, firstName: event.target.value })}
                        placeholder="First name"
                        className={fieldClass}
                      />

                      <label htmlFor="inv-last" className="sr-only">
                        Last name
                      </label>
                      <input
                        id="inv-last"
                        required
                        value={form.lastName}
                        onChange={(event) => setForm({ ...form, lastName: event.target.value })}
                        placeholder="Last name"
                        className={fieldClass}
                      />

                      <label htmlFor="inv-email" className="sr-only">
                        Work email
                      </label>
                      <input
                        id="inv-email"
                        required
                        type="email"
                        value={form.email}
                        onChange={(event) => setForm({ ...form, email: event.target.value })}
                        placeholder="Work email"
                        className={fieldClass}
                      />

                      <label htmlFor="inv-role" className="sr-only">
                        Role
                      </label>
                      <select
                        id="inv-role"
                        value={form.role}
                        onChange={(event) =>
                          setForm({ ...form, role: event.target.value as Staff["role"] })
                        }
                        className={fieldClass}
                      >
                        <option value="MEDICAL_STAFF">Medical staff</option>
                        <option value="LAB_TECHNICIAN">Laboratory technician</option>
                      </select>

                      <button
                        disabled={submitting}
                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-red-950 text-[13px] font-semibold text-white transition hover:brightness-125 disabled:opacity-50"
                      >
                        <UserPlus size={16} />
                        {submitting ? "Creating invite…" : "Create invite"}
                      </button>
                    </form>
                  </Panel>

                  <Panel
                    label="Staff directory"
                    padded={false}
                    action={
                      <span className="text-[11px] tabular-nums text-slate-500">
                        {staff.length} team member{staff.length === 1 ? "" : "s"}
                      </span>
                    }
                  >
                    <div className="mt-5 border-t border-slate-100">
                      {loading ? (
                        <p className="px-6 py-8 text-sm text-slate-500">Loading staff…</p>
                      ) : staff.length === 0 ? (
                        <div className="p-6">
                          <EmptyState
                            title="No staff invited yet"
                            description="Use the invite form to add medical staff and laboratory technicians."
                          />
                        </div>
                      ) : (
                        staff.map((member) => (
                          <Row key={member.id}>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <RowTitle>
                                  {member.firstName} {member.lastName}
                                </RowTitle>
                                <Pill tone={member.isActive ? "good" : "neutral"}>
                                  {member.isActive ? "Active" : "Inactive"}
                                </Pill>
                              </div>

                              <RowMeta>
                                {member.email} · {roleLabels[member.role]}
                              </RowMeta>
                            </div>

                            <button
                              type="button"
                              onClick={() => setConfirmRemoval(member)}
                              disabled={removingId === member.id || !member.isActive}
                              className="inline-flex h-9 shrink-0 items-center rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-800 transition hover:bg-red-50 disabled:opacity-50"
                            >
                              {removingId === member.id
                                ? "Deactivating…"
                                : member.isActive
                                  ? "Deactivate"
                                  : "Inactive"}
                            </button>
                          </Row>
                        ))
                      )}
                    </div>
                  </Panel>
                </div>
              </>
            )}
          </div>
      {confirmRemoval && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="remove-staff-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
        >
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-950">Team access</p>

            <h2 id="remove-staff-title" className="mt-2 text-xl font-bold text-slate-950">
              Deactivate this team member?
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              {confirmRemoval.firstName} {confirmRemoval.lastName} ({confirmRemoval.email}) will lose
              access to the {roleLabels[confirmRemoval.role]} workspace. Their past records stay intact.
            </p>

            <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-5">
              <button
                type="button"
                onClick={() => setConfirmRemoval(null)}
                className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-600"
              >
                Keep access
              </button>

              <button
                type="button"
                onClick={() => deleteStaff(confirmRemoval)}
                disabled={removingId === confirmRemoval.id}
                className="h-10 rounded-xl bg-red-950 px-4 text-xs font-semibold text-white disabled:opacity-50"
              >
                {removingId === confirmRemoval.id ? "Deactivating..." : "Yes, deactivate"}
              </button>
            </div>
          </div>
        </div>
      )}

    </PortalShell>
  );
}
