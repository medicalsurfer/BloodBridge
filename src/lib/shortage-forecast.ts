import { BLOOD_GROUPS, type BloodGroupValue } from "./blood-compatibility";

/*
  Blood shortage prediction.

  Every number here is arithmetic over the institute's own records. Nothing is
  produced by the language model: a forecast is a claim a laboratory acts on,
  and a model asked to guess one would return a confident figure with nothing
  behind it. The model's only job, in ai-recommendations.ts, is to phrase what
  this file has already worked out.

  The projection is deliberately simple enough to explain to the person
  reading it:

      demand   = units requested over the history window / days in it
      supply   = donations already booked inside the horizon
      drain    = demand - supply, per day
      cover    = units on hand / drain

  Two things it does not do. It does not extrapolate supply from past
  donations, because a booked appointment is a fact and a trend is not. And
  where there is no request history it reports UNKNOWN rather than projecting
  from a demand of zero, which would otherwise read as "stock is fine forever"
  for an institute that simply has not recorded anything yet.
*/

/** How far back demand is measured, before widening. */
export const HISTORY_WINDOW_DAYS = 30;

/*
  When the recent window holds no requests for a group, the search widens
  before giving up. An institute that raises a request every few months still
  has a demand rate — it just is not visible in 30 days — and reporting
  "nothing to go on" for it would waste information the database already has.
*/
export const WIDER_WINDOW_DAYS = [60, 90, 180] as const;

/** How far forward the projection runs. */
export const FORECAST_HORIZON_DAYS = 30;

export type ShortageRisk = "CRITICAL" | "HIGH" | "WATCH" | "STABLE";

/*
  How a group's risk was arrived at. Both are real assessments; they differ in
  what they had to work with, and the screen says which was used.

  - "cover": demand was measured, so the figure is days until stock runs out.
  - "stock-level": no demand on record yet, so the group is judged against the
    stock floors the laboratory works to instead. Still an assessment, just
    not a projection — the one thing this never does is invent a trend.
*/
export type ForecastMethod = "cover" | "stock-level";

/** Stock floors used when there is no demand history to project from. */
export const CRITICAL_UNITS = 5;
export const LOW_UNITS = 10;

export type GroupForecast = {
  bloodGroup: BloodGroupValue;
  unitsOnHand: number;
  /** Units on open requests right now — a fact, not a projection. */
  openDemand: number;
  /** Units requested per day across the history window. */
  dailyDemand: number;
  /** Units already booked to arrive inside the horizon. */
  scheduledUnits: number;
  /** Net units per day: negative means stock is draining. */
  netDailyChange: number;
  /** Days until stock reaches zero at the current rate, or null if it does not. */
  daysOfCover: number | null;
  /** Units projected to remain at the end of the horizon. */
  projectedUnits: number;
  risk: ShortageRisk;
  /** How the risk was arrived at. */
  method: ForecastMethod;
  /** What the assessment was computed from, so the reader can judge it. */
  basis: {
    requestsInWindow: number;
    unitsRequestedInWindow: number;
    donationsInWindow: number;
    /** The window actually used, which widens when the recent one is empty. */
    windowDays: number;
  };
  message: string;
};

export type ForecastInput = {
  inventory: { bloodGroup: BloodGroupValue; units: number }[];
  /** Open requests, whatever their age. */
  openRequests: { bloodGroup: BloodGroupValue; unitsNeeded: number }[];
  /** Requests raised over the widest window, each with the date it was raised. */
  requestHistory: { bloodGroup: BloodGroupValue; unitsNeeded: number; createdAt: Date }[];
  /** Donations recorded over the widest window, with their dates. */
  donationHistory: { bloodGroup: BloodGroupValue; donatedAt: Date }[];
  /** Appointments booked inside the horizon, by the donor's recorded group. */
  scheduled: { bloodGroup: BloodGroupValue | null }[];
  horizonDays?: number;
  /** The clock, for tests. */
  now?: Date;
};

/** Days of cover below which each risk level begins. */
const CRITICAL_DAYS = 7;
const HIGH_DAYS = 14;
const WATCH_DAYS = 30;

function sumBy(rows: { bloodGroup: BloodGroupValue; unitsNeeded?: number }[]) {
  const totals = new Map<BloodGroupValue, number>();

  for (const row of rows) {
    totals.set(row.bloodGroup, (totals.get(row.bloodGroup) ?? 0) + (row.unitsNeeded ?? 1));
  }

  return totals;
}

