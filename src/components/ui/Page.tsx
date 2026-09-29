// Shared page furniture for BloodBridge.
//
// The design language, in one place so every screen inherits it rather than
// re-deriving it: quiet uppercase labels, a large tight-tracked title, flat
// panels with hairline borders and no shadow, and tabular figures wherever
// numbers sit in a column. Presentational only — safe in server components.

import Link from "next/link";
import type { ReactNode } from "react";
import { CountUp } from "./CountUp";

/* ── Labels ─────────────────────────────────────────────────────────── */

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-slate-500">
      {children}
    </p>
  );
}

// The rule-and-label eyebrow from the landing page, reused wherever a screen
// announces itself — so marketing and product share one opening gesture.
export function RuledEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="inline-flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-garnet">
      <span aria-hidden className="h-px w-5 bg-gradient-to-r from-garnet to-transparent" />
      {children}
    </p>
  );
}

/* ── Page header ────────────────────────────────────────────────────── */

/*
  The heading speaks for itself. The small ruled label that used to sit above
  every title repeated what the top bar already says, and a kicker over every
  heading is the most recognisable template habit there is. `eyebrow` is kept
  as the header's accessible name so no caller has to change.
*/
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header
      aria-label={eyebrow}
      className="flex flex-col gap-5 pb-2 sm:flex-row sm:items-end sm:justify-between"
      style={{ animation: "var(--animate-rise)" }}
    >
      <div className="min-w-0">
        <h1 className="text-[40px] font-semibold leading-[1.05] tracking-[-0.028em] text-slate-950">
          {title}
        </h1>

        {description && (
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
        )}
      </div>

      {actions && <div className="flex flex-wrap gap-2.5">{actions}</div>}
    </header>
  );
}

/* ── Buttons ────────────────────────────────────────────────────────── */

const buttonBase =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-[13px] font-semibold transition duration-300";

export function PrimaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={`${buttonBase} bg-gradient-to-br from-crimson via-garnet to-garnet-deep text-white shadow-sm shadow-garnet/20 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-garnet/25`}
    >
      {children}
    </Link>
  );
}

export function SecondaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={`${buttonBase} border border-slate-300 text-slate-700 hover:-translate-y-0.5 hover:border-garnet/30 hover:text-garnet`}
    >
      {children}
    </Link>
  );
}

/* ── Panel ──────────────────────────────────────────────────────────── */

export function Panel({
  label,
  action,
  children,
  className = "",
  padded = true,
  id,
}: {
  label?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
  // Set when a sidebar link needs to scroll to this panel.
  id?: string;
}) {
  return (
    <section
      id={id}
      // Scrolled-to panels would otherwise sit flush under the sticky top bar.
      className={`bb-spot relative scroll-mt-6 rounded-2xl border border-slate-200 bg-white shadow-[var(--bb-card-shadow)] ${padded ? "p-6" : ""} ${className}`}
    >
      {(label || action) && (
        <div className={`flex items-center justify-between gap-3 ${padded ? "" : "px-6 pt-6"}`}>
          {label ? <Eyebrow>{label}</Eyebrow> : <span />}
          {action}
        </div>
      )}

      {children}
    </section>
  );
}

/* ── Stat grid ──────────────────────────────────────────────────────── */

// Each figure gets its own tile and its own colour from the brand family
// (see .bb-tiles in globals.css), so a row reads as distinct facts.
export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="bb-tiles grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">{children}</div>;
}

export function Stat({
  label,
  value,
  foot,
  tone = "default",
  href,
}: {
  label: string;
  value: string;
  foot?: string;
  tone?: "default" | "good" | "warn" | "critical";
  /** Makes the tile a link to the page where this figure is managed. */
  href?: string;
}) {
  // A tone recolours the whole tile (see .bb-tile in globals.css), so state
  // shows as colour, as a word in the value, and as the label's dot.
  const body = (
    <>
      <p className="flex items-center gap-2 text-[12px] font-semibold text-slate-600">
        <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: "var(--tile-dot)" }} />
        {label}
      </p>

      <p
        className="mt-3.5 font-display text-[32px] font-semibold leading-none tracking-[-0.025em] tabular-nums"
        style={{ color: "var(--tile-ink)" }}
      >
        <CountUp value={value} />
      </p>

      {foot && <p className="mt-2.5 truncate text-xs text-slate-500">{foot}</p>}

      {href && (
        <span
          aria-hidden
          className="absolute right-4 top-4 flex h-7 w-7 -translate-x-1 items-center justify-center rounded-full opacity-0 transition duration-300 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100"
          style={{ background: "color-mix(in oklch, var(--tile-dot) 16%, transparent)", color: "var(--tile-ink)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      )}
    </>
  );

  const className = "bb-tile group relative overflow-hidden rounded-2xl px-5 pb-5 pt-4";
  const toneAttr = tone === "default" ? undefined : tone;

  return href ? (
    <Link href={href} className={`${className} block`} data-tone={toneAttr}>
      {body}
    </Link>
  ) : (
    <div className={className} data-tone={toneAttr}>
      {body}
    </div>
  );
}

/* ── Status pill ────────────────────────────────────────────────────── */

export type PillTone = "neutral" | "good" | "warn" | "critical" | "brand";

const pillTones: Record<PillTone, string> = {
  neutral: "bg-slate-100 text-slate-600",
  good: "bg-emerald-50 text-emerald-700",
  warn: "bg-ember/12 text-amber-800",
  critical: "bg-garnet/8 text-garnet",
  brand: "bg-gradient-to-br from-crimson to-garnet-deep text-white",
};

export function Pill({ tone = "neutral", children }: { tone?: PillTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold ${pillTones[tone]}`}
    >
      {children}
    </span>
  );
}

/* ── Rows & empty state ─────────────────────────────────────────────── */

export function Row({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-6 py-4 last:border-b-0">
      {children}
    </div>
  );
}

export function RowTitle({ children }: { children: ReactNode }) {
  return <p className="text-[13.5px] font-semibold text-slate-900">{children}</p>;
}

export function RowMeta({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-xs text-slate-500">{children}</p>;
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 px-5 py-10 text-center">
      <p className="text-sm font-semibold text-slate-700">{title}</p>

      {description && (
        <p className="mx-auto mt-1.5 max-w-sm text-xs leading-5 text-slate-500">{description}</p>
      )}

      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
