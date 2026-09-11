"use client";

// Next.js navigation component
import Link from "next/link";
import { useRouter } from "next/navigation";

// React types and hooks
import { FormEvent, useState } from "react";

// Main BloodBridge brand colour
const PRIMARY_RED = "oklch(27.1% 0.105 12.094)";

export default function LoginPage() {
  const router = useRouter();

  // Controls whether the password is visible
  const [showPassword, setShowPassword] = useState(false);

  // Stores the "Remember me" checkbox state
  const [rememberMe, setRememberMe] = useState(false);

  // Used while the login request is running
  const [isLoading, setIsLoading] = useState(false);

  // Success message shown after login
  const [message, setMessage] = useState<string | null>(null);

  // Error message shown if login fails
  const [error, setError] = useState<string | null>(null);

  // Stores the email and password entered by the user
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  function isAllowedEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  return (
    normalizedEmail.endsWith("@gmail.com") ||
    normalizedEmail.endsWith("@icloud.com")
  );
}

  // Runs when the login form is submitted
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Prevent the browser from refreshing the page
    event.preventDefault();

    // Reset previous messages
    setError(null);
    setMessage(null);

    const normalizedEmail = formData.email.trim().toLowerCase();

if (!isAllowedEmail(normalizedEmail)) {
  setError("Please use a Gmail or iCloud email address.");
  return;
}

    // Disable the form while authentication is running
    setIsLoading(true);

    try {
      // Send email and password to the login API
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
        email: normalizedEmail,
          password: formData.password,
        }),
      });

      // Convert the API response to JSON
      const data = await response.json();

      // Development logs
      // Check these in F12 > Console
      console.log("LOGIN STATUS:", response.status);
      console.log("LOGIN RESPONSE:", data);

      // If the API returns 400, 401, 500, etc.
      if (!response.ok) {
        setError(data?.error ?? "Unable to sign in.");
        return;
      }

      // If we reach this point:
      // 1. The email exists
      // 2. The password matched
      // 3. The backend created the JWT
      // 4. The bloodbridge_session cookie was created

      console.log("LOGIN SUCCESSFUL");
      console.log("LOGGED IN USER:", data.user);

      const destination =
        data?.redirectTo ??
        (data?.user?.role === "SYSTEM_ADMIN"
          ? "/system-admin"
          : "/home");

      setMessage(
        `Welcome back, ${data?.user?.firstName ?? "Donor"}! Login successful.`
      );

      router.replace(destination);
    } catch (fetchError) {
      // Usually means the frontend could not reach the API
      console.error("LOGIN ERROR:", fetchError);

      setError(
        "Unable to communicate with the server. Please try again."
      );
    } finally {
      // Re-enable the form
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-2">
      <section className="mx-auto min-h-[calc(100vh-1rem)] max-w-375 rounded-3xl border border-white bg-slate-200/70 p-2 shadow-xl">
        <div className="grid min-h-[calc(100vh-2rem)] overflow-hidden rounded-[20px] bg-white lg:grid-cols-[1fr_1.05fr]">
          
          {/* LEFT SIDE */}
          <div className="flex min-h-0 flex-col px-6 py-5 sm:px-10 lg:px-12 xl:px-16">
            
            <Header />

            <div className="mx-auto flex min-h-0 w-full max-w-130 flex-1 items-center">
              <div className="w-full py-4">
                
                {/* Page title */}
                <div className="mb-6 text-center">
                  <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                    Welcome Back
                  </h1>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Enter your account details to access your BloodBridge
                    workspace.
                  </p>
                </div>

                {/* LOGIN FORM */}
                <form
                  onSubmit={handleSubmit}
                  className="space-y-4"
                >
                  
                  {/* EMAIL */}
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-2 block text-sm font-semibold text-slate-800"
                    >
                      Email address
                    </label>

                    <input
                      id="email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="name@gmail.com"
                      value={formData.email}
                      disabled={isLoading}
                      onChange={(event) =>
                        setFormData((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                      className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-red-900 focus:ring-4 focus:ring-red-900/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                    />
                  </div>

                  {/* PASSWORD */}
                  <div>
                    <label
                      htmlFor="password"
                      className="mb-2 block text-sm font-semibold text-slate-800"
                    >
                      Password
                    </label>

                    <div className="relative">
                      <input
                        id="password"
                        type={
                          showPassword
                            ? "text"
                            : "password"
                        }
                        required
                        autoComplete="current-password"
                        placeholder="Enter your password"
                        value={formData.password}
                        disabled={isLoading}
                        onChange={(event) =>
                          setFormData((current) => ({
                            ...current,
                            password: event.target.value,
                          }))
                        }
                        className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-14 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-red-900 focus:ring-4 focus:ring-red-900/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                      />

                      {/* SHOW / HIDE PASSWORD */}
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() =>
                          setShowPassword(
                            (current) => !current
                          )
                        }
                        aria-label={
                          showPassword
                            ? "Hide password"
                            : "Show password"
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700 disabled:cursor-not-allowed"
                      >
                        {showPassword ? (
                          <EyeOffIcon />
                        ) : (
                          <EyeIcon />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* REMEMBER ME AND FORGOT PASSWORD */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        disabled={isLoading}
                        onChange={(event) =>
                          setRememberMe(
                            event.target.checked
                          )
                        }
                        className="h-4 w-4 rounded border-slate-300 accent-red-950"
                      />

                      Remember me
                    </label>

                    <Link
                      href="/forgot-password"
                      className="text-sm font-semibold text-red-950 hover:underline"
                    >
                      Forgot your password?
                    </Link>
                  </div>

                  {/* LOGIN ERROR */}
                  {error && (
                    <div
                      role="alert"
                      className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
                    >
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700">
                        <ErrorIcon />
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-red-800">
                          Login failed
                        </p>

                        <p className="mt-0.5 text-xs leading-5 text-red-700">
                          {error}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* LOGIN SUCCESS */}
                  {message && (
                    <div
                      role="status"
                      className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3"
                    >
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        <CheckIcon />
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-emerald-800">
                          Login successful
                        </p>

                        <p className="mt-0.5 text-xs leading-5 text-emerald-700">
                          {message}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* LOGIN BUTTON */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                      backgroundColor: PRIMARY_RED,
                    }}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white shadow-lg shadow-red-950/20 transition hover:brightness-125 focus:outline-none focus:ring-4 focus:ring-red-950/20 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:brightness-100"
                  >
                    {isLoading ? (
                      <>
                        <LoadingSpinner />
                        Signing in...
                      </>
                    ) : (
                      "Log in"
                    )}
                  </button>
                </form>

                {/* SOCIAL LOGIN DIVIDER */}
                <div className="my-5 flex items-center gap-4">
                  <div className="h-px flex-1 bg-slate-200" />

                  <span className="text-sm text-slate-400">
                    Or continue with
                  </span>

                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                {/* SOCIAL LOGIN BUTTONS */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    className="flex h-12 items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <GoogleIcon />
                    Google
                  </button>

                  <button
                    type="button"
                    className="flex h-12 items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <MicrosoftIcon />
                    Microsoft
                  </button>
                </div>

                {/* REGISTER LINK */}
                <p className="mt-5 text-center text-sm text-slate-500">
                  Do not have a donor account?{" "}
                  <Link
                    href="/register"
                    className="font-semibold text-red-950 hover:underline"
                  >
                    Register now
                  </Link>
                </p>
              </div>
            </div>

            {/* FOOTER */}
            <footer className="flex flex-col gap-2 border-t border-slate-100 pt-4 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
              <p>
                Copyright ©{" "}
                {new Date().getFullYear()} BloodBridge Health
                Systems.
              </p>

              <div className="flex gap-5">
                <Link
                  href="/privacy"
                  className="transition hover:text-slate-700"
                >
                  Privacy policy
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

          {/* RIGHT SIDE DONOR PREVIEW */}
          <DonorPanel />
        </div>
      </section>
    </main>
  );
}

// BloodBridge header
function Header() {
  return (
    <header className="flex items-center gap-3">
      <div
        style={{
          backgroundColor: PRIMARY_RED,
        }}
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

// Decorative donor information displayed on desktop
function DonorPanel() {
  return (
    <aside
      style={{
        backgroundColor: PRIMARY_RED,
      }}
      className="relative hidden min-h-0 overflow-hidden px-8 py-6 text-white lg:flex lg:h-full lg:flex-col lg:justify-center xl:px-10"
    >
      <DecorativeBackground />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-170 flex-col justify-center">
        <div className="mb-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-red-100 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-red-200" />
            Your donation journey
          </span>

          <h2 className="mt-3 max-w-155 text-3xl font-semibold leading-[1.08] xl:text-4xl">
            Every donation creates another chance at life.
          </h2>

          <p className="mt-2 max-w-xl text-sm leading-5 text-red-100/75">
            Follow your eligibility, appointments and donation
            impact from your BloodBridge donor account.
          </p>
        </div>

        <div className="w-full rounded-[26px] border border-white/20 bg-white/95 p-4 text-slate-900 shadow-2xl backdrop-blur-sm">
          <DonorDashboardPreview />
        </div>
      </div>
    </aside>
  );
}

function DonorDashboardPreview() {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Donor overview
          </p>

          <h3 className="mt-1 text-base font-bold text-slate-950">
            Your donation profile
          </h3>

          <p className="mt-0.5 text-[11px] text-slate-500">
            You are currently eligible for your next donation.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-700">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>

          Eligible
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <DonorStatCard
          title="Blood group"
          value="O+"
          description="High demand"
          icon={<BloodDropSmallIcon />}
        />

        <DonorStatCard
          title="Donations"
          value="6"
          description="Completed"
          icon={<HeartIcon />}
        />

        <DonorStatCard
          title="Lives impacted"
          value="18"
          description="Estimated"
          icon={<PeopleIcon />}
        />
      </div>

      <div className="grid gap-2.5 xl:grid-cols-[1.15fr_0.85fr]">
        <UpcomingAppointmentCard />
        <DonationMilestoneCard />
      </div>

      <RecentDonationCard />
    </div>
  );
}

function DonorStatCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="group rounded-2xl border border-slate-100 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-400">
            {title}
          </p>

          <p className="mt-1.5 text-xl font-bold text-slate-950">
            {value}
          </p>
        </div>

        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-950/5 text-red-950">
          {icon}
        </div>
      </div>

      <p className="mt-1 text-[9px] font-medium text-slate-500">
        {description}
      </p>
    </div>
  );
}

function UpcomingAppointmentCard() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Upcoming appointment
          </p>

          <p className="mt-2 text-sm font-bold text-slate-950">
            14 August 2026
          </p>

          <div className="mt-2 space-y-1.5">
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <ClockIcon />
              <span>10:30 AM</span>
            </div>

            <div className="flex items-center gap-2 text-[11px] font-medium text-slate-700">
              <LocationIcon />
              <span>Dispensaire Odza</span>
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: PRIMARY_RED,
          }}
          className="shrink-0 rounded-xl px-3 py-2 text-center text-white shadow-md shadow-red-950/20"
        >
          <p className="text-lg font-bold leading-none">
            14
          </p>

          <p className="mt-1 text-[8px] font-semibold uppercase tracking-wide">
            Aug
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5">
        <div>
          <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-400">
            Next eligible date
          </p>

          <p className="mt-1 text-[11px] font-bold text-slate-800">
            18 September 2026
          </p>
        </div>

        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-950/5 text-red-950">
          <CalendarIcon />
        </div>
      </div>
    </div>
  );
}

function DonationMilestoneCard() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-3.5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Donation milestone
          </p>

          <p className="mt-1 text-[10px] text-slate-500">
            Your progress
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-950/10 text-red-950">
          <BloodDropSmallIcon />
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-xl font-bold leading-none text-slate-950">
              6 of 10
            </p>

            <p className="mt-1.5 text-[9px] leading-4 text-slate-500">
              Four more donations to reach your next milestone.
            </p>
          </div>

          <span className="text-[11px] font-bold text-red-950">
            60%
          </span>
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            style={{
              width: "60%",
              backgroundColor: PRIMARY_RED,
            }}
            className="h-full rounded-full"
          />
        </div>
      </div>

      <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2">
        <p className="text-[9px] font-semibold text-amber-700">
          Next reward: Silver donor badge
        </p>
      </div>
    </div>
  );
}

