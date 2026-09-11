"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertOctagon,
  Droplet,
  LayoutDashboard,
  MessageCircle,
  RefreshCw,
  Search,
  Users,
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
type RequestStatus = "OPEN" | "FULFILLED" | "CANCELLED";
type AppointmentStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED";

type BloodRequestItem = {
  id: string;
  bloodGroup: BloodGroup;
  unitsNeeded: number;
  urgency: Urgency;
  status: RequestStatus;
  notes: string | null;
  createdAt: string;
  requestedBy: { firstName: string; lastName: string };
};

type AppointmentItem = {
  id: string;
  appointmentDate: string;
  appointmentTime: string;
  status: AppointmentStatus;
  donor: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string | null;
    donorProfile: { bloodGroup: BloodGroup | null } | null;
  };
};

type DonorItem = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  donorProfile: {
    bloodGroup: BloodGroup | null;
    city: string | null;
    lastDonationDate: string | null;
    eligibilityStatus: boolean;
  } | null;
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

const urgencyStyles: Record<Urgency, string> = {
  LOW: "bg-slate-100 text-slate-700",
  MEDIUM: "bg-amber-50 text-amber-700",
  HIGH: "bg-orange-50 text-orange-700",
  CRITICAL: "bg-red-50 text-red-700",
};

