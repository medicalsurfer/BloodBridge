import Link from "next/link";
import { getTotalUsers } from "../../src/lib/prisma";
import { Reveal } from "@/src/components/landing/Reveal";
import { ThemeToggle } from "@/src/components/ThemeToggle";

/*
  ─────────────────────────────────────────────────────────────────────────
  BloodBridge landing page.

  Palette — every colour is a relative of the brand garnet rather than a
  bolted-on accent: garnet → plum → garnet-deep carries the dark surfaces,
  ember and gold warm the highlights, rose marks what is vital. Emerald is
  held back for one job only: confirmed state.

  Type — Fraunces (variable serif, optical sizing) for display, Source Sans 3
  for everything read at speed, JetBrains Mono for the data readouts in the
  hero panel, so figures look measured rather than written.

  Motion — one choreography, not scattered effects. Above the fold a single
  staggered entrance; below it, sections reveal once on scroll. Two ambient
  loops (drifting glows, floating cards) are confined to the dark panel so
  the reading side stays still. All of it collapses under
  prefers-reduced-motion, and the reveal states are scoped to `.js` so the
  page renders complete without JavaScript.
  ─────────────────────────────────────────────────────────────────────────
*/

export default async function LandingPage() {
  const totalUsers = await getTotalUsers();

  return (
    <>
      <main className="min-h-screen bg-slate-100 p-2">
        <section className="mx-auto min-h-[calc(100vh-1rem)] max-w-[1500px] overflow-hidden rounded-[24px] border border-white bg-white shadow-xl">
          <Navbar />

          <section className="grid min-h-[calc(100vh-92px)] lg:grid-cols-[1fr_1.02fr]">
            <div className="flex items-center px-6 py-12 sm:px-10 lg:px-14 xl:px-20">
              <div className="max-w-[650px]">
                <div
                  className="inline-flex items-center gap-2.5 rounded-full border border-garnet/12 bg-garnet/[0.04] px-3.5 py-1.5"
                  style={{ animation: "var(--animate-rise)", animationDelay: "60ms" }}
                >
                  <span className="relative flex h-2 w-2">
                    <span
                      aria-hidden
                      className="absolute inset-0 rounded-full bg-rose"
                      style={{ animation: "var(--animate-pulse-ring)" }}
                    />
                    <span className="relative h-2 w-2 rounded-full bg-garnet" />
                  </span>

                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-garnet">
                    Intelligent blood donation platform
                  </span>
                </div>

                <h1
                  className="mt-7 text-[40px] leading-[1.04] font-semibold tracking-[-0.025em] text-slate-950 sm:text-[52px] xl:text-[64px]"
                  style={{ animation: "var(--animate-rise)", animationDelay: "140ms" }}
                >
                  Connecting blood donors with the{" "}
                  <span className="relative whitespace-nowrap">
                    <span className="bg-gradient-to-br from-crimson via-garnet to-plum bg-clip-text text-transparent">
                      people
                    </span>
                    {/* A hand-drawn-feeling underscore, not a rectangle. */}
                    <svg
                      aria-hidden
                      viewBox="0 0 220 12"
                      preserveAspectRatio="none"
                      className="absolute -bottom-1 left-0 h-[10px] w-full text-rose/45"
                    >
                      <path
                        d="M2 8.5C46 3.5 118 2.5 218 6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>{" "}
                  who need them most.
                </h1>

                <p
                  className="mt-6 max-w-[590px] text-[15px] leading-7 text-slate-600"
                  style={{ animation: "var(--animate-rise)", animationDelay: "220ms" }}
                >
                  BloodBridge helps donors manage their donation journey while enabling
                  healthcare institutions to coordinate blood requests, monitor availability and
                  reach eligible donors faster.
                </p>

                <p
                  className="mt-5 inline-flex items-center gap-2.5 rounded-lg bg-ember/10 px-3 py-1.5 text-[13px] font-semibold text-garnet"
                  style={{ animation: "var(--animate-rise)", animationDelay: "280ms" }}
                >
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-ember" />
                  Over {totalUsers.toLocaleString()} registered donors and counting
                </p>

                <div
                  className="mt-8 flex flex-wrap gap-3"
                  style={{ animation: "var(--animate-rise)", animationDelay: "340ms" }}
                >
                  <Link
                    href="/register"
                    className="group relative flex h-12 items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-br from-crimson via-garnet to-garnet-deep px-6 text-sm font-semibold text-white shadow-lg shadow-garnet/25 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-garnet/30"
                  >
                    {/* Sheen sweeps once on hover — a highlight, not a loop. */}
                    <span
                      aria-hidden
                      className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full"
                    />
                    <span className="relative">Become a donor</span>
                    <span className="relative transition-transform duration-300 group-hover:translate-x-1">
                      <ArrowIcon />
                    </span>
                  </Link>

                  <Link
                    href="/login"
                    className="flex h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-700 transition duration-300 hover:-translate-y-0.5 hover:border-garnet/30 hover:text-garnet"
                  >
                    Log in
                  </Link>
                </div>

                <div
                  className="mt-9 grid max-w-[580px] grid-cols-3 gap-3"
                  style={{ animation: "var(--animate-rise)", animationDelay: "420ms" }}
                >
                  <MiniStat value="Simple" label="Donor registration" accent="garnet" />
                  <MiniStat value="Fast" label="Emergency response" accent="ember" />
                  <MiniStat value="Secure" label="Donor information" accent="plum" />
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

      <Reveal />
    </>
  );
}

