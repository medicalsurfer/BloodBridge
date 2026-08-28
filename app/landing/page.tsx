import Link from "next/link";
import { getTotalUsers } from "../../src/lib/prisma";

const PRIMARY_RED = "oklch(27.1% 0.105 12.094)";

export default async function LandingPage() {
  const totalUsers = await getTotalUsers();

  return (
    <main className="min-h-screen bg-slate-100 p-2">
      <section className="mx-auto min-h-[calc(100vh-1rem)] max-w-[1500px] overflow-hidden rounded-[24px] border border-white bg-white shadow-xl">
        <Navbar />

        <section className="grid min-h-[calc(100vh-92px)] lg:grid-cols-[1fr_1.02fr]">
          <div className="flex items-center px-6 py-10 sm:px-10 lg:px-14 xl:px-20">
            <div className="max-w-[650px]">
              <div className="inline-flex items-center gap-2 rounded-full border border-red-950/10 bg-red-950/5 px-3 py-1.5">
                <span
                  style={{ backgroundColor: PRIMARY_RED }}
                  className="h-2 w-2 rounded-full"
                />

                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-red-950">
                  Intelligent blood donation platform
                </span>
              </div>

              <h1 className="mt-6 text-4xl font-bold leading-[1.08] tracking-tight text-slate-950 sm:text-5xl xl:text-6xl">
                Connecting blood donors with the people who need them most.
              </h1>

              <p className="mt-5 max-w-[590px] text-sm leading-7 text-slate-500 sm:text-base">
                BloodBridge helps donors manage their donation journey while
                enabling healthcare institutions to coordinate blood requests,
                monitor availability and reach eligible donors faster.
              </p>

              <p className="mt-4 text-sm font-semibold text-red-950">
                Over {totalUsers.toLocaleString()} registered donors and counting.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/register"
                  style={{ backgroundColor: PRIMARY_RED }}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold text-white shadow-lg shadow-red-950/20 transition hover:brightness-125"
                >
                  Become a donor
                  <ArrowIcon />
                </Link>

                <Link
                  href="/login"
                  className="flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Log in
                </Link>
              </div>

              <div className="mt-8 grid max-w-[580px] grid-cols-3 gap-3">
                <MiniStat
                  value="Simple"
                  label="Donor registration"
                />

                <MiniStat
                  value="Fast"
                  label="Emergency response"
                />

                <MiniStat
                  value="Secure"
                  label="Donor information"
                />
              </div>
            </div>
          </div>

          <HeroPanel />
        </section>

        <FeaturesSection />

        <HowItWorksSection />

        <InstitutionSection />

        <CallToAction />

        <Footer />
      </section>
    </main>
  );
}

function Navbar() {
  return (
    <header className="flex h-[84px] items-center justify-between border-b border-slate-100 px-6 sm:px-10 lg:px-14 xl:px-20">
      <Link href="/landing" className="flex items-center gap-3">
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

          <p className="text-[10px] text-slate-400">
            Intelligent Blood Donation Platform
          </p>
        </div>
      </Link>

      <nav className="hidden items-center gap-7 text-sm font-medium text-slate-500 md:flex">
        <a
          href="#about"
          className="transition hover:text-slate-950"
        >
          About
        </a>

        <a
          href="#features"
          className="transition hover:text-slate-950"
        >
          Features
        </a>

        <a
          href="#how-it-works"
          className="transition hover:text-slate-950"
        >
          How it works
        </a>

        <a
          href="#institutions"
          className="transition hover:text-slate-950"
        >
          Institutions
        </a>
      </nav>

      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="hidden h-10 items-center rounded-xl px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 sm:flex"
        >
          Log in
        </Link>

        <Link
          href="/register"
          style={{ backgroundColor: PRIMARY_RED }}
          className="flex h-10 items-center rounded-xl px-4 text-sm font-semibold text-white shadow-md shadow-red-950/15 transition hover:brightness-125"
        >
          Register
        </Link>
      </div>
    </header>
  );
}

