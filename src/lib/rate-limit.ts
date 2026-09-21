import { NextRequest, NextResponse } from "next/server";

/*
  Abuse controls for authentication and AI endpoints (SRS §9). A fixed-window
  counter kept in this server process's memory: enough for a single Next.js
  server. If the app is ever run as several instances, move this to a shared
  store such as Redis.
*/

type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();
let lastSweep = Date.now();

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}

export function clientIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Counts one attempt against `key`. Returns a 429 response once more than
 * `limit` attempts happen within `windowMs`, or null when the request may go on.
 */
export function rateLimit(key: string, limit: number, windowMs: number): NextResponse | null {
  const now = Date.now();
  sweep(now);

  let window = windows.get(key);
  if (!window || window.resetAt <= now) {
    window = { count: 0, resetAt: now + windowMs };
    windows.set(key, window);
  }

  window.count += 1;

  if (window.count <= limit) return null;

  const retryAfter = Math.ceil((window.resetAt - now) / 1000);
  const minutes = Math.ceil(retryAfter / 60);

  return NextResponse.json(
    {
      error: `Too many attempts. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}

const MINUTE = 60_000;

export const LIMITS = {
  login: { limit: 10, windowMs: 15 * MINUTE },
  register: { limit: 5, windowMs: 60 * MINUTE },
  passwordReset: { limit: 5, windowMs: 60 * MINUTE },
  passwordChange: { limit: 10, windowMs: 15 * MINUTE },
  aiChat: { limit: 20, windowMs: 10 * MINUTE },
} as const;
