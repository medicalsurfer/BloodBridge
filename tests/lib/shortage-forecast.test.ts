import {
  FORECAST_HORIZON_DAYS,
  HISTORY_WINDOW_DAYS,
  buildShortageForecast,
  groupsNeedingAction,
  shortfallDate,
  type ForecastInput,
  type GroupForecast,
} from "@/src/lib/shortage-forecast";
import { BLOOD_GROUPS, type BloodGroupValue } from "@/src/lib/blood-compatibility";

/*
  Blood shortage prediction.

  These are the numbers a laboratory decides staffing and outreach on, so the
  arithmetic is pinned down rather than sampled: each risk band is tested at
  its boundary, and the cases where there is nothing to project from are
  tested hardest — a forecast that quietly reports "stable" for an institute
  with no data would be worse than no forecast at all.
*/

function input(overrides: Partial<ForecastInput> = {}): ForecastInput {
  return {
    inventory: [],
    openRequests: [],
    requestHistory: [],
    donationHistory: [],
    scheduled: [],
    ...overrides,
  };
}

/** `count` requests for `units` each, all of one group, `daysAgo` old. */
function requests(bloodGroup: BloodGroupValue, count: number, units = 1, daysAgo = 1) {
  const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  return Array.from({ length: count }, () => ({ bloodGroup, unitsNeeded: units, createdAt }));
}

function appointments(bloodGroup: BloodGroupValue | null, count: number) {
  return Array.from({ length: count }, () => ({ bloodGroup }));
}

/** The forecast for one group out of a full run. */
function forGroup(result: GroupForecast[], bloodGroup: BloodGroupValue) {
  const found = result.find((row) => row.bloodGroup === bloodGroup);
  if (!found) throw new Error(`no forecast produced for ${bloodGroup}`);
  return found;
}