function RecentDonationCard() {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white px-3.5 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
          <CheckIcon />
        </div>

        <div className="min-w-0">
          <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Recent donation
          </p>

          <p className="mt-1 text-[11px] font-bold text-slate-800">
            12 May 2026 at Dispensaire Odza
          </p>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-[10px] font-bold text-emerald-700">
          Completed successfully
        </p>

        <p className="mt-0.5 text-[8px] text-slate-400">
          Thank you for donating
        </p>
      </div>
    </div>
  );
}

// Spinner displayed while login request is running
function LoadingSpinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
      />

      <path
        className="opacity-90"
        fill="currentColor"
        d="M12 3a9 9 0 0 1 9 9h-3a6 6 0 0 0-6-6V3Z"
      />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6" />
      <path d="M12 17h.01" />
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

function PeopleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M3.5 20c.4-4 2.3-6 5.5-6s5.1 2 5.5 6" />
      <path d="M14 15c3.8-.8 6.1 1 6.5 5" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
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
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="M17.94 17.94C16.21 19.08 14.16 19.75 12 19.75c-6.5 0-11-7-11-7a20.16 20.16 0 0 1 4.66-5.16" />
      <path d="M1 1l22 22" />
      <path d="M9.88 9.88A3 3 0 0 0 14.12 14.12" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        d="M21.6 12.2c0-.7-.1-1.4-.3-2.1H12v4h5.4c-.2 1.1-.8 2-1.6 2.6v2.2h2.6c1.5-1.4 2.4-3.4 2.4-6.7Z"
        fill="#4285F4"
      />

      <path
        d="M12 22c2.7 0 4.9-.9 6.5-2.4l-2.6-2.2c-.7.5-1.6.9-3.9.9-3 0-5.6-2-6.5-4.8H2.7v2.9C4.3 19.8 7.8 22 12 22Z"
        fill="#34A853"
      />

      <path
        d="M5.5 13.5c-.2-.5-.3-1-.3-1.5s.1-1 .3-1.5V7.6H2.7A9.9 9.9 0 0 0 2 12c0 1.6.4 3.2 1.1 4.6l2.4-2.1Z"
        fill="#FBBC05"
      />

      <path
        d="M12 5.5c1.4 0 2.6.5 3.6 1.5l2.7-2.7C16.8 2.7 14.6 2 12 2 7.8 2 4.3 4.2 2.7 7.6l2.8 2.2C6.4 7.5 8.9 5.5 12 5.5Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="3"
        width="7"
        height="7"
        fill="#F35325"
      />

      <rect
        x="14"
        y="3"
        width="7"
        height="7"
        fill="#81BC06"
      />

      <rect
        x="3"
        y="14"
        width="7"
        height="7"
        fill="#05A6F0"
      />

      <rect
        x="14"
        y="14"
        width="7"
        height="7"
        fill="#FFBA08"
      />
    </svg>
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

function DecorativeBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 opacity-30">
      <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />

      <div className="absolute bottom-0 right-0 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
    </div>
  );
}

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5h4" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M12 21s8-4.5 8-11a8 8 0 1 0-16 0c0 6.5 8 11 8 11Z" />
      <circle cx="12" cy="10" r="2.5" />
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
      strokeWidth="2"
      aria-hidden="true"
    >
      <rect
        x="4"
        y="4"
        width="16"
        height="16"
        rx="3"
      />

      <path d="M16 2v4M8 2v4M4 10h16" />
    </svg>
  );
}

function BloodDropSmallIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="M12 3.5c2.8 3.8 7 8.9 7 12.5a7 7 0 1 1-14 0c0-3.6 4.2-8.7 7-12.5Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}