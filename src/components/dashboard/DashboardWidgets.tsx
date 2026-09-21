// Shared, dependency-free dashboard building blocks (KPI cards, trend chart,
// weekday bar chart, radial gauge, breakdown bar). No charting library is
// installed in this project, so every visual here is hand-rolled inline SVG.
// Pure/presentational (no hooks, no "use client") so it can be used from
// both server components (e.g. the system admin dashboard) and client
// components (the other portal dashboards) alike.

export type TrendPoint = {
  label: string;
  value: number;
};

export type BarPoint = {
  label: string;
  value: number;
};

export type BreakdownSegment = {
  label: string;
  value: number;
  color: string;
};

export function KpiCard({
  label,
  value,
  delta,
  trend = "flat",
  icon,
  accent = "oklch(27.1% 0.105 12.094)",
}: {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down" | "flat";
  icon?: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-slate-500">
          {label}
        </p>

        {icon && (
          <div
            style={{ color: accent }}
            className="flex h-5 w-5 shrink-0 items-center justify-center opacity-70"
          >
            {icon}
          </div>
        )}
      </div>

      {/* tabular-nums so figures line up column-to-column across a KPI row */}
      <p className="mt-3 text-[28px] font-bold leading-none tracking-[-0.02em] text-slate-950 tabular-nums">
        {value}
      </p>

      {delta && (
        <p
          className={`mt-2.5 inline-flex items-center gap-1 text-[11.5px] font-semibold ${
            trend === "up"
              ? "text-emerald-700"
              : trend === "down"
                ? "text-red-800"
                : "text-slate-500"
          }`}
        >
          {trend !== "flat" && <TrendArrow direction={trend} />}
          {delta}
        </p>
      )}
    </div>
  );
}

// Stroke-based arrow. Replaces the ▲/▼ dingbat glyphs, which render
// inconsistently across platforms and read as emoji-as-icon.
function TrendArrow({ direction }: { direction: "up" | "down" }) {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      {direction === "up" ? (
        <path d="M12 19V5M5 12l7-7 7 7" />
      ) : (
        <path d="M12 5v14M5 12l7 7 7-7" />
      )}
    </svg>
  );
}

