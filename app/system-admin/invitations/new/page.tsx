"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type InviteResponse = {
  user?: {
    email: string;
    firstName: string;
    lastName: string;
  };
  temporaryPassword?: string;
  emailSent?: boolean;
  error?: string;
};

type Institute = {
  id: string;
  name: string;
  city: string;
  region: string | null;
  address: string | null;
  email: string | null;
  phoneNumber: string | null;
  isActive: boolean;
};

export default function NewInstituteAdminInvitationPage() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    healthInstituteId: "",
  });
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [isLoadingInstitutes, setIsLoadingInstitutes] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<InviteResponse["user"] & { temporaryPassword: string } | null>(null);

  const selectedInstitute = institutes.find(
    (institute) => institute.id === form.healthInstituteId
  );

  useEffect(() => {
    fetch("/api/system-admin/institutes", { credentials: "include" })
      .then((response) => response.json())
      .then((data) => setInstitutes(data.institutes ?? []))
      .catch(() => setError("Unable to load health institutes."))
      .finally(() => setIsLoadingInstitutes(false));
  }, []);

  async function submitInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/system-admin/users", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data: InviteResponse = await response.json().catch(() => ({}));

      if (!response.ok || !data.user || !data.emailSent) {
        throw new Error(data.error ?? "Unable to create invitation.");
      }

      setResult({ ...data.user, temporaryPassword: "Sent by email" });
      setForm({ firstName: "", lastName: "", email: "", healthInstituteId: "" });
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to create invitation."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
      <div className="min-h-full">
        <section className="flex min-h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mx-auto w-full max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-700">
            System administration
          </p>
          <h1 className="mt-3 text-3xl font-bold text-slate-950">
            Invite a health institute admin
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
            Create an active administrator and assign them to the health institute they will manage.
          </p>

          {error && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
              {error}
            </div>
          )}

          {result && (
            <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              <p className="font-bold">Invitation created for {result.email}.</p>
              <p className="mt-2">
                Temporary password sent securely to <strong>{result.email}</strong>.
              </p>
              <Link
                href="/system-admin/users"
                className="mt-4 inline-block font-semibold text-emerald-800 underline"
              >
                View all users
              </Link>
            </div>
          )}

          <form onSubmit={submitInvitation} className="mt-8 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700">
                First name
                <input
                  required
                  value={form.firstName}
                  onChange={(event) => setForm({ ...form, firstName: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-red-700"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Last name
                <input
                  required
                  value={form.lastName}
                  onChange={(event) => setForm({ ...form, lastName: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-red-700"
                />
              </label>
            </div>

            <label className="block text-sm font-semibold text-slate-700">
              Email address
              <input
                required
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-red-700"
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Health institute
              <select
                required
                value={form.healthInstituteId}
                disabled={isLoadingInstitutes}
                onChange={(event) => setForm({ ...form, healthInstituteId: event.target.value })}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:border-red-700 disabled:bg-slate-100"
              >
                <option value="">
                  {isLoadingInstitutes ? "Loading institutes..." : "Select a health institute"}
                </option>
                {institutes.filter((institute) => institute.isActive).map((institute) => (
                  <option key={institute.id} value={institute.id}>
                    {institute.name} · {institute.city}
                  </option>
                ))}
              </select>
            </label>

            {selectedInstitute && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  <p className="font-bold text-slate-900">{selectedInstitute.name}</p>
                  <p className="mt-1">{[selectedInstitute.address, selectedInstitute.city, selectedInstitute.region].filter(Boolean).join(", ")}</p>
                  <p className="mt-1">{selectedInstitute.email || "No institute email"} · {selectedInstitute.phoneNumber || "No phone number"}</p>
                </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-red-950 px-5 py-3 text-sm font-bold text-white hover:bg-red-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Creating invitation..." : "Create invitation"}
            </button>
          </form>
          </div>
        </section>
      </div>
  );
}