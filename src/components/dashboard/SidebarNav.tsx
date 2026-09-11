"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const PRIMARY_RED = "oklch(27.1% 0.105 12.094)";

const primaryLinks = [
  { href: "/system-admin", label: "Dashboard", icon: <DashboardIcon /> },
  {
    href: "/system-admin/institutes",
    label: "Health institutes",
    icon: <HospitalIcon />,
  },
  {
    href: "/system-admin/invitations/new",
    label: "Invitations",
    icon: <MailIcon />,
  },
  { href: "/system-admin/users", label: "Users", icon: <UsersIcon /> },
];

const platformLinks = [
  { href: "/system-admin/logs", label: "System logs", icon: <LogsIcon /> },
  {
    href: "/system-admin/settings",
    label: "Settings",
    icon: <SettingsIcon />,
  },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="overflow-y-auto border-r border-slate-200 bg-white p-4">
      <nav className="space-y-2">
        {primaryLinks.map((link) => (
          <NavItem
            key={link.href}
            href={link.href}
            label={link.label}
            icon={link.icon}
            active={isActive(pathname, link.href)}
          />
        ))}
      </nav>

      <div className="mt-8 border-t border-slate-100 pt-5">
        <p className="px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
          Platform
        </p>

        <div className="mt-3 space-y-2">
          {platformLinks.map((link) => (
            <NavItem
              key={link.href}
              href={link.href}
              label={link.label}
              icon={link.icon}
              active={isActive(pathname, link.href)}
            />
          ))}

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
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/system-admin") {
    return pathname === "/system-admin";
  }

  return pathname.startsWith(href);
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

function LogsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M9 4h9a2 2 0 0 1 2 2v13a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
      <path d="M9 4v16" />
      <path d="M13 9h4M13 13h4M13 17h2" />
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
