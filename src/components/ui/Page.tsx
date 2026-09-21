// Shared page furniture for BloodBridge.
//
// The design language, in one place so every screen inherits it rather than
// re-deriving it: quiet uppercase labels, a large tight-tracked title, flat
// panels with hairline borders and no shadow, and tabular figures wherever
// numbers sit in a column. Presentational only — safe in server components.

import Link from "next/link";
import type { ReactNode } from "react";

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
      className="flex flex-col gap-5 border-b border-slate-200 pb-7 sm:flex-row sm:items-end sm:justify-between"
      style={{ animation: "var(--animate-rise)" }}
    >
      <div className="min-w-0">
        <RuledEyebrow>{eyebrow}</RuledEyebrow>

        <h1 className="mt-3 text-[34px] font-semibold leading-[1.1] tracking-[-0.022em] text-slate-950">
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
      className={`scroll-mt-6 rounded-2xl border border-slate-200 bg-white ${padded ? "p-6" : ""} ${className}`}
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

// Dividers come from a 1px grid gap over a slate background, so the row reads
// as one instrument instead of four separate floating tiles.
export function StatGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  foot,
  tone = "default",
}: {
  label: string;
  value: string;
  foot?: string;
  tone?: "default" | "good" | "warn" | "critical";
}) {
  const toneClass =
    tone === "good"
      ? "text-emerald-700"
      : tone === "warn"
        ? "text-amber-700"
        : tone === "critical"
          ? "text-garnet"
          : "text-slate-950";

  // The tone rail restates state as position and colour, so a critical figure
  // is legible in a glance down the row — not only by reading the number.
  const railClass =
    tone === "good"
      ? "bg-emerald-500"
      : tone === "warn"
        ? "bg-ember"
        : tone === "critical"
          ? "bg-gradient-to-b from-crimson to-garnet"
          : "bg-transparent";

  return (
    <div className="group relative bg-white px-5 py-5 transition-colors duration-300 hover:bg-slate-50">
      <span aria-hidden className={`absolute inset-y-0 left-0 w-0.5 ${railClass}`} />

      <Eyebrow>{label}</Eyebrow>

      <p
        className={`mt-3 text-[28px] font-semibold leading-none tracking-[-0.025em] tabular-nums ${toneClass}`}
      >
        {value}
      </p>

      {foot && <p className="mt-2.5 truncate text-xs text-slate-500">{foot}</p>}
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