describe("buildShortageForecast", () => {
  it("reports every blood group, whether or not it has stock", () => {
    const result = buildShortageForecast(input());

    expect(result).toHaveLength(BLOOD_GROUPS.length);
    expect(result.map((row) => row.bloodGroup).sort()).toEqual([...BLOOD_GROUPS].sort());
  });

  describe("when a group has no demand on record", () => {
    /*
      Every group still gets a real assessment — judged against the stock
      floors instead of a trend. What it must never do is invent a demand rate
      to fill the gap, so the method is reported alongside the risk.
    */
    it.each([
      [0, "CRITICAL"],
      [3, "HIGH"],
      [4, "HIGH"],
      [5, "WATCH"],
      [9, "WATCH"],
      [10, "STABLE"],
      [40, "STABLE"],
    ])("judges %i units on hand as %s", (units, expected) => {
      const result = forGroup(
        buildShortageForecast(input({ inventory: [{ bloodGroup: "O_POSITIVE", units }] })),
        "O_POSITIVE",
      );

      expect(result.risk).toBe(expected);
      expect(result.method).toBe("stock-level");
    });

    it("says it is a stock check, not a projection", () => {
      const result = forGroup(
        buildShortageForecast(input({ inventory: [{ bloodGroup: "O_POSITIVE", units: 12 }] })),
        "O_POSITIVE",
      );

      expect(result.daysOfCover).toBeNull();
      expect(result.message).toMatch(/stock check rather than a projection/i);
    });

    it("never invents a demand rate to fill the gap", () => {
      const result = forGroup(
        buildShortageForecast(input({ inventory: [{ bloodGroup: "O_POSITIVE", units: 12 }] })),
        "O_POSITIVE",
      );

      expect(result.dailyDemand).toBe(0);
      expect(result.basis.requestsInWindow).toBe(0);
    });

    it("says how long a window it looked at, so the reader can judge it", () => {
      const result = forGroup(buildShortageForecast(input()), "A_POSITIVE");

      expect(result.basis).toEqual({
        requestsInWindow: 0,
        unitsRequestedInWindow: 0,
        donationsInWindow: 0,
        windowDays: HISTORY_WINDOW_DAYS,
      });
    });

    it("still raises a shortfall that exists right now", () => {
      // No history, but three units are requested and none are on the shelf.
      const result = forGroup(
        buildShortageForecast(
          input({
            inventory: [{ bloodGroup: "B_NEGATIVE", units: 0 }],
            openRequests: requests("B_NEGATIVE", 1, 3),
          }),
        ),
        "B_NEGATIVE",
      );

      expect(result.risk).toBe("CRITICAL");
      expect(result.message).toMatch(/shortfall now, not a forecast/i);
    });
  });

  describe("widening the window", () => {
    /*
      An institute that raises a request every couple of months still has a
      demand rate; it is just not visible in 30 days. The search widens rather
      than writing the group off, and reports the window it settled on.
    */
    it("finds demand outside the recent window and says which window it used", () => {
      const result = forGroup(
        buildShortageForecast(
          input({
            inventory: [{ bloodGroup: "A_NEGATIVE", units: 20 }],
            // Nothing in the last 30 days; two requests 45 days back.
            requestHistory: requests("A_NEGATIVE", 2, 10, 45),
          }),
        ),
        "A_NEGATIVE",
      );

      expect(result.method).toBe("cover");
      expect(result.basis.windowDays).toBe(60);
      expect(result.basis.requestsInWindow).toBe(2);
      expect(result.dailyDemand).toBe(0.33); // reported to 2dp
    });

    it("prefers the narrowest window that holds anything", () => {
      const result = forGroup(
        buildShortageForecast(
          input({
            inventory: [{ bloodGroup: "A_NEGATIVE", units: 20 }],
            requestHistory: [
              ...requests("A_NEGATIVE", 1, 5, 10),
              ...requests("A_NEGATIVE", 1, 5, 100),
            ],
          }),
        ),
        "A_NEGATIVE",
      );

      // The recent window has a request, so the older one is not reached for.
      expect(result.basis.windowDays).toBe(HISTORY_WINDOW_DAYS);
      expect(result.basis.requestsInWindow).toBe(1);
    });

    it("widens per group, not for the institute as a whole", () => {
      const result = buildShortageForecast(
        input({
          inventory: [
            { bloodGroup: "A_POSITIVE", units: 20 },
            { bloodGroup: "B_POSITIVE", units: 20 },
          ],
          requestHistory: [
            ...requests("A_POSITIVE", 1, 5, 5),
            ...requests("B_POSITIVE", 1, 5, 120),
          ],
        }),
      );

      expect(forGroup(result, "A_POSITIVE").basis.windowDays).toBe(HISTORY_WINDOW_DAYS);
      expect(forGroup(result, "B_POSITIVE").basis.windowDays).toBe(180);
    });

    it("falls back to a stock check when nothing is found at any width", () => {
      const result = forGroup(
        buildShortageForecast(
          input({
            inventory: [{ bloodGroup: "A_NEGATIVE", units: 20 }],
            requestHistory: requests("A_NEGATIVE", 1, 5, 400),
          }),
        ),
        "A_NEGATIVE",
      );

      expect(result.method).toBe("stock-level");
      expect(result.risk).toBe("STABLE");
    });
  });

  describe("days of cover", () => {
    it("divides stock by the daily demand rate", () => {
      // 30 units requested over a 30-day window is 1 unit/day; 20 on hand.
      const result = forGroup(
        buildShortageForecast(
          input({
            inventory: [{ bloodGroup: "A_POSITIVE", units: 20 }],
            requestHistory: requests("A_POSITIVE", 30, 1),
          }),
        ),
        "A_POSITIVE",
      );

      expect(result.dailyDemand).toBe(1);
      expect(result.daysOfCover).toBe(20);
    });

    it("counts booked donations as supply against the drain", () => {
      // 1 unit/day out, 15 booked across a 30-day horizon = 0.5/day in.
      const result = forGroup(
        buildShortageForecast(
          input({
            inventory: [{ bloodGroup: "A_POSITIVE", units: 10 }],
            requestHistory: requests("A_POSITIVE", 30, 1),
            scheduled: appointments("A_POSITIVE", 15),
          }),
        ),
        "A_POSITIVE",
      );

      expect(result.scheduledUnits).toBe(15);
      expect(result.netDailyChange).toBe(-0.5);
      expect(result.daysOfCover).toBe(20);
    });

    it("reports no end date when bookings cover demand", () => {
      const result = forGroup(
        buildShortageForecast(
          input({
            inventory: [{ bloodGroup: "A_POSITIVE", units: 10 }],
            requestHistory: requests("A_POSITIVE", 30, 1),
            scheduled: appointments("A_POSITIVE", 30),
          }),
        ),
        "A_POSITIVE",
      );

      expect(result.daysOfCover).toBeNull();
      expect(result.risk).toBe("STABLE");
      expect(result.message).toMatch(/cover the expected demand/i);
    });

    it("ignores a booking whose donor has no recorded blood group", () => {
      const result = forGroup(
        buildShortageForecast(
          input({
            inventory: [{ bloodGroup: "A_POSITIVE", units: 10 }],
            requestHistory: requests("A_POSITIVE", 30, 1),
            scheduled: appointments(null, 20),
          }),
        ),
        "A_POSITIVE",
      );

      expect(result.scheduledUnits).toBe(0);
    });
  });

  describe("risk bands", () => {
    /** Stock that yields exactly `days` of cover at 1 unit/day. */
    const coverOf = (days: number) =>
      buildShortageForecast(
        input({
          inventory: [{ bloodGroup: "O_NEGATIVE", units: days }],
          requestHistory: requests("O_NEGATIVE", 30, 1),
        }),
      );

    it.each([
      [3, "CRITICAL"],
      [6, "CRITICAL"],
      [7, "HIGH"],
      [13, "HIGH"],
      [14, "WATCH"],
      [29, "WATCH"],
      [30, "STABLE"],
      [60, "STABLE"],
    ])("%i days of cover is %s", (days, expected) => {
      expect(forGroup(coverOf(days), "O_NEGATIVE").risk).toBe(expected);
    });

    it("treats an empty shelf as critical", () => {
      expect(forGroup(coverOf(0), "O_NEGATIVE").risk).toBe("CRITICAL");
    });

    it("raises a present shortfall above whatever the trend says", () => {
      // A month of cover by the trend, but the open requests exceed stock.
      const result = forGroup(
        buildShortageForecast(
          input({
            inventory: [{ bloodGroup: "AB_POSITIVE", units: 40 }],
            openRequests: requests("AB_POSITIVE", 1, 50),
            requestHistory: requests("AB_POSITIVE", 30, 1),
          }),
        ),
        "AB_POSITIVE",
      );

      expect(result.risk).toBe("HIGH");
      expect(result.message).toMatch(/exceed stock by 10 units/);
    });
  });

  describe("ordering", () => {
    it("puts the group most at risk first", () => {
      const result = buildShortageForecast(
        input({
          inventory: [
            { bloodGroup: "A_POSITIVE", units: 40 },
            { bloodGroup: "O_NEGATIVE", units: 3 },
            { bloodGroup: "B_POSITIVE", units: 20 },
          ],
          requestHistory: [
            ...requests("A_POSITIVE", 30, 1),
            ...requests("O_NEGATIVE", 30, 1),
            ...requests("B_POSITIVE", 30, 1),
          ],
        }),
      );

      expect(result[0].bloodGroup).toBe("O_NEGATIVE");
      expect(result[0].risk).toBe("CRITICAL");
    });

    it("puts the soonest shortfall first within a band", () => {
      const result = buildShortageForecast(
        input({
          inventory: [
            { bloodGroup: "A_POSITIVE", units: 5 },
            { bloodGroup: "B_POSITIVE", units: 2 },
          ],
          requestHistory: [...requests("A_POSITIVE", 30, 1), ...requests("B_POSITIVE", 30, 1)],
        }),
      );

      const positions = Object.fromEntries(result.map((row, index) => [row.bloodGroup, index]));

      // Both are critical; the one that runs out sooner comes first.
      expect(forGroup(result, "B_POSITIVE").daysOfCover).toBeLessThan(
        forGroup(result, "A_POSITIVE").daysOfCover!,
      );
      expect(positions.B_POSITIVE).toBeLessThan(positions.A_POSITIVE);
    });

    it("ranks an empty shelf above a well-stocked group, however each was judged", () => {
      const result = buildShortageForecast(
        input({
          inventory: [
            { bloodGroup: "A_POSITIVE", units: 100 },
            // No demand on record, and nothing on the shelf either.
            { bloodGroup: "B_NEGATIVE", units: 0 },
          ],
          requestHistory: requests("A_POSITIVE", 1, 1),
        }),
      );

      const positions = Object.fromEntries(result.map((row, index) => [row.bloodGroup, index]));

      expect(forGroup(result, "B_NEGATIVE").risk).toBe("CRITICAL");
      expect(positions.B_NEGATIVE).toBeLessThan(positions.A_POSITIVE);
    });
  });

  describe("projection", () => {
    it("never projects a negative number of units", () => {
      const result = forGroup(
        buildShortageForecast(
          input({
            inventory: [{ bloodGroup: "O_POSITIVE", units: 2 }],
            requestHistory: requests("O_POSITIVE", 30, 10),
          }),
        ),
        "O_POSITIVE",
      );

      expect(result.projectedUnits).toBe(0);
    });

    it("projects the horizon forward at the net rate", () => {
      const result = forGroup(
        buildShortageForecast(
          input({
            inventory: [{ bloodGroup: "O_POSITIVE", units: 100 }],
            requestHistory: requests("O_POSITIVE", 30, 1),
          }),
        ),
        "O_POSITIVE",
      );

      expect(result.projectedUnits).toBe(100 - FORECAST_HORIZON_DAYS);
    });
  });
});

