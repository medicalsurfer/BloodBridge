"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const PRIMARY_RED = "oklch(27.1% 0.105 12.094)";

type Donor = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  bloodGroup: string;
  donations: number;
  livesImpacted: number;
  nextEligibleDate: string;
};

export default function DonorHomePage() {
  const router = useRouter();

  const [showNotifications, setShowNotifications] = useState(false);
  const [donor, setDonor] = useState<Donor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadCurrentDonor() {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        // If the user is not logged in, return to the login page
        if (response.status === 401) {
          router.push("/login");
          return;
        }

        if (!response.ok) {
          throw new Error("Unable to load donor profile.");
        }

        const data = await response.json();
        const currentUser = data.user ?? data;

        setDonor({
          id: currentUser.id,
          email: currentUser.email,
          firstName: currentUser.firstName ?? "",
          lastName: currentUser.lastName ?? "",
          bloodGroup: currentUser.bloodGroup ?? "Not set",
          donations: currentUser.donations ?? 0,
          livesImpacted: currentUser.livesImpacted ?? 0,
          nextEligibleDate: currentUser.nextEligibleDate ?? "Not available",
        });
      } catch (err) {
        console.error("Failed to load donor:", err);

        setError("We could not load your donor profile.");
      } finally {
        setIsLoading(false);
      }
    }

    loadCurrentDonor();
  }, [router]);

  // Loading state
  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm font-medium text-slate-500">
          Loading your donor dashboard...
        </p>
      </main>
    );
  }

  // Error state
  if (error || !donor) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
          <p className="font-semibold text-red-950">
            {error || "Unable to load donor profile."}
          </p>

          <Link
            href="/login"
            className="mt-4 inline-flex rounded-xl bg-red-950 px-4 py-2 text-sm font-semibold text-white"
          >
            Return to login
          </Link>
        </div>
      </main>
    );
  }

  // Main donor dashboard
  return (
    <main className="min-h-screen bg-slate-50">
      <TopNavigation
        donor={donor}
        showNotifications={showNotifications}
        setShowNotifications={setShowNotifications}
      />

      <div className="mx-auto max-w-375 px-4 py-6 sm:px-6 lg:px-8">
        <WelcomeSection donor={donor} />

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Blood group"
            value={donor.bloodGroup}
            description="Your registered blood type"
            icon={<BloodDropIcon />}
          />

          <StatCard
            title="Donations"
            value={String(donor.donations)}
            description="Successful donations"
            icon={<HeartIcon />}
          />

          <StatCard
            title="Lives impacted"
            value={String(donor.livesImpacted)}
            description="Estimated lives supported"
            icon={<PeopleIcon />}
          />

          <StatCard
            title="Eligibility"
            value="Eligible"
            description="You can currently donate"
            icon={<CheckCircleIcon />}
            success
          />
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-6">
            <AppointmentCard />

            <QuickActions />

            <DonationHistory />
          </div>

          <div className="space-y-6">
            <EligibilityCard donor={donor} />

            <BloodNeedCard />

            <ImpactCard donor={donor} />
          </div>
        </div>
      </div>
    </main>
  );
}

function TopNavigation({
  donor,
  showNotifications,
  setShowNotifications,
}: {
  donor: Donor;
  showNotifications: boolean;
  setShowNotifications: (value: boolean) => void;
}) {
  return (
    <div className="border-b border-slate-200 bg-white/95 px-4 py-4 shadow-sm sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-375 items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            style={{ backgroundColor: PRIMARY_RED }}
            className="flex h-11 w-11 items-center justify-center rounded-2xl text-white"
          >
            <BloodDropIcon />
          </div>

          <div>
            <p className="text-sm font-medium text-slate-500">
              Welcome back
            </p>

            <p className="text-base font-semibold text-slate-950">
              {donor.firstName} {donor.lastName}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowNotifications(!showNotifications)}
          className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700"
        >
          Notifications
        </button>
      </div>
    </div>
  );
}

function WelcomeSection({ donor }: { donor: Donor }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            Dashboard overview
          </p>

          <h1 className="mt-2 text-3xl font-semibold text-slate-950">
            Hello, {donor.firstName}.
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Here is your donor summary and next steps for donating blood safely.
          </p>
        </div>

        <div className="rounded-3xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <p className="font-semibold text-slate-950">
            Next eligible date
          </p>

          <p className="mt-1">
            {donor.nextEligibleDate}
          </p>
        </div>
      </div>
    </section>
  );
}

function StatCard({
  title,
  value,
  description,
  icon,
  success = false,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  success?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            {title}
          </p>

          <p className="mt-3 text-3xl font-semibold text-slate-950">
            {value}
          </p>

          <p className="mt-2 text-sm text-slate-500">
            {description}
          </p>
        </div>

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-3xl ${
            success
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-100 text-slate-700"
          }`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function AppointmentCard() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
        Upcoming appointment
      </p>

      <p className="mt-3 text-xl font-semibold text-slate-950">
        14 August 2026
      </p>

      <div className="mt-4 space-y-2 text-sm text-slate-600">
        <p>Dispensaire Odza</p>
        <p>10:30 AM</p>
      </div>
    </div>
  );
}

function QuickActions() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Quick actions
          </p>

          <p className="mt-2 text-sm text-slate-600">
            Book your next appointment or update your donor profile.
          </p>
        </div>

        <button
          type="button"
          className="rounded-2xl bg-red-950 px-4 py-2 text-sm font-semibold text-white"
        >
          View
        </button>
      </div>
    </div>
  );
}

function DonationHistory() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Donation history
          </p>

          <p className="mt-2 text-sm text-slate-600">
            Your completed donations: {0}
          </p>
        </div>
      </div>
    </div>
  );
}

function EligibilityCard({ donor }: { donor: Donor }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
        Eligibility
      </p>

      <p className="mt-3 text-sm text-slate-600">
        Review your donor eligibility before booking your next appointment.
      </p>

      <p className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-700">
        Next donation window begins on {donor.nextEligibleDate}
      </p>
    </div>
  );
}

function BloodNeedCard() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
        Blood needs
      </p>

      <p className="mt-3 text-sm text-slate-600">
        Current blood requirements will appear here.
      </p>
    </div>
  );
}

function ImpactCard({ donor }: { donor: Donor }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
        Impact
      </p>

      <p className="mt-3 text-sm text-slate-600">
        Your donations have helped {donor.livesImpacted} people so far.
      </p>
    </div>
  );
}

function BloodDropIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
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

function CheckCircleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}