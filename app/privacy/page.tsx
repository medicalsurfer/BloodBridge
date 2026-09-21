import Link from "next/link";
import type { Metadata } from "next";
import { DONATIONS_PER_CONSULTATION } from "@/src/lib/consultation";

export const metadata: Metadata = {
  title: "Privacy & Policy · BloodBridge",
  description:
    "How BloodBridge collects, uses and protects donor data, the rights donors hold, and the obligations of participating health institutes.",
};

/*
  Privacy & Policy.

  Two audiences in one document: donors, who need to know what happens to
  their health data and what they are entitled to, and participating health
  institutes, who need to know what the platform requires of them.

  A sticky contents rail on the left makes a long legal document navigable —
  the section a reader came for is usually one of fourteen, not the first.
*/

const LAST_UPDATED = "15 September 2026";

const sections = [
  { id: "scope", label: "Scope of this policy" },
  { id: "roles", label: "Who controls your data" },
  { id: "data-we-collect", label: "Information we collect" },
  { id: "why-we-use-it", label: "Why we use it" },
  { id: "health-data", label: "Health information" },
  { id: "who-can-see", label: "Who can see your records" },
  { id: "free-consultation", label: "Free consultation entitlement" },
  { id: "institute-obligations", label: "Obligations of institutes" },
  { id: "retention", label: "How long we keep records" },
  { id: "your-rights", label: "Your rights" },
  { id: "security", label: "How we protect data" },
  { id: "sessions", label: "Sessions and cookies" },
  { id: "regulatory", label: "Regulatory framework" },
  { id: "contact", label: "Changes and contact" },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-2">
      <div className="mx-auto max-w-[1500px] overflow-hidden rounded-[24px] border border-white bg-white shadow-xl">
        <PolicyNavbar />

        <Hero />

        <div className="px-6 py-14 sm:px-10 lg:px-14 xl:px-20">
          <div className="mx-auto grid max-w-[1250px] gap-12 lg:grid-cols-[240px_1fr]">
            <nav aria-label="Sections of this policy" className="lg:sticky lg:top-8 lg:self-start">
              <p className="text-[10.5px] font-semibold tracking-[0.09em] text-slate-500 uppercase">
                On this page
              </p>

              <ol className="mt-4 space-y-0.5 border-l border-slate-200">
                {sections.map((section, index) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="block border-l-2 border-transparent py-1.5 pl-3.5 text-[13px] leading-5 text-slate-600 transition hover:border-l-garnet hover:text-garnet"
                    >
                      <span className="mr-2 font-mono text-[11px] text-slate-400">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {section.label}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>

            <article className="min-w-0 max-w-[720px]">
              <Section id="scope" number="01" title="Scope of this policy">
                <P>
                  BloodBridge is a blood-donation coordination platform. It connects people who
                  wish to donate blood with the health institutes that collect, test, store and
                  issue it. This policy explains what information the platform holds about you,
                  why it holds it, who can see it, and what you can require us to do about it.
                </P>
                <P>
                  It applies to everyone who uses BloodBridge: donors, medical staff, laboratory
                  technicians, health-institute administrators and system administrators. Where a
                  rule applies to only one of those groups, the text says so.
                </P>
              </Section>

              <Section id="roles" number="02" title="Who controls your data">
                <P>
                  Two parties handle your information, and the distinction matters for the rights
                  you can exercise and against whom.
                </P>
                <DefinitionList
                  items={[
                    {
                      term: "The participating health institute",
                      detail:
                        "Acts as the controller of your clinical records. It decides the medical purpose for which your eligibility answers, donation records and blood test outcomes are used, and it is accountable for those clinical decisions.",
                    },
                    {
                      term: "BloodBridge",
                      detail:
                        "Acts as the processor. It provides the software that stores and moves that information between you and the institute, on the institute's instructions, and does not make clinical decisions.",
                    },
                  ]}
                />
                <P>
                  In practice: ask BloodBridge about your account, your login and how the platform
                  works. Ask the institute about a clinical decision, a deferral, or a blood test
                  result.
                </P>
              </Section>

              <Section id="data-we-collect" number="03" title="Information we collect">
                <P>We collect only what the donation process requires.</P>
                <DefinitionList
                  items={[
                    {
                      term: "Identity and contact details",
                      detail:
                        "Name, email address, phone number, date of birth, gender, and your city and address. Used to identify you at a donation centre and to reach you about appointments.",
                    },
                    {
                      term: "Donor profile",
                      detail:
                        "Blood group, eligibility status and the date of your last donation. This is what lets the platform tell you when you are next able to donate.",
                    },
                    {
                      term: "Eligibility questionnaire answers",
                      detail:
                        "Your responses about general health, weight, current illness, medication, pregnancy, recent procedures and infection risk. These are health data and are treated as described in section 05.",
                    },
                    {
                      term: "Appointment and donation records",
                      detail:
                        "Appointments you book, their outcome, and for completed donations the volume collected, the blood pack identifier and the recording staff member.",
                    },
                    {
                      term: "Messages",
                      detail:
                        "Conversations between you and a health institute, and your exchanges with the in-app assistant.",
                    },
                    {
                      term: "Activity records",
                      detail:
                        "An audit log of significant actions — registration, sign-in, appointment changes, donation records, reward validation — recording who acted, on what, and when.",
                    },
                  ]}
                />
                <Callout tone="info">
                  BloodBridge does not collect location or GPS data, and does not track you across
                  other websites.
                </Callout>
              </Section>

              <Section id="why-we-use-it" number="04" title="Why we use it">
                <List
                  items={[
                    "To determine, provisionally, whether you are eligible to donate, and to tell you when you will next be eligible.",
                    "To let you book, reschedule and cancel donation appointments, and to remind you about them.",
                    "To let a health institute record a donation and attach it to your history.",
                    "To alert you to blood requests that match your blood group, so you can choose to respond.",
                    "To award and validate donation points, and to calculate the free-consultation entitlement described in section 07.",
                    "To keep the platform secure, investigate misuse, and maintain an accurate audit trail.",
                  ]}
                />
                <P>
                  We do not sell your information, and we do not use it for advertising or
                  profiling unrelated to blood donation.
                </P>
              </Section>

              <Section id="health-data" number="05" title="Health information">
                <P>
                  Your eligibility answers, blood group and donation records are health data and
                  carry a higher standard of protection than ordinary contact details. We handle
                  them on these terms:
                </P>
                <List
                  items={[
                    "They are collected on the basis of your explicit consent, given when you complete the eligibility questionnaire, and you may withdraw that consent at any time.",
                    "They are visible only to staff at a participating health institute with a clinical reason to see them, and to you.",
                    "They are never used to make an automated decision that finally excludes you from donating. The eligibility result the app shows you is preliminary, and qualified healthcare staff confirm it in person before any blood is collected.",
                    "They are not shared with employers, insurers, or any commercial third party.",
                  ]}
                />
                <Callout tone="warn">
                  The in-app eligibility check is a screening aid, not a medical diagnosis. It does
                  not replace examination by qualified healthcare staff, and it must not be relied
                  on for any purpose other than preparing for a blood donation.
                </Callout>
              </Section>

              <Section id="who-can-see" number="06" title="Who can see your records">
                <P>
                  Access follows the role a person holds. No role can read more than its work
                  requires, and every access path is recorded in the audit log.
                </P>
                <RoleTable />
              </Section>

              {/* The commitment the user asked to have stated on this page. */}
              <Section
                id="free-consultation"
                number="07"
                title="Free consultation entitlement"
                highlight
              >
                <P>
                  <strong className="font-semibold text-slate-900">
                    Every health institute participating in BloodBridge undertakes to grant each
                    donor one free medical consultation for every {DONATIONS_PER_CONSULTATION}{" "}
                    completed blood donations.
                  </strong>{" "}
                  This is a condition of using the platform, not an optional benefit, and it
                  applies at every participating institute regardless of where the donations were
                  given.
                </P>

                <P>How the entitlement is calculated and shown:</P>
                <List
                  items={[
                    `Only donations recorded as completed by institute staff count. A cancelled or missed appointment does not count towards the total.`,
                    `Each ${DONATIONS_PER_CONSULTATION} completed donations earn one consultation. The entitlement accumulates: ${
                      DONATIONS_PER_CONSULTATION * 2
                    } donations earn two, ${DONATIONS_PER_CONSULTATION * 3} earn three, and so on.`,
                    "Your donor dashboard and donation history both show the number you have earned and how many donations remain in the current cycle.",
                    "Institute staff see the same figure on your record in the donor directory, so you do not have to prove it yourself.",
                    "Donations given at any participating institute count towards the total, and the consultation may be redeemed at any participating institute.",
                  ]}
                />

                <Callout tone="brand">
                  To redeem a consultation, present your BloodBridge account at the reception of any
                  participating institute. Staff can see your entitlement on your donor record.
                </Callout>

                <P className="text-[13px] text-slate-500">
                  The consultation covers a general medical consultation. It does not automatically
                  cover laboratory tests, imaging, prescribed medication, procedures or specialist
                  referral, and the treating institute will tell you before any chargeable service
                  is provided. The entitlement cannot be exchanged for cash.
                </P>
              </Section>

              <Section id="institute-obligations" number="08" title="Obligations of institutes">
                <P>
                  A health institute admitted to BloodBridge accepts the following obligations. A
                  system administrator may suspend an institute that does not meet them.
                </P>
                <List
                  items={[
                    `Grant the free consultation described in section 07 after every ${DONATIONS_PER_CONSULTATION} completed donations by a donor.`,
                    "Record donations accurately and promptly, so donors' histories and entitlements are correct.",
                    "Confirm eligibility in person, by qualified staff, before collecting blood — never on the strength of the in-app screening alone.",
                    "Restrict access to donor records to staff with a clinical reason to see them, and keep staff accounts current by deactivating leavers.",
                    "Obtain informed consent before collection, and explain to the donor what will be done with their blood.",
                    "Not use contact details obtained through the platform for marketing or for any purpose other than blood-donation coordination.",
                    "Report any suspected breach of donor data to BloodBridge without delay.",
                  ]}
                />
              </Section>

              <Section id="retention" number="09" title="How long we keep records">
                <DefinitionList
                  items={[
                    {
                      term: "Account and profile",
                      detail:
                        "Kept while your account is active. Deleted, or irreversibly anonymised, after you close it — subject to the clinical retention period below.",
                    },
                    {
                      term: "Donation and blood-pack records",
                      detail:
                        "Retained by the collecting institute for the period its national blood-service rules require, because a unit of blood must remain traceable to its donor after transfusion. This period typically outlasts your account and is set by the institute, not by BloodBridge.",
                    },
                    {
                      term: "Eligibility answers",
                      detail:
                        "Kept as part of the clinical record for the donation they relate to.",
                    },
                    {
                      term: "Messages and assistant history",
                      detail: "Deleted with your account.",
                    },
                    {
                      term: "Audit log",
                      detail:
                        "Retained as a security record after account closure, reduced to the acting user's identifier and the action taken.",
                    },
                  ]}
                />
              </Section>

              <Section id="your-rights" number="10" title="Your rights">
                <P>In relation to your own information you may:</P>
                <List
                  items={[
                    "Ask for a copy of everything held about you, in a portable format.",
                    "Correct anything inaccurate — much of it you can edit yourself on your profile page.",
                    "Ask for your account and data to be deleted, subject to the clinical retention period in section 09.",
                    "Withdraw consent to the eligibility questionnaire, which stops further screening but does not erase donations already recorded.",
                    "Object to receiving blood-request alerts, without losing access to the rest of the platform.",
                    "Complain to your national data-protection authority if you believe your information has been mishandled.",
                  ]}
                />
                <P>
                  We answer requests within one month. We may ask you to confirm your identity
                  first, so that nobody else can obtain your records by impersonating you.
                </P>
              </Section>

              <Section id="security" number="11" title="How we protect data">
                <List
                  items={[
                    "Passwords are stored only as salted one-way hashes. Nobody at BloodBridge or at an institute can read your password.",
                    "Sessions use signed, HTTP-only tokens that expire, and every page checks your role on the server before rendering.",
                    "Access is restricted by role, as set out in section 06, and enforced on the server rather than merely hidden in the interface.",
                    "Significant actions are written to an append-only audit log.",
                    "Password-reset links are single-use and time-limited.",
                  ]}
                />
                <P className="text-[13px] text-slate-500">
                  No system is immune to compromise. If a breach affects your information we will
                  notify you and the relevant authority as the applicable law requires.
                </P>
              </Section>

              <Section id="sessions" number="12" title="Sessions and cookies">
                <P>
                  BloodBridge sets one cookie, <Code>bloodbridge_session</Code>, which holds a
                  signed token identifying your signed-in session. It is strictly necessary for the
                  platform to work: without it the server cannot tell who you are. It is not used
                  for analytics or advertising, and there are no third-party tracking cookies.
                </P>
                <P>
                  Clearing it signs you out. Your browser may also store small interface
                  preferences locally; those never leave your device.
                </P>
              </Section>

              <Section id="regulatory" number="13" title="Regulatory framework">
                <P>
                  BloodBridge is designed around the principles common to data-protection law and
                  to blood-service practice:
                </P>
                <List
                  items={[
                    "Lawfulness, fairness and transparency — you are told what is collected and why, in language you can act on.",
                    "Purpose limitation — donor data is used for blood-donation coordination and nothing else.",
                    "Data minimisation — only the fields the donation process needs are collected.",
                    "Accuracy — donors can correct their own records, and staff must record donations promptly.",
                    "Storage limitation — records are kept only as long as section 09 provides.",
                    "Integrity and confidentiality — role-based access, hashed credentials, audited actions.",
                    "Accountability — every significant action is attributable to an identified user.",
                    "Voluntary, non-remunerated donation and informed consent, consistent with established blood-service practice.",
                    "Donor traceability — each unit remains linkable to its donor and its recipient institute.",
                  ]}
                />
                <Callout tone="warn">
                  <strong className="font-semibold">For the project owner:</strong> the specific
                  statutes, national blood-service rules and supervisory authority that govern this
                  deployment depend on the country it operates in, and are not asserted here.
                  Before this policy is published or submitted, name the governing law, the
                  competent data-protection authority and the national blood-transfusion service,
                  and have the text reviewed by someone qualified in that jurisdiction. The
                  principles above are accurate as principles; they are not a substitute for legal
                  advice.
                </Callout>
              </Section>

              <Section id="contact" number="14" title="Changes and contact">
                <P>
                  We will update this policy as the platform changes. Material changes are
                  announced in the app, and the date below always shows the current version. If you
                  continue using BloodBridge after a change takes effect, the revised policy
                  applies to you.
                </P>
                <P>
                  For a question about this policy, a request under section 10, or to report a
                  concern, contact the data-protection contact at your participating health
                  institute, or write to the BloodBridge administrators through the in-app chat.
                </P>
                <p className="mt-6 border-t border-slate-200 pt-5 font-mono text-[12px] text-slate-500">
                  Version effective {LAST_UPDATED}
                </p>
              </Section>

              <div className="mt-12 rounded-2xl bg-gradient-to-br from-crimson via-garnet to-garnet-deep p-8 text-white">
                <p className="text-[10.5px] font-semibold tracking-[0.09em] text-red-200 uppercase">
                  Ready to donate
                </p>

                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.02em]">
                  Your first {DONATIONS_PER_CONSULTATION} donations earn a free consultation.
                </h2>

                <p className="mt-3 max-w-[520px] text-[13.5px] leading-6 text-red-100/80">
                  Create a donor account and BloodBridge will track the count for you.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/register"
                    className="flex h-11 items-center rounded-xl bg-white px-5 text-[13px] font-semibold text-garnet transition duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20"
                  >
                    Become a donor
                  </Link>

                  <Link
                    href="/landing"
                    className="flex h-11 items-center rounded-xl border border-white/25 bg-white/10 px-5 text-[13px] font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-white/20"
                  >
                    Back to home
                  </Link>
                </div>
              </div>
            </article>
          </div>
        </div>

        <PolicyFooter />
      </div>
    </main>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-garnet via-plum to-garnet-deep px-6 py-16 text-white sm:px-10 lg:px-14 xl:px-20">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-24 right-1/4 h-[360px] w-[360px] rounded-full bg-rose/18 blur-3xl"
          style={{ animation: "var(--animate-drift)" }}
        />
        <div
          className="absolute -bottom-20 left-[5%] h-[300px] w-[300px] rounded-full bg-ember/12 blur-3xl"
          style={{ animation: "var(--animate-drift)", animationDelay: "-8s" }}
        />
      </div>

      <div className="relative mx-auto max-w-[1250px]">
        <p className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em] text-gold uppercase">
          <span aria-hidden className="h-px w-6 bg-gradient-to-r from-gold to-transparent" />
          Privacy &amp; policy
        </p>

        <h1 className="mt-4 max-w-[760px] text-[38px] leading-[1.1] font-semibold tracking-[-0.025em] text-balance sm:text-[46px]">
          How BloodBridge handles your data — and what you are owed for donating.
        </h1>

        <p className="mt-5 max-w-[620px] text-[15px] leading-7 text-red-100/80">
          The information we hold, who may see it, the rights you hold over it, and the
          commitments every participating health institute makes to its donors.
        </p>

        <p className="mt-6 font-mono text-[12px] text-red-100/65">
          Effective {LAST_UPDATED}
        </p>
      </div>
    </section>
  );
}