function Navbar() {
  return (
    <header className="flex h-[84px] items-center justify-between border-b border-slate-100 px-6 sm:px-10 lg:px-14 xl:px-20">
      <Link href="/landing" className="group flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-crimson to-garnet-deep text-white shadow-sm transition duration-300 group-hover:scale-105 group-hover:shadow-md">
          <BloodDropIcon />
        </div>

        <div>
          <p className="text-xl font-semibold tracking-[-0.02em] text-slate-950">BloodBridge</p>
          <p className="text-[10px] text-slate-500">Intelligent Blood Donation Platform</p>
        </div>
      </Link>

      <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
        <NavLink href="#features">Features</NavLink>
        <NavLink href="#how-it-works">How it works</NavLink>
        <NavLink href="#institutions">Institutions</NavLink>
      </nav>

      <div className="flex items-center gap-2">
        <ThemeToggle className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-50 hover:text-garnet" />

        <Link
          href="/login"
          className="hidden h-10 items-center rounded-xl px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-garnet sm:flex"
        >
          Log in
        </Link>

        <Link
          href="/register"
          className="flex h-10 items-center rounded-xl bg-gradient-to-br from-crimson to-garnet-deep px-4 text-sm font-semibold text-white shadow-md shadow-garnet/20 transition duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-garnet/25"
        >
          Register
        </Link>
      </div>
    </header>
  );
}

/* Underline grows from the left on hover rather than blinking on. */
function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="group relative py-1 transition hover:text-slate-950">
      {children}
      <span
        aria-hidden
        className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-garnet transition-transform duration-300 group-hover:scale-x-100"
      />
    </Link>
  );
}

