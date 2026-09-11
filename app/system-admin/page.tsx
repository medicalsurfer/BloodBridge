import Link from "next/link";
import { prisma } from "@/src/lib/prisma";
import {
  KpiCard,
  TrendAreaChart,
  WeekdayBarChart,
  BreakdownBar,
  ActivityFeed,
  DashboardCard,
  bucketByDay,
  weekdayCounts,
  formatRelativeTime,
  type ActivityItem,
} from "@/src/components/dashboard/DashboardWidgets";

const PRIMARY_RED = "oklch(27.1% 0.105 12.094)";

const bloodGroupLabels: Record<string, string> = {
  O_POSITIVE: "O+",
  O_NEGATIVE: "O-",
  A_POSITIVE: "A+",
  A_NEGATIVE: "A-",
  B_POSITIVE: "B+",
  B_NEGATIVE: "B-",
  AB_POSITIVE: "AB+",
  AB_NEGATIVE: "AB-",
};

const bloodGroupColors: Record<string, string> = {
  O_POSITIVE: PRIMARY_RED,
  O_NEGATIVE: "oklch(45% 0.16 20)",
  A_POSITIVE: "oklch(62% 0.15 40)",
  A_NEGATIVE: "oklch(70% 0.15 60)",
  B_POSITIVE: "oklch(60% 0.12 250)",
  B_NEGATIVE: "oklch(68% 0.11 260)",
  AB_POSITIVE: "oklch(55% 0.14 320)",
  AB_NEGATIVE: "oklch(65% 0.02 260)",
};

const activityMeta: Record<
  string,
  { verb: string; badgeClassName: string; icon: React.ReactNode }
> = {
  USER_REGISTERED: { verb: "registered a new account", badgeClassName: "bg-blue-50 text-blue-600", icon: <UsersIcon /> },
  USER_LOGGED_IN: { verb: "signed in", badgeClassName: "bg-slate-100 text-slate-500", icon: <UsersIcon /> },
  USER_CREATED: { verb: "created a user account", badgeClassName: "bg-blue-50 text-blue-600", icon: <UsersIcon /> },
  USER_UPDATED: { verb: "updated a user account", badgeClassName: "bg-slate-100 text-slate-500", icon: <UsersIcon /> },
  USER_DELETED: { verb: "removed a user account", badgeClassName: "bg-red-50 text-red-700", icon: <UsersIcon /> },
  INSTITUTE_CREATED: { verb: "registered a health institute", badgeClassName: "bg-red-50 text-red-950", icon: <HospitalIcon /> },
  INSTITUTE_UPDATED: { verb: "updated a health institute", badgeClassName: "bg-red-50 text-red-950", icon: <HospitalIcon /> },
  INSTITUTE_STATUS_CHANGED: { verb: "changed an institute's status", badgeClassName: "bg-amber-50 text-amber-700", icon: <HospitalIcon /> },
  INSTITUTE_DELETED: { verb: "removed a health institute", badgeClassName: "bg-red-50 text-red-700", icon: <HospitalIcon /> },
  STAFF_INVITED: { verb: "invited a staff member", badgeClassName: "bg-amber-50 text-amber-700", icon: <MailIcon /> },
  STAFF_REMOVED: { verb: "removed a staff member", badgeClassName: "bg-amber-50 text-amber-700", icon: <MailIcon /> },
  APPOINTMENT_BOOKED: { verb: "booked an appointment", badgeClassName: "bg-amber-50 text-amber-700", icon: <CalendarIcon /> },
  APPOINTMENT_CANCELLED: { verb: "cancelled an appointment", badgeClassName: "bg-slate-100 text-slate-500", icon: <CalendarIcon /> },
  APPOINTMENT_RESCHEDULED: { verb: "rescheduled an appointment", badgeClassName: "bg-amber-50 text-amber-700", icon: <CalendarIcon /> },
  DONATION_RECORDED: { verb: "recorded a blood donation", badgeClassName: "bg-emerald-50 text-emerald-700", icon: <HeartIcon /> },
  BLOOD_REQUEST_CREATED: { verb: "opened a blood request", badgeClassName: "bg-red-50 text-red-700", icon: <DropletIcon /> },
  REWARD_VALIDATED: { verb: "validated a donation reward", badgeClassName: "bg-purple-50 text-purple-700", icon: <AwardIcon /> },
  REWARD_REJECTED: { verb: "rejected a donation reward", badgeClassName: "bg-slate-100 text-slate-500", icon: <AwardIcon /> },
};