function round(value: number, places = 2) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function describe(forecast: Omit<GroupForecast, "message">): string {
  const { unitsOnHand, openDemand, daysOfCover, scheduledUnits, method } = forecast;
  const units = `${unitsOnHand} unit${unitsOnHand === 1 ? "" : "s"}`;

  if (method === "stock-level") {
    // An open request that outstrips the shelf is a fact about today, and
    // says so whether or not there is any history behind it.
    if (openDemand > unitsOnHand) {
      const short = openDemand - unitsOnHand;
      return `Open requests already exceed stock by ${short} unit${short === 1 ? "" : "s"}. This is a shortfall now, not a forecast.`;
    }

    // Otherwise the group is judged on the stock floors. Say which it is, and
    // say why the figure is a level rather than a forecast.
    const standing =
      unitsOnHand === 0
        ? "None on the shelf."
        : unitsOnHand < CRITICAL_UNITS
          ? `${units} on hand, below the ${CRITICAL_UNITS}-unit floor.`
          : unitsOnHand < LOW_UNITS
            ? `${units} on hand, under the ${LOW_UNITS}-unit comfortable level.`
            : `${units} on hand.`;

    return `${standing} No requests recorded yet, so this is a stock check rather than a projection.`;
  }

  if (openDemand > unitsOnHand) {
    const short = openDemand - unitsOnHand;
    return `Open requests already exceed stock by ${short} unit${short === 1 ? "" : "s"}. This is a shortfall now, not a forecast.`;
  }

  if (daysOfCover === null) {
    return scheduledUnits > 0
      ? `Booked donations cover the expected demand. ${unitsOnHand} unit${unitsOnHand === 1 ? "" : "s"} on hand, ${scheduledUnits} more booked.`
      : `Demand is within supply at the current rate. ${unitsOnHand} unit${unitsOnHand === 1 ? "" : "s"} on hand.`;
  }

  const days = Math.floor(daysOfCover);
  const booked = scheduledUnits > 0 ? `, counting the ${scheduledUnits} already booked` : "";

  if (days <= 0) {
    return `Stock runs out today at the current rate${booked}.`;
  }

  return `About ${days} day${days === 1 ? "" : "s"} of cover left at the current rate${booked}.`;
}

/** Risk from stock alone, for a group with no demand on record. */
function riskFromStockLevel(unitsOnHand: number, openDemand: number): ShortageRisk {
  if (unitsOnHand === 0) return "CRITICAL";
  if (openDemand > unitsOnHand) return "HIGH";
  if (unitsOnHand < CRITICAL_UNITS) return "HIGH";
  if (unitsOnHand < LOW_UNITS) return "WATCH";
  return "STABLE";
}

/** The assessment for one blood group. */
function forecastGroup(
  bloodGroup: BloodGroupValue,
  input: {
    horizonDays: number;
    windowDays: number;
    unitsOnHand: number;
    openDemand: number;
    unitsRequestedInWindow: number;
    requestsInWindow: number;
    donationsInWindow: number;
    scheduledUnits: number;
  },
): GroupForecast {
  const { windowDays, horizonDays, unitsOnHand, openDemand, scheduledUnits } = input;

  const measured = input.requestsInWindow > 0;
  const dailyDemand = measured ? input.unitsRequestedInWindow / windowDays : 0;
  const dailySupply = scheduledUnits / horizonDays;
  const netDailyChange = dailySupply - dailyDemand;

  const draining = netDailyChange < 0;
  const daysOfCover = draining ? unitsOnHand / -netDailyChange : null;
  const projectedUnits = Math.max(0, unitsOnHand + netDailyChange * horizonDays);

  const method: ForecastMethod = measured ? "cover" : "stock-level";

  let risk: ShortageRisk;

  if (!measured) {
    // No demand to project from, so judge the group on the stock floors the
    // laboratory works to. A real assessment, just not a projection.
    risk = riskFromStockLevel(unitsOnHand, openDemand);
  } else if (unitsOnHand === 0 || (openDemand > 0 && unitsOnHand < openDemand)) {
    // A shortfall that exists right now outranks anything projected.
    risk = unitsOnHand === 0 ? "CRITICAL" : "HIGH";
  } else if (daysOfCover === null) {
    risk = "STABLE";
  } else if (daysOfCover < CRITICAL_DAYS) {
    risk = "CRITICAL";
  } else if (daysOfCover < HIGH_DAYS) {
    risk = "HIGH";
  } else if (daysOfCover < WATCH_DAYS) {
    risk = "WATCH";
  } else {
    risk = "STABLE";
  }

  const withoutMessage: Omit<GroupForecast, "message"> = {
    bloodGroup,
    unitsOnHand,
    openDemand,
    dailyDemand: round(dailyDemand),
    scheduledUnits,
    netDailyChange: round(netDailyChange),
    daysOfCover: daysOfCover === null ? null : round(daysOfCover, 1),
    projectedUnits: Math.round(projectedUnits),
    risk,
    method,
    basis: {
      requestsInWindow: input.requestsInWindow,
      unitsRequestedInWindow: input.unitsRequestedInWindow,
      donationsInWindow: input.donationsInWindow,
      windowDays,
    },
  };

  return { ...withoutMessage, message: describe(withoutMessage) };
}