describe("shortfallDate", () => {
  it("is the day stock is projected to reach zero", () => {
    const [group] = buildShortageForecast(
      input({
        inventory: [{ bloodGroup: "A_NEGATIVE", units: 10 }],
        requestHistory: requests("A_NEGATIVE", 30, 1),
      }),
    ).filter((row) => row.bloodGroup === "A_NEGATIVE");

    const from = new Date(2026, 5, 1);

    expect(shortfallDate(group, from)).toEqual(new Date(2026, 5, 11));
  });

  it("is null when stock is not projected to run out", () => {
    const [group] = buildShortageForecast(
      input({ inventory: [{ bloodGroup: "A_NEGATIVE", units: 10 }] }),
    ).filter((row) => row.bloodGroup === "A_NEGATIVE");

    expect(shortfallDate(group)).toBeNull();
  });
});

describe("groupsNeedingAction", () => {
  /** A full shelf for every group, so a fixture only varies what it means to. */
  const stockedShelf = BLOOD_GROUPS.map((bloodGroup) => ({ bloodGroup, units: 40 }));

  it("returns the groups a laboratory should act on, and no others", () => {
    const forecast = buildShortageForecast(
      input({
        inventory: [
          ...stockedShelf.filter((row) => row.bloodGroup !== "O_NEGATIVE"),
          { bloodGroup: "O_NEGATIVE", units: 2 },
        ],
        requestHistory: [...requests("O_NEGATIVE", 30, 1), ...requests("A_POSITIVE", 30, 1)],
      }),
    );

    expect(groupsNeedingAction(forecast).map((row) => row.bloodGroup)).toEqual(["O_NEGATIVE"]);
  });

  it("leaves a well-stocked shelf alone, however each group was judged", () => {
    // Most of these have no demand history, so they are judged on stock —
    // and a full shelf is not something to act on.
    const forecast = buildShortageForecast(
      input({ inventory: stockedShelf, requestHistory: requests("A_POSITIVE", 1, 1) }),
    );

    expect(groupsNeedingAction(forecast)).toEqual([]);
  });

  it("flags an empty shelf even with nothing else on record", () => {
    // The case the laboratory most needs raised: no stock, no history. An
    // assessment of "we cannot say" would have hidden it.
    const actionable = groupsNeedingAction(buildShortageForecast(input()));

    expect(actionable).toHaveLength(BLOOD_GROUPS.length);
    expect(actionable.every((row) => row.risk === "CRITICAL")).toBe(true);
  });
});