const urgencyColors: Record<Urgency, string> = {
  LOW: "oklch(75% 0.02 260)",
  MEDIUM: "oklch(80% 0.14 85)",
  HIGH: "oklch(68% 0.18 45)",
  CRITICAL: "oklch(27.1% 0.105 12.094)",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function MedicalStaffPortalPage() {
  const [requests, setRequests] = useState<BloodRequestItem[]>([]);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [donors, setDonors] = useState<DonorItem[]>([]);
  const [donorSearch, setDonorSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);

  const [requestForm, setRequestForm] = useState({
    bloodGroup: "O_POSITIVE" as BloodGroup,
    unitsNeeded: "1",
    urgency: "MEDIUM" as Urgency,
    notes: "",
  });
  const [submittingRequest, setSubmittingRequest] = useState(false);

  const openRequests = useMemo(
    () => requests.filter((request) => request.status === "OPEN"),
    [requests],
  );
  const criticalOpenRequests = useMemo(
    () => openRequests.filter((request) => request.urgency === "CRITICAL"),
    [openRequests],
  );
  const scheduledAppointments = useMemo(
    () => appointments.filter((appointment) => appointment.status === "SCHEDULED"),
    [appointments],
  );

  const requestTrend = useMemo(
    () => bucketByDay(requests.map((request) => request.createdAt), 14),
    [requests],
  );

  const requestsByWeekday = useMemo(
    () => weekdayCounts(requests.map((request) => request.createdAt)),
    [requests],
  );

  const urgencyBreakdown = useMemo(() => {
    const order: Urgency[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
    return order
      .map((urgency) => ({
        label: urgency.charAt(0) + urgency.slice(1).toLowerCase(),
        value: requests.filter((request) => request.urgency === urgency).length,
        color: urgencyColors[urgency],
      }))
      .filter((segment) => segment.value > 0);
  }, [requests]);

  const fulfilledCount = useMemo(
    () => requests.filter((request) => request.status === "FULFILLED").length,
    [requests],
  );
  const fulfillmentRate =
    requests.length === 0 ? 0 : Math.round((fulfilledCount / requests.length) * 100);

  async function loadAll() {
    setLoading(true);
    setError("");

    try {
      const [requestsRes, appointmentsRes, donorsRes] = await Promise.all([
        fetch("/api/medical-staff/blood-requests", { credentials: "include", cache: "no-store" }),
        fetch("/api/medical-staff/appointments", { credentials: "include", cache: "no-store" }),
        fetch("/api/medical-staff/donors", { credentials: "include", cache: "no-store" }),
      ]);

      const [requestsData, appointmentsData, donorsData] = await Promise.all([
        requestsRes.json().catch(() => ({})),
        appointmentsRes.json().catch(() => ({})),
        donorsRes.json().catch(() => ({})),
      ]);

      if (!requestsRes.ok) throw new Error(requestsData.error ?? "Unable to load blood requests.");
      if (!appointmentsRes.ok) throw new Error(appointmentsData.error ?? "Unable to load appointments.");
      if (!donorsRes.ok) throw new Error(donorsData.error ?? "Unable to load donors.");

      setRequests(requestsData.requests ?? []);
      setAppointments(appointmentsData.appointments ?? []);
      setDonors(donorsData.donors ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load your workspace.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      const params = new URLSearchParams();
      if (donorSearch.trim()) params.set("search", donorSearch.trim());

      const response = await fetch(`/api/medical-staff/donors?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) setDonors(data.donors ?? []);
    }, 300);

    return () => clearTimeout(timeout);
  }, [donorSearch]);

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittingRequest(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/medical-staff/blood-requests", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bloodGroup: requestForm.bloodGroup,
          unitsNeeded: Number(requestForm.unitsNeeded),
          urgency: requestForm.urgency,
          notes: requestForm.notes,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to create blood request.");
      }

      setRequests((current) => [data.request, ...current]);
      setNotice("Blood request created and visible to donors.");
      setRequestForm({ bloodGroup: "O_POSITIVE", unitsNeeded: "1", urgency: "MEDIUM", notes: "" });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create blood request.");
    } finally {
      setSubmittingRequest(false);
    }
  }

  async function updateRequestStatus(id: string, status: "FULFILLED" | "CANCELLED") {
    setActionId(id);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/medical-staff/blood-requests", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to update blood request.");
      }

      setRequests((current) => current.map((item) => (item.id === id ? data.request : item)));
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update blood request.");
    } finally {
      setActionId(null);
    }
  }

  async function updateAppointmentStatus(id: string, status: "COMPLETED" | "CANCELLED") {
    setActionId(id);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/medical-staff/appointments", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to update appointment.");
      }

      setAppointments((current) => current.map((item) => (item.id === id ? data.appointment : item)));
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update appointment.");
    } finally {
      setActionId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4">
      <section className="mx-auto max-w-375 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

        <header className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div style={{ backgroundColor: PRIMARY_RED }} className="flex h-10 w-10 items-center justify-center rounded-xl text-white">
              <Activity size={19} />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-950">BloodBridge</p>
              <p className="text-[10px] text-slate-400">Clinical care workspace</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-bold text-slate-800">Medical staff</p>
              <p className="mt-0.5 text-[10px] text-slate-400">Donation care</p>
            </div>
            <div style={{ backgroundColor: PRIMARY_RED }} className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white">
              MS
            </div>
          </div>
        </header>

        <div className="grid min-h-175 lg:grid-cols-[230px_1fr]">

          <aside className="border-r border-slate-200 bg-white p-4">
            <nav className="space-y-2">
              <NavItem href="#dashboard" label="Dashboard" icon={<LayoutDashboard size={18} />} active />
              <NavItem href="#requests" label="Blood requests" icon={<Droplet size={18} />} />
              <NavItem href="#donors" label="Donor directory" icon={<Users size={18} />} />
              <NavItem href="/portal/institute-admin/chat" label="Donor chat" icon={<MessageCircle size={18} />} />
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

          <section id="dashboard" className="bg-slate-50/70 p-6 lg:p-8">

            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-red-950">
                  <Activity size={13} strokeWidth={2.5} />
                  Clinical dashboard
                </p>
                <h1 className="mt-2 text-3xl font-bold text-slate-950">Donation care workspace</h1>
                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                  Raise blood requests, keep appointments moving, and know your donor pool.
                </p>
              </div>

              <button onClick={loadAll} className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
                <RefreshCw size={15} />
                Refresh
              </button>
            </div>

            {error && <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
            {notice && <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</p>}

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard label="Open blood requests" value={openRequests.length.toString()} delta="Visible to donors" trend="flat" icon={<Droplet size={18} />} />
              <KpiCard label="Scheduled appointments" value={scheduledAppointments.length.toString()} delta="Upcoming visits" trend="flat" icon={<Activity size={18} />} />
              <KpiCard label="Donor pool" value={donors.length.toString()} delta="Active donors" trend="flat" icon={<Users size={18} />} />
              <KpiCard
                label="Critical requests"
                value={criticalOpenRequests.length.toString()}
                delta={criticalOpenRequests.length > 0 ? "Needs urgent action" : "None open"}
                trend={criticalOpenRequests.length > 0 ? "down" : "up"}
                icon={<AlertOctagon size={18} />}
              />
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_340px]">
              <DashboardCard title="Blood requests raised" action={<span className="text-[11px] font-semibold text-slate-400">Last 14 days</span>}>
                <TrendAreaChart data={requestTrend} color={PRIMARY_RED} emptyLabel="No blood requests yet." />
              </DashboardCard>

              <DashboardCard title="Busiest request day">
                <WeekdayBarChart data={requestsByWeekday} color={PRIMARY_RED} />
                <p className="mt-3 text-[11px] leading-5 text-slate-400">All blood requests raised so far.</p>
              </DashboardCard>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_340px]">
              <DashboardCard title="Requests by urgency">
                {urgencyBreakdown.length === 0 ? (
                  <p className="text-xs text-slate-400">No blood requests yet.</p>
                ) : (
                  <BreakdownBar segments={urgencyBreakdown} />
                )}
              </DashboardCard>

              <DashboardCard>
                <RadialGauge
                  percent={fulfillmentRate}
                  label="Request fulfillment rate"
                  sublabel={`${fulfilledCount} of ${requests.length} fulfilled`}
                  color={PRIMARY_RED}
                />
              </DashboardCard>
            </div>

            <div id="requests" className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-red-700">Raise a need</p>
                <h2 className="mt-2 text-xl font-black text-slate-950">Create blood request</h2>
                <form onSubmit={submitRequest} className="mt-5 space-y-4">
                  <select
                    value={requestForm.bloodGroup}
                    onChange={(event) => setRequestForm({ ...requestForm, bloodGroup: event.target.value as BloodGroup })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                  >
                    {Object.entries(bloodGroupLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  <input
                    required
                    type="number"
                    min={1}
                    value={requestForm.unitsNeeded}
                    onChange={(event) => setRequestForm({ ...requestForm, unitsNeeded: event.target.value })}
                    placeholder="Units needed"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                  />
                  <select
                    value={requestForm.urgency}
                    onChange={(event) => setRequestForm({ ...requestForm, urgency: event.target.value as Urgency })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                  >
                    <option value="LOW">Low urgency</option>
                    <option value="MEDIUM">Medium urgency</option>
                    <option value="HIGH">High urgency</option>
                    <option value="CRITICAL">Critical urgency</option>
                  </select>
                  <textarea
                    value={requestForm.notes}
                    onChange={(event) => setRequestForm({ ...requestForm, notes: event.target.value })}
                    placeholder="Notes for donors (optional)"
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                  />
                  <button
                    disabled={submittingRequest}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-800 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-900 disabled:opacity-50"
                  >
                    <Droplet size={16} />
                    {submittingRequest ? "Creating..." : "Create request"}
                  </button>
                </form>
              </section>

              <div className="space-y-6">
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-950">Blood requests</h2>
                  {loading ? (
                    <p className="mt-6 text-sm text-slate-500">Loading requests...</p>
                  ) : requests.length === 0 ? (
                    <p className="mt-6 rounded-xl bg-slate-50 p-6 text-sm text-slate-500">No blood requests yet.</p>
                  ) : (
                    <div className="mt-5 divide-y divide-slate-100">
                      {requests.map((request) => (
                        <div key={request.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                          <div>
                            <p className="flex items-center gap-2 font-semibold text-slate-900">
                              {bloodGroupLabels[request.bloodGroup]} · {request.unitsNeeded} unit{request.unitsNeeded > 1 ? "s" : ""}
                              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${urgencyStyles[request.urgency]}`}>
                                {request.urgency}
                              </span>
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              Requested by {request.requestedBy.firstName} {request.requestedBy.lastName} · {formatDate(request.createdAt)}
                            </p>
                            {request.notes && <p className="mt-1 text-sm text-slate-500">{request.notes}</p>}
                          </div>
                          {request.status === "OPEN" ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => updateRequestStatus(request.id, "FULFILLED")}
                                disabled={actionId === request.id}
                                className="rounded-lg border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
                              >
                                Mark fulfilled
                              </button>
                              <button
                                onClick={() => updateRequestStatus(request.id, "CANCELLED")}
                                disabled={actionId === request.id}
                                className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{request.status}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-950">Appointments</h2>
                  {loading ? (
                    <p className="mt-6 text-sm text-slate-500">Loading appointments...</p>
                  ) : appointments.length === 0 ? (
                    <p className="mt-6 rounded-xl bg-slate-50 p-6 text-sm text-slate-500">No appointments booked yet.</p>
                  ) : (
                    <div className="mt-5 divide-y divide-slate-100">
                      {appointments.map((appointment) => (
                        <div key={appointment.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
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
                              {formatDate(appointment.appointmentDate)} at {appointment.appointmentTime} · {appointment.donor.email}
                            </p>
                          </div>
                          {appointment.status === "SCHEDULED" ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => updateAppointmentStatus(appointment.id, "COMPLETED")}
                                disabled={actionId === appointment.id}
                                className="rounded-lg border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
                              >
                                Mark completed
                              </button>
                              <button
                                onClick={() => updateAppointmentStatus(appointment.id, "CANCELLED")}
                                disabled={actionId === appointment.id}
                                className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{appointment.status}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section id="donors" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <h2 className="text-lg font-bold text-slate-950">Donor directory</h2>
                    <div className="relative">
                      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        value={donorSearch}
                        onChange={(event) => setDonorSearch(event.target.value)}
                        placeholder="Search donors..."
                        className="rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm"
                      />
                    </div>
                  </div>
                  {loading ? (
                    <p className="mt-6 text-sm text-slate-500">Loading donors...</p>
                  ) : donors.length === 0 ? (
                    <p className="mt-6 rounded-xl bg-slate-50 p-6 text-sm text-slate-500">No donors found.</p>
                  ) : (
                    <div className="mt-5 divide-y divide-slate-100">
                      {donors.map((donor) => (
                        <div key={donor.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                          <div>
                            <p className="font-semibold text-slate-900">{donor.firstName} {donor.lastName}</p>
                            <p className="mt-1 text-sm text-slate-500">
                              {donor.email} · {donor.donorProfile?.city ?? "No city on file"}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-800">
                              {donor.donorProfile?.bloodGroup ? bloodGroupLabels[donor.donorProfile.bloodGroup] : "Unknown"}
                            </span>
                            <span className={`rounded-full px-3 py-1 text-xs font-bold ${donor.donorProfile?.eligibilityStatus ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                              {donor.donorProfile?.eligibilityStatus ? "Eligible" : "Not eligible"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </div>
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

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M10 5H5v14h5" />
      <path d="M14 8l4 4-4 4M18 12H9" />
    </svg>
  );
}