function HeroPanel() {
  return (
    <div
      id="about"
      style={{ backgroundColor: PRIMARY_RED }}
      className="relative hidden overflow-hidden lg:flex lg:items-center lg:justify-center"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-20 -top-20 h-[420px] w-[420px] rounded-full bg-white/[0.07] blur-3xl" />

        <div className="absolute -bottom-32 -left-24 h-[380px] w-[380px] rounded-full bg-red-400/10 blur-3xl" />

        <div className="absolute left-[15%] top-[10%] h-[260px] w-[260px] rounded-full border border-white/[0.06]" />

        <div className="absolute bottom-[5%] right-[8%] h-[330px] w-[330px] rounded-full border border-white/[0.05]" />
      </div>

      <div className="relative z-10 flex h-full w-full max-w-[720px] flex-col justify-center px-10 py-10 xl:px-14">
        <div className="max-w-[560px]">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-200 opacity-50" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-200" />
            </span>

            <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-red-100">
              A connected donation network
            </span>
          </div>

          <h2 className="mt-4 text-3xl font-semibold leading-[1.1] text-white xl:text-[38px]">
            Connecting every donor to a moment that matters.
          </h2>

          <p className="mt-3 max-w-[510px] text-xs leading-5 text-red-100/70">
            BloodBridge connects eligible donors with healthcare institutions
            and helps blood reach the right place when it is needed.
          </p>
        </div>

        <div className="relative mt-8 h-[400px] w-full">
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 700 400"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M348 198 C270 135, 190 120, 110 115"
              stroke="rgba(255,255,255,0.18)"
              strokeWidth="1.5"
              strokeDasharray="5 7"
            />

            <path
              d="M350 200 C430 132, 515 115, 605 118"
              stroke="rgba(255,255,255,0.18)"
              strokeWidth="1.5"
              strokeDasharray="5 7"
            />

            <path
              d="M350 204 C275 280, 200 305, 110 315"
              stroke="rgba(255,255,255,0.18)"
              strokeWidth="1.5"
              strokeDasharray="5 7"
            />

            <path
              d="M352 204 C430 278, 520 300, 610 310"
              stroke="rgba(255,255,255,0.18)"
              strokeWidth="1.5"
              strokeDasharray="5 7"
            />
          </svg>

          <div className="absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.08] blur-2xl" />

          <div className="absolute left-1/2 top-1/2 flex h-[175px] w-[175px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-white/10 shadow-2xl backdrop-blur-xl">
            <div className="absolute inset-3 rounded-full border border-white/10" />

            <div className="absolute inset-7 rounded-full bg-white/[0.06]" />

            <div className="relative text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-white text-red-950 shadow-xl">
                <BloodDropHeroIcon />
              </div>

              <p className="mt-3 text-sm font-bold text-white">
                BloodBridge
              </p>

              <p className="mt-1 text-[8px] uppercase tracking-[0.14em] text-red-100/60">
                Connecting lives
              </p>
            </div>
          </div>

          <div className="absolute left-0 top-8 w-[205px] rounded-[20px] border border-white/15 bg-white/[0.1] p-3.5 shadow-xl backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-red-950">
                <UserIcon />
              </div>

              <div>
                <p className="text-[8px] font-semibold uppercase tracking-[0.12em] text-red-100/60">
                  Donor
                </p>

                <p className="mt-0.5 text-[11px] font-bold text-white">
                  Eligible to donate
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between rounded-xl bg-white/[0.08] px-3 py-2">
              <span className="text-[9px] text-red-100/70">
                Blood group
              </span>

              <span className="text-sm font-bold text-white">
                O+
              </span>
            </div>
          </div>

          <div className="absolute right-0 top-10 w-[205px] rounded-[20px] border border-white/15 bg-white/[0.1] p-3.5 shadow-xl backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-red-950">
                <HospitalIcon />
              </div>

              <div>
                <p className="text-[8px] font-semibold uppercase tracking-[0.12em] text-red-100/60">
                  Health institute
                </p>

                <p className="mt-0.5 text-[11px] font-bold text-white">
                  Dispensaire Odza
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/[0.08] px-3 py-2">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />

              <span className="text-[9px] font-medium text-red-50">
                Blood services active
              </span>
            </div>
          </div>

          <div className="absolute bottom-7 left-1 w-[215px] rounded-[20px] border border-red-300/20 bg-white/[0.11] p-3.5 shadow-xl backdrop-blur-xl">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-200 text-red-950">
                <AlertIcon />
              </div>

              <div>
                <p className="text-[8px] font-semibold uppercase tracking-[0.12em] text-red-100/60">
                  Emergency request
                </p>

                <p className="mt-1 text-[11px] font-bold text-white">
                  O- blood urgently needed
                </p>

                <p className="mt-1 text-[8px] text-red-100/60">
                  Matching eligible donors nearby
                </p>
              </div>
            </div>
          </div>

          <div className="absolute bottom-5 right-0 w-[215px] rounded-[20px] border border-white/15 bg-white/[0.1] p-3.5 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[8px] font-semibold uppercase tracking-[0.12em] text-red-100/60">
                  Smart matching
                </p>

                <p className="mt-1 text-[11px] font-bold text-white">
                  Suitable donor found
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-300/20 text-emerald-200">
                <CheckIcon />
              </div>
            </div>

            <div className="mt-3">
              <div className="mb-1.5 flex items-center justify-between text-[8px]">
                <span className="text-red-100/60">
                  Match confidence
                </span>

                <span className="font-bold text-white">
                  94%
                </span>
              </div>

              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-[94%] rounded-full bg-emerald-300" />
              </div>
            </div>
          </div>

          <div className="absolute left-[26%] top-[42%] h-2 w-2 rounded-full bg-red-200/60 shadow-[0_0_16px_rgba(254,202,202,0.8)]" />

          <div className="absolute right-[27%] top-[40%] h-1.5 w-1.5 rounded-full bg-white/60 shadow-[0_0_14px_rgba(255,255,255,0.7)]" />

          <div className="absolute bottom-[29%] left-[30%] h-1.5 w-1.5 rounded-full bg-white/50" />

          <div className="absolute bottom-[28%] right-[30%] h-2 w-2 rounded-full bg-emerald-300/60" />
        </div>
      </div>
    </div>
  );
}

