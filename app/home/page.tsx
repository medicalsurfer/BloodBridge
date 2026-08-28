"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const PRIMARY_RED = "oklch(27.1% 0.105 12.094)";

type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
};

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadUser = async () => {
      try {
        console.log("Loading current BloodBridge user...");

        const response = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        console.log("AUTH STATUS:", response.status);

        const text = await response.text();

        console.log("AUTH RESPONSE:", text);

        let data;

        try {
          data = JSON.parse(text);
        } catch {
          setError(
            `The /api/auth/me route did not return valid JSON. HTTP status: ${response.status}`
          );

          return;
        }

        if (!response.ok) {
          setError(
            data.error ||
              `Authentication request failed with status ${response.status}.`
          );

          return;
        }

        if (!data.user) {
          setError(
            "The authentication API worked, but no user object was returned."
          );

          return;
        }

        setUser(data.user);
      } catch (error) {
        console.error("HOME PAGE ERROR:", error);

        setError(
          error instanceof Error
            ? error.message
            : "Unable to connect to the authentication API."
        );
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  if (loading) {
    return <LoadingPage />;
  }

  if (error) {
    return <ErrorPage error={error} />;
  }

  if (!user) {
    return (
      <ErrorPage error="No authenticated BloodBridge user was returned." />
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#f1f5f9",
        color: "#0f172a",
      }}
      className="p-2"
    >
      <section className="mx-auto min-h-[calc(100vh-1rem)] max-w-375 overflow-hidden rounded-3xl border border-white bg-white shadow-xl">
        <Navbar user={user} />

        <div className="bg-slate-50/70 px-5 py-6 sm:px-8 lg:px-12 xl:px-16">
          <WelcomeSection user={user} />

          <div className="mt-6 grid gap-5 xl:grid-cols-[1.45fr_0.75fr]">
            <div className="space-y-5">
              <HeroCard user={user} />

              <QuickActions />

              <BloodRequests />
            </div>

            <div className="space-y-5">
              <ProfileCard user={user} />

              <DonationJourney />

              <NotificationsCard />
            </div>
          </div>

          <DonationCentreSection />
        </div>
      </section>
    </main>
  );
}