function PolicyNavbar() {
  return (
    <header className="flex h-[84px] items-center justify-between border-b border-slate-100 px-6 sm:px-10 lg:px-14 xl:px-20">
      <Link href="/landing" className="group flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-crimson to-garnet-deep text-white shadow-sm transition duration-300 group-hover:scale-105">
          <BloodDropIcon />
        </div>

        <div>
          <p className="text-xl font-semibold tracking-[-0.02em] text-slate-950">BloodBridge</p>
          <p className="text-[10px] text-slate-500">Intelligent Blood Donation Platform</p>
        </div>
      </Link>

      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="hidden h-10 items-center rounded-xl px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-garnet sm:flex"
        >
          Log in
        </Link>

        <Link
          href="/register"
          className="flex h-10 items-center rounded-xl bg-gradient-to-br from-crimson to-garnet-deep px-4 text-sm font-semibold text-white shadow-md shadow-garnet/20 transition duration-300 hover:-translate-y-0.5"
        >
          Register
        </Link>
      </div>
    </header>
  );
}

function PolicyFooter() {
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
          <Link href="/privacy" className="font-semibold text-garnet">
            Privacy
          </Link>

          <Link href="/landing" className="transition hover:text-garnet">
            Home
          </Link>
        </div>
      </div>
    </footer>
  );
}