function FeaturesSection() {
  return (
    <section
      id="features"
      className="bg-slate-50 px-6 py-20 sm:px-10 lg:px-14 xl:px-20"
    >
      <div className="mx-auto max-w-[1250px]">
        <div className="max-w-[640px]">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-950">
            Platform capabilities
          </p>

          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
            Built around the blood donation process.
          </h2>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            BloodBridge gives donors and healthcare institutions the tools
            needed to manage blood donation activities from one platform.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            icon={<EligibilityIcon />}
            title="Donor eligibility"
            description="Help donors understand when they are eligible for their next donation."
          />

          <FeatureCard
            icon={<CalendarIcon />}
            title="Appointments"
            description="Allow donors to book and manage donation appointments with participating centres."
          />

          <FeatureCard
            icon={<BloodDropSmallIcon />}
            title="Blood management"
            description="Support healthcare institutions in monitoring blood availability and requests."
          />

          <FeatureCard
            icon={<BellIcon />}
            title="Notifications"
            description="Inform donors about appointments, eligibility and urgent blood needs."
          />
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="px-6 py-20 sm:px-10 lg:px-14 xl:px-20"
    >
      <div className="mx-auto max-w-[1250px]">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-950">
            How it works
          </p>

          <h2 className="mt-3 text-3xl font-bold text-slate-950">
            A simpler donation journey.
          </h2>

          <p className="mx-auto mt-3 max-w-[600px] text-sm leading-6 text-slate-500">
            BloodBridge connects donor registration, eligibility and donation
            activities through one digital workflow.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-[1050px] gap-4 md:grid-cols-4">
          <ProcessCard
            number="01"
            title="Register"
            description="Create your BloodBridge donor account."
          />

          <ProcessCard
            number="02"
            title="Complete profile"
            description="Provide the information required for donor management."
          />

          <ProcessCard
            number="03"
            title="Check eligibility"
            description="Know whether you are ready for your next donation."
          />

          <ProcessCard
            number="04"
            title="Donate"
            description="Book an appointment and contribute when blood is needed."
          />
        </div>
      </div>
    </section>
  );
}

