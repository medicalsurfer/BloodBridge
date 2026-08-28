import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthenticatedUserFromToken } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

const PRIMARY_RED = "oklch(27.1% 0.105 12.094)";

export const dynamic = "force-dynamic";

export default async function SystemAdminPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("bloodbridge_session")?.value;

  if (!token) {
    redirect("/login");
  }

  const authentication = await getAuthenticatedUserFromToken(token);

  if (
    !authentication.user ||
    authentication.user.role !== "SYSTEM_ADMIN"
  ) {
    redirect("/home");
  }

  const [
    totalInstitutes,
    activeInstitutes,
    pendingInstitutes,
    instituteAdmins,
    recentInstitutes,
    totalUsers,
  ] = await Promise.all([
    prisma.healthInstitute.count(),

    prisma.healthInstitute.count({
      where: {
        status: "ACTIVE",
      },
    }),

    prisma.healthInstitute.count({
      where: {
        status: "PENDING",
      },
    }),

    prisma.user.count({
      where: {
        role: "HEALTH_INSTITUTE_ADMIN",
        isActive: true,
      },
    }),

    prisma.healthInstitute.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    }),

    prisma.user.count(),
  ]);

  return (
    <main className="min-h-screen bg-slate-100 p-4">
      <section className="mx-auto max-w-7xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

        <header className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/system-admin" className="flex items-center gap-3">

            <div
              style={{ backgroundColor: PRIMARY_RED }}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
            >
              <BloodDropIcon />
            </div>

            <div>
              <p className="text-lg font-bold text-slate-950">
                BloodBridge
              </p>

              <p className="text-[10px] text-slate-400">
                System Administration
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-bold text-slate-800">
                System Administrator
              </p>

              <p className="mt-0.5 text-[10px] text-slate-400">
                Platform administration
              </p>
            </div>

            <div
              style={{ backgroundColor: PRIMARY_RED }}
              className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white"
            >
              SA
            </div>
          </div>
        </header>

        <div className="grid min-h-175 lg:grid-cols-[230px_1fr]">

          <aside className="border-r border-slate-200 bg-white p-4">

            <nav className="space-y-2">
              <NavItem
                href="/system-admin"
                label="Dashboard"
                icon={<DashboardIcon />}
                active
              />

              <NavItem
                href="/system-admin/institutes"
                label="Health institutes"
                icon={<HospitalIcon />}
              />

              <NavItem
                href="/system-admin/invitations"
                label="Invitations"
                icon={<MailIcon />}
              />

              <NavItem
                href="/system-admin/users"
                label="Users"
                icon={<UsersIcon />}
              />
            </nav>

            <div className="mt-8 border-t border-slate-100 pt-5">
              <p className="px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Platform
              </p>

              <div className="mt-3 space-y-2">
                <NavItem
                  href="/system-admin/settings"
                  label="Settings"
                  icon={<SettingsIcon />}
                />

                <Link
                  href="/login"
                  className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                >
                  <LogoutIcon />

                  Sign out
                </Link>
              </div>
            </div>
          </aside>

          <section className="bg-slate-50/70 p-6 lg:p-8">

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

              <StatCard
                label="Health institutes"
                value={totalInstitutes.toString()}
                helper={`${activeInstitutes} currently active`}
                icon={<HospitalIcon />}
              />

              <StatCard
                label="Institute admins"
                value={instituteAdmins.toString()}
                helper="Active institute administrators"
                icon={<UsersIcon />}
              />

              <StatCard
                label="Platform users"
                value={totalUsers.toString()}
                helper="Registered BloodBridge users"
                icon={<UsersIcon />}
              />

              <StatCard
                label="Pending institutes"
                value={pendingInstitutes.toString()}
                helper="Require administrative action"
                icon={<ClockIcon />}
              />

            </div>

            <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_340px]">

              <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

                <div className="flex items-center justify-between border-b border-slate-100 p-5">

                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Health institutes
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      Recently registered institutes
                    </p>
                  </div>

                  <Link
                    href="/system-admin/institutes"
                    className="text-xs font-bold text-red-950"
                  >
                    View all
                  </Link>

                </div>

                {recentInstitutes.length === 0 ? (
                  <div className="px-6 py-14 text-center">

                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                      <HospitalIcon />
                    </div>

                    <p className="mt-4 text-sm font-bold text-slate-800">
                      No health institutes registered
                    </p>

                    <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-slate-500">
                      Register your first health institute to begin managing
                      institutional access to BloodBridge.
                    </p>

                    <Link
                      href="/system-admin/institutes/new"
                      style={{ backgroundColor: PRIMARY_RED }}
                      className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-semibold text-white"
                    >
                      <PlusIcon />

                      Add health institute
                    </Link>

                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">

                    {recentInstitutes.map((institute) => (
                      <Link
                        key={institute.id}
                        href={`/system-admin/institutes/${institute.id}`}
                        className="flex flex-col gap-4 p-5 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                      >

                        <div className="flex min-w-0 items-center gap-4">

                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-950">
                            <HospitalIcon />
                          </div>

                          <div className="min-w-0">

                            <div className="flex flex-wrap items-center gap-2">

                              <p className="text-sm font-bold text-slate-900">
                                {institute.name}
                              </p>

                              <InstituteStatus
                                status={institute.status}
                              />

                            </div>

                            <p className="mt-1 text-xs text-slate-500">
                              {institute.city}
                              {institute.region
                                ? `, ${institute.region}`
                                : ""}
                            </p>

                            {institute.email && (
                              <p className="mt-1 text-[11px] text-slate-400">
                                {institute.email}
                              </p>
                            )}

                          </div>
                        </div>

                        <div className="flex items-center gap-3">

                          <div className="hidden text-right sm:block">

                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                              Registered
                            </p>

                            <p className="mt-1 text-xs font-semibold text-slate-700">
                              {formatDate(institute.createdAt)}
                            </p>

                          </div>

                          <ChevronRightIcon />

                        </div>

                      </Link>
                    ))}

                  </div>
                )}

              </section>

              <aside className="space-y-5">

                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">

                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    Quick actions
                  </p>

                  <div className="mt-5 space-y-3">

                    <QuickAction
                      href="/system-admin/institutes/new"
                      icon={<HospitalIcon />}
                      title="Register institute"
                      description="Add a health institute to BloodBridge."
                    />

                    <QuickAction
                      href="/system-admin/invitations/new"
                      icon={<MailIcon />}
                      title="Invite institute admin"
                      description="Create an administrator invitation."
                    />

                    <QuickAction
                      href="/system-admin/users"
                      icon={<UsersIcon />}
                      title="Manage users"
                      description="Review registered user accounts."
                    />

                  </div>
                </div>

                <div
                  style={{ backgroundColor: PRIMARY_RED }}
                  className="rounded-3xl p-5 text-white"
                >

                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                    <ShieldIcon />
                  </div>

                  <p className="mt-4 text-base font-bold">
                    Institutional access
                  </p>

                  <p className="mt-2 text-xs leading-5 text-red-100/80">
                    Health Institute Admin accounts are created through
                    invitation and linked to an approved health institute.
                  </p>

                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">

                  <div className="flex items-center justify-between">

                    <div>

                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                        Active institutes
                      </p>

                      <p className="mt-3 text-3xl font-bold text-slate-950">
                        {activeInstitutes}
                      </p>

                    </div>

                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                      <HospitalIcon />
                    </div>

                  </div>

                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    {totalInstitutes === 0
                      ? "No health institutes have been registered yet."
                      : `${activeInstitutes} of ${totalInstitutes} registered institutes are currently active.`}
                  </p>

                  <Link
                    href="/system-admin/institutes"
                    className="mt-4 inline-flex text-xs font-bold text-red-950"
                  >
                    Manage institutes
                  </Link>

                </div>

              </aside>

            </div>

          </section>

        </div>

      </section>
    </main>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function NavItem({
  href,
  label,
  icon,
  active = false,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      style={
        active
          ? {
              backgroundColor: PRIMARY_RED,
            }
          : undefined
      }
      className={`flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${
        active
          ? "text-white"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      {icon}

      {label}
    </Link>
  );
}

function StatCard({
  label,
  value,
  helper,
  icon,
}: {
  label: string;
  value: string;
  helper: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex items-start justify-between gap-4">

        <div>

          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
            {label}
          </p>

          <p className="mt-3 text-3xl font-bold text-slate-950">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {helper}
          </p>

        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-950">
          {icon}
        </div>

      </div>

    </div>
  );
}

function InstituteStatus({
  status,
}: {
  status: "ACTIVE" | "PENDING" | "INACTIVE";
}) {
  if (status === "ACTIVE") {
    return (
      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
        Active
      </span>
    );
  }

  if (status === "PENDING") {
    return (
      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
        Pending
      </span>
    );
  }

  return (
    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">
      Inactive
    </span>
  );
}

function QuickAction({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 rounded-2xl border border-slate-100 p-3 transition hover:border-slate-200 hover:bg-slate-50"
    >

      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-950">
        {icon}
      </div>

      <div>

        <p className="text-xs font-bold text-slate-800">
          {title}
        </p>

        <p className="mt-1 text-[11px] leading-5 text-slate-500">
          {description}
        </p>

      </div>

    </Link>
  );
}

function BloodDropIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M12 3.5c2.8 3.8 7 8.9 7 12.5a7 7 0 1 1-14 0c0-3.6 4.2-8.7 7-12.5Z" />
    </svg>
  );
}

function DashboardIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </svg>
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

function SettingsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="12" r="3" />

      <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.7-1L14.5 3h-5L9 6.1a7 7 0 0 0-1.7 1l-2.4-1-2 3.4L5 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.4 3.1h5l.4-3.1a7 7 0 0 0 1.7-1l2.4 1 2-3.4L19 13a7 7 0 0 0 0-1Z" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M10 5H5v14h5" />
      <path d="M14 8l4 4-4 4M18 12H9" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M12 3 20 6v5c0 5-3.2 8.5-8 10-4.8-1.5-8-5-8-10V6l8-3Z" />

      <path
        d="m9 12 2 2 4-4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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

function ChevronRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 text-slate-300"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        d="m9 6 6 6-6 6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}