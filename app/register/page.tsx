
"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

const PRIMARY_RED = "oklch(27.1% 0.105 12.094)";

// Only allow donor accounts registered with Gmail or iCloud.
function isAllowedEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const domain = normalizedEmail.split("@")[1];

  return domain === "gmail.com" || domain === "icloud.com";
}

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    password: "",
    confirmPassword: "",
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const normalizedEmail = formData.email.trim().toLowerCase();

    if (!isAllowedEmail(normalizedEmail)) {
      setError("Please use a Gmail or iCloud email address.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    const response = await fetch("/api/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: normalizedEmail,
        password: formData.password,
        phone: formData.phone.trim(),
      }),
    });

    const data = await response.json();
    setIsLoading(false);

    if (!response.ok) {
      setError(data?.error ?? "Unable to register.");
      return;
    }

    setMessage(`Account created for ${data.firstName}. Please log in.`);
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      dateOfBirth: "",
      gender: "",
      password: "",
      confirmPassword: "",
    });
  }

  return (
    <main className="h-screen overflow-hidden bg-slate-100 p-2">
      <section className="mx-auto h-[calc(100vh-1rem)] max-w-[1500px] rounded-3xl border border-white bg-slate-200/70 p-2 shadow-xl">
        <div className="grid h-full overflow-hidden rounded-2xl bg-white lg:grid-cols-[1fr_1.05fr]">

          {/* LEFT SIDE */}
          <div className="flex h-full min-h-0 flex-col px-6 py-5 sm:px-10 lg:px-12 xl:px-16">
            <Header />

            {/* REGISTRATION FORM */}
            <div className="mx-auto flex min-h-0 w-full max-w-[540px] flex-1 items-center">
              <div className="w-full py-2">

                <div className="mb-4 text-center">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                    Create your donor account
                  </h1>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Join BloodBridge and start your blood donation journey.
                  </p>
                </div>

                {error && (
                  <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}
                  </div>
                )}

                {message && (
                  <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                    {message}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3">

                  {/* FIRST NAME + LAST NAME */}
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="First name" htmlFor="firstName">
                      <input
                        id="firstName"
                        type="text"
                        required
                        placeholder="First name"
                        value={formData.firstName}
                        onChange={(event) =>
                          setFormData((current) => ({
                            ...current,
                            firstName: event.target.value,
                          }))
                        }
                        className="formInput"
                      />
                    </FormField>

                    <FormField label="Last name" htmlFor="lastName">
                      <input
                        id="lastName"
                        type="text"
                        required
                        placeholder="Last name"
                        value={formData.lastName}
                        onChange={(event) =>
                          setFormData((current) => ({
                            ...current,
                            lastName: event.target.value,
                          }))
                        }
                        className="formInput"
                      />
                    </FormField>
                  </div>

                  {/* EMAIL */}
                  <FormField label="Email address" htmlFor="email">
                    <input
                      id="email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="name@gmail.com"
                      value={formData.email}
                      onChange={(event) =>
                        setFormData((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                      className="formInput"
                    />
                  </FormField>

                  {/* PHONE + DATE OF BIRTH */}
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Phone number" htmlFor="phone">
                      <input
                        id="phone"
                        type="tel"
                        required
                        placeholder="+237 6XX XXX XXX"
                        value={formData.phone}
                        onChange={(event) =>
                          setFormData((current) => ({
                            ...current,
                            phone: event.target.value,
                          }))
                        }
                        className="formInput"
                      />
                    </FormField>

                    <FormField label="Date of birth" htmlFor="dateOfBirth">
                      <input
                        id="dateOfBirth"
                        type="date"
                        required
                        value={formData.dateOfBirth}
                        onChange={(event) =>
                          setFormData((current) => ({
                            ...current,
                            dateOfBirth: event.target.value,
                          }))
                        }
                        className="formInput"
                      />
                    </FormField>
                  </div>

                  {/* GENDER */}
                  <FormField label="Gender" htmlFor="gender">
                    <select
                      id="gender"
                      required
                      value={formData.gender}
                      onChange={(event) =>
                        setFormData((current) => ({
                          ...current,
                          gender: event.target.value,
                        }))
                      }
                      className="formInput"
                    >
                      <option value="">Select gender</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                    </select>
                  </FormField>

                  {/* PASSWORDS */}
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Password" htmlFor="password">
                      <div className="relative">
                        <input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          required
                          minLength={8}
                          autoComplete="new-password"
                          placeholder="Password"
                          value={formData.password}
                          onChange={(event) =>
                            setFormData((current) => ({
                              ...current,
                              password: event.target.value,
                            }))
                          }
                          className="formInput pr-11"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setShowPassword((current) => !current)
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                        >
                          {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                        </button>
                      </div>
                    </FormField>

                    <FormField
                      label="Confirm password"
                      htmlFor="confirmPassword"
                    >
                      <div className="relative">
                        <input
                          id="confirmPassword"
                          type={
                            showConfirmPassword ? "text" : "password"
                          }
                          required
                          minLength={8}
                          autoComplete="new-password"
                          placeholder="Confirm"
                          value={formData.confirmPassword}
                          onChange={(event) =>
                            setFormData((current) => ({
                              ...current,
                              confirmPassword: event.target.value,
                            }))
                          }
                          className="formInput pr-11"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword((current) => !current)
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                          aria-label={
                            showConfirmPassword
                              ? "Hide password"
                              : "Show password"
                          }
                        >
                          {showConfirmPassword ? (
                            <EyeOffIcon />
                          ) : (
                            <EyeIcon />
                          )}
                        </button>
                      </div>
                    </FormField>
                  </div>

                  {/* TERMS */}
                  <label className="flex cursor-pointer items-start gap-2 text-[11px] leading-4 text-slate-500">
                    <input
                      type="checkbox"
                      required
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-slate-300 accent-red-950"
                    />

                    <span>
                      I agree to the{" "}
                      <Link
                        href="/terms"
                        className="font-semibold text-red-950 hover:underline"
                      >
                        Terms
                      </Link>{" "}
                      and{" "}
                      <Link
                        href="/privacy"
                        className="font-semibold text-red-950 hover:underline"
                      >
                        Privacy Policy
                      </Link>
                      .
                    </span>
                  </label>

                  {/* BUTTON */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    style={{ backgroundColor: PRIMARY_RED }}
                    className="flex h-11 w-full items-center justify-center rounded-xl text-sm font-semibold text-white shadow-lg shadow-red-950/20 transition hover:brightness-125 focus:outline-none focus:ring-4 focus:ring-red-950/20 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isLoading ? "Creating account..." : "Create account"}
                  </button>
                </form>

                <p className="mt-3 text-center text-xs text-slate-500">
                  Already have a donor account?{" "}
                  <Link
                    href="/login"
                    className="font-semibold text-red-950 hover:underline"
                  >
                    Log in
                  </Link>
                </p>
              </div>
            </div>

            {/* FOOTER */}
            <footer className="flex shrink-0 items-center justify-between border-t border-slate-100 pt-3 text-[10px] text-slate-400">
              <p>
                Copyright © {new Date().getFullYear()} BloodBridge Health
                Systems.
              </p>

              <div className="flex gap-4">
                <Link
                  href="/privacy"
                  className="transition hover:text-slate-700"
                >
                  Privacy
                </Link>

                <Link
                  href="/terms"
                  className="transition hover:text-slate-700"
                >
                  Terms
                </Link>
              </div>
            </footer>
          </div>

          {/* RIGHT SIDE */}
          <RegistrationPanel />
        </div>
      </section>

      <style jsx global>{`
        .formInput {
          height: 42px;
          width: 100%;
          border-radius: 12px;
          border: 1px solid rgb(226 232 240);
          background: white;
          padding-left: 14px;
          padding-right: 14px;
          font-size: 12px;
          color: rgb(15 23 42);
          outline: none;
          transition: 0.2s ease;
        }

        .formInput::placeholder {
          color: rgb(148 163 184);
        }

        .formInput:focus {
          border-color: rgb(69 10 10);
          box-shadow: 0 0 0 4px rgba(69, 10, 10, 0.08);
        }
      `}</style>
    </main>
  );
}

/* =========================================================
   FORM FIELD
========================================================= */

function FormField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1 block text-[11px] font-semibold text-slate-700"
      >
        {label}
      </label>

      {children}
    </div>
  );
}

/* =========================================================
   HEADER
========================================================= */

function Header() {
  return (
    <header className="flex shrink-0 items-center gap-3">
      <div
        style={{ backgroundColor: PRIMARY_RED }}
        className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm"
      >
        <BloodDropIcon />
      </div>

      <div>
        <p className="text-xl font-bold text-slate-950">
          BloodBridge
        </p>

        <p className="text-xs text-slate-400">
          Intelligent Blood Donation Platform
        </p>
      </div>
    </header>
  );
}

/* =========================================================
   RIGHT PANEL
========================================================= */

function RegistrationPanel() {
  return (
    <aside
      style={{ backgroundColor: PRIMARY_RED }}
      className="relative hidden h-full min-h-0 overflow-hidden px-8 py-6 text-white lg:flex lg:flex-col lg:justify-center xl:px-10"
    >
      <DecorativeBackground />

      <div className="relative z-10 mx-auto w-full max-w-[680px]">
        {/* INTRO */}
        <div className="mb-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] on-garnet">
            <span className="h-1.5 w-1.5 rounded-full bg-red-200" />
            Join BloodBridge
          </span>

          <h2 className="mt-3 max-w-[580px] text-3xl font-semibold leading-tight">
            Start your journey as a blood donor.
          </h2>

          <p className="mt-2 max-w-xl text-xs leading-5 on-garnet">
            Create your donor account and stay connected with healthcare
            institutions when your donation can make a difference.
          </p>
        </div>

        {/* WHITE CARD */}
        <div className="rounded-3xl border border-white/20 bg-white/95 p-4 text-slate-900 shadow-2xl">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-slate-400">
                Donor journey
              </p>

              <h3 className="mt-1 text-sm font-bold text-slate-950">
                Everything you need in one place
              </h3>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-950/5 text-red-950">
              <HeartIcon />
            </div>
          </div>

          {/* FEATURE CARDS */}
          <div className="grid grid-cols-2 gap-2">
            <FeatureCard
              icon={<CheckCircleIcon />}
              title="Check eligibility"
              text="Know when you are eligible to donate."
            />

            <FeatureCard
              icon={<CalendarIcon />}
              title="Book appointments"
              text="Schedule your next donation online."
            />

            <FeatureCard
              icon={<BellIcon />}
              title="Stay informed"
              text="Receive reminders and donor alerts."
            />

            <FeatureCard
              icon={<HeartIcon />}
              title="Track donations"
              text="View your donation history and impact."
            />
          </div>

          {/* STEPS */}
          <div className="mt-3 rounded-2xl bg-slate-50 p-3">
            <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-slate-400">
              Getting started
            </p>

            <div className="mt-2 grid grid-cols-3 gap-2">
              <SmallStep
                number="1"
                title="Register"
              />

              <SmallStep
                number="2"
                title="Complete profile"
              />

              <SmallStep
                number="3"
                title="Book donation"
              />
            </div>
          </div>

          {/* SAFE INFO */}
          <div className="mt-3 flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-700">
              <ShieldIcon />
            </div>

            <div>
              <p className="text-[10px] font-bold text-emerald-800">
                Your information is protected
              </p>

              <p className="mt-0.5 text-[8px] text-emerald-700/70">
                Your donor information is securely managed by BloodBridge.
              </p>
            </div>

            <span className="ml-auto rounded-full bg-white px-2 py-1 text-[8px] font-bold text-emerald-700">
              Secure
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}

/* =========================================================
   FEATURE CARD
========================================================= */

function FeatureCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-950/5 text-red-950">
        {icon}
      </div>

      <p className="mt-2 text-[10px] font-bold text-slate-900">
        {title}
      </p>

      <p className="mt-0.5 text-[8px] leading-3.5 text-slate-500">
        {text}
      </p>
    </div>
  );
}

/* =========================================================
   SMALL STEP
========================================================= */

function SmallStep({
  number,
  title,
}: {
  number: string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-white px-2.5 py-2">
      <div
        style={{ backgroundColor: PRIMARY_RED }}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[9px] font-bold text-white"
      >
        {number}
      </div>

      <p className="text-[8px] font-semibold text-slate-700">
        {title}
      </p>
    </div>
  );
}

/* =========================================================
   ICONS
========================================================= */

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

function HeartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="M20.8 5.7a5.3 5.3 0 0 0-7.5 0L12 7l-1.3-1.3a5.3 5.3 0 0 0-7.5 7.5L12 22l8.8-8.8a5.3 5.3 0 0 0 0-7.5Z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M16 2v4M8 2v4M4 10h16" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 2.5 2.5L16 9" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" />
      <path d="M10 21h4" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M12 3 5 6v5c0 5 2.8 8.5 7 10 4.2-1.5 7-5 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M1 12s4.5-7 11-7 11 7 11 7-4.5 7-11 7S1 12 1 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M17.94 17.94C16.21 19.08 14.16 19.75 12 19.75c-6.5 0-11-7-11-7a20.16 20.16 0 0 1 4.66-5.16" />
      <path d="M1 1l22 22" />
      <path d="M9.88 9.88A3 3 0 0 0 14.12 14.12" />
    </svg>
  );
}

function DecorativeBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 opacity-30">
      <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />

      <div className="absolute bottom-0 right-0 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
    </div>
  );
}