export const dynamic = "force-dynamic";

function percentChange(current: number, previous: number) {
  if (previous === 0) {
    return current > 0 ? { delta: "New", trend: "up" as const } : undefined;
  }

  const change = ((current - previous) / previous) * 100;
  const rounded = Math.round(change * 10) / 10;

  return {
    delta: `${rounded > 0 ? "+" : ""}${rounded}%`,
    trend: rounded > 0 ? ("up" as const) : rounded < 0 ? ("down" as const) : ("flat" as const),
  };
}

export default async function SystemAdminPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const fourteenDaysAgo = new Date(today);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sixtyDaysAgo = new Date(today);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const [
    totalInstitutes,
    activeInstitutes,
    pendingInstitutes,
    instituteAdmins,
    totalUsers,
    institutesLast30,
    institutesPrev30,
    usersLast30,
    usersPrev30,
    recentSignups,
    recentActivity,
    recentActivityFeed,
    bloodInventoryByGroup,
  ] = await Promise.all([
    prisma.healthInstitute.count(),

    prisma.healthInstitute.count({ where: { status: "ACTIVE" } }),

    prisma.healthInstitute.count({ where: { status: "PENDING" } }),

    prisma.user.count({
      where: { role: "HEALTH_INSTITUTE_ADMIN", isActive: true },
    }),

    prisma.user.count(),

    prisma.healthInstitute.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),

    prisma.healthInstitute.count({
      where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
    }),

    prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),

    prisma.user.count({
      where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
    }),

    prisma.user.findMany({
      where: { createdAt: { gte: fourteenDaysAgo } },
      select: { createdAt: true },
    }),

    prisma.auditLog.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
      take: 2000,
    }),

    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 7,
      include: {
        actor: { select: { firstName: true, lastName: true } },
      },
    }),

    prisma.bloodInventory.groupBy({
      by: ["bloodGroup"],
      _sum: { units: true },
    }),
  ]);

  const institutesTrend = percentChange(institutesLast30, institutesPrev30);
  const usersTrend = percentChange(usersLast30, usersPrev30);
  const signupSeries = bucketByDay(
    recentSignups.map((row) => row.createdAt),
    14,
  );
  const activityByWeekday = weekdayCounts(recentActivity.map((row) => row.createdAt));

  const activityItems: ActivityItem[] = recentActivityFeed.map((log) => {
    const meta = activityMeta[log.action] ?? {
      verb: "performed an action",
      badgeClassName: "bg-slate-100 text-slate-500",
      icon: <ClockIcon />,
    };

    const actorName = log.actor
      ? `${log.actor.firstName} ${log.actor.lastName}`
      : "System";

    return {
      id: log.id,
      title: actorName,
      subtitle: meta.verb,
      time: formatRelativeTime(log.createdAt),
      badgeClassName: meta.badgeClassName,
      icon: meta.icon,
    };
  });

  const bloodSupplySegments = bloodInventoryByGroup
    .map((row) => ({
      label: bloodGroupLabels[row.bloodGroup] ?? row.bloodGroup,
      value: row._sum.units ?? 0,
      color: bloodGroupColors[row.bloodGroup] ?? "oklch(60% 0.05 250)",
    }))
    .sort((a, b) => b.value - a.value);

  const totalBloodUnits = bloodSupplySegments.reduce(
    (sum, segment) => sum + segment.value,
    0,
  );

  return (
    <>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-950">
            Administration
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-950">
            System Admin Dashboard
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Manage health institutes, institutional administrators and
            access to the BloodBridge platform.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">

          <Link
            href="/system-admin/invitations/new"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <MailIcon />

            Invite admin
          </Link>

          <Link
            href="/system-admin/institutes/new"
            style={{ backgroundColor: PRIMARY_RED }}
            className="inline-flex h-11 items-center gap-2 rounded-xl px-4 text-xs font-semibold text-white transition hover:brightness-125"
          >
            <PlusIcon />

            Add health institute
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <KpiCard
          label="Health institutes"
          value={totalInstitutes.toString()}
          delta={institutesTrend?.delta}
          trend={institutesTrend?.trend}
          icon={<HospitalIcon />}
        />

        <KpiCard
          label="Institute admins"
          value={instituteAdmins.toString()}
          delta={`${activeInstitutes} active institutes`}
          trend="flat"
          icon={<UsersIcon />}
        />

        <KpiCard
          label="Platform users"
          value={totalUsers.toString()}
          delta={usersTrend?.delta}
          trend={usersTrend?.trend}
          icon={<UsersIcon />}
        />

        <KpiCard
          label="Pending institutes"
          value={pendingInstitutes.toString()}
          delta={pendingInstitutes > 0 ? "Needs review" : "All clear"}
          trend={pendingInstitutes > 0 ? "down" : "up"}
          icon={<ClockIcon />}
        />

      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_340px]">

        <DashboardCard
          title="Platform growth"
          action={
            <span className="text-[11px] font-semibold text-slate-400">
              New signups, last 14 days
            </span>
          }
        >
          <TrendAreaChart data={signupSeries} color={PRIMARY_RED} />
        </DashboardCard>

        <DashboardCard title="Most active day">
          <WeekdayBarChart data={activityByWeekday} color={PRIMARY_RED} />
          <p className="mt-3 text-[11px] leading-5 text-slate-400">
            Platform actions logged in the last 30 days.
          </p>
        </DashboardCard>

      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_340px]">

        <DashboardCard
          title="Recent platform activity"
          action={
            <Link
              href="/system-admin/logs"
              className="text-[11px] font-bold text-red-950"
            >
              View all
            </Link>
          }
        >
          <ActivityFeed items={activityItems} />
        </DashboardCard>

        <DashboardCard
          title="Blood supply by group"
          action={
            <span className="text-[11px] font-semibold text-slate-400">
              {totalBloodUnits} units
            </span>
          }
        >
          {totalBloodUnits === 0 ? (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-950">
                <DropletIcon />
              </div>

              <p className="mt-3 text-xs font-semibold text-slate-500">
                No inventory recorded across institutes yet.
              </p>
            </div>
          ) : (
            <BreakdownBar segments={bloodSupplySegments} />
          )}
        </DashboardCard>

      </div>
    </>
  );
}

function HospitalIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M5 21V6h14v15" />
      <path d="M3 21h18" />
      <path d="M9 10h6M12 7v6" />
      <path d="M8 21v-4h8v4" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="9" cy="8" r="3" />
      <path d="M4 19c0-3 2-5 5-5s5 2 5 5" />
      <path d="M15 6.5a3 3 0 0 1 0 5.8M16 14c2.5.4 4 2.2 4 4.5" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        d="M12 5v14M5 12h14"
        strokeLinecap="round"
      />
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

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4.5 w-4.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3.5" y="5" width="17" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3.5 10h17" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4.5 w-4.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M12 20.5s-7.5-4.6-9.7-9.2C.7 7.8 2.6 4.5 6 4.5c2 0 3.5 1.1 4.2 2.3.5-.9 2.2-2.3 4.2-2.3 3.4 0 5.3 3.3 3.7 6.8-2.2 4.6-9.7 9.2-9.7 9.2Z" />
    </svg>
  );
}

function DropletIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4.5 w-4.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M12 3.5c2.8 3.8 7 8.9 7 12.5a7 7 0 1 1-14 0c0-3.6 4.2-8.7 7-12.5Z" />
    </svg>
  );
}

function AwardIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4.5 w-4.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="9" r="5.5" />
      <path d="M9 13.5 7.5 21l4.5-2.5 4.5 2.5-1.5-7.5" />
    </svg>
  );
}