/* ── Document primitives ──────────────────────────────────────────────── */

function Section({
  id,
  number,
  title,
  highlight = false,
  children,
}: {
  id: string;
  number: string;
  title: string;
  highlight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      // scroll-mt keeps the heading clear of the sticky rail when linked to.
      className={`scroll-mt-8 border-t border-slate-200 py-10 first:border-t-0 first:pt-0 ${
        highlight ? "relative" : ""
      }`}
    >
      {highlight && (
        <span
          aria-hidden
          className="absolute top-10 -left-4 h-[calc(100%-5rem)] w-0.5 rounded-full bg-gradient-to-b from-crimson to-garnet"
        />
      )}

      <div className="flex items-baseline gap-3">
        <span className="font-mono text-[12px] text-slate-400">{number}</span>

        <h2 className="text-[24px] leading-tight font-semibold tracking-[-0.02em] text-slate-950">
          {title}
        </h2>
      </div>

      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function P({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-[14.5px] leading-7 text-slate-700 ${className}`}>{children}</p>;
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-[14.5px] leading-7 text-slate-700">
          <span aria-hidden className="mt-3 h-1 w-1 shrink-0 rounded-full bg-garnet/50" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function DefinitionList({ items }: { items: { term: string; detail: string }[] }) {
  return (
    <dl className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
      {items.map((item) => (
        <div key={item.term} className="px-5 py-4">
          <dt className="text-[13px] font-semibold text-slate-900">{item.term}</dt>
          <dd className="mt-1.5 text-[13.5px] leading-6 text-slate-600">{item.detail}</dd>
        </div>
      ))}
    </dl>
  );
}

const calloutTones = {
  info: "border-slate-200 bg-slate-50 text-slate-700",
  warn: "border-amber-200 bg-amber-50/70 text-amber-900",
  brand: "border-garnet/20 bg-garnet/[0.04] text-garnet",
} as const;

function Callout({
  tone,
  children,
}: {
  tone: keyof typeof calloutTones;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border px-5 py-4 text-[13.5px] leading-6 ${calloutTones[tone]}`}>
      {children}
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[12.5px] text-slate-800">
      {children}
    </code>
  );
}

function RoleTable() {
  const rows = [
    {
      role: "You, the donor",
      access: "Your own profile, eligibility results, appointments, donations, rewards and messages.",
    },
    {
      role: "Medical staff",
      access:
        "Donor name, contact details, blood group and eligibility status at their own institute, plus appointments and blood requests they manage.",
    },
    {
      role: "Laboratory technician",
      access:
        "Donation records and blood inventory at their own institute. Donor identity only as far as recording a donation requires.",
    },
    {
      role: "Institute administrator",
      access:
        "Their own institute's staff accounts, aggregate statistics and reward validation. Not donors' clinical answers.",
    },
    {
      role: "System administrator",
      access:
        "Institutes, user accounts and the platform audit log. Not the content of donors' eligibility answers or messages.",
    },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="w-[180px] pb-3 text-[10.5px] font-semibold tracking-[0.09em] text-slate-500 uppercase">
              Role
            </th>
            <th className="pb-3 text-[10.5px] font-semibold tracking-[0.09em] text-slate-500 uppercase">
              Can see
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.role}>
              <td className="py-4 pr-6 align-top text-[13px] font-semibold text-slate-900">
                {row.role}
              </td>
              <td className="py-4 align-top text-[13.5px] leading-6 text-slate-600">
                {row.access}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
