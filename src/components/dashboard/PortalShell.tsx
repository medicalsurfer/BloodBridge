"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, type ReactNode } from "react";
import styles from "./DonorSidebarShell.module.css";
import { ThemeToggle } from "@/src/components/ThemeToggle";

// The staff portals each grew their own header + fixed-width sidebar, which is
// why they squeezed on narrow screens while the donor area did not. They now
// share the donor shell's markup and stylesheet, so there is one set of shell
// behaviours (drawer, escape-to-close, non-scrolling frame) to maintain.

export type PortalNavLink = {
  href: string;
  label: string;
  icon: ReactNode;
};

export type PortalNavGroup = {
  label: string;
  links: PortalNavLink[];
};

export function PortalShell({
  brandHref,
  title,
  subtitle,
  navGroups,
  activeHref,
  accountName,
  accountRole,
  accountHref = "/account",
  onNavigate,
  actions,
  children,
}: {
  brandHref: string;
  title: string;
  subtitle?: string;
  navGroups: PortalNavGroup[];
  // Pages that switch sections in local state pass this explicitly; routed
  // sections leave it off and the current path decides.
  activeHref?: string;
  accountName: string;
  accountRole: string;
  // Where the name/avatar at the bottom of the sidebar leads.
  accountHref?: string;
  // Called for "#section" links, so a single-page portal can switch section
  // instead of the browser just jumping to an anchor.
  onNavigate?: (href: string) => void;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  function isActive(href: string) {
    if (activeHref !== undefined) return activeHref === href;
    if (href.startsWith("#")) return false;
    if (href === brandHref) return pathname === href;

    return pathname === href || pathname.startsWith(href + "/");
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const initials =
    accountName
      .split(" ")
      .map((part) => part[0] ?? "")
      .join("")
      .slice(0, 2)
      .toUpperCase() || "BB";

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
        <Link href={brandHref} className={styles.brand} onClick={() => setMenuOpen(false)}>
          <div className={styles.brandMark}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
            >
              <path d="M12 3.5c2.8 3.8 7 8.9 7 12.5a7 7 0 1 1-14 0c0-3.6 4.2-8.7 7-12.5Z" />
            </svg>
          </div>
          <span className={styles.brandName}>BloodBridge</span>
        </Link>

        <nav className={styles.navScroll}>
          {navGroups.map((group) => (
            <div key={group.label} className={styles.navGroup}>
              <div className={styles.navLabel}>{group.label}</div>

              <ul className={styles.navList}>
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={(event) => {
                        setMenuOpen(false);

                        if (link.href.startsWith("#") && onNavigate) {
                          event.preventDefault();
                          onNavigate(link.href);
                          window.history.replaceState(null, "", link.href);
                        }
                      }}
                      className={`${styles.navItem} ${
                        isActive(link.href) ? styles.navItemActive : ""
                      }`}
                    >
                      {link.icon}
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className={styles.account}>
          <Link
            href={accountHref}
            className={styles.accountLink}
            title="Account settings"
            onClick={() => setMenuOpen(false)}
          >
            <div className={styles.avatar}>{initials}</div>

            <div className={styles.accountText}>
              <div className={styles.accountName}>{accountName}</div>
              <div className={styles.accountRole}>{accountRole} · Settings</div>
            </div>
          </Link>

          <Link href="/api/logout" className={styles.signOut} title="Sign out">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
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
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
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
            {actions}
          </div>
        </div>

        <div className={styles.content} data-portal-content>
          {children}
        </div>
      </div>
    </div>
  );
}
