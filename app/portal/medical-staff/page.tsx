"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarCheck,
  Droplet,
  FilePlus2,
  LayoutDashboard,
  MessageCircle,
  RefreshCw,
  Search,
  Users,
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
import { APPOINTMENT_TIMES } from "@/src/lib/appointment-slots";
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
import { getConsultationProgress } from "@/src/lib/consultation";

const PRIMARY_RED = "oklch(27.1% 0.105 12.094)";

// Shared control classes, so every field and row action in this workspace is
// the same height and weight rather than drifting per section.
const fieldClass =
  "h-11 w-full rounded-xl border border-slate-300 px-3.5 text-[13.5px] transition focus:border-slate-500 focus:outline-none";

const rowButtonClass =
  "inline-flex h-9 items-center rounded-lg border px-3 text-xs font-semibold transition disabled:opacity-50";

const SECTIONS = ["dashboard", "requests", "appointments", "donors"] as const;

type Section = (typeof SECTIONS)[number];

const SECTION_COPY: Record<Section, { eyebrow: string; title: string; description: string }> = {
  dashboard: {
    eyebrow: "Clinical dashboard",
    title: "Donation care workspace",
    description: "Activity across your institute's blood requests, appointments and donor pool.",
  },
  requests: {
    eyebrow: "Blood requests",
    title: "Create and track blood requests",
    description: "Raise a need for your institute, and follow every request you have opened.",
  },
  appointments: {
    eyebrow: "Appointments",
    title: "Donor appointments",
    description: "Confirm attendance or cancel visits booked at your institute.",
  },
  donors: {
    eyebrow: "Donor pool",
    title: "Donor directory",
    description: "Search donors, and filter by who can give to a patient of a given blood group.",
  },
};

const MEDICAL_STAFF_NAV: PortalNavGroup[] = [
  {
    label: "Workspace",
    links: [
      { href: "#dashboard", label: "Dashboard", icon: <LayoutDashboard size={16} /> },
      { href: "#requests", label: "Create blood request", icon: <FilePlus2 size={16} /> },
      { href: "#appointments", label: "Appointments", icon: <CalendarCheck size={16} /> },
      { href: "#donors", label: "Donor list", icon: <Users size={16} /> },
    ],
  },
  {
    label: "Support",
    links: [
      {
        href: "/portal/chat",
        label: "Donor chat",
        icon: <MessageCircle size={16} />,
      },
    ],
  },
];

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
type AppointmentStatus = "SCHEDULED" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

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
  donationsCount: number;
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