function InstitutionSection() {
  return (
    <section
      id="institutions"
      className="bg-slate-950 px-6 py-20 text-white sm:px-10 lg:px-14 xl:px-20"
    >
      <div className="mx-auto grid max-w-[1250px] items-center gap-12 lg:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-300">
            For healthcare institutions
          </p>

          <h2 className="mt-3 max-w-[560px] text-3xl font-bold leading-tight">
            Improve blood coordination across your institution.
          </h2>

          <p className="mt-4 max-w-[580px] text-sm leading-7 text-slate-400">
            Healthcare institutions can use BloodBridge to manage blood
            requests, coordinate donor appointments, monitor blood stock and
            communicate with donors.
          </p>

          <Link
            href="/institution/register"
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
          >
            Register an institution
            <ArrowIcon />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <InstitutionCard
            value="Manage"
            label="Blood requests"
          />

          <InstitutionCard
            value="Monitor"
            label="Blood inventory"
          />

          <InstitutionCard
            value="Contact"
            label="Eligible donors"
          />

          <InstitutionCard
            value="Predict"
            label="Potential shortages"
          />
        </div>
      </div>
    </section>
  );
}

function CallToAction() {
  return (
    <section className="px-6 py-20 sm:px-10 lg:px-14 xl:px-20">
      <div
        style={{ backgroundColor: PRIMARY_RED }}
        className="mx-auto max-w-[1250px] overflow-hidden rounded-[28px] px-8 py-12 text-center text-white shadow-xl shadow-red-950/15"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
          <BloodDropIcon />
        </div>

        <h2 className="mx-auto mt-4 max-w-[680px] text-3xl font-bold">
          Your next donation could help someone when it matters most.
        </h2>

        <p className="mx-auto mt-3 max-w-[600px] text-sm leading-6 text-red-100/75">
          Create your BloodBridge donor account and become part of a more
          connected blood donation network.
        </p>

        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/register"
            className="flex h-11 items-center rounded-xl bg-white px-5 text-sm font-semibold text-red-950 transition hover:bg-red-50"
          >
            Create donor account
          </Link>

          <Link
            href="/login"
            className="flex h-11 items-center rounded-xl border border-white/20 bg-white/10 px-5 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            Log in
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-100 px-6 py-8 sm:px-10 lg:px-14 xl:px-20">
      <div className="mx-auto flex max-w-[1250px] flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div
            style={{ backgroundColor: PRIMARY_RED }}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white"
          >
            <BloodDropIcon />
          </div>

          <div>
            <p className="text-sm font-bold text-slate-950">
              BloodBridge
            </p>

            <p className="text-[9px] text-slate-400">
              Intelligent Blood Donation Platform
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-400">
          Copyright © {new Date().getFullYear()} BloodBridge Health Systems.
        </p>

        <div className="flex gap-5 text-xs text-slate-400">
          <Link
            href="/privacy"
            className="hover:text-slate-700"
          >
            Privacy
          </Link>

          <Link
            href="/terms"
            className="hover:text-slate-700"
          >
            Terms
          </Link>
        </div>
      </div>
    </footer>
  );
}

function MiniStat({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
      <p className="text-sm font-bold text-slate-950">
        {value}
      </p>

      <p className="mt-1 text-[9px] text-slate-400">
        {label}
      </p>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-950/5 text-red-950">
        {icon}
      </div>

      <h3 className="mt-4 text-sm font-bold text-slate-950">
        {title}
      </h3>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function ProcessCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="relative rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <span className="text-3xl font-bold text-red-950/10">
        {number}
      </span>

      <h3 className="mt-3 text-sm font-bold text-slate-900">
        {title}
      </h3>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function InstitutionCard({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="text-lg font-bold text-white">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        {label}
      </p>
    </div>
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

function BloodDropHeroIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-8 w-8"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
    >
      <path d="M12 2.8c3.1 4.2 7.5 9.4 7.5 13.2a7.5 7.5 0 1 1-15 0C4.5 12.2 8.9 7 12 2.8Z" />
      <path d="M9 17c.7 1.3 1.7 2 3.2 2.2" />
    </svg>
  );
}

function BloodDropSmallIcon() {
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

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="M12 3 2.5 20h19L12 3Z" />
      <path d="M12 9v4" />
      <circle cx="12" cy="16" r=".7" fill="currentColor" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21c.5-4.4 3-6.5 7.5-6.5s7 2.1 7.5 6.5" />
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
      aria-hidden="true"
    >
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M9 21v-5h6v5" />
      <path d="M12 6v6" />
      <path d="M9 9h6" />
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
      <path d="m5 13 4 4L19 7" />
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
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 2.5 2.5L16 9" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M16 2v4M8 2v4M4 10h16" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" />
      <path d="M10 21h4" />
    </svg>
  );
}