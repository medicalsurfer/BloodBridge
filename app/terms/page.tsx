import Link from "next/link";
import type { Metadata } from "next";
import { DONATIONS_PER_CONSULTATION } from "@/src/lib/consultation";
import { ELIGIBILITY_VALID_FOR_MS, MIN_DAYS_BETWEEN_DONATIONS } from "@/src/lib/eligibility";
import { APPOINTMENT_TIMES, MAX_DAYS_AHEAD, SLOT_CAPACITY } from "@/src/lib/appointment-slots";

export const metadata: Metadata = {
  title: "Terms of Use · BloodBridge",
  description:
    "The terms on which donors, health institutes and their staff use BloodBridge: accounts, eligibility screening, appointments, donation records and acceptable use.",
};

/*
  Terms of Use.

  Written against what the platform actually enforces rather than boilerplate:
  every figure here — the interval between donations, how long a screening
  stays valid, how far ahead an appointment can be booked, what earns a free
  consultation — is imported from the module that enforces it, so the terms
  cannot drift away from the code.

  Structure deliberately mirrors app/privacy/page.tsx: a reader who has seen
  one document should not have to learn a second layout.
*/

const LAST_UPDATED = "27 September 2026";

const ELIGIBILITY_VALID_HOURS = ELIGIBILITY_VALID_FOR_MS / 3_600_000;

