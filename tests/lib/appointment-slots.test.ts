import {
  APPOINTMENT_TIMES,
  MAX_DAYS_AHEAD,
  SLOT_CAPACITY,
  validateSchedule,
} from "@/src/lib/appointment-slots";

/*
  Booking slot validation (FR-11). Every case here runs against a frozen
  clock: "today", "in the past" and "already passed today" are all relative to
  the moment the code runs, so without a fixed system time these tests would
  pass or fail depending on the hour they were run at.

  The frozen instant is built from local components on purpose - the module
  compares local calendar days, so the test's notion of "today" has to be the
  same one it uses, in whatever timezone the suite runs.
*/

const NOON_ON_A_MONDAY = new Date(2026, 5, 15, 12, 0, 0); // 15 June 2026, local

/** The YYYY-MM-DD the module expects, for a date `offset` days from frozen now. */
function dateOffset(offset: number): string {
  const date = new Date(NOON_ON_A_MONDAY);
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

beforeAll(() => {
  jest.useFakeTimers({ doNotFake: ["performance"] });
  jest.setSystemTime(NOON_ON_A_MONDAY);
});

afterAll(() => {
  jest.useRealTimers();
});

describe("appointment slot constants", () => {
  it("offers eight hourly slots with a break over lunch", () => {
    expect(APPOINTMENT_TIMES).toEqual([
      "08:00",
      "09:00",
      "10:00",
      "11:00",
      "12:00",
      "14:00",
      "15:00",
      "16:00",
    ]);
  });

  it("seats four donors per slot and books up to 90 days ahead", () => {
    expect(SLOT_CAPACITY).toBe(4);
    expect(MAX_DAYS_AHEAD).toBe(90);
  });
});

describe("validateSchedule", () => {
  describe("accepted bookings", () => {
    it("accepts a valid date and time a week out", () => {
      const result = validateSchedule(dateOffset(7), "10:00");

      expect(result.error).toBeUndefined();
      expect(result).toMatchObject({ time: "10:00" });
      expect((result as { date: Date }).date).toEqual(new Date(2026, 5, 22));
    });

    it("accepts every published time", () => {
      for (const time of APPOINTMENT_TIMES) {
        expect(validateSchedule(dateOffset(1), time).error).toBeUndefined();
      }
    });

    it("accepts a later slot today", () => {
      expect(validateSchedule(dateOffset(0), "14:00").error).toBeUndefined();
    });

    it("accepts the last day of the booking horizon", () => {
      expect(validateSchedule(dateOffset(MAX_DAYS_AHEAD), "08:00").error).toBeUndefined();
    });
  });

  describe("rejected dates", () => {
    it("rejects yesterday", () => {
      expect(validateSchedule(dateOffset(-1), "10:00")).toEqual({
        error: "Appointments can't be booked in the past.",
      });
    });

    it("rejects a date past the booking horizon", () => {
      expect(validateSchedule(dateOffset(MAX_DAYS_AHEAD + 1), "10:00")).toEqual({
        error: `Appointments can be booked up to ${MAX_DAYS_AHEAD} days ahead.`,
      });
    });

    it.each([
      ["a non-ISO format", "15/06/2026"],
      ["a partial date", "2026-06"],
      ["an empty string", ""],
      ["a number", 20260615],
      ["null", null],
      ["undefined", undefined],
      ["an object", { date: "2026-06-15" }],
    ])("rejects %s", (_label, date) => {
      expect(validateSchedule(date, "10:00")).toEqual({
        error: "Choose a valid appointment date.",
      });
    });

    it.each([
      ["an out-of-range month", "2026-13-01"],
      ["a day that never existed", "2026-02-31"],
      ["29 February in a non-leap year", "2026-02-29"],
    ])("rejects %s", (_label, date) => {
      expect(validateSchedule(date, "10:00")).toEqual({
        error: "Choose a valid appointment date.",
      });
    });

    it("rejects a bookable-looking day that never existed", () => {
      // 31 June is inside the 90-day horizon from the frozen clock, so before
      // the round-trip check this booked an appointment for 1 July instead.
      expect(validateSchedule("2026-06-31", "10:00")).toEqual({
        error: "Choose a valid appointment date.",
      });
    });
  });

  describe("rejected times", () => {
    it.each([
      ["a time outside the published slots", "13:00"],
      ["a time with minutes", "10:30"],
      ["an unpadded hour", "8:00"],
      ["an empty string", ""],
      ["null", null],
      ["a number", 10],
    ])("rejects %s", (_label, time) => {
      expect(validateSchedule(dateOffset(7), time)).toEqual({
        error: "Choose one of the available appointment times.",
      });
    });
  });

  describe("slots that have already passed today", () => {
    it("rejects a morning slot when it is already noon", () => {
      expect(validateSchedule(dateOffset(0), "08:00")).toEqual({
        error: "That time has already passed today. Choose a later slot.",
      });
    });

    it("rejects the slot that starts exactly now", () => {
      expect(validateSchedule(dateOffset(0), "12:00")).toEqual({
        error: "That time has already passed today. Choose a later slot.",
      });
    });

    it("does not apply the cutoff to tomorrow's early slot", () => {
      expect(validateSchedule(dateOffset(1), "08:00").error).toBeUndefined();
    });
  });

  it("checks the date before the time", () => {
    // Both are invalid; the donor should be told about the date first.
    expect(validateSchedule("not-a-date", "99:99")).toEqual({
      error: "Choose a valid appointment date.",
    });
  });
});
