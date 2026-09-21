"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  PageHeader,
  PrimaryLink,
  SecondaryLink,
  StatGrid,
  Stat,
} from "@/src/components/ui/Page";
import {
  DONATIONS_PER_CONSULTATION,
  describeConsultationProgress,
  getConsultationProgress,
} from "@/src/lib/consultation";

const PRIMARY_RED = "oklch(27.1% 0.105 12.094)";

type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  // /api/auth/me already returns these for donors; the dashboard leads with them.
  bloodGroup: string | null;
  eligibilityStatus: boolean | null;
  nextEligibleDate: string | null;
  donations: number | null;
  livesImpacted: number | null;
  upcomingAppointment: {
    appointmentDate: string;
    appointmentTime: string;
    healthInstitute: { name: string; city: string };
  } | null;
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
    <div className="mx-auto max-w-6xl">
      <DonorHeader user={user} />

      <StatRow user={user} />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <AppointmentPanel user={user} />

          <BloodRequests />
        </div>

        <div className="space-y-6">
          <ConsultationPanel donations={user.donations ?? 0} />

          <DonationJourney />
        </div>
      </div>
    </div>
  );
}

// Clinical dashboards lead with the reader's status, not with a marketing
// banner. Greeting stays small; the actions sit on the same line.
function DonorHeader({ user }: { user: User }) {
  return (
    <PageHeader
      eyebrow="Donor overview"
      title={`Hello, ${user.firstName}.`}
      description={
        user.eligibilityStatus
          ? "You are eligible to donate. Book a visit whenever suits you."
          : "Complete your eligibility check to book your next donation."
      }
      actions={
        <>
          <PrimaryLink href="/appointments/book">Book donation</PrimaryLink>
          <SecondaryLink href="/eligibility">Check eligibility</SecondaryLink>
        </>
      }
    />
  );
}

// The four facts a donor actually opens this page for.
function StatRow({ user }: { user: User }) {
  const appointment = user.upcomingAppointment;

  return (
    <div className="mt-7"><StatGrid>
      <Stat label="Blood group" value={user.bloodGroup ?? "Not set"} foot="On your donor profile" />

      <Stat
        label="Eligibility"
        value={user.eligibilityStatus ? "Eligible" : "Not yet"}
        foot={user.nextEligibleDate ?? "Complete the check"}
        tone={user.eligibilityStatus ? "good" : "default"}
      />

      <Stat
        label="Donations"
        value={String(user.donations ?? 0)}
        foot={`${user.livesImpacted ?? 0} lives supported`}
      />

      <Stat
        label="Next appointment"
        value={
          appointment
            ? new Date(appointment.appointmentDate).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
              })
            : "None"
        }
        foot={
          appointment
            ? `${appointment.appointmentTime} · ${appointment.healthInstitute.name}`
            : "Nothing scheduled"
        }
      />
    </StatGrid></div>
  );
}

/*
  Free-consultation entitlement. Platform policy grants one free consultation
  per three completed donations, so the donor needs to see three things: how
  many they have banked, where they are in the current cycle, and that the
  entitlement is honoured by every participating institute.
*/
function ConsultationPanel({ donations }: { donations: number }) {
  const consultation = getConsultationProgress(donations);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10.5px] font-semibold tracking-[0.09em] text-slate-500 uppercase">
          Free consultation
        </p>

        {consultation.earned > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
            {consultation.earned} earned
          </span>
        )}
      </div>

      <p className="mt-4 text-[28px] leading-none font-semibold tracking-[-0.025em] tabular-nums text-slate-950">
        {consultation.earned}
      </p>

      <p className="mt-2.5 text-xs text-slate-500">
        consultation{consultation.earned === 1 ? "" : "s"} available to redeem
      </p>

      {/* Three discrete segments, because the entitlement is granted per whole
          donation — a continuous bar would imply partial credit. */}
      <div
        className="mt-5 flex gap-1.5"
        role="progressbar"
        aria-valuenow={consultation.progressInCycle}
        aria-valuemin={0}
        aria-valuemax={DONATIONS_PER_CONSULTATION}
        aria-label="Donations towards your next free consultation"
      >
        {Array.from({ length: DONATIONS_PER_CONSULTATION }).map((_, index) => (
          <span
            key={index}
            className={`h-2 flex-1 rounded-full transition-colors duration-500 ${
              index < consultation.progressInCycle
                ? "bg-gradient-to-r from-crimson to-garnet"
                : "bg-slate-200"
            }`}
          />
        ))}
      </div>

      <p className="mt-3.5 text-xs leading-5 text-slate-600">
        {describeConsultationProgress(consultation)}
      </p>

      <p className="mt-4 border-t border-slate-100 pt-4 text-[11px] leading-5 text-slate-500">
        Every participating health institute grants one free medical consultation for every{" "}
        {DONATIONS_PER_CONSULTATION} completed donations.{" "}
        <Link
          href="/privacy#free-consultation"
          className="font-semibold text-garnet underline-offset-4 hover:underline"
        >
          Read the policy
        </Link>
      </p>
    </section>
  );
}

function AppointmentPanel({ user }: { user: User }) {
  const appointment = user.upcomingAppointment;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-slate-500">
          Upcoming appointment
        </p>

        <Link href="/appointments" className="text-xs font-semibold text-red-900 hover:underline">
          All appointments
        </Link>
      </div>

      {appointment ? (
        <div className="mt-5 flex flex-wrap items-center gap-5">
          <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-red-950 text-white">
            <span className="text-lg font-bold leading-none tabular-nums">
              {new Date(appointment.appointmentDate).getDate()}
            </span>
            <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide">
              {new Date(appointment.appointmentDate).toLocaleDateString("en-GB", { month: "short" })}
            </span>
          </div>

          <div className="min-w-0">
            <p className="text-base font-bold text-slate-950">
              {new Date(appointment.appointmentDate).toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {appointment.appointmentTime} · {appointment.healthInstitute.name},{" "}
              {appointment.healthInstitute.city}
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-slate-300 px-5 py-8 text-center">
          <p className="text-sm font-semibold text-slate-700">No appointment scheduled</p>
          <p className="mx-auto mt-1.5 max-w-sm text-xs leading-5 text-slate-500">
            Once you pass the eligibility check you can pick a centre, date and time.
          </p>
          <Link
            href="/appointments/book"
            className="mt-4 inline-flex h-10 items-center rounded-xl bg-red-950 px-4 text-xs font-semibold text-white transition hover:brightness-125"
          >
            Book a donation
          </Link>
        </div>
      )}
    </section>
  );
}

function BloodRequests() {
  return (
    <section className="overflow-hidden rounded-2xl border border-red-200 bg-red-50">
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
            href="/request"
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

function DonationJourney() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
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

function LoadingPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bb-bg)",
        color: "var(--bb-text)",
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
        backgroundColor: "var(--bb-bg)",
        color: "var(--bb-text)",
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

