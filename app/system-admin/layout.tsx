import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthenticatedUserFromToken } from "@/src/lib/auth";
import { PortalShell, type PortalNavGroup } from "@/src/components/dashboard/PortalShell";

const SYSTEM_ADMIN_NAV: PortalNavGroup[] = [
  {
    label: "Administration",
    links: [
      { href: "/system-admin", label: "Dashboard", icon: <DashboardIcon /> },
      { href: "/system-admin/institutes", label: "Health institutes", icon: <HospitalIcon /> },
      { href: "/system-admin/invitations/new", label: "Invitations", icon: <MailIcon /> },
      { href: "/system-admin/users", label: "Users", icon: <UsersIcon /> },
    ],
  },
  {
    label: "Platform",
    links: [
      { href: "/system-admin/logs", label: "System logs", icon: <LogsIcon /> },
      { href: "/system-admin/settings", label: "Settings", icon: <SettingsIcon /> },
    ],
  },
];

export default async function SystemAdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("bloodbridge_session")?.value;

  if (!token) {
    redirect("/login");
  }

  const authentication = await getAuthenticatedUserFromToken(token);

  if (!authentication.user || authentication.user.role !== "SYSTEM_ADMIN") {
    redirect("/home");
  }

  return (
    <PortalShell
      brandHref="/system-admin"
      title="System administration"
      subtitle="Institutes, users and platform activity"
      navGroups={SYSTEM_ADMIN_NAV}
      accountName={`${authentication.user.firstName} ${authentication.user.lastName}`}
      accountRole="System admin"
      accountHref="/system-admin/settings"
    >
      <div className="mx-auto max-w-7xl">{children}</div>
    </PortalShell>
  );
}

function DashboardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </svg>
  );
}

function HospitalIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M5 21V6h14v15" />
      <path d="M3 21h18" />
      <path d="M9 10h6M12 7v6" />
      <path d="M8 21v-4h8v4" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="8" r="3" />
      <path d="M4 19c0-3 2-5 5-5s5 2 5 5" />
      <path d="M15 6.5a3 3 0 0 1 0 5.8M16 14c2.5.4 4 2.2 4 4.5" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function LogsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 4h9a2 2 0 0 1 2 2v13a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
      <path d="M9 4v16" />
      <path d="M13 9h4M13 13h4M13 17h2" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.7-1L14.5 3h-5L9 6.1a7 7 0 0 0-1.7 1l-2.4-1-2 3.4L5 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.4 3.1h5l.4-3.1a7 7 0 0 0 1.7-1l2.4 1 2-3.4L19 13a7 7 0 0 0 0-1Z" />
    </svg>
  );
}