const RISK_ORDER: ShortageRisk[] = ["CRITICAL", "HIGH", "WATCH", "STABLE"];

/**
 * The narrowest window that holds any request for this group, so a group with
 * sparse but real demand still gets a rate rather than being written off.
 */
function demandWindowFor(
  bloodGroup: BloodGroupValue,
  history: ForecastInput["requestHistory"],
  now: Date,
) {
  const windows = [HISTORY_WINDOW_DAYS, ...WIDER_WINDOW_DAYS];

  for (const windowDays of windows) {
    const since = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
    const rows = history.filter(
      (row) => row.bloodGroup === bloodGroup && row.createdAt >= since,
    );

    if (rows.length > 0) {
      return {
        windowDays,
        requests: rows.length,
        units: rows.reduce((sum, row) => sum + row.unitsNeeded, 0),
      };
    }
  }

  return { windowDays: HISTORY_WINDOW_DAYS, requests: 0, units: 0 };
}

/** Every blood group, most at risk first. */
export function buildShortageForecast(input: ForecastInput): GroupForecast[] {
  const horizonDays = input.horizonDays ?? FORECAST_HORIZON_DAYS;
  const now = input.now ?? new Date();

  const onHand = new Map(input.inventory.map((row) => [row.bloodGroup, row.units]));
  const open = sumBy(input.openRequests);

  const scheduledCounts = new Map<BloodGroupValue, number>();
  for (const row of input.scheduled) {
    // An appointment whose donor has no recorded blood group cannot be
    // counted towards any group's supply.
    if (!row.bloodGroup) continue;
    scheduledCounts.set(row.bloodGroup, (scheduledCounts.get(row.bloodGroup) ?? 0) + 1);
  }

  return BLOOD_GROUPS.map((bloodGroup) => {
    const demand = demandWindowFor(bloodGroup, input.requestHistory, now);
    const since = new Date(now.getTime() - demand.windowDays * 24 * 60 * 60 * 1000);

    const donationsInWindow = input.donationHistory.filter(
      (row) => row.bloodGroup === bloodGroup && row.donatedAt >= since,
    ).length;

    return forecastGroup(bloodGroup, {
      windowDays: demand.windowDays,
      horizonDays,
      unitsOnHand: onHand.get(bloodGroup) ?? 0,
      openDemand: open.get(bloodGroup) ?? 0,
      unitsRequestedInWindow: demand.units,
      requestsInWindow: demand.requests,
      donationsInWindow,
      scheduledUnits: scheduledCounts.get(bloodGroup) ?? 0,
    });
  }).sort((a, b) => {
    const byRisk = RISK_ORDER.indexOf(a.risk) - RISK_ORDER.indexOf(b.risk);
    if (byRisk !== 0) return byRisk;

    // Within a risk band, the group that runs out soonest comes first.
    const aCover = a.daysOfCover ?? Number.POSITIVE_INFINITY;
    const bCover = b.daysOfCover ?? Number.POSITIVE_INFINITY;
    return aCover - bCover;
  });
}

/** The date stock is projected to run out, or null when it is not. */
export function shortfallDate(forecast: GroupForecast, from = new Date()): Date | null {
  if (forecast.daysOfCover === null) return null;

  const date = new Date(from);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + Math.floor(forecast.daysOfCover));

  return date;
}

/** The groups a laboratory should act on, worst first. */
export function groupsNeedingAction(forecast: GroupForecast[]) {
  return forecast.filter(
    (group) => group.risk === "CRITICAL" || group.risk === "HIGH" || group.risk === "WATCH",
  );
}