const urgencyTones: Record<Urgency, PillTone> = {
  LOW: "neutral",
  MEDIUM: "warn",
  HIGH: "warn",
  CRITICAL: "critical",
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
  const router = useRouter();
  const [requests, setRequests] = useState<BloodRequestItem[]>([]);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [donors, setDonors] = useState<DonorItem[]>([]);
  const [donorSearch, setDonorSearch] = useState("");
  const [donorCompatibleWith, setDonorCompatibleWith] = useState<BloodGroup | "">("");
  const [donorEligibleOnly, setDonorEligibleOnly] = useState(false);
  const [donorsLoaded, setDonorsLoaded] = useState(false);
  const [section, setSection] = useState<Section>("dashboard");

  // Each nav entry shows its own screen, so the workspace never stacks the
  // dashboard, the request form, appointments and donors on one page.
  function goToSection(next: Section) {
    setSection(next);
    window.history.replaceState(null, "", `#${next}`);
    document.querySelector("[data-portal-content]")?.scrollTo({ top: 0 });
  }

  useEffect(() => {
    function applyHash() {
      const hash = window.location.hash.replace("#", "");
      setSection(SECTIONS.includes(hash as Section) ? (hash as Section) : "dashboard");
    }

    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);
  const [contactingId, setContactingId] = useState<string | null>(null);
  const [rescheduling, setRescheduling] = useState<AppointmentItem | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [rescheduleError, setRescheduleError] = useState("");

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
    () =>
      appointments.filter(
        (appointment) => appointment.status === "SCHEDULED" || appointment.status === "CONFIRMED",
      ),
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

  // Donors are loaded by the directory effect below, which reacts to its filters.
  const loadAll = useCallback(async () => {
    try {
      const [requestsRes, appointmentsRes] = await Promise.all([
        fetch("/api/medical-staff/blood-requests", { credentials: "include", cache: "no-store" }),
        fetch("/api/medical-staff/appointments", { credentials: "include", cache: "no-store" }),
      ]);

      const [requestsData, appointmentsData] = await Promise.all([
        requestsRes.json().catch(() => ({})),
        appointmentsRes.json().catch(() => ({})),
      ]);

      if (!requestsRes.ok) throw new Error(requestsData.error ?? "Unable to load blood requests.");
      if (!appointmentsRes.ok) throw new Error(appointmentsData.error ?? "Unable to load appointments.");

      setError("");
      setRequests(requestsData.requests ?? []);
      setAppointments(appointmentsData.appointments ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load your workspace.");
    } finally {
      setLoading(false);
    }
  }, []);

  function refresh() {
    setLoading(true);
    void loadAll();
  }

  useEffect(() => {
    // Initial load; state updates happen after the fetches resolve.
    const initial = setTimeout(() => void loadAll(), 0);
    return () => clearTimeout(initial);
  }, [loadAll]);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      const params = new URLSearchParams();
      if (donorSearch.trim()) params.set("search", donorSearch.trim());
      if (donorCompatibleWith) params.set("compatibleWith", donorCompatibleWith);
      if (donorEligibleOnly) params.set("eligibleOnly", "1");

      const response = await fetch(`/api/medical-staff/donors?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) setDonors(data.donors ?? []);
      setDonorsLoaded(true);
    }, 300);

    return () => clearTimeout(timeout);
  }, [donorSearch, donorCompatibleWith, donorEligibleOnly]);

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

  async function contactDonor(donorId: string) {
    setContactingId(donorId);
    setError("");

    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ donorId }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to start a conversation.");
      }

      router.push(`/portal/chat?conversationId=${data.conversation.id}`);
    } catch (contactError) {
      setError(contactError instanceof Error ? contactError.message : "Unable to start a conversation.");
      setContactingId(null);
    }
  }

  async function changeAppointment(
    id: string,
    change: { status?: "CONFIRMED" | "COMPLETED" | "CANCELLED"; appointmentDate?: string; appointmentTime?: string },
    successMessage: string,
  ) {
    setActionId(id);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/medical-staff/appointments", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...change }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to update appointment.");
      }

      setAppointments((current) => current.map((item) => (item.id === id ? data.appointment : item)));
      setNotice(successMessage);
      return true;
    } catch (updateError) {
      const message = updateError instanceof Error ? updateError.message : "Unable to update appointment.";
      if (rescheduling?.id === id) setRescheduleError(message);
      else setError(message);
      return false;
    } finally {
      setActionId(null);
    }
  }

  function openReschedule(appointment: AppointmentItem) {
    setRescheduling(appointment);
    setNewDate(appointment.appointmentDate.slice(0, 10));
    setNewTime(appointment.appointmentTime);
    setRescheduleError("");
  }

  async function submitReschedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!rescheduling) return;

    setRescheduleError("");

    const moved = await changeAppointment(
      rescheduling.id,
      { appointmentDate: newDate, appointmentTime: newTime },
      `Appointment moved to ${newDate} at ${newTime}. The donor has been notified.`,
    );

    if (moved) setRescheduling(null);
  }

  return (
    <PortalShell
      brandHref="/portal/medical-staff"
      title="Clinical dashboard"
      subtitle="Blood requests, appointments and the donor pool"
      navGroups={MEDICAL_STAFF_NAV}
      activeHref={`#${section}`}
      onNavigate={(href) => goToSection(href.replace("#", "") as Section)}
      accountName="Medical staff"
      accountRole="Donation care"
    >
          <div className="mx-auto max-w-7xl">

            <PageHeader
              eyebrow={SECTION_COPY[section].eyebrow}
              title={SECTION_COPY[section].title}
              description={SECTION_COPY[section].description}
              actions={
                <button
                  onClick={refresh}
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-300 px-5 text-[13px] font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  <RefreshCw size={15} />
                  Refresh
                </button>
              }
            />

            {error && <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
            {notice && <p className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}

            {section === "dashboard" && (
              <>
            <div className="mt-7">
              <StatGrid>
                <Stat
                  label="Open blood requests"
                  value={openRequests.length.toString()}
                  foot="Visible to donors"
                />
                <Stat
                  label="Scheduled appointments"
                  value={scheduledAppointments.length.toString()}
                  foot="Upcoming visits"
                />
                <Stat label="Donor pool" value={donors.length.toString()} foot="Active donors" />
                <Stat
                  label="Critical requests"
                  value={criticalOpenRequests.length.toString()}
                  foot={criticalOpenRequests.length > 0 ? "Needs urgent action" : "None open"}
                  tone={criticalOpenRequests.length > 0 ? "critical" : "good"}
                />
              </StatGrid>
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
              </>
            )}

            {section === "requests" && (
              <div className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
              <Panel label="Raise a need">
                <h2 className="mt-3 text-[15px] font-bold text-slate-950">Create blood request</h2>

                <form onSubmit={submitRequest} className="mt-5 space-y-3">
                  <label htmlFor="rq-group" className="sr-only">
                    Blood group
                  </label>
                  <select
                    id="rq-group"
                    value={requestForm.bloodGroup}
                    onChange={(event) =>
                      setRequestForm({ ...requestForm, bloodGroup: event.target.value as BloodGroup })
                    }
                    className={fieldClass}
                  >
                    {Object.entries(bloodGroupLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>

                  <label htmlFor="rq-units" className="sr-only">
                    Units needed
                  </label>
                  <input
                    id="rq-units"
                    required
                    type="number"
                    min={1}
                    value={requestForm.unitsNeeded}
                    onChange={(event) =>
                      setRequestForm({ ...requestForm, unitsNeeded: event.target.value })
                    }
                    placeholder="Units needed"
                    className={fieldClass}
                  />

                  <label htmlFor="rq-urgency" className="sr-only">
                    Urgency
                  </label>
                  <select
                    id="rq-urgency"
                    value={requestForm.urgency}
                    onChange={(event) =>
                      setRequestForm({ ...requestForm, urgency: event.target.value as Urgency })
                    }
                    className={fieldClass}
                  >
                    <option value="LOW">Low urgency</option>
                    <option value="MEDIUM">Medium urgency</option>
                    <option value="HIGH">High urgency</option>
                    <option value="CRITICAL">Critical urgency</option>
                  </select>

                  <label htmlFor="rq-notes" className="sr-only">
                    Notes for donors
                  </label>
                  <textarea
                    id="rq-notes"
                    value={requestForm.notes}
                    onChange={(event) =>
                      setRequestForm({ ...requestForm, notes: event.target.value })
                    }
                    placeholder="Notes for donors (optional)"
                    rows={3}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-[13.5px] transition focus:border-slate-500 focus:outline-none"
                  />

                  <button
                    disabled={submittingRequest}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-red-950 text-[13px] font-semibold text-white transition hover:brightness-125 disabled:opacity-50"
                  >
                    <Droplet size={16} />
                    {submittingRequest ? "Creating…" : "Create request"}
                  </button>
                </form>
              </Panel>

                <div className="space-y-6">
                <Panel label="Blood requests" padded={false}>
                  <div className="mt-5 border-t border-slate-100">
                    {loading ? (
                      <p className="px-6 py-8 text-sm text-slate-500">Loading requests…</p>
                    ) : requests.length === 0 ? (
                      <div className="p-6">
                        <EmptyState
                          title="No blood requests yet"
                          description="Create one on the left and it becomes visible to matching donors."
                        />
                      </div>
                    ) : (
                      requests.map((request) => (
                        <Row key={request.id}>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <RowTitle>
                                {bloodGroupLabels[request.bloodGroup]} · {request.unitsNeeded} unit
                                {request.unitsNeeded > 1 ? "s" : ""}
                              </RowTitle>
                              <Pill tone={urgencyTones[request.urgency]}>{request.urgency}</Pill>
                            </div>

                            <RowMeta>
                              Requested by {request.requestedBy.firstName}{" "}
                              {request.requestedBy.lastName} · {formatDate(request.createdAt)}
                            </RowMeta>

                            {request.notes && (
                              <p className="mt-2 max-w-xl text-xs leading-5 text-slate-600">
                                {request.notes}
                              </p>
                            )}
                          </div>

                          {request.status === "OPEN" ? (
                            <div className="flex shrink-0 gap-2">
                              <button
                                onClick={() => updateRequestStatus(request.id, "FULFILLED")}
                                disabled={actionId === request.id}
                                className={`${rowButtonClass} border-emerald-200 text-emerald-700 hover:bg-emerald-50`}
                              >
                                Mark fulfilled
                              </button>
                              <button
                                onClick={() => updateRequestStatus(request.id, "CANCELLED")}
                                disabled={actionId === request.id}
                                className={`${rowButtonClass} border-red-200 text-red-800 hover:bg-red-50`}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <Pill>{request.status}</Pill>
                          )}
                        </Row>
                      ))
                    )}
                  </div>
                </Panel>
                </div>
              </div>
            )}

            {section === "appointments" && (
              <div className="mt-6">
                <Panel label="Appointments" padded={false}>
                  <div className="mt-5 border-t border-slate-100">
                    {loading ? (
                      <p className="px-6 py-8 text-sm text-slate-500">Loading appointments…</p>
                    ) : appointments.length === 0 ? (
                      <div className="p-6">
                        <EmptyState
                          title="No appointments booked yet"
                          description="Donor bookings for your institute appear here."
                        />
                      </div>
                    ) : (
                      appointments.map((appointment) => (
                        <Row key={appointment.id}>
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
                              {appointment.appointmentTime} · {appointment.donor.email}
                            </RowMeta>
                          </div>

                          {appointment.status === "SCHEDULED" || appointment.status === "CONFIRMED" ? (
                            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                              <Pill tone={appointment.status === "CONFIRMED" ? "good" : "neutral"}>
                                {appointment.status === "CONFIRMED" ? "Approved" : "Awaiting approval"}
                              </Pill>

                              {appointment.status === "SCHEDULED" && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    changeAppointment(
                                      appointment.id,
                                      { status: "CONFIRMED" },
                                      `Appointment approved for ${appointment.donor.firstName} ${appointment.donor.lastName}. The donor has been notified.`,
                                    )
                                  }
                                  disabled={actionId === appointment.id}
                                  className={`${rowButtonClass} border-emerald-200 bg-emerald-50 text-emerald-700 hover:brightness-95`}
                                >
                                  Approve
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => openReschedule(appointment)}
                                disabled={actionId === appointment.id}
                                className={`${rowButtonClass} border-slate-300 text-slate-700 hover:bg-slate-50`}
                              >
                                Reschedule
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  changeAppointment(
                                    appointment.id,
                                    { status: "COMPLETED" },
                                    "Appointment marked as completed.",
                                  )
                                }
                                disabled={actionId === appointment.id}
                                className={`${rowButtonClass} border-emerald-200 text-emerald-700 hover:bg-emerald-50`}
                              >
                                Mark completed
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  changeAppointment(
                                    appointment.id,
                                    { status: "CANCELLED" },
                                    "Appointment cancelled. The donor has been notified.",
                                  )
                                }
                                disabled={actionId === appointment.id}
                                className={`${rowButtonClass} border-red-200 text-red-800 hover:bg-red-50`}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <Pill tone={appointment.status === "COMPLETED" ? "good" : "neutral"}>
                              {appointment.status === "COMPLETED" ? "Completed" : "Cancelled"}
                            </Pill>
                          )}
                        </Row>
                      ))
                    )}
                  </div>
                </Panel>
              </div>
            )}

            {section === "donors" && (
              <div className="mt-6">
                <Panel
                  label="Donor directory"
                  padded={false}
                  action={
                    <div className="flex flex-wrap items-center gap-2">
                    <label htmlFor="donor-compatible" className="sr-only">
                      Can donate to
                    </label>
                    <select
                      id="donor-compatible"
                      value={donorCompatibleWith}
                      onChange={(event) => setDonorCompatibleWith(event.target.value as BloodGroup | "")}
                      className="h-9 rounded-lg border border-slate-300 px-2.5 text-[13px] transition focus:border-slate-500 focus:outline-none"
                    >
                      <option value="">Any blood group</option>
                      {Object.entries(bloodGroupLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          Can give to {label} patient
                        </option>
                      ))}
                    </select>
                    <label className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 text-[13px] text-slate-700">
                      <input
                        type="checkbox"
                        checked={donorEligibleOnly}
                        onChange={(event) => setDonorEligibleOnly(event.target.checked)}
                      />
                      Eligible only
                    </label>
                    <div className="relative">
                      <Search
                        size={15}
                        aria-hidden
                        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                      />
                      <label htmlFor="donor-search" className="sr-only">
                        Search donors
                      </label>
                      <input
                        id="donor-search"
                        value={donorSearch}
                        onChange={(event) => setDonorSearch(event.target.value)}
                        placeholder="Search donors…"
                        className="h-9 rounded-lg border border-slate-300 pr-3 pl-9 text-[13px] transition focus:border-slate-500 focus:outline-none"
                      />
                    </div>
                    </div>
                  }
                >
                  <div className="mt-5 border-t border-slate-100">
                    {!donorsLoaded ? (
                      <p className="px-6 py-8 text-sm text-slate-500">Loading donors…</p>
                    ) : donors.length === 0 ? (
                      <div className="p-6">
                        <EmptyState
                          title="No donors found"
                          description="Try a different search or filter."
                        />
                      </div>
                    ) : (
                      donors.map((donor) => (
                        <Row key={donor.id}>
                          <div className="min-w-0">
                            <RowTitle>
                              {donor.firstName} {donor.lastName}
                            </RowTitle>

                            <RowMeta>
                              {donor.email} · {donor.donorProfile?.city ?? "No city on file"} ·{" "}
                              {donor.donationsCount ?? 0} donation
                              {(donor.donationsCount ?? 0) === 1 ? "" : "s"}
                            </RowMeta>
                          </div>

                          <div className="flex shrink-0 items-center gap-2.5">
                            {getConsultationProgress(donor.donationsCount ?? 0).earned > 0 && (
                              <Pill tone="good">
                                {getConsultationProgress(donor.donationsCount ?? 0).earned} free
                                consultation
                                {getConsultationProgress(donor.donationsCount ?? 0).earned === 1
                                  ? ""
                                  : "s"}
                              </Pill>
                            )}

                            <Pill tone="critical">
                              {donor.donorProfile?.bloodGroup
                                ? bloodGroupLabels[donor.donorProfile.bloodGroup]
                                : "Unknown"}
                            </Pill>

                            <Pill tone={donor.donorProfile?.eligibilityStatus ? "good" : "neutral"}>
                              {donor.donorProfile?.eligibilityStatus ? "Eligible" : "Not eligible"}
                            </Pill>

                            <button
                              onClick={() => contactDonor(donor.id)}
                              disabled={contactingId === donor.id}
                              className={`${rowButtonClass} gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-50`}
                            >
                              <MessageCircle size={13} />
                              {contactingId === donor.id ? "Opening…" : "Message"}
                            </button>
                          </div>
                        </Row>
                      ))
                    )}
                  </div>
                </Panel>
              </div>
            )}

          </div>
      {rescheduling && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="staff-reschedule-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
        >
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-950">Reschedule</p>

            <h2 id="staff-reschedule-title" className="mt-2 text-xl font-bold text-slate-950">
              Move this appointment
            </h2>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              {rescheduling.donor.firstName} {rescheduling.donor.lastName} ·{" "}
              {formatDate(rescheduling.appointmentDate)} at {rescheduling.appointmentTime}
            </p>

            <form onSubmit={submitReschedule} className="mt-6 space-y-5">
              <div>
                <label htmlFor="staff-new-date" className="mb-2 block text-xs font-bold text-slate-700">
                  New date
                </label>
                <input
                  id="staff-new-date"
                  type="date"
                  required
                  value={newDate}
                  onChange={(event) => {
                    setNewDate(event.target.value);
                    setRescheduleError("");
                  }}
                  className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm text-slate-700 outline-none focus:border-red-950"
                />
              </div>

              <div>
                <span className="mb-2 block text-xs font-bold text-slate-700">New time</span>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {APPOINTMENT_TIMES.map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => {
                        setNewTime(time);
                        setRescheduleError("");
                      }}
                      className={`h-10 rounded-xl border text-xs font-semibold ${
                        newTime === time
                          ? "border-red-950 bg-red-950 text-white"
                          : "border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>

              {rescheduleError && (
                <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs font-medium text-red-700">
                  {rescheduleError}
                </p>
              )}

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={() => setRescheduling(null)}
                  className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-600"
                >
                  Keep current time
                </button>

                <button
                  type="submit"
                  disabled={actionId === rescheduling.id}
                  className="h-10 rounded-xl bg-red-950 px-4 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {actionId === rescheduling.id ? "Moving..." : "Move appointment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PortalShell>
  );
}