function Navbar({ user }: { user: User }) {
  return (
    <header className="flex h-19.5 items-center justify-between border-b border-slate-100 bg-white px-5 sm:px-8 lg:px-12 xl:px-16">
      <Link href="/home" className="flex items-center gap-3">
        <div
          style={{
            backgroundColor: PRIMARY_RED,
          }}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm"
        >
          <BloodDropIcon />
        </div>

        <div className="hidden sm:block">
          <p className="text-lg font-bold text-slate-950">
            BloodBridge
          </p>

          <p className="text-[9px] text-slate-400">
            Intelligent Blood Donation Platform
          </p>
        </div>
      </Link>

      <nav className="hidden items-center gap-1 lg:flex">
        <NavItem href="/home" active>
          Home
        </NavItem>

        <NavItem href="/appointments">
          Appointments
        </NavItem>

        <NavItem href="/donations">
          My donations
        </NavItem>

        <NavItem href="/requests">
          Blood requests
        </NavItem>

        <NavItem href="/notifications">
          Notifications
        </NavItem>
      </nav>

      <div className="flex items-center gap-3">
        <Link
          href="/notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
        >
          <BellIcon />

          <span
            style={{
              backgroundColor: PRIMARY_RED,
            }}
            className="absolute right-2 top-2 h-2 w-2 rounded-full ring-2 ring-white"
          />
        </Link>

        <Link
          href="/profile"
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-2 py-1.5 transition hover:bg-slate-50"
        >
          <div
            style={{
              backgroundColor: PRIMARY_RED,
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white"
          >
            {getInitials(user)}
          </div>

          <div className="hidden text-left sm:block">
            <p className="max-w-37.5 truncate text-xs font-semibold text-slate-800">
              {user.firstName} {user.lastName}
            </p>

            <p className="text-[9px] text-slate-400">
              {formatRole(user.role)}
            </p>
          </div>

          <ChevronDownIcon />
        </Link>
      </div>
    </header>
  );
}

function NavItem({
  href,
  children,
  active = false,
}: {
  href: string;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      style={
        active
          ? {
              color: PRIMARY_RED,
            }
          : undefined
      }
      className={`rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
        active
          ? "bg-red-950/5"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      {children}
    </Link>
  );
}

function WelcomeSection({ user }: { user: User }) {
  return (
    <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-semibold text-slate-400">
          Donor home
        </p>

        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          Hello, {user.firstName}.
        </h1>

        <p className="mt-2 max-w-155 text-sm leading-6 text-slate-500">
          Manage your donation activities and stay informed about blood needs
          from participating healthcare institutions.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
        <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
          Signed in as
        </p>

        <p className="mt-0.5 max-w-70 truncate text-xs font-semibold text-slate-700">
          {user.email}
        </p>
      </div>
    </section>
  );
}

function HeroCard({ user }: { user: User }) {
  return (
    <section
      style={{
        backgroundColor: PRIMARY_RED,
      }}
      className="relative overflow-hidden rounded-[28px] px-6 py-7 text-white shadow-lg shadow-red-950/10 sm:px-8"
    >
      <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-white/6" />

      <div className="pointer-events-none absolute -bottom-32 right-32 h-64 w-64 rounded-full border border-white/6" />

      <div className="relative z-10 grid gap-8 lg:grid-cols-[1fr_280px] lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-300" />

            <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-red-50">
              Account active
            </span>
          </div>

          <h2 className="mt-5 max-w-142.5 text-2xl font-bold leading-tight sm:text-3xl">
            Ready to continue your donation journey, {user.firstName}?
          </h2>

          <p className="mt-3 max-w-130 text-sm leading-6 text-red-100/70">
            Check your eligibility, book donation appointments and stay
            informed about current blood requirements.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/appointments/book"
              className="flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-xs font-bold text-red-950 transition hover:bg-red-50"
            >
              <CalendarIcon />

              Book donation
            </Link>

            <Link
              href="/eligibility"
              className="flex h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 text-xs font-semibold text-white transition hover:bg-white/15"
            >
              Check eligibility

              <ArrowIcon />
            </Link>
          </div>
        </div>

        <div className="rounded-[22px] border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
          <div className="flex items-start justify-between">
            <div className="min-w-0 pr-3">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-red-100/60">
                Your account
              </p>

              <p className="mt-2 text-lg font-bold">
                {user.firstName} {user.lastName}
              </p>

              <p className="mt-1 truncate text-[10px] text-red-100/60">
                {user.email}
              </p>
            </div>

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-sm font-bold text-red-950">
              {getInitials(user)}
            </div>
          </div>

          <div className="mt-6 border-t border-white/10 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-red-100/60">
                Account role
              </span>

              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[9px] font-bold text-white">
                {formatRole(user.role)}
              </span>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-[10px] text-red-100/60">
                Status
              </span>

              <span className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />

                Active
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function QuickActions() {
  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <p className="text-sm font-bold text-slate-900">
          Quick actions
        </p>

        <p className="mt-1 text-[11px] text-slate-400">
          Access your main donation activities.
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ActionCard
          href="/appointments/book"
          icon={<CalendarIcon />}
          title="Book donation"
          description="Schedule your next donation."
        />

        <ActionCard
          href="/eligibility"
          icon={<EligibilityIcon />}
          title="Check eligibility"
          description="Review if you can donate."
        />

        <ActionCard
          href="/donations"
          icon={<HistoryIcon />}
          title="My donations"
          description="Review your donation history."
        />

        <ActionCard
          href="/donor/centers"
          icon={<LocationIcon />}
          title="Find centre"
          description="Locate participating centres."
        />
      </div>
    </section>
  );
}

function ActionCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition hover:-translate-y-0.5 hover:border-red-950/10 hover:bg-white hover:shadow-md"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-red-950 shadow-sm">
        {icon}
      </div>

      <p className="mt-4 text-xs font-bold text-slate-900">
        {title}
      </p>

      <p className="mt-1 text-[10px] leading-4 text-slate-400">
        {description}
      </p>

      <div className="mt-4 text-red-950 opacity-60 transition group-hover:translate-x-1 group-hover:opacity-100">
        <ArrowIcon />
      </div>
    </Link>
  );
}

function BloodRequests() {
  return (
    <section className="overflow-hidden rounded-3xl border border-red-100 bg-red-50/50">
      <div className="grid md:grid-cols-[1fr_auto]">
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-950 text-white">
              <AlertIcon />
            </div>

            <div>
              <p className="text-xs font-bold text-slate-900">
                Blood requests
              </p>

              <p className="mt-2 text-lg font-bold text-slate-950">
                See where blood is currently needed.
              </p>

              <p className="mt-2 max-w-140 text-xs leading-5 text-slate-500">
                View blood requests submitted by participating healthcare
                institutions.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center border-t border-red-100 bg-white/50 p-5 md:border-l md:border-t-0">
          <Link
            href="/requests"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-red-950 px-5 text-xs font-semibold text-white transition hover:brightness-125 md:w-auto"
          >
            View requests

            <ArrowIcon />
          </Link>
        </div>
      </div>
    </section>
  );
}

function ProfileCard({ user }: { user: User }) {
  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            style={{
              backgroundColor: PRIMARY_RED,
            }}
            className="flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-bold text-white"
          >
            {getInitials(user)}
          </div>

          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-slate-900">
              {user.firstName} {user.lastName}
            </p>

            <p className="mt-0.5 text-[9px] text-slate-400">
              {formatRole(user.role)}
            </p>
          </div>
        </div>

        <Link
          href="/profile"
          className="text-[10px] font-semibold text-red-950 hover:underline"
        >
          Profile
        </Link>
      </div>

      <div className="mt-5 space-y-3">
        <ProfileItem
          label="First name"
          value={user.firstName}
        />

        <ProfileItem
          label="Last name"
          value={user.lastName}
        />

        <ProfileItem
          label="Email address"
          value={user.email}
        />

        <ProfileItem
          label="Account role"
          value={formatRole(user.role)}
        />
      </div>

      <Link
        href="/profile"
        className="mt-5 flex h-10 w-full items-center justify-center rounded-xl border border-slate-200 text-[10px] font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        Manage profile
      </Link>
    </section>
  );
}

function ProfileItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-[8px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 wrap-break-word text-[11px] font-bold text-slate-800">
        {value}
      </p>
    </div>
  );
}

function DonationJourney() {
  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-slate-900">
            Donation journey
          </p>

          <p className="mt-1 text-[9px] text-slate-400">
            Continue your donor process.
          </p>
        </div>

        <HeartIcon />
      </div>

      <div className="mt-5">
        <JourneyItem
          title="Account created"
          description="Your BloodBridge account is active."
          completed
        />

        <JourneyItem
          title="Complete donor profile"
          description="Provide the required donor information."
          active
        />

        <JourneyItem
          title="Check eligibility"
          description="Confirm whether you can donate."
        />

        <JourneyItem
          title="Book donation"
          description="Choose a participating centre."
          last
        />
      </div>
    </section>
  );
}

function JourneyItem({
  title,
  description,
  completed = false,
  active = false,
  last = false,
}: {
  title: string;
  description: string;
  completed?: boolean;
  active?: boolean;
  last?: boolean;
}) {
  return (
    <div className="relative flex gap-3 pb-5 last:pb-0">
      <div className="relative flex flex-col items-center">
        <div
          className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full border ${
            completed
              ? "border-red-950 bg-red-950 text-white"
              : active
              ? "border-red-950 bg-white text-red-950"
              : "border-slate-200 bg-white text-slate-300"
          }`}
        >
          {completed ? (
            <CheckIcon />
          ) : (
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
          )}
        </div>

        {!last && (
          <div className="absolute bottom-0 top-7 w-px bg-slate-100" />
        )}
      </div>

      <div className="pt-1">
        <p
          className={`text-[10px] font-bold ${
            active ? "text-red-950" : "text-slate-700"
          }`}
        >
          {title}
        </p>

        <p className="mt-1 text-[9px] leading-4 text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}

function NotificationsCard() {
  return (
    <section
      style={{
        backgroundColor: PRIMARY_RED,
      }}
      className="relative overflow-hidden rounded-3xl p-5 text-white"
    >
      <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/5" />

      <div className="relative">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
          <BellIcon />
        </div>

        <p className="mt-4 text-xs font-bold">
          Stay informed
        </p>

        <p className="mt-2 text-[10px] leading-5 text-red-100/65">
          Receive updates about appointments, donation eligibility and blood
          requests.
        </p>

        <Link
          href="/notifications"
          className="mt-4 inline-flex items-center gap-2 text-[10px] font-semibold text-white"
        >
          View notifications

          <ArrowIcon />
        </Link>
      </div>
    </section>
  );
}

function DonationCentreSection() {
  return (
    <section className="mt-5 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-slate-900">
            Donation centres
          </p>

          <p className="mt-1 text-[10px] text-slate-400">
            Find healthcare institutions participating in BloodBridge.
          </p>
        </div>

        <Link
          href="/donor/centers"
          className="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-[10px] font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          View centres

          <ArrowIcon />
        </Link>
      </div>

      <div className="mt-5 rounded-2xl bg-slate-50 p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-red-950 shadow-sm">
          <HospitalIcon />
        </div>

        <p className="mt-4 text-xs font-bold text-slate-800">
          Find a donation centre
        </p>

        <p className="mx-auto mt-2 max-w-120 text-[10px] leading-5 text-slate-400">
          Search participating institutions and find a suitable location for
          your next donation.
        </p>

        <Link
          href="/donor/centers"
          className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-red-950 px-4 text-[10px] font-semibold text-white transition hover:brightness-125"
        >
          Browse centres

          <ArrowIcon />
        </Link>
      </div>
    </section>
  );
}

function LoadingPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#f1f5f9",
        color: "#0f172a",
      }}
      className="flex items-center justify-center"
    >
      <div className="text-center">
        <div
          style={{
            backgroundColor: PRIMARY_RED,
          }}
          className="mx-auto flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl text-white"
        >
          <BloodDropIcon />
        </div>

        <p className="mt-4 text-sm font-semibold text-slate-800">
          Loading BloodBridge
        </p>

        <p className="mt-1 text-xs text-slate-400">
          Retrieving your account.
        </p>
      </div>
    </main>
  );
}

