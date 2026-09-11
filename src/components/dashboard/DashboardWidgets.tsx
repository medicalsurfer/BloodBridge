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
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold text-slate-500">{label}</p>

        {icon && (
          <div
            style={{ color: accent }}
            className="flex h-7 w-7 shrink-0 items-center justify-center"
          >
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <p className="text-2xl font-bold text-slate-950">{value}</p>

        {delta && (
          <span
            className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-bold ${
              trend === "up"
                ? "bg-emerald-50 text-emerald-700"
                : trend === "down"
                  ? "bg-red-50 text-red-700"
                  : "bg-slate-100 text-slate-500"
            }`}
          >
            {trend === "up" ? "▲" : trend === "down" ? "▼" : ""} {delta}
          </span>
        )}
      </div>
    </div>
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

  const linePath = coordinates
    .map((coordinate, index) => `${index === 0 ? "M" : "L"}${coordinate.x},${coordinate.y}`)
    .join(" ");

  const areaPath = `${linePath} L${coordinates[coordinates.length - 1].x},${paddingTop + innerHeight} L${coordinates[0].x},${paddingTop + innerHeight} Z`;

  const last = coordinates[coordinates.length - 1];
  const gradientId = `trend-gradient-${color.replace(/[^a-zA-Z0-9]/g, "")}`;

  // Show at most ~6 x-axis labels so long ranges stay legible.
  const labelStride = Math.max(1, Math.ceil(data.length / 6));

  return (
    <div style={{ height }} className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-full w-full"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />

        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <circle cx={last.x} cy={last.y} r="4.5" fill={color} />
        <circle cx={last.x} cy={last.y} r="8" fill={color} opacity="0.18" />

        {coordinates.map((coordinate, index) =>
          index % labelStride === 0 || index === coordinates.length - 1 ? (
            <text
              key={index}
              x={coordinate.x}
              y={height - 8}
              textAnchor={
                index === 0
                  ? "start"
                  : index === coordinates.length - 1
                    ? "end"
                    : "middle"
              }
              className="fill-slate-400"
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
          const heightPercent = Math.max(
            6,
            Math.round((point.value / maxValue) * 100),
          );
          const isMax = index === maxIndex && point.value > 0;

          return (
            <div key={point.label} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-24 w-full items-end">
                <div
                  style={{
                    height: `${heightPercent}%`,
                    backgroundColor: isMax ? color : undefined,
                  }}
                  className={`w-full rounded-md ${isMax ? "" : "bg-slate-150 bg-slate-200"}`}
                />
              </div>

              <p
                className={`text-[11px] font-semibold ${
                  isMax ? "text-slate-900" : "text-slate-400"
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

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-36 w-36">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="currentColor"
            className="text-slate-100"
            strokeWidth="10"
          />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl font-bold text-slate-950">{clamped}%</p>
        </div>
      </div>

      <p className="mt-3 text-center text-xs font-bold text-slate-700">{label}</p>

      {sublabel && (
        <p className="mt-1 text-center text-[11px] text-slate-400">{sublabel}</p>
      )}
    </div>
  );
}

// Horizontal stacked bar + legend, styled after the "Customers" breakdown
// (Retailers / Distributors / Wholesalers).
export function BreakdownBar({ segments }: { segments: BreakdownSegment[] }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  return (
    <div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        {total > 0 &&
          segments.map((segment) => (
            <div
              key={segment.label}
              style={{
                width: `${(segment.value / total) * 100}%`,
                backgroundColor: segment.color,
              }}
            />
          ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
        {segments.map((segment) => (
          <div key={segment.label} className="flex items-center gap-2">
            <span
              style={{ backgroundColor: segment.color }}
              className="h-2.5 w-2.5 shrink-0 rounded-full"
            />

            <div>
              <p className="text-sm font-bold text-slate-900">{segment.value}</p>
              <p className="text-[11px] text-slate-400">{segment.label}</p>
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
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
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
