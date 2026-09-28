"use client";

// Next.js navigation component
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

// React types and hooks
import { FormEvent, useState } from "react";

// Main BloodBridge brand colour
const PRIMARY_RED = "oklch(27.1% 0.105 12.094)";

/*
  Google sign-in happens across a browser redirect, so it cannot return a
  message the way the fetch to /api/login does. The callback sends the donor
  back to /login?error=<reason> instead, and these are the sentences those
  reasons stand for. Each one names what went wrong and what to do next.
*/
const GOOGLE_SIGN_IN_ERRORS: Record<string, string> = {
  google_unavailable:
    "Google sign-in is not configured on this server yet. Use your email and password for now.",
  google_cancelled:
    "Google sign-in was cancelled. Nothing changed — try again, or use your email and password.",
  google_domain:
    "That Google account uses an address we cannot accept. Only Gmail and iCloud addresses are allowed.",
  account_inactive:
    "This account is inactive. Please contact your BloodBridge administrator.",
  rate_limited: "Too many sign-in attempts. Please wait a few minutes and try again.",
  google_failed:
    "Google sign-in could not be completed. Please try again, or use your email and password.",
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

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

  // Once the form is used, its result replaces any message carried in the URL.
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Stores the email and password entered by the user
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  /*
    A failed Google sign-in comes back as /login?error=<reason>, which is the
    only way a redirect can report anything. It is read straight out of the
    URL and shown where a password failure would appear.

    Derived rather than copied into state: useSearchParams resolves on the
    server and the client alike, so there is no effect writing state after
    mount and no first paint that disagrees with the markup. Submitting the
    form supersedes it, since the form's own error takes precedence below.
  */
  const signInError = (() => {
    const reason = searchParams.get("error");
    if (!reason) return null;

    return GOOGLE_SIGN_IN_ERRORS[reason] ?? GOOGLE_SIGN_IN_ERRORS.google_failed;
  })();

  const shownError = error ?? (hasSubmitted ? null : signInError);

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
    setHasSubmitted(true);
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
        <div className="grid min-h-[calc(100vh-2rem)] overflow-hidden rounded-2xl bg-white lg:grid-cols-[1fr_1.05fr]">
          
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
                  {shownError && (
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
                          {shownError}
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

                {/*
                  A link, not a button: signing in with Google is a navigation
                  away to accounts.google.com, which /api/auth/google performs
                  after minting the state and nonce the callback checks.
                  `aria-disabled` rather than a disabled attribute, because an
                  anchor has no disabled state to set.
                */}
                <a
                  href="/api/auth/google"
                  aria-disabled={isLoading}
                  onClick={(event) => {
                    if (isLoading) event.preventDefault();
                  }}
                  className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 aria-disabled:pointer-events-none aria-disabled:opacity-60"
                >
                  <GoogleIcon />
                  Continue with Google
                </a>

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

/*
  The panel beside the form, on desktop.

  It used to be a white dashboard card floating on the gradient: a made-up
  donor's blood group, donation count and next appointment, shown to someone
  who has not signed in yet. It read as a screenshot pasted onto the page, and
  the facts in it belonged to nobody.

  What replaces it is set on the gradient itself rather than in a container,
  and every figure is a rule that is true before anyone signs in — two of them
  the platform's own (MIN_DAYS_BETWEEN_DONATIONS and ELIGIBILITY_VALID_FOR_MS
  in src/lib/eligibility.ts). The ledger's last rule does not stop: it carries
  on as a heartbeat that draws itself once.
*/
function DonorPanel() {
  return (
    <aside
      className="relative hidden min-h-0 overflow-hidden bg-gradient-to-br from-garnet via-plum to-garnet-deep px-8 py-8 text-white lg:flex lg:h-full lg:flex-col lg:justify-center xl:px-12"
      /*
        This panel is a dark garnet surface in both themes, so its text cannot
        use the red-* scale: dark mode re-points red-100 to oklch(30%), which
        is the lightness of the panel itself, and the copy disappears. These
        two tints are fixed, and taken from the brand hue rather than gray so
        they belong to the surface they sit on.
      */
      style={
        {
          "--panel-text": "oklch(91% 0.035 12.094)",
          "--panel-text-dim": "oklch(84% 0.05 12.094)",
        } as React.CSSProperties
      }
    >
      <DecorativeBackground />

      {/*
        Everything is capped to the column's own width rather than a fixed
        max-w, which used to overshoot the 1.05fr track at 1440px and clip the
        heading. `min-w-0` lets the flex child actually shrink.
      */}
      <div
        className="relative z-10 mx-auto flex min-w-0 w-full max-w-[540px] flex-col justify-center"
        style={{ animation: "var(--animate-rise)", animationDelay: "120ms" }}
      >
        <h2 className="text-[34px] leading-[1.06] font-semibold tracking-[-0.025em] text-balance xl:text-[40px]">
          Every donation creates another chance at life.
        </h2>

        <p className="mt-5 max-w-[46ch] text-[15px] leading-7 text-[var(--panel-text)]">
          Follow your eligibility, appointments and donation impact from your
          BloodBridge donor account.
        </p>

        <ImpactLedger />

        <p className="mt-7 text-[13px] leading-6 text-[var(--panel-text-dim)]">
          Screened before every visit, recorded the moment it happens.
        </p>
      </div>
    </aside>
  );
}

/*
  Three rules of donation, as a specimen table.

  Terms in the body face, small and letterspaced; values in Fraunces so the
  numeral is the thing the eye lands on. Hairlines rather than boxes — the
  rows are separated by the rules between them, not by containers around them.
*/
const DONATION_RULES = [
  {
    term: "One donation helps",
    qualifier: "up to",
    value: "3",
    unit: "patients",
  },
  { term: "Between donations", qualifier: null, value: "56", unit: "days" },
  {
    term: "A screening stays valid",
    qualifier: null,
    value: "24",
    unit: "hours",
  },
] as const;

function ImpactLedger() {
  return (
    <>
      <dl className="mt-9 border-t border-white/15">
        {DONATION_RULES.map((rule, index) => (
          <div
            key={rule.term}
            /*
            The final row carries no rule of its own: the heartbeat below is
            its rule, so the ledger ends by coming alive rather than by
            closing with one more hairline.
          */
            className={`flex items-baseline justify-between gap-6 py-4 ${
              index === DONATION_RULES.length - 1
                ? ""
                : "border-b border-white/15"
            }`}
            style={{
              animation: "var(--animate-fade)",
              animationDelay: `${260 + index * 70}ms`,
            }}
          >
            <dt className="text-[11px] font-semibold tracking-[0.16em] text-[var(--panel-text-dim)] uppercase">
              {rule.term}
            </dt>

            <dd className="flex shrink-0 items-baseline gap-1.5">
              {rule.qualifier ? (
                <span className="text-[13px] text-[var(--panel-text)]">
                  {rule.qualifier}
                </span>
              ) : null}

              <span className="font-display text-[30px] leading-none font-semibold tracking-[-0.02em] text-white tabular-nums">
                {rule.value}
              </span>

              <span className="text-[13px] text-[var(--panel-text)]">
                {rule.unit}
              </span>
            </dd>
          </div>
        ))}
      </dl>

      {/* A sibling of the list, not a child: <dl> takes dt, dd and div only. */}
      <Heartbeat />
    </>
  );
}

/*
  The ledger's closing rule, alive. One authored moment for the panel: the
  line draws itself left to right, and the point it arrives at keeps beating.
  Both stop under prefers-reduced-motion, which globals.css enforces globally.
*/
function Heartbeat() {
  return (
    <svg
      viewBox="0 0 520 34"
      className="h-[34px] w-full overflow-visible"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M0 17 H188 l11 -1.5 l9 3.5 l10 -13 l11 26 l10 -17 l9 2 H520"
        stroke="var(--color-gold)"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={
          {
            "--dash": "600",
            strokeDasharray: 600,
            animation: "var(--animate-draw-line)",
            animationDelay: "480ms",
          } as React.CSSProperties
        }
      />

      <circle cx="520" cy="17" r="3" fill="var(--color-gold)" />

      <circle
        cx="520"
        cy="17"
        r="3"
        fill="var(--color-gold)"
        style={{
          animation: "var(--animate-beacon)",
          animationDelay: "1.9s",
          transformOrigin: "520px 17px",
        }}
      />
    </svg>
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
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div
        className="absolute -top-20 -left-16 h-[340px] w-[340px] rounded-full bg-rose/20 blur-3xl"
        style={{ animation: "var(--animate-drift)" }}
      />

      <div
        className="absolute -right-16 bottom-0 h-[320px] w-[320px] rounded-full bg-ember/15 blur-3xl"
        style={{ animation: "var(--animate-drift)", animationDelay: "-7s" }}
      />

      {/* Deepens the corners so the headline sits on the darkest part of the
          gradient rather than on a drift glow passing behind it. */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_45%,transparent_35%,oklch(19%_0.085_8/0.55)_100%)]" />
    </div>
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