// Area + line trend chart, styled after the "Total Profit" chart: a soft
// gradient fill under a line, with the latest point called out.
export function TrendAreaChart({
  data,
  color = "oklch(27.1% 0.105 12.094)",
  height = 180,
  valueFormatter = (value: number) => value.toString(),
  emptyLabel = "No data yet for this period.",
}: {
  data: TrendPoint[];
  color?: string;
  height?: number;
  valueFormatter?: (value: number) => string;
  emptyLabel?: string;
}) {
  const width = 600;
  const paddingX = 8;
  const paddingTop = 16;
  const paddingBottom = 28;

  if (data.length === 0 || data.every((point) => point.value === 0)) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center rounded-2xl bg-slate-50 text-xs font-semibold text-slate-400"
      >
        {emptyLabel}
      </div>
    );
  }

  const maxValue = Math.max(...data.map((point) => point.value), 1);
  const innerHeight = height - paddingTop - paddingBottom;
  const innerWidth = width - paddingX * 2;
  const stepX = data.length > 1 ? innerWidth / (data.length - 1) : 0;

  const coordinates = data.map((point, index) => {
    const x = paddingX + stepX * index;
    const y =
      paddingTop + innerHeight - (point.value / maxValue) * innerHeight;
    return { x, y, point };
  });

  // A smoothed curve rather than a polyline. Catmull-Rom converted to cubic
  // béziers, with the tangent scaled down to 1/6 so the curve cannot
  // overshoot into implying values the data never reached.
  const linePath = coordinates
    .map((coordinate, index) => {
      if (index === 0) return `M${coordinate.x},${coordinate.y}`;

      const previous = coordinates[index - 1];
      const beforePrevious = coordinates[index - 2] ?? previous;
      const next = coordinates[index + 1] ?? coordinate;

      const c1x = previous.x + (coordinate.x - beforePrevious.x) / 6;
      const c1y = previous.y + (coordinate.y - beforePrevious.y) / 6;
      const c2x = coordinate.x - (next.x - previous.x) / 6;
      const c2y = coordinate.y - (next.y - previous.y) / 6;

      return `C${c1x},${c1y} ${c2x},${c2y} ${coordinate.x},${coordinate.y}`;
    })
    .join(" ");

  const baseline = paddingTop + innerHeight;
  const areaPath = `${linePath} L${coordinates[coordinates.length - 1].x},${baseline} L${coordinates[0].x},${baseline} Z`;

  const last = coordinates[coordinates.length - 1];
  const key = color.replace(/[^a-zA-Z0-9]/g, "");
  const areaId = `trend-area-${key}`;
  const strokeId = `trend-stroke-${key}`;

  // Show at most ~6 x-axis labels so long ranges stay legible.
  const labelStride = Math.max(1, Math.ceil(data.length / 6));

  // Rough path length, used to seed the draw-in animation's dash offset.
  const pathLength = Math.round(innerWidth * 1.35);

  return (
    <div style={{ height }} className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" preserveAspectRatio="none">
        <defs>
          {/* Warm at the peak, cooling toward the baseline. */}
          <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-rose)" stopOpacity="0.3" />
            <stop offset="45%" stopColor={color} stopOpacity="0.16" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>

          {/* The stroke travels across the accent family left to right, so the
              line carries the brand rather than one flat colour. */}
          <linearGradient id={strokeId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--color-plum)" />
            <stop offset="55%" stopColor={color} />
            <stop offset="100%" stopColor="var(--color-crimson)" />
          </linearGradient>
        </defs>

        {/* Three reference lines, enough to read height without ruling the card. */}
        {[0.25, 0.5, 0.75].map((fraction) => (
          <line
            key={fraction}
            x1={paddingX}
            x2={width - paddingX}
            y1={paddingTop + innerHeight * fraction}
            y2={paddingTop + innerHeight * fraction}
            stroke="currentColor"
            className="text-slate-200"
            strokeWidth="1"
            strokeDasharray="3 6"
          />
        ))}

        <path
          d={areaPath}
          fill={`url(#${areaId})`}
          stroke="none"
          style={{ animation: "var(--animate-fade)", animationDelay: "500ms" }}
        />

        <path
          d={linePath}
          fill="none"
          stroke={`url(#${strokeId})`}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={pathLength}
          style={
            {
              "--dash": pathLength,
              animation: "var(--animate-draw-line)",
            } as React.CSSProperties
          }
        />

        {/* A dot per reading, so the eye can find the actual samples. Each
            carries a native tooltip, which is what makes the series readable
            without a JS hover layer. */}
        {coordinates.map((coordinate, index) => (
          <circle
            key={`dot-${index}`}
            cx={coordinate.x}
            cy={coordinate.y}
            r="2.5"
            fill="white"
            stroke={color}
            strokeWidth="1.5"
            style={{
              animation: "var(--animate-fade)",
              animationDelay: `${700 + index * 25}ms`,
            }}
          >
            <title>
              {coordinate.point.label}: {valueFormatter(coordinate.point.value)}
            </title>
          </circle>
        ))}

        {/* The live edge of the series. */}
        <circle
          cx={last.x}
          cy={last.y}
          r="6"
          fill="var(--color-rose)"
          opacity="0.35"
          style={{
            animation: "var(--animate-beacon)",
            transformOrigin: `${last.x}px ${last.y}px`,
          }}
        />
        <circle
          cx={last.x}
          cy={last.y}
          r="4.5"
          fill={color}
          stroke="white"
          strokeWidth="2"
          style={{ animation: "var(--animate-fade)", animationDelay: "1.1s" }}
        />

        {coordinates.map((coordinate, index) =>
          index % labelStride === 0 || index === coordinates.length - 1 ? (
            <text
              key={index}
              x={coordinate.x}
              y={height - 8}
              textAnchor={
                index === 0 ? "start" : index === coordinates.length - 1 ? "end" : "middle"
              }
              className="fill-slate-500"
              style={{ fontSize: 10, fontWeight: 600 }}
            >
              {coordinate.point.label}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}

// Vertical bar chart styled after "Most Day Active" — the tallest bar is
// called out in the accent color, the rest stay neutral.
export function WeekdayBarChart({
  data,
  color = "oklch(27.1% 0.105 12.094)",
}: {
  data: BarPoint[];
  color?: string;
}) {
  const maxValue = Math.max(...data.map((point) => point.value), 1);
  const maxIndex = data.reduce(
    (bestIndex, point, index) =>
      point.value > data[bestIndex].value ? index : bestIndex,
    0,
  );

  return (
    <div>
      {data.length > 0 && (
        <p className="text-2xl font-bold text-slate-950">
          {data[maxIndex].value}
        </p>
      )}

      <div className="mt-4 flex h-28 items-end justify-between gap-2">
        {data.map((point, index) => {
          const heightPercent = Math.max(6, Math.round((point.value / maxValue) * 100));
          const isMax = index === maxIndex && point.value > 0;

          return (
            <div key={point.label} className="group flex flex-1 flex-col items-center gap-2">
              <div className="flex h-24 w-full items-end">
                <div
                  title={`${point.label}: ${point.value}`}
                  style={{
                    height: `${heightPercent}%`,
                    // The busiest day is drawn in the caller's accent, shading
                    // upward from a deepened form of it, so the chart follows
                    // whatever colour the portal passes rather than hardcoding
                    // the brand garnet here.
                    backgroundImage: isMax
                      ? `linear-gradient(to top, color-mix(in oklab, ${color} 72%, black), ${color} 55%, color-mix(in oklab, ${color} 62%, white))`
                      : undefined,
                    // Bars rise in sequence, left to right, so the week reads
                    // as a progression rather than appearing all at once.
                    animation: "var(--animate-grow-bar)",
                    animationDelay: `${index * 70}ms`,
                    transformOrigin: "bottom",
                  }}
                  className={`w-full rounded-t-md transition-opacity duration-300 group-hover:opacity-80 ${
                    isMax ? "shadow-sm shadow-garnet/30" : "bg-gradient-to-t from-slate-200 to-slate-100"
                  }`}
                />
              </div>

              <p
                className={`text-[11px] font-semibold tabular-nums ${
                  isMax ? "text-garnet" : "text-slate-500"
                }`}
              >
                {point.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Circular progress gauge styled after "Repeat Customer Rate".
export function RadialGauge({
  percent,
  label,
  sublabel,
  color = "oklch(27.1% 0.105 12.094)",
}: {
  percent: number;
  label: string;
  sublabel?: string;
  color?: string;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  const arcId = `gauge-arc-${color.replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-36 w-36">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <defs>
            <linearGradient id={arcId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--color-crimson)" />
              <stop offset="60%" stopColor={color} />
              <stop offset="100%" stopColor="var(--color-plum)" />
            </linearGradient>
          </defs>

          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="currentColor"
            className="text-slate-150 text-slate-200"
            strokeWidth="10"
          />

          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={`url(#${arcId})`}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            // The arc sweeps to its value rather than appearing at it.
            style={
              {
                "--circumference": circumference,
                "--offset": offset,
                animation: "var(--animate-sweep)",
              } as React.CSSProperties
            }
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-[26px] font-semibold tracking-[-0.02em] tabular-nums text-slate-950">
            {clamped}%
          </p>
        </div>
      </div>

      <p className="mt-3 text-center text-xs font-semibold text-slate-800">{label}</p>

      {sublabel && <p className="mt-1 text-center text-[11px] text-slate-500">{sublabel}</p>}
    </div>
  );
}

// Horizontal stacked bar + legend, styled after the "Customers" breakdown
// (Retailers / Distributors / Wholesalers).
export function BreakdownBar({ segments }: { segments: BreakdownSegment[] }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  return (
    <div>
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-slate-100">
        {total > 0 &&
          segments.map((segment, index) => (
            <div
              key={segment.label}
              title={`${segment.label}: ${segment.value}`}
              style={{
                width: `${(segment.value / total) * 100}%`,
                // A vertical sheen turns a flat block into something with
                // material, which reads better at only 12px tall.
                backgroundImage: `linear-gradient(to bottom, color-mix(in oklab, ${segment.color} 78%, white), ${segment.color})`,
                animation: "var(--animate-expand)",
                animationDelay: `${index * 80}ms`,
                transformOrigin: "left",
              }}
              className="first:rounded-l-full last:rounded-r-full"
            />
          ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
        {segments.map((segment, index) => (
          <div
            key={segment.label}
            className="flex items-center gap-2"
            style={{
              animation: "var(--animate-rise)",
              animationDelay: `${150 + index * 60}ms`,
            }}
          >
            <span
              style={{ backgroundColor: segment.color }}
              className="h-2.5 w-2.5 shrink-0 rounded-full"
            />

            <div>
              <p className="text-sm font-semibold tabular-nums text-slate-900">{segment.value}</p>
              <p className="text-[11px] text-slate-500">{segment.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export type ActivityItem = {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  badgeClassName: string;
  icon: React.ReactNode;
};

// Icon-bubble list styled to match the KPI/breakdown cards — used for audit
// log style feeds ("who did what, when").
export function ActivityFeed({
  items,
  emptyLabel = "No recent activity.",
}: {
  items: ActivityItem[];
  emptyLabel?: string;
}) {
  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-xs font-semibold text-slate-400">
        {emptyLabel}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-slate-100">
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.badgeClassName}`}
          >
            {item.icon}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-slate-900">
              {item.title}
            </p>

            <p className="mt-0.5 truncate text-xs text-slate-500">
              {item.subtitle}
            </p>
          </div>

          <span className="shrink-0 pt-0.5 text-[11px] font-semibold text-slate-400">
            {item.time}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function DashboardCard({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}
    >
      {title && (
        <div className="mb-5 flex items-center justify-between gap-3">
          {/* Same label treatment as KpiCard so the dashboard reads as one system */}
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-slate-500">
            {title}
          </p>

          {action}
        </div>
      )}

      {children}
    </section>
  );
}

// Buckets a list of ISO-ish date strings into counts-per-day over the last
// `days` days (oldest first), for feeding TrendAreaChart. Dates outside the
// window are ignored.
export function bucketByDay(
  dates: (string | Date)[],
  days: number,
): TrendPoint[] {
  const buckets: TrendPoint[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const counts = new Map<string, number>();

  for (const raw of dates) {
    const date = new Date(raw);
    date.setHours(0, 0, 0, 0);
    const key = date.toISOString().split("T")[0];
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(date.getDate() - offset);
    const key = date.toISOString().split("T")[0];

    buckets.push({
      label: date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
      value: counts.get(key) ?? 0,
    });
  }

  return buckets;
}

// "2h ago" / "3d ago" style relative timestamps for activity feeds.
export function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.round(diffMs / 60000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

export function weekdayCounts(dates: (string | Date)[]): BarPoint[] {
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const counts = new Array(7).fill(0);

  for (const raw of dates) {
    const date = new Date(raw);
    counts[date.getDay()] += 1;
  }

  return labels.map((label, index) => ({ label, value: counts[index] }));
}
