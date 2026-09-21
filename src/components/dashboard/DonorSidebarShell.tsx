"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./DonorSidebarShell.module.css";
import { ThemeToggle } from "@/src/components/ThemeToggle";

type NavLink = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

const NAV_GROUPS: { label: string; links: NavLink[] }[] = [
  {
    label: "Overview",
    links: [
      {
        href: "/home",
        label: "Dashboard",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="4" y="4" width="7" height="7" rx="1.5" />
            <rect x="13" y="4" width="7" height="7" rx="1.5" />
            <rect x="4" y="13" width="7" height="7" rx="1.5" />
            <rect x="13" y="13" width="7" height="7" rx="1.5" />
          </svg>
        ),
      },
      {
        href: "/profile",
        label: "My profile",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" />
          </svg>
        ),
      },
    ],
  },
  {
    label: "Donation",
    links: [
      {
        href: "/appointments",
        label: "Appointments",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="4" y="5" width="16" height="15" rx="2" />
            <path d="M8 3v4M16 3v4M4 10h16" />
          </svg>
        ),
      },
      {
        href: "/donations",
        label: "My donations",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 8v4l3 2" />
            <circle cx="12" cy="12" r="9" />
          </svg>
        ),
      },
      {
        href: "/request",
        label: "Blood requests",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 3.5c2.8 3.8 7 8.9 7 12.5a7 7 0 1 1-14 0c0-3.6 4.2-8.7 7-12.5Z" />
          </svg>
        ),
      },
      {
        href: "/donor/centers",
        label: "Donation centres",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="4" y="3" width="16" height="18" rx="2" />
            <path d="M9 21v-5h6v5M12 6v6M9 9h6" />
          </svg>
        ),
      },
      {
        href: "/rewards",
        label: "Rewards",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3" y="8" width="18" height="13" rx="2" />
            <path d="M12 8v13M3 12h18" />
          </svg>
        ),
      },
    ],
  },
  {
    label: "Support",
    links: [
      {
        href: "/chat",
        label: "Chat with institute",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 5h16v11H8l-4 4V5Z" />
          </svg>
        ),
      },
    ],
  },
];

const PAGE_TITLES: Record<string, [string, string]> = {
  "/home": ["Dashboard", "Your donation activity at a glance"],
  "/appointments": ["Appointments", "Book, reschedule or cancel your visits"],
  "/donations": ["My donations", "Your recorded donation history"],
  "/request": ["Blood requests", "Open requests matching your blood type"],
  "/donor/centers": ["Donation centres", "Participating institutions where you can donate"],
  "/rewards": ["Rewards", "Track your donation tier and points"],
  "/chat": ["Chat with institute", "Message the staff at a donation centre"],
  "/eligibility": ["Eligibility", "Check whether you can donate right now"],
  "/profile": ["My profile", "View and edit your donor details"],
  "/notification": ["Notifications", "Updates about your donation activity"],
};

function getTitle(pathname: string): [string, string] {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  const match = Object.keys(PAGE_TITLES).find((key) => pathname.startsWith(key + "/"));
  return match ? PAGE_TITLES[match] : ["BloodBridge", ""];
}

export function DonorSidebarShell({
  user,
  children,
}: {
  user: { firstName: string; lastName: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetch("/api/notifications", { credentials: "include", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setUnreadCount(data?.unreadCount ?? 0))
      .catch(() => setUnreadCount(0));
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const [title, subtitle] = getTitle(pathname);
  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();

  return (
    <div className={styles.shell}>
      {menuOpen && (
        <button
          type="button"
          className={styles.backdrop}
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ""}`}>
        <Link href="/home" className={styles.brand} onClick={() => setMenuOpen(false)}>
          <div className={styles.brandMark}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
              <path d="M12 3.5c2.8 3.8 7 8.9 7 12.5a7 7 0 1 1-14 0c0-3.6 4.2-8.7 7-12.5Z" />
            </svg>
          </div>
          <span className={styles.brandName}>BloodBridge</span>
        </Link>

        <nav className={styles.navScroll}>
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className={styles.navGroup}>
              <div className={styles.navLabel}>{group.label}</div>
              <ul className={styles.navList}>
                {group.links.map((link) => {
                  const active = pathname === link.href || pathname.startsWith(link.href + "/");
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        onClick={() => setMenuOpen(false)}
                        className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
                      >
                        {link.icon}
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className={styles.account}>
          <Link
            href="/profile"
            className={styles.accountLink}
            title="Edit your profile"
            onClick={() => setMenuOpen(false)}
          >
            <div className={styles.avatar}>{initials}</div>
            <div className={styles.accountText}>
              <div className={styles.accountName}>
                {user.firstName} {user.lastName}
              </div>
              <div className={styles.accountRole}>Donor · Edit profile</div>
            </div>
          </Link>
          <Link href="/api/logout" className={styles.signOut} title="Sign out">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M10 5H5v14h5" />
              <path d="M14 8l4 4-4 4M18 12H9" />
            </svg>
          </Link>
        </div>
      </aside>

      <div className={styles.main}>
        <div className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <button
              type="button"
              className={styles.menuBtn}
              onClick={() => setMenuOpen(true)}
              aria-label="Open navigation"
              aria-expanded={menuOpen}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
            <div>
              <div className={styles.pageTitle}>{title}</div>
              {subtitle && <div className={styles.pageSub}>{subtitle}</div>}
            </div>
          </div>
          <div className={styles.topbarActions}>
            <ThemeToggle className={styles.iconBtn} />

            <Link href="/notification" className={styles.iconBtn} aria-label="Notifications">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 3a5 5 0 0 0-5 5v3.2c0 .5-.2 1-.6 1.4L5 14v1h14v-1l-1.4-1.4a2 2 0 0 1-.6-1.4V8a5 5 0 0 0-5-5Z" />
                <path d="M9.5 18a2.5 2.5 0 0 0 5 0" />
              </svg>
              {unreadCount > 0 && <span className={styles.dot} />}
            </Link>
          </div>
        </div>

        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
