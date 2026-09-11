"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Building2,
  LayoutDashboard,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  ShieldCheck,
  Users,
  UserPlus,
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
  const [activeSection, setActiveSection] = useState<"dashboard" | "team">("dashboard");
  const activeStaff = staff.filter((member) => member.isActive).length;

  function goToSection(section: "dashboard" | "team") {
    setActiveSection(section);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

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
    if (!window.confirm(`Delete ${member.firstName} ${member.lastName}?`)) return;

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

  return (
    <main className="min-h-screen bg-slate-100 p-4">
      <section className="mx-auto max-w-375 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

        <header className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div
              style={{ backgroundColor: PRIMARY_RED }}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
            >
              <Building2 size={19} />
            </div>

            <div>
              <p className="text-lg font-bold text-slate-950">BloodBridge</p>
              <p className="text-[10px] text-slate-400">Institute workspace</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-bold text-slate-800">
                {institute?.name ?? "Institute administrator"}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-400">Institute administration</p>
            </div>

            <div
              style={{ backgroundColor: PRIMARY_RED }}
              className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white"
            >
              IA
            </div>
          </div>
        </header>

        <div className="grid min-h-175 lg:grid-cols-[230px_1fr]">

          <aside className="border-r border-slate-200 bg-white p-4">
            <nav className="space-y-2">
              <NavItem
                label="Dashboard"
                icon={<LayoutDashboard size={18} />}
                active={activeSection === "dashboard"}
                onClick={() => goToSection("dashboard")}
              />
              <NavItem
                label="Team"
                icon={<Users size={18} />}
                active={activeSection === "team"}
                onClick={() => goToSection("team")}
              />
              <NavItem href="/portal/institute-admin/rewards" label="Donation rewards" icon={<ShieldCheck size={18} />} />
            </nav>

            <div className="mt-8 border-t border-slate-100 pt-5">
              <p className="px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Account
              </p>

              <div className="mt-3 space-y-2">
                <NavItem href="/portal/institute-admin/profile" label="My profile" icon={<Users size={18} />} />

                <Link
                  href="/api/logout"
                  className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                >
                  <LogoutIcon />
                  Sign out
                </Link>
              </div>
            </div>
          </aside>

          <section className="bg-slate-50/70 p-6 lg:p-8">

            {activeSection === "dashboard" ? (
              <>
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-red-950">
                      <Activity size={13} strokeWidth={2.5} />
                      Institute dashboard
                    </p>

                    <h1 className="mt-2 text-3xl font-bold text-slate-950">
                      {institute?.name ?? "Institute workspace"}
                    </h1>

                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                      Keep your clinical team coordinated and your donation centre ready for every visit.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      loadStaff();
                      loadStats();
                    }}
                    className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <RefreshCw size={15} />
                    Refresh
                  </button>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <KpiCard label="Team members" value={staff.length.toString()} delta={`${activeStaff} active`} trend="flat" icon={<Users size={18} />} />
                  <KpiCard label="Donations (30 days)" value={donationsLast30.toString()} delta={`${stats?.totalDonationsCount ?? 0} all time`} trend="flat" icon={<Activity size={18} />} />
                  <KpiCard label="Upcoming appointments" value={(stats?.upcomingAppointmentsCount ?? 0).toString()} delta="Scheduled" trend="flat" icon={<Building2 size={18} />} />
                  <KpiCard label="Pending rewards" value={(stats?.pendingRewardsCount ?? 0).toString()} delta={`${stats?.validatedRewardsCount ?? 0} validated`} trend="flat" icon={<ShieldCheck size={18} />} />
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
                  <section className="mt-6 overflow-hidden rounded-3xl bg-red-950 p-6 text-white shadow-lg shadow-red-950/10 sm:p-7">
                    <div className="flex flex-wrap items-start justify-between gap-5">
                      <div className="flex gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-red-100">
                          <Building2 size={24} />
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-200">Assigned institute</p>
                          <h2 className="mt-2 text-2xl font-bold">{institute.name}</h2>
                          <div className="mt-3 space-y-1 text-sm text-red-100">
                            <p className="flex items-center gap-2"><MapPin size={14} />{[institute.address, institute.city, institute.region].filter(Boolean).join(", ")}</p>
                            <p className="flex flex-wrap items-center gap-x-4 gap-y-1"><span className="inline-flex items-center gap-2"><Mail size={14} />{institute.email || "No institute email"}</span><span className="inline-flex items-center gap-2"><Phone size={14} />{institute.phoneNumber || "No phone number"}</span></p>
                          </div>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/15 px-3 py-1.5 text-xs font-bold text-emerald-200"><span className="h-2 w-2 rounded-full bg-emerald-300" />Operational</span>
                    </div>
                  </section>
                )}
              </>
            ) : (
              <>
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-red-950">
                      <Users size={13} strokeWidth={2.5} />
                      Team
                    </p>

                    <h1 className="mt-2 text-3xl font-bold text-slate-950">
                      Manage your clinical team
                    </h1>

                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                      Invite medical staff and laboratory technicians, and manage who has access.
                    </p>
                  </div>

                  <button
                    onClick={loadStaff}
                    className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <RefreshCw size={15} />
                    Refresh
                  </button>
                </div>

                {error && <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
                {notice && <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</p>}

                <div className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
                  <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-900"><UserPlus size={19} /></div>
                    <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-red-700">Build your team</p>
                    <h2 className="mt-2 text-xl font-black text-slate-950">Invite staff</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500">Credentials are delivered securely by email.</p>
                    <form onSubmit={inviteStaff} className="mt-5 space-y-4">
                      <input required value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} placeholder="First name" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
                      <input required value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} placeholder="Last name" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
                      <input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Work email" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
                      <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as Staff["role"] })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
                        <option value="MEDICAL_STAFF">Medical staff</option>
                        <option value="LAB_TECHNICIAN">Laboratory technician</option>
                      </select>
                      <button disabled={submitting} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-800 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-900 disabled:opacity-50">
                        <UserPlus size={16} />
                        {submitting ? "Creating invite..." : "Create invite"}
                      </button>
                    </form>
                  </section>

                  <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-bold text-slate-950">Staff directory</h2>
                        <p className="mt-1 text-sm text-slate-500">{staff.length} team members</p>
                      </div>
                    </div>
                    {loading ? <p className="mt-8 text-sm text-slate-500">Loading staff...</p> : staff.length === 0 ? <p className="mt-8 rounded-xl bg-slate-50 p-6 text-sm text-slate-500">No staff members have been invited yet.</p> : (
                      <div className="mt-5 divide-y divide-slate-100">
                        {staff.map((member) => (
                          <div key={member.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                            <div>
                              <p className="font-semibold text-slate-900">{member.firstName} {member.lastName}</p>
                              <p className="mt-1 text-sm text-slate-500">{member.email} · {roleLabels[member.role]}</p>
                            </div>
                            <button onClick={() => deleteStaff(member)} disabled={removingId === member.id || !member.isActive} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50">
                              {removingId === member.id ? "Deactivating..." : member.isActive ? "Deactivate" : "Inactive"}
                            </button>
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
  onClick,
}: {
  href?: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  const className = `flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${
    active ? "text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
  }`;
  const style = active ? { backgroundColor: PRIMARY_RED } : undefined;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} style={style} className={className}>
        {icon}
        {label}
      </button>
    );
  }

  return (
    <Link href={href ?? "#"} style={style} className={className}>
      {icon}
      {label}
    </Link>
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