const sections = [
  { id: "agreement", label: "The agreement" },
  { id: "what-bloodbridge-is", label: "What BloodBridge is" },
  { id: "accounts", label: "Accounts" },
  { id: "donor-duties", label: "Donor responsibilities" },
  { id: "screening", label: "Eligibility screening" },
  { id: "appointments", label: "Appointments" },
  { id: "donation-records", label: "Donation records" },
  { id: "rewards", label: "Consultations and rewards" },
  { id: "institutes", label: "Health institutes" },
  { id: "assistant", label: "The assistant" },
  { id: "acceptable-use", label: "Acceptable use" },
  { id: "availability", label: "Availability" },
  { id: "suspension", label: "Suspension and closure" },
  { id: "liability", label: "Medical care and liability" },
  { id: "changes", label: "Changes and contact" },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-2">
      <div className="mx-auto max-w-[1500px] overflow-hidden rounded-[24px] border border-white bg-white shadow-xl">
        <PolicyNavbar />

        <Hero />

        <div className="px-6 py-14 sm:px-10 lg:px-14 xl:px-20">
          <div className="mx-auto grid max-w-[1250px] gap-12 lg:grid-cols-[240px_1fr]">
            <nav aria-label="Sections of these terms" className="lg:sticky lg:top-8 lg:self-start">
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
              <Section id="agreement" number="01" title="The agreement">
                <P>
                  These terms govern your use of BloodBridge. They apply from the moment you create
                  an account or sign in, and they bind everyone who uses the platform: donors,
                  medical staff, laboratory technicians, health-institute administrators and system
                  administrators. Where a rule applies to only one of those groups, the text says
                  so.
                </P>
                <P>
                  BloodBridge is operated by BloodBridge Health Systems. Using the platform means
                  you accept these terms and the{" "}
                  <Link href="/privacy" className="font-semibold text-garnet hover:underline">
                    Privacy &amp; Policy
                  </Link>
                  , which explains how your information is handled. If you do not accept them, do
                  not use the platform.
                </P>
              </Section>

              <Section id="what-bloodbridge-is" number="02" title="What BloodBridge is">
                <P>
                  BloodBridge is coordination software. It connects people who wish to donate blood
                  with the health institutes that collect, test, store and issue it.
                </P>
                <DefinitionList
                  items={[
                    {
                      term: "What the platform does",
                      detail:
                        "Records donor accounts and profiles, runs a preliminary eligibility questionnaire, books and manages donation appointments, records completed donations, tracks blood stock and requests for participating institutes, and carries messages between donors and institute staff.",
                    },
                    {
                      term: "What the platform does not do",
                      detail:
                        "It does not collect, test, store, transport or issue blood; it does not employ clinical staff; and it does not make any clinical decision about you. Those are the responsibility of the health institute you attend.",
                    },
                  ]}
                />
                <Callout tone="warn">
                  Nothing on BloodBridge is medical advice. A result, a figure or an assistant reply
                  is information to discuss with qualified staff, never a substitute for their
                  judgement.
                </Callout>
              </Section>

              <Section id="accounts" number="03" title="Accounts">
                <P>
                  You need an account to use BloodBridge. You are responsible for everything done
                  through yours.
                </P>
                <List
                  items={[
                    "Register with an email address you control. The platform currently accepts Gmail and iCloud addresses only, for both registration and sign-in.",
                    "Give accurate details, and keep them current. Your name, phone number and city are how an institute identifies and reaches you.",
                    "Keep your password to yourself. Do not share an account, and do not sign in to someone else's.",
                    "Tell us and your institute promptly if you believe your account has been used without your permission.",
                  ]}
                />
                <P>
                  Donor accounts are self-registered. Staff and administrator accounts are not: a
                  system administrator registers a health institute and invites its administrator,
                  who in turn adds that institute&apos;s medical staff and laboratory technicians.
                  Nobody can grant themselves a staff role.
                </P>
              </Section>

              <Section id="donor-duties" number="04" title="Donor responsibilities" highlight>
                <P>
                  Blood donation is a clinical procedure, and the safety of the person who receives
                  your blood depends on what you tell us. By donating through BloodBridge you
                  undertake to:
                </P>
                <List
                  items={[
                    "Answer the eligibility questions truthfully and completely, including about illness, medication, recent procedures and possible exposure to infection.",
                    `Observe the mandatory interval of ${MIN_DAYS_BETWEEN_DONATIONS} days between whole blood donations, whether or not every donation was recorded on this platform.`,
                    "Disclose any donation given elsewhere, so the interval can be applied correctly.",
                    "Attend the appointment you booked, or cancel it so the slot returns to another donor.",
                    "Tell the institute promptly if you become unwell after donating, or if you learn something that should have deferred you.",
                  ]}
                />
                <Callout tone="brand">
                  Knowingly giving false answers to the eligibility questionnaire endangers a
                  patient. It is grounds for immediate and permanent closure of your account, and
                  the institute may be obliged to act on it further.
                </Callout>
              </Section>

              <Section id="screening" number="05" title="Eligibility screening">
                <P>
                  Before booking, you complete a short questionnaire. It is a preliminary check, not
                  medical clearance.
                </P>
                <DefinitionList
                  items={[
                    {
                      term: "It expires",
                      detail: `A passed screening stays usable for ${ELIGIBILITY_VALID_HOURS} hours. The answers describe how you feel now, so an older result cannot authorise today's donation and the questionnaire must be taken again.`,
                    },
                    {
                      term: "It can defer you",
                      detail:
                        "Feeling unwell, a current illness, pregnancy, being under the minimum weight, or an unexpired interval since your last donation will defer you temporarily. The result explains which applied.",
                    },
                    {
                      term: "It can refer you",
                      detail:
                        "A reported medical condition, current medication, recent surgery, transfusion, tattoo or piercing, or possible exposure to a blood-borne infection routes you to review by institute staff rather than an automatic pass.",
                    },
                    {
                      term: "Staff decide on the day",
                      detail:
                        "Passing the questionnaire does not entitle you to donate. Clinical staff assess you when you attend and may decline for reasons the questionnaire cannot capture.",
                    },
                  ]}
                />
                <P>
                  Where the platform holds a recorded donation date that is more recent than the one
                  you report, the recorded date is the one applied.
                </P>
              </Section>

              <Section id="appointments" number="06" title="Appointments">
                <P>Booking is subject to rules the platform enforces on every attempt.</P>
                <List
                  items={[
                    "You must hold a passed, unexpired eligibility screening before you can book.",
                    `Appointments may be booked up to ${MAX_DAYS_AHEAD} days ahead, at ${APPOINTMENT_TIMES.join(", ")}.`,
                    `Each centre takes up to ${SLOT_CAPACITY} donors in a slot; when a slot is full you will be asked to choose another time.`,
                    "You may hold one upcoming appointment at a time. Reschedule or cancel the one you have before booking another.",
                    `An appointment cannot be booked for a date before the ${MIN_DAYS_BETWEEN_DONATIONS}-day interval has elapsed.`,
                    "Only centres that are registered and currently active can be booked.",
                  ]}
                />
                <P>
                  Please cancel rather than simply not attending. A slot you release is one another
                  donor can take, and centres plan staffing around expected attendance.
                </P>
              </Section>

              <Section id="donation-records" number="07" title="Donation records">
                <P>
                  A donation is recorded by a laboratory technician at the institute after it has
                  been given. The record — the date, the blood group, the volume and the pack
                  identifier — is a clinical record belonging to that institute.
                </P>
                <List
                  items={[
                    "Only institute staff can create or amend a donation record. You cannot add one yourself, and neither can BloodBridge.",
                    "Your donation history, your next eligible date and any entitlement you have earned are all derived from those records.",
                    "If you believe a record is wrong or missing, raise it with the institute that made it. BloodBridge cannot alter a clinical record on your behalf.",
                  ]}
                />
              </Section>

              <Section id="rewards" number="08" title="Consultations and rewards">
                <P>
                  Every participating institute grants one free medical consultation for every{" "}
                  {DONATIONS_PER_CONSULTATION} completed donations.
                </P>
                <List
                  items={[
                    "Only completed donations count. A booked, cancelled or missed appointment is not a donation.",
                    "The entitlement is granted and redeemed by the participating institute, not by BloodBridge. The platform counts your donations and shows the entitlement; the institute provides the consultation.",
                    "An institute administrator validates a reward before it can be redeemed, and may reject a claim that does not match its own records.",
                    "Entitlements are personal to you. They cannot be sold, transferred or exchanged for anything else.",
                  ]}
                />
              </Section>

              <Section id="institutes" number="09" title="Health institutes">
                <P>
                  A health institute joining BloodBridge accepts additional obligations to the
                  donors who attend it.
                </P>
                <List
                  items={[
                    "Keep your institute's details, opening arrangements and contact information accurate, so donors are not sent to the wrong place.",
                    "Keep blood stock figures and blood requests current. Other people's decisions — and the platform's own shortage estimates — are built on them.",
                    "Record donations promptly and accurately, since a donor's next eligible date depends on it.",
                    "Grant staff accounts only to people who need them, and withdraw them when they leave.",
                    "Honour the free-consultation entitlement your institute's participation advertises.",
                    "Use donor contact details only to arrange and follow up donation, never for marketing.",
                  ]}
                />
                <P>
                  An institute that is set to pending or inactive stops appearing to donors, cannot
                  be booked, and cannot be messaged. Its staff keep access to their own
                  institute&apos;s records.
                </P>
              </Section>

              <Section id="assistant" number="10" title="The assistant">
                <P>
                  BloodBridge includes an assistant that answers questions about the platform and
                  drafts short summaries for laboratory staff.
                </P>
                <List
                  items={[
                    "It is decision support. Staff make every decision, and the figures it quotes are calculated by the platform rather than produced by the assistant.",
                    "It is not a clinician. It cannot assess your fitness to donate, and it will refer questions about symptoms, medication or health to qualified staff.",
                    "It can be wrong or unavailable. Nothing it says overrides these terms, a rule the platform enforces, or a decision by institute staff.",
                    "Conversations are stored against your account so the assistant can follow a thread. You can clear your own history at any time.",
                  ]}
                />
              </Section>

              <Section id="acceptable-use" number="11" title="Acceptable use">
                <P>When using BloodBridge you must not:</P>
                <List
                  items={[
                    "Impersonate another person, or register on someone else's behalf without their knowledge.",
                    "Submit false eligibility answers, false donation records or false stock figures.",
                    "Attempt to reach records belonging to another user, another institute, or a role you do not hold.",
                    "Probe, scan or interfere with the platform's security, or try to bypass a rule it enforces.",
                    "Use automated means to access, scrape or overload the service. Sign-in, registration, password reset and assistant requests are rate limited, and repeated attempts are refused.",
                    "Use donor contact details obtained through the platform for any purpose other than coordinating donation.",
                  ]}
                />
                <P>
                  Significant actions are written to an audit log — sign-ins, registrations,
                  bookings, donation records, stock adjustments and administrative changes — with
                  the account that performed them.
                </P>
              </Section>

              <Section id="availability" number="12" title="Availability">
                <P>
                  We work to keep BloodBridge available, but we do not guarantee uninterrupted
                  service. Maintenance, faults, network problems or the unavailability of a
                  dependent service can interrupt it.
                </P>
                <P>
                  Features may change. Where a change affects a rule in these terms — the donation
                  interval, the booking window, the consultation entitlement — the terms are updated
                  with it.
                </P>
                <Callout tone="warn">
                  Never rely on BloodBridge in an emergency. If blood is needed urgently, contact
                  the health institute directly. In a medical emergency, contact the emergency
                  services.
                </Callout>
              </Section>

              <Section id="suspension" number="13" title="Suspension and closure">
                <P>
                  A system administrator may deactivate an account. A deactivated account cannot
                  sign in, and its holder is told the account is inactive.
                </P>
                <List
                  items={[
                    "We may deactivate an account that breaches these terms, that is used to submit false clinical information, or that puts a recipient's safety at risk.",
                    "An institute administrator may remove a staff account belonging to their own institute.",
                    "You may ask for your own account to be closed. Clinical records already created by an institute are kept under that institute's retention obligations, as set out in the Privacy & Policy.",
                  ]}
                />
              </Section>

              <Section id="liability" number="14" title="Medical care and liability">
                <P>
                  Clinical responsibility sits with the health institute that screens, collects and
                  tests. BloodBridge provides the software that coordinates those activities.
                </P>
                <List
                  items={[
                    "We are not liable for a clinical decision taken by an institute or its staff, including a decision to defer or decline you.",
                    "We are not liable for the accuracy of information an institute or a donor enters, though we build checks to catch what can be checked.",
                    "We do not exclude liability for anything that cannot lawfully be excluded.",
                  ]}
                />
                <P>
                  Nothing in these terms affects rights you hold under the law applicable to you, or
                  the obligations a health institute owes you as a patient.
                </P>
              </Section>

              <Section id="changes" number="15" title="Changes and contact">
                <P>
                  We may update these terms as the platform develops. The effective date at the top
                  of this page changes when we do, and continuing to use BloodBridge after an update
                  means accepting the revised terms.
                </P>
                <P>
                  For a question about your account, the platform or these terms, message your
                  health institute from your BloodBridge account, or contact the institute directly
                  using the details on its centre listing. For a clinical question, speak to the
                  staff at your institute.
                </P>
                <P className="text-slate-500">Effective {LAST_UPDATED}.</P>
              </Section>
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
          Terms of use
        </p>

        <h1 className="mt-4 max-w-[760px] text-[38px] leading-[1.1] font-semibold tracking-[-0.025em] text-balance sm:text-[46px]">
          The terms you and your health institute agree to.
        </h1>

        <p className="mt-5 max-w-[620px] text-[15px] leading-7 on-garnet">
          What BloodBridge does and does not do, what is asked of donors and institutes, and the
          rules the platform enforces on every booking and every donation.
        </p>

        <p className="mt-6 font-mono text-[12px] on-garnet-dim">Effective {LAST_UPDATED}</p>
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
          <Link href="/privacy" className="transition hover:text-garnet">
            Privacy
          </Link>

          <Link href="/terms" className="font-semibold text-garnet">
            Terms
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

function BloodDropIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <path d="M12 2.5c3.6 4.2 6.5 7.7 6.5 11.1A6.5 6.5 0 0 1 12 20a6.5 6.5 0 0 1-6.5-6.4c0-3.4 2.9-6.9 6.5-11.1Z" />
    </svg>
  );
}
