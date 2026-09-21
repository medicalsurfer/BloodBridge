"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { AuthBackdrop } from "@/src/components/auth/AuthBackdrop";

const PRIMARY_RED = "oklch(27.1% 0.105 12.094)";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!token) {
      setError("This reset link is missing its token. Please request a new one.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error ?? "Unable to reset password.");
        return;
      }

      setMessage(data.message ?? "Password updated. You can now sign in.");
      setTimeout(() => router.replace("/login"), 1500);
    } catch {
      setError("Unable to communicate with the server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section
      className="relative w-full max-w-md rounded-2xl border border-white/80 bg-white p-8 shadow-[0_24px_60px_-20px_oklch(27.1%_0.105_12.094/0.28)]"
      style={{ animation: "var(--animate-rise)" }}
    >
      <div className="mb-6 flex items-center gap-3">
        <div
          style={{ backgroundColor: PRIMARY_RED }}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
        >
          <BloodDropIcon />
        </div>
        <div>
          <p className="text-lg font-bold text-slate-950">BloodBridge</p>
          <p className="text-xs text-slate-400">Intelligent Blood Donation Platform</p>
        </div>
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-slate-950">Reset your password</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">Choose a new password for your account.</p>

      {!token && (
        <div role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This link is missing a reset token. Please request a new password reset email.
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-800">
            New password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            disabled={isLoading}
            onChange={(event) => setPassword(event.target.value)}
            className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-red-900 focus:ring-4 focus:ring-red-900/10 disabled:cursor-not-allowed disabled:bg-slate-50"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="mb-2 block text-sm font-semibold text-slate-800">
            Confirm new password
          </label>
          <input
            id="confirmPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Re-enter your new password"
            value={confirmPassword}
            disabled={isLoading}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-red-900 focus:ring-4 focus:ring-red-900/10 disabled:cursor-not-allowed disabled:bg-slate-50"
          />
        </div>

        {error && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !token}
          style={{ backgroundColor: PRIMARY_RED }}
          className="flex h-12 w-full items-center justify-center rounded-xl text-sm font-semibold text-white shadow-lg shadow-red-950/20 transition hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading ? "Updating..." : "Reset password"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        <Link href="/login" className="font-semibold text-red-950 hover:underline">
          Back to sign in
        </Link>
      </p>
    </section>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center p-4">
      <AuthBackdrop />

      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}

function BloodDropIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3.5c2.8 3.8 7 8.9 7 12.5a7 7 0 1 1-14 0c0-3.6 4.2-8.7 7-12.5Z" />
    </svg>
  );
}
