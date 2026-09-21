/*
  Request-input helpers (SRS §9 "Validate input", 6.1 "Required fields shall be
  validated"). Every value from a request body or query string is coerced to a
  known type and bounded here before it reaches a Prisma query.

  These are not SQL escaping functions, and nothing in BloodBridge builds SQL
  strings: Prisma sends every value as a bound parameter, so a value can never
  become SQL syntax. This layer exists so that malformed or oversized input is
  rejected early with a clear 400, and so a future raw query would receive
  values that were already validated.
*/

/** Trimmed text of at most `maxLength` characters, or "" when absent. */
export function text(value: unknown, maxLength = 200): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

/**
 * A database identifier. Prisma ids here are cuids, so anything outside the
 * cuid character set is rejected rather than queried.
 */
export function id(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const candidate = value.trim();
  return /^[A-Za-z0-9_-]{1,64}$/.test(candidate) ? candidate : null;
}

/** One of `allowed`, or null. Use for every enum-typed field. */
export function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

/** A whole number within [min, max], or null. */
export function integer(value: unknown, { min = 1, max = 1_000_000 } = {}): number | null {
  // Only a number or a numeric string is a number. `Number()` alone would
  // also unwrap [5] to 5 and turn true into 1, so a JSON body sending an
  // array or a boolean would pass a check that reads as a type check.
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && value.trim() === "") return null;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) return null;
  return parsed;
}

/** A date-only string (YYYY-MM-DD), or null. */
export function dateString(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  // An out-of-range day does not make `new Date` fail: it rolls forward, so
  // "2026-02-31" parses as 3 March and "2026-06-31" as 1 July. Formatting the
  // parsed date back and comparing is what rejects a day that never existed.
  // Parsed as UTC so the round-trip through toISOString is timezone-safe.
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toISOString().slice(0, 10) === value ? value : null;
}