function ErrorPage({ error }: { error: string }) {
  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#f1f5f9",
        color: "#0f172a",
      }}
      className="flex items-center justify-center p-6"
    >
      <div className="w-full max-w-130 rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <div
          style={{
            backgroundColor: PRIMARY_RED,
          }}
          className="flex h-12 w-12 items-center justify-center rounded-2xl text-white"
        >
          <AlertIcon />
        </div>

        <h1 className="mt-5 text-xl font-bold text-slate-950">
          Unable to load BloodBridge
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          {error}
        </p>

        <div className="mt-5 rounded-xl bg-slate-50 p-4">
          <p className="text-[10px] font-bold text-slate-700">
            Authentication endpoint
          </p>

          <p className="mt-1 text-[10px] text-slate-500">
            /api/auth/me
          </p>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex h-11 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Try again
          </button>

          <Link
            href="/login"
            className="flex h-11 flex-1 items-center justify-center rounded-xl bg-red-950 text-xs font-semibold text-white hover:brightness-125"
          >
            Go to login
          </Link>
        </div>
      </div>
    </main>
  );
}

function getInitials(user: User) {
  const first = user.firstName?.charAt(0) || "";
  const last = user.lastName?.charAt(0) || "";

  return `${first}${last}`.toUpperCase();
}

function formatRole(role: string) {
  if (!role) {
    return "User";
  }

  return role
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function BloodDropIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M12 3.5c2.8 3.8 7 8.9 7 12.5a7 7 0 1 1-14 0c0-3.6 4.2-8.7 7-12.5Z" />
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
      <rect x="4" y="5" width="16" height="15" rx="3" />

      <path d="M8 3v4M16 3v4M4 10h16" />
    </svg>
  );
}

function EligibilityIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="12" r="9" />

      <path d="m8 12 2.5 2.5L16 9" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M3 12a9 9 0 1 0 3-6.7" />

      <path d="M3 4v6h6" />

      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />

      <circle cx="12" cy="10" r="2.5" />
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

function AlertIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M12 3 2.5 20h19L12 3Z" />

      <path d="M12 9v4" />

      <circle
        cx="12"
        cy="16.5"
        r=".7"
        fill="currentColor"
      />
    </svg>
  );
}

function HospitalIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect
        x="4"
        y="3"
        width="16"
        height="18"
        rx="2"
      />

      <path d="M9 21v-5h6v5" />

      <path d="M12 6v6" />

      <path d="M9 9h6" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 text-red-950"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M5 12h14" />

      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="mr-1 h-3.5 w-3.5 text-slate-400"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}