function HeroPanel() {
  return (
    <div className="relative hidden overflow-hidden bg-gradient-to-br from-garnet via-plum to-garnet-deep lg:flex lg:items-center lg:justify-center">
      {/* Ambient field: slow, large, low-contrast. Never competes with type. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-20 -right-20 h-[420px] w-[420px] rounded-full bg-rose/20 blur-3xl"
          style={{ animation: "var(--animate-drift)" }}
        />
        <div
          className="absolute -bottom-32 -left-24 h-[380px] w-[380px] rounded-full bg-ember/15 blur-3xl"
          style={{ animation: "var(--animate-drift)", animationDelay: "-6s" }}
        />
        <div
          className="absolute top-1/3 left-1/2 h-[300px] w-[300px] rounded-full bg-gold/10 blur-3xl"
          style={{ animation: "var(--animate-drift)", animationDelay: "-12s" }}
        />
        <div className="absolute top-[10%] left-[15%] h-[260px] w-[260px] rounded-full border border-white/[0.06]" />
        <div className="absolute right-[8%] bottom-[5%] h-[330px] w-[330px] rounded-full border border-white/[0.05]" />
      </div>

      <div className="relative z-10 flex h-full w-full max-w-[720px] flex-col justify-center px-10 py-10 xl:px-14">
        <div className="max-w-[560px]">
          <div
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 backdrop-blur-md"
            style={{ animation: "var(--animate-rise)", animationDelay: "200ms" }}
          >
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-gold" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] on-garnet">
              A connected donation network
            </span>
          </div>

          <h2
            className="mt-5 text-[30px] leading-[1.15] font-semibold tracking-[-0.02em] text-white xl:text-[34px]"
            style={{ animation: "var(--animate-rise)", animationDelay: "280ms" }}
          >
            Connecting every donor to a moment that matters.
          </h2>

          <p
            className="mt-4 max-w-[430px] text-[13.5px] leading-6 on-garnet"
            style={{ animation: "var(--animate-rise)", animationDelay: "340ms" }}
          >
            BloodBridge connects eligible donors with healthcare institutions and helps blood
            reach the right place when it is needed.
          </p>
        </div>

        <NetworkDiagram />
      </div>
    </div>
  );
}

function NetworkDiagram() {
  return (
    <div
      className="relative mt-10 h-[420px] w-full"
      style={{ animation: "var(--animate-fade)", animationDelay: "420ms" }}
    >
      {/* Connectors draw themselves, so the hub reads as actively linking. */}
      <svg
        aria-hidden
        viewBox="0 0 640 420"
        className="absolute inset-0 h-full w-full"
        fill="none"
      >
        {[
          "M150 90 C 250 140, 270 170, 310 200",
          "M500 100 C 410 145, 380 170, 342 198",
          "M160 330 C 250 290, 275 245, 308 218",
          "M495 320 C 410 285, 375 245, 344 220",
        ].map((d, index) => (
          <path
            key={d}
            d={d}
            stroke="currentColor"
            className="text-white/25"
            strokeWidth="1.5"
            strokeDasharray="260"
            style={{
              animation: "var(--animate-draw)",
              animationDelay: `${index * 320}ms`,
            }}
          />
        ))}

        <circle
          cx="325"
          cy="210"
          r="120"
          stroke="currentColor"
          className="text-white/10"
          strokeWidth="1"
          strokeDasharray="5 7"
        />
      </svg>

      <div
        aria-hidden
        className="absolute top-1/2 left-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.08] blur-2xl"
      />

      {/* Hub: two offset pulse rings read as a heartbeat rather than a spinner. */}
      <div className="absolute top-1/2 left-1/2 flex h-[175px] w-[175px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-white/10 shadow-2xl backdrop-blur-xl">
        <span
          aria-hidden
          className="absolute inset-0 rounded-full border border-rose/40"
          style={{ animation: "var(--animate-pulse-ring)" }}
        />
        <span
          aria-hidden
          className="absolute inset-0 rounded-full border border-gold/30"
          style={{ animation: "var(--animate-pulse-ring)", animationDelay: "1.6s" }}
        />

        <div className="absolute inset-3 rounded-full border border-white/10" />
        <div className="absolute inset-7 rounded-full bg-white/[0.06]" />

        <div className="relative text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-white text-garnet shadow-xl">
            <BloodDropHeroIcon />
          </div>

          <p className="mt-3 text-sm font-semibold text-white">BloodBridge</p>

          <p className="mt-1 text-[8px] tracking-[0.14em] on-garnet-dim uppercase">
            Connecting lives
          </p>
        </div>
      </div>

      <FloatingCard className="top-8 left-0 w-[205px]" delay="0s">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-garnet">
            <UserIcon />
          </div>

          <div>
            <CardLabel>Donor</CardLabel>
            <p className="mt-0.5 text-[11px] font-semibold text-white">Eligible to donate</p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-xl bg-white/[0.08] px-3 py-2">
          <span className="text-[9px] on-garnet-dim">Blood group</span>
          <span className="font-mono text-sm font-medium text-gold">O+</span>
        </div>
      </FloatingCard>

      <FloatingCard className="top-10 right-0 w-[205px]" delay="-1.8s">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-garnet">
            <HospitalIcon />
          </div>

          <div>
            <CardLabel>Health institute</CardLabel>
            <p className="mt-0.5 text-[11px] font-semibold text-white">Dispensaire Odza</p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/[0.08] px-3 py-2">
          <span aria-hidden className="h-2 w-2 rounded-full bg-emerald-300" />
          <span className="text-[9px] font-medium text-red-50">Blood services active</span>
        </div>
      </FloatingCard>

      <FloatingCard
        className="bottom-7 left-1 w-[215px] border-rose/25 bg-rose/[0.12]"
        delay="-3.4s"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose to-crimson text-white">
            <AlertIcon />
          </div>

          <div>
            <CardLabel>Emergency request</CardLabel>
            <p className="mt-1 text-[11px] font-semibold text-white">O- blood urgently needed</p>
            <p className="mt-1 text-[8px] on-garnet-dim">Matching eligible donors nearby</p>
          </div>
        </div>
      </FloatingCard>

      <FloatingCard className="right-0 bottom-5 w-[215px]" delay="-5.1s">
        <div className="flex items-center justify-between">
          <div>
            <CardLabel>Smart matching</CardLabel>
            <p className="mt-1 text-[11px] font-semibold text-white">Suitable donor found</p>
          </div>

          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-300/20 text-emerald-200">
            <CheckIcon />
          </div>
        </div>

        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between text-[8px]">
            <span className="on-garnet-dim">Match confidence</span>
            <span className="font-mono font-medium text-white">94%</span>
          </div>

          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-[94%] rounded-full bg-gradient-to-r from-emerald-300 to-gold" />
          </div>
        </div>
      </FloatingCard>

      {/* Traffic along the connectors. */}
      <span
        aria-hidden
        className="absolute top-[42%] left-[26%] h-2 w-2 rounded-full bg-rose shadow-[0_0_16px_var(--color-rose)]"
        style={{ animation: "var(--animate-float)" }}
      />
      <span
        aria-hidden
        className="absolute top-[40%] right-[27%] h-1.5 w-1.5 rounded-full bg-gold shadow-[0_0_14px_var(--color-gold)]"
        style={{ animation: "var(--animate-float)", animationDelay: "-2.5s" }}
      />
      <span
        aria-hidden
        className="absolute bottom-[29%] left-[30%] h-1.5 w-1.5 rounded-full bg-white/60"
        style={{ animation: "var(--animate-float)", animationDelay: "-4s" }}
      />
      <span
        aria-hidden
        className="absolute right-[30%] bottom-[28%] h-2 w-2 rounded-full bg-emerald-300/70"
        style={{ animation: "var(--animate-float)", animationDelay: "-1.2s" }}
      />
    </div>
  );
}

function FloatingCard({
  className,
  delay,
  children,
}: {
  className: string;
  delay: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`absolute rounded-[20px] border border-white/15 bg-white/[0.1] p-3.5 shadow-xl backdrop-blur-xl ${className}`}
      style={{ animation: "var(--animate-float)", animationDelay: delay }}
    >
      {children}
    </div>
  );
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[8px] font-semibold tracking-[0.12em] on-garnet-dim uppercase">
      {children}
    </p>
  );
}

function SectionIntro({
  eyebrow,
  title,
  description,
  center = false,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description: string;
  center?: boolean;
}) {
  return (
    <div data-reveal className={center ? "text-center" : "max-w-[660px]"}>
      <p className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em] text-garnet uppercase">
        <span aria-hidden className="h-px w-6 bg-gradient-to-r from-garnet to-transparent" />
        {eyebrow}
      </p>

      <h2 className="mt-4 text-[32px] leading-[1.15] font-semibold tracking-[-0.022em] text-slate-950">
        {title}
      </h2>

      <p
        className={`mt-4 text-[15px] leading-7 text-slate-600 ${center ? "mx-auto max-w-[620px]" : ""}`}
      >
        {description}
      </p>
    </div>
  );
}

function FeaturesSection() {
  const features = [
    {
      icon: <EligibilityIcon />,
      title: "Donor eligibility",
      description: "Help donors understand when they are eligible for their next donation.",
      accent: "garnet" as const,
    },
    {
      icon: <CalendarIcon />,
      title: "Appointments",
      description:
        "Allow donors to book and manage donation appointments with participating centres.",
      accent: "plum" as const,
    },
    {
      icon: <BloodDropSmallIcon />,
      title: "Blood management",
      description:
        "Support healthcare institutions in monitoring blood availability and requests.",
      accent: "crimson" as const,
    },
    {
      icon: <BellIcon />,
      title: "Notifications",
      description: "Inform donors about appointments, eligibility and urgent blood needs.",
      accent: "ember" as const,
    },
  ];

  return (
    <section
      id="features"
      className="relative overflow-hidden bg-slate-50 px-6 py-24 sm:px-10 lg:px-14 xl:px-20"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 h-[400px] w-[400px] rounded-full bg-rose/[0.06] blur-3xl"
      />

      <div className="relative mx-auto max-w-[1250px]">
        <SectionIntro
          eyebrow="Platform capabilities"
          title="Built around the blood donation process."
          description="BloodBridge gives donors and healthcare institutions the tools needed to manage blood donation activities from one platform."
        />

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              data-reveal
              style={{ "--reveal-delay": `${index * 90}ms` } as React.CSSProperties}
            >
              <FeatureCard {...feature} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    { number: "01", title: "Register", description: "Create your BloodBridge donor account." },
    {
      number: "02",
      title: "Complete profile",
      description: "Provide the information required for donor management.",
    },
    {
      number: "03",
      title: "Check eligibility",
      description: "Know whether you are ready for your next donation.",
    },
    {
      number: "04",
      title: "Donate",
      description: "Book an appointment and contribute when blood is needed.",
    },
  ];

  return (
    <section id="how-it-works" className="px-6 py-24 sm:px-10 lg:px-14 xl:px-20">
      <div className="mx-auto max-w-[1250px]">
        <SectionIntro
          center
          eyebrow="How it works"
          title="A simpler donation journey."
          description="BloodBridge connects donor registration, eligibility and donation activities through one digital workflow."
        />

        <div className="relative mx-auto mt-14 max-w-[1050px]">
          {/* The rail is the sequence made visible — these steps really are ordered. */}
          <div
            aria-hidden
            className="absolute top-[26px] right-[12%] left-[12%] hidden h-px bg-gradient-to-r from-transparent via-garnet/25 to-transparent md:block"
          />

          <div className="relative grid gap-5 md:grid-cols-4">
            {steps.map((step, index) => (
              <div
                key={step.number}
                data-reveal
                style={{ "--reveal-delay": `${index * 110}ms` } as React.CSSProperties}
              >
                <ProcessCard {...step} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function InstitutionSection() {
  const capabilities = [
    { value: "Manage", label: "Blood requests" },
    { value: "Monitor", label: "Blood inventory" },
    { value: "Contact", label: "Eligible donors" },
    { value: "Predict", label: "Potential shortages" },
  ];

  return (
    <section
      id="institutions"
      className="relative overflow-hidden bg-gradient-to-br from-garnet-deep via-plum to-garnet px-6 py-24 text-white sm:px-10 lg:px-14 xl:px-20"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-32 left-1/4 h-[420px] w-[420px] rounded-full bg-rose/15 blur-3xl"
          style={{ animation: "var(--animate-drift)" }}
        />
        <div
          className="absolute -right-20 -bottom-24 h-[360px] w-[360px] rounded-full bg-ember/12 blur-3xl"
          style={{ animation: "var(--animate-drift)", animationDelay: "-9s" }}
        />
      </div>

      <div className="relative mx-auto grid max-w-[1250px] items-center gap-14 lg:grid-cols-2">
        <div data-reveal>
          <p className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em] text-gold uppercase">
            <span aria-hidden className="h-px w-6 bg-gradient-to-r from-gold to-transparent" />
            For healthcare institutions
          </p>

          <h2 className="mt-4 max-w-[560px] text-[32px] leading-[1.15] font-semibold tracking-[-0.022em]">
            Improve blood coordination across your institution.
          </h2>

          <p className="mt-5 max-w-[580px] text-[15px] leading-7 on-garnet">
            Healthcare institutions can use BloodBridge to manage blood requests, coordinate donor
            appointments, monitor blood stock and communicate with donors.
          </p>

          {/*
            No public sign-up for institutes. A system administrator registers
            the institute and invites its administrator, who then adds their own
            medical staff and laboratory technicians — so the only action this
            section can honestly offer is a way in for an institute already on
            the network.
          */}
          <p className="mt-6 max-w-[580px] text-[14px] leading-7 on-garnet-dim">
            Institutes join the network by arrangement. A BloodBridge system administrator registers
            the institute and invites its administrator, who then adds the institute&apos;s medical
            staff and laboratory technicians.
          </p>

          <Link
            href="/login"
            className="group mt-6 inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-garnet transition duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/20"
          >
            Institution sign in
            <span className="transition-transform duration-300 group-hover:translate-x-1">
              <ArrowIcon />
            </span>
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {capabilities.map((capability, index) => (
            <div
              key={capability.label}
              data-reveal
              style={{ "--reveal-delay": `${index * 90}ms` } as React.CSSProperties}
            >
              <InstitutionCard {...capability} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CallToAction() {
  return (
    <section className="px-6 py-24 sm:px-10 lg:px-14 xl:px-20">
      <div
        data-reveal
        className="relative mx-auto max-w-[1250px] overflow-hidden rounded-[28px] bg-gradient-to-br from-crimson via-garnet to-garnet-deep px-8 py-16 text-center text-white shadow-xl shadow-garnet/20"
      >
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div
            className="absolute -top-24 left-1/3 h-[340px] w-[340px] rounded-full bg-gold/15 blur-3xl"
            style={{ animation: "var(--animate-drift)" }}
          />
          <div
            className="absolute -bottom-28 left-[10%] h-[300px] w-[300px] rounded-full bg-rose/20 blur-3xl"
            style={{ animation: "var(--animate-drift)", animationDelay: "-8s" }}
          />
        </div>

        <div className="relative">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/12 backdrop-blur-sm">
            <BloodDropIcon />
          </div>

          <h2 className="mx-auto mt-6 max-w-[700px] text-[32px] leading-[1.15] font-semibold tracking-[-0.022em]">
            Your next donation could help someone when it matters most.
          </h2>

          <p className="mx-auto mt-4 max-w-[600px] text-[15px] leading-7 on-garnet">
            Create your BloodBridge donor account and become part of a more connected blood
            donation network.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/register"
              className="flex h-12 items-center rounded-xl bg-white px-6 text-sm font-semibold text-garnet transition duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/20"
            >
              Create donor account
            </Link>

            <Link
              href="/login"
              className="flex h-12 items-center rounded-xl border border-white/25 bg-white/10 px-6 text-sm font-semibold text-white backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:bg-white/20"
            >
              Log in
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-100 px-6 py-10 sm:px-10 lg:px-14 xl:px-20">
      <div className="mx-auto flex max-w-[1250px] flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-crimson to-garnet-deep text-white">
            <BloodDropIcon />
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-950">BloodBridge</p>
            <p className="text-[9px] text-slate-500">Intelligent Blood Donation Platform</p>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          Copyright © {new Date().getFullYear()} BloodBridge Health Systems.
        </p>

        <div className="flex gap-5 text-xs text-slate-500">
          <Link href="/privacy" className="transition hover:text-garnet">
            Privacy
          </Link>

          <Link href="/terms" className="transition hover:text-garnet">
            Terms
          </Link>
        </div>
      </div>
    </footer>
  );
}

const accentClasses = {
  garnet: "from-garnet to-garnet-deep",
  plum: "from-plum to-garnet-deep",
  crimson: "from-crimson to-garnet",
  ember: "from-ember to-crimson",
} as const;

type Accent = keyof typeof accentClasses;

function MiniStat({ value, label, accent }: { value: string; label: string; accent: Accent }) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-3.5 transition duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      {/* The accent is a rail that fills on hover, not a permanent block of colour. */}
      <span
        aria-hidden
        className={`absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-gradient-to-r transition-transform duration-300 group-hover:scale-x-100 ${accentClasses[accent]}`}
      />

      <p className="text-sm font-semibold text-slate-950">{value}</p>
      <p className="mt-1 text-[10px] text-slate-500">{label}</p>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: Accent;
}) {
  return (
    <div className="group h-full rounded-2xl border border-slate-200 bg-white p-6 transition duration-300 hover:-translate-y-1.5 hover:border-transparent hover:shadow-xl hover:shadow-garnet/10">
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm transition duration-300 group-hover:scale-110 group-hover:rotate-3 ${accentClasses[accent]}`}
      >
        {icon}
      </div>

      <h3 className="mt-5 text-[15px] font-semibold text-slate-950">{title}</h3>

      <p className="mt-2.5 text-[13px] leading-6 text-slate-600">{description}</p>
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
    <div className="group relative h-full">
      {/* The node sits on the rail, tying the card to its position in the sequence. */}
      <div className="relative z-10 mx-auto flex h-13 w-13 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 group-hover:-translate-y-1 group-hover:border-transparent group-hover:bg-gradient-to-br group-hover:from-crimson group-hover:to-garnet-deep group-hover:shadow-lg group-hover:shadow-garnet/25">
        <span className="font-mono text-sm font-medium text-garnet transition group-hover:text-white">
          {number}
        </span>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 text-center transition duration-300 group-hover:-translate-y-1 group-hover:shadow-lg">
        <h3 className="text-[15px] font-semibold text-slate-950">{title}</h3>
        <p className="mt-2 text-[13px] leading-6 text-slate-600">{description}</p>
      </div>
    </div>
  );
}

function InstitutionCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="h-full rounded-2xl border border-white/12 bg-white/[0.07] p-5 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-white/25 hover:bg-white/[0.12]">
      <p className="text-lg font-semibold text-white">{value}</p>
      <p className="mt-1.5 text-xs on-garnet-dim">{label}</p>
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
