// Appointment slot rules shared by the booking/reschedule screens and the API.
// Pure module: safe to import from client components.

import { dateString } from "./input";

export const APPOINTMENT_TIMES = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "14:00",
  "15:00",
  "16:00",
] as const;

// How many donors a centre can see in one slot (FR-11 "available slot").
export const SLOT_CAPACITY = 4;

export const MAX_DAYS_AHEAD = 90;

function todayLocal() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Validates a requested date (YYYY-MM-DD) and time (one of APPOINTMENT_TIMES).
 * Returns the parsed date, or an error message.
 */
export function validateSchedule(
  date: unknown,
  time: unknown,
): { date: Date; time: string; error?: undefined } | { error: string } {
  // dateString rejects a day that never existed, which a plain parse would
  // roll forward instead: without it a submitted "2026-06-31" books 1 July.
  const validDate = dateString(date);
  if (!validDate) {
    return { error: "Choose a valid appointment date." };
  }

  // Local midnight, not the UTC instant dateString parsed: the checks below
  // and the stored appointment date are all in the centre's local days.
  const parsed = new Date(`${validDate}T00:00:00`);

  if (typeof time !== "string" || !(APPOINTMENT_TIMES as readonly string[]).includes(time)) {
    return { error: "Choose one of the available appointment times." };
  }

  const today = todayLocal();
  const latest = new Date(today);
  latest.setDate(latest.getDate() + MAX_DAYS_AHEAD);

  if (parsed < today) {
    return { error: "Appointments can't be booked in the past." };
  }

  if (parsed > latest) {
    return { error: `Appointments can be booked up to ${MAX_DAYS_AHEAD} days ahead.` };
  }

  if (parsed.getTime() === today.getTime()) {
    const [hours, minutes] = time.split(":").map(Number);
    const slot = new Date();
    slot.setHours(hours, minutes, 0, 0);
    if (slot <= new Date()) {
      return { error: "That time has already passed today. Choose a later slot." };
    }
  }

  return { date: parsed, time };
}
