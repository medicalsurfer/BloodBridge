"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Panel } from "@/src/components/ui/Page";

type Account = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  healthInstitute: { name: string; city: string } | null;
};

const inputClass =
  "h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-[13.5px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-950 focus:ring-4 focus:ring-red-950/10 read-only:bg-slate-50 read-only:text-slate-500";

/**
 * Account details and password change for any signed-in role. Donors edit
 * their name and phone on the donor profile form, so they pass
 * `showDetails={false}` and only get the password section.
 */
export function AccountSettings({ showDetails = true }: { showDetails?: boolean }) {
  return (
    <div className="space-y-6">
      {showDetails && <DetailsForm />}
      <PasswordForm />
    </div>
  );
}

function DetailsForm() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [form, setForm] = useState({ firstName: "", lastName: "", phoneNumber: "" });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/account", { credentials: "include", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => {
        setAccount(data.user);
        setForm({
          firstName: data.user.firstName,
          lastName: data.user.lastName,
          phoneNumber: data.user.phoneNumber ?? "",
        });
      })
      .catch(() => setStatus({ tone: "error", text: "Couldn't load your account details." }));
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus(null);

    try {
      const response = await fetch("/api/account", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to save your details.");

      setAccount(data.user);
      setStatus({ tone: "ok", text: data.message });
      router.refresh();
    } catch (error) {
      setStatus({ tone: "error", text: error instanceof Error ? error.message : "Unable to save your details." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel label="Account details">
      <form onSubmit={save} className="mt-5 space-y-4">
        <StatusMessage status={status} />

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="First name" htmlFor="account-first-name">
            <input
              id="account-first-name"
              required
              value={form.firstName}
              onChange={(event) => setForm({ ...form, firstName: event.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Last name" htmlFor="account-last-name">
            <input
              id="account-last-name"
              required
              value={form.lastName}
              onChange={(event) => setForm({ ...form, lastName: event.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Email address" htmlFor="account-email">
            <input id="account-email" readOnly value={account?.email ?? ""} className={inputClass} />
          </Field>
          <Field label="Phone number" htmlFor="account-phone">
            <input
              id="account-phone"
              type="tel"
              placeholder="+237 6XX XXX XXX"
              value={form.phoneNumber}
              onChange={(event) => setForm({ ...form, phoneNumber: event.target.value })}
              className={inputClass}
            />
          </Field>
        </div>

        {account?.healthInstitute && (
          <p className="text-xs text-slate-500">
            Health institute: <span className="font-semibold text-slate-700">{account.healthInstitute.name}</span>,{" "}
            {account.healthInstitute.city}
          </p>
        )}

        <div className="flex justify-end">
          <SubmitButton busy={saving || !account} label="Save details" busyLabel="Saving…" />
        </div>
      </form>
    </Panel>
  );
}

function PasswordForm() {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    if (form.newPassword !== form.confirmPassword) {
      setStatus({ tone: "error", text: "The new passwords don't match." });
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/account", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to change your password.");

      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setStatus({ tone: "ok", text: data.message });
    } catch (error) {
      setStatus({ tone: "error", text: error instanceof Error ? error.message : "Unable to change your password." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel label="Change password">
      <form onSubmit={save} className="mt-5 space-y-4">
        <StatusMessage status={status} />

        <Field label="Current password" htmlFor="current-password">
          <input
            id="current-password"
            type="password"
            autoComplete="current-password"
            required
            value={form.currentPassword}
            onChange={(event) => setForm({ ...form, currentPassword: event.target.value })}
            className={inputClass}
          />
        </Field>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="New password" htmlFor="new-password">
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={form.newPassword}
              onChange={(event) => setForm({ ...form, newPassword: event.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Confirm new password" htmlFor="confirm-password">
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={form.confirmPassword}
              onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
              className={inputClass}
            />
          </Field>
        </div>

        <p className="text-[11px] text-slate-500">At least 8 characters.</p>

        <div className="flex justify-end">
          <SubmitButton busy={saving} label="Change password" busyLabel="Changing…" />
        </div>
      </form>
    </Panel>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 block text-xs font-semibold text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}

function SubmitButton({ busy, label, busyLabel }: { busy: boolean; label: string; busyLabel: string }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="h-11 rounded-xl bg-red-950 px-6 text-[13px] font-semibold text-white transition hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {busy ? busyLabel : label}
    </button>
  );
}

function StatusMessage({ status }: { status: { tone: "ok" | "error"; text: string } | null }) {
  if (!status) return null;

  return (
    <p
      role={status.tone === "error" ? "alert" : "status"}
      className={`rounded-xl border px-4 py-3 text-xs ${
        status.tone === "ok"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-red-200 bg-red-50 text-red-800"
      }`}
    >
      {status.text}
    </p>
  );
}
