"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AuthBackdrop } from "@/src/components/auth/AuthBackdrop";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error ?? "Unable to send reset instructions.");
        return;
      }

      setMessage(
        data.message ?? "If an account exists for that email, we've sent reset instructions.",
      );
    } catch {
      setError("Unable to reach the server. Check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center p-4">
      <AuthBackdrop />

      <section
        // A deeper shadow than the card used to carry: it now has a ground to
        // cast onto, so the elevation can actually be seen.
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/80 bg-white shadow-[0_24px_60px_-20px_oklch(27.1%_0.105_12.094/0.28)]"
        style={{ animation: "var(--animate-rise)" }}
      >
        {/* A garnet cap so the page is recognisably part of the product, not a
            bare utility form. */}
        <div className="relative overflow-hidden bg-gradient-to-br from-garnet via-plum to-garnet-deep px-8 py-7 text-white">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-16 -right-10 h-48 w-48 rounded-full bg-rose/25 blur-3xl"
            style={{ animation: "var(--animate-drift)" }}
          />

          <div className="relative flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/12 backdrop-blur-sm">
              <BloodDropIcon />
            </div>

            <div>
              <p className="text-base font-semibold">BloodBridge</p>
              <p className="text-[10px] text-red-100/70">Intelligent Blood Donation Platform</p>
            </div>
          </div>
        </div>

        <div className="p-8">
          {message ? (
            // Success is its own state, not a green box under a form the donor
            // no longer needs to fill in.
            <div>
              <div
                aria-hidden
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"
              >
                <MailCheckIcon />
              </div>

              <h1 className="mt-5 text-2xl font-semibold tracking-[-0.02em] text-slate-950">
                Check your email
              </h1>

              <p role="status" className="mt-3 text-sm leading-6 text-slate-600">
                {message}
              </p>

              <ul className="mt-5 space-y-2.5 border-t border-slate-100 pt-5 text-[13px] leading-5 text-slate-600">
                <li className="flex gap-2.5">
                  <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                  The link expires in one hour for your security.
                </li>
                <li className="flex gap-2.5">
                  <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                  Not in your inbox? Check the spam folder before requesting another.
                </li>
              </ul>

              <button
                type="button"
                onClick={() => {
                  setMessage(null);
                  setEmail("");
                }}
                className="mt-6 h-12 w-full rounded-xl border border-slate-300 text-[13px] font-semibold text-slate-700 transition duration-300 hover:border-garnet/30 hover:text-garnet"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-semibold tracking-[-0.02em] text-slate-950">
                Forgot your password?
              </h1>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                Enter the email address on your account and we&apos;ll send you a link to reset your
                password.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-[13px] font-semibold text-slate-800"
                  >
                    Email address
                  </label>

                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    autoFocus
                    placeholder="name@gmail.com"
                    value={email}
                    disabled={isLoading}
                    onChange={(event) => setEmail(event.target.value)}
                    aria-describedby={error ? "reset-error" : undefined}
                    className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-[13.5px] text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-garnet focus:ring-4 focus:ring-garnet/10 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />
                </div>

                {error && (
                  <div
                    id="reset-error"
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800"
                  >
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-crimson via-garnet to-garnet-deep text-[13px] font-semibold text-white shadow-sm shadow-garnet/20 transition duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-garnet/25 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
                >
                  {isLoading ? "Sending…" : "Send reset link"}
                </button>
              </form>
            </div>
          )}

          <p className="mt-6 border-t border-slate-100 pt-6 text-center text-[13px] text-slate-500">
            Remembered your password?{" "}
            <Link
              href="/login"
              className="font-semibold text-garnet underline-offset-4 hover:underline"
            >
              Back to sign in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

function BloodDropIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="M12 3.5c2.8 3.8 7 8.9 7 12.5a7 7 0 1 1-14 0c0-3.6 4.2-8.7 7-12.5Z" />
    </svg>
  );
}

function MailCheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="M21 8.5V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h11" />
      <path d="m3 7 9 6 4.5-3" />
      <path d="m17 5 2 2 3-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
