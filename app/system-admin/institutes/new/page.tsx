"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const PRIMARY_RED = "oklch(27.1% 0.105 12.094)";

export default function NewHealthInstitutePage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    address: "",
    city: "",
    region: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/system-admin/institutes",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "Unable to create health institute."
        );
        return;
      }

      router.push("/system-admin/institutes");
      router.refresh();
    } catch {
      setError(
        "Something went wrong while creating the institute."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
      <section className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">

        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-950">
            System Administration
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-950">
            Add Health Institute
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Register a hospital or health institute on BloodBridge.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <Field
            label="Institute name"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
          />

          <Field
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
          />

          <Field
            label="Phone number"
            name="phoneNumber"
            value={form.phoneNumber}
            onChange={handleChange}
          />

          <Field
            label="Address"
            name="address"
            value={form.address}
            onChange={handleChange}
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="City"
              name="city"
              value={form.city}
              onChange={handleChange}
              required
            />

            <Field
              label="Region"
              name="region"
              value={form.region}
              onChange={handleChange}
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-6">

            <Link
              href="/system-admin/institutes"
              className="inline-flex h-11 items-center rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-600"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: PRIMARY_RED,
              }}
              className="inline-flex h-11 items-center rounded-xl px-5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading
                ? "Creating..."
                : "Create institute"}
            </button>

          </div>
        </form>
      </section>
  );
}

function Field({
  label,
  name,
  value,
  type = "text",
  required = false,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  type?: string;
  required?: boolean;
  onChange: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold text-slate-700">
        {label}
      </label>

      <input
        name={name}
        type={type}
        value={value}
        required={required}
        onChange={onChange}
        className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-red-900"
      />
    </div>
  );
}