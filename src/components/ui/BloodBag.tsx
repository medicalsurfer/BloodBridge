/*
  A blood bag that fills.

  The object a laboratory handles all day, used as the unit of measure: how
  full the bag is, is how much of that group is on the shelf. It is a dumb
  drawing — the caller decides the colour, because the workspace judges a
  group on stock alone while the forecast page also weighs demand, and a
  component should not quietly hold one of those policies.

  One scale across every bag in a view: `fullMark` is the top of all of them,
  so two bags side by side can be compared by eye.
*/

export type StockLevel = "empty" | "critical" | "low" | "healthy";

/** The floors the laboratory works to, shared by every stock read-out. */
export const CRITICAL_UNITS = 5;
export const LOW_UNITS = 10;

export function stockLevel(units: number): StockLevel {
  if (units === 0) return "empty";
  if (units < CRITICAL_UNITS) return "critical";
  if (units < LOW_UNITS) return "low";
  return "healthy";
}

/*
  Status colours from the design system's own tokens, so they follow light and
  dark. `mark` fills the bag; `ink` is for text, which needs the darker step
  to stay legible on a white card.
*/
export const STOCK_STYLES = {
  empty: { mark: "var(--color-crimson)", ink: "text-red-800", word: "Empty" },
  critical: { mark: "var(--color-crimson)", ink: "text-red-800", word: "Critical" },
  low: { mark: "var(--bb-high)", ink: "text-orange-800", word: "Running low" },
  healthy: { mark: "var(--bb-success)", ink: "text-emerald-800", word: "Healthy" },
} as const satisfies Record<StockLevel, { mark: string; ink: string; word: string }>;

export function BloodBag({
  units,
  fullMark,
  color,
  label,
  className = "h-16 w-11",
}: {
  units: number;
  /** The number of units that fills a bag to the top. */
  fullMark: number;
  color: string;
  /** Distinguishes this bag's clip path from the others on the page. */
  label: string;
  className?: string;
}) {
  const ratio = fullMark > 0 ? Math.min(1, Math.max(0, units / fullMark)) : 0;

  // The body of the bag runs between these two lines in the viewBox.
  const top = 14;
  const bottom = 60;
  const level = bottom - (bottom - top) * ratio;
  const clipId = `bag-clip-${label}`;

  const body =
    "M8 14 h28 a4 4 0 0 1 4 4 v38 a4 4 0 0 1 -4 4 h-28 a4 4 0 0 1 -4 -4 v-38 a4 4 0 0 1 4 -4 z";

  return (
    <svg viewBox="0 0 44 64" className={`${className} shrink-0`} aria-hidden>
      <defs>
        <clipPath id={clipId}>
          <path d={body} />
        </clipPath>
      </defs>

      {/* the port at the top */}
      <rect x="18" y="3" width="8" height="8" rx="2" fill="currentColor" opacity="0.28" />

      {/* what is in the bag */}
      <g clipPath={`url(#${clipId})`}>
        <rect x="4" y="14" width="36" height="46" fill="currentColor" opacity="0.09" />
        {units > 0 && (
          <rect x="4" y={level} width="36" height={bottom - level} fill={color} />
        )}
      </g>

      <path d={body} fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
    </svg>
  );
}
