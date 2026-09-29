import { BLOOD_GROUPS, canDonateTo, compatibleDonorGroups, type BloodGroupValue } from "./blood-compatibility";

/*
  The half of the assistant that is never wrong about a figure.

  The model is good at language and poor at facts: it will phrase a reply
  well and, in the same breath, give the wrong blood group or a date it made
  up. The system is the opposite — it knows every figure exactly and cannot
  write a sentence. So they split the work:

  1. The system recognises the questions it can settle from live records
     (compatibility, when a donor can give again, stock, priorities...) and
     works the answer out here, in code.
  2. The model is handed that answer as verified and writes the reply around
     it, adding the explanation and next step the system cannot.
  3. The system checks the finished reply still carries the answer's key
     figures. If the model dropped or changed one, the verified answer is
     appended so the user never leaves with a wrong figure.
  4. If the model is unreachable, the system's answer is given on its own
     rather than an apology.

  Everything in this file is pure — no database, no network — so each of
  those steps is covered by tests/lib/assistant-answers.test.ts.
*/

export const BLOOD_GROUP_LABEL: Record<BloodGroupValue, string> = {
  A_POSITIVE: "A+",
  A_NEGATIVE: "A-",
  B_POSITIVE: "B+",
  B_NEGATIVE: "B-",
  AB_POSITIVE: "AB+",
  AB_NEGATIVE: "AB-",
  O_POSITIVE: "O+",
  O_NEGATIVE: "O-",
};

export const formatDate = (date: Date) =>
  date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

type GroupUnits = { group: BloodGroupValue; units: number };

export type DonorFacts = {
  bloodGroup: BloodGroupValue | null;
  missingFields: string[];
  donationCount: number;
  consultationsEarned: number;
  donationsPerConsultation: number;
  lastDonation: Date | null;
  /** When the donation interval ends; null when it is not a barrier. */
  nextEligible: Date | null;
  latestCheck: { status: string; date: Date; daysRemaining: number; reasons: string[] } | null;
  markedEligible: boolean;
  nextAppointment: { date: Date; time: string; centre: string; city: string } | null;
};

export type CentreFact = { name: string; city: string; openGroups: BloodGroupValue[] };

export type StaffFacts = {
  totalDonors: number;
  markedEligible: number;
  readyNow: number;
  intervalDays: number;
  /** Everything below is per institute, and absent for accounts without one. */
  institute?: {
    openRequests: { group: BloodGroupValue; units: number; urgency: string }[];
    mostRequested: GroupUnits | null;
    lowestStock: GroupUnits | null;
    /** Shown only to roles that manage stock. */
    stock: GroupUnits[] | null;
    upcomingAppointments: number;
    /** Shown only to roles that record donations. */
    unrecorded: number | null;
    priorities: string[];
  };
  platform?: { staffAccounts: number; institutes: number; activeInstitutes: number };
};

export type AssistantFacts = {
  role: string;
  today: Date;
  /** Every active centre, for every role: staff ask where to send people too. */
  centres: CentreFact[];
  donor?: DonorFacts;
  staff?: StaffFacts;
};

/**
 * A reply the system can vouch for. Each entry of `anchors` lists the ways
 * one key fact may be written; a reply that contains none of them has lost
 * that fact.
 */
export type SystemAnswer = {
  intent: string;
  text: string;
  anchors: string[][];
  /**
   * Given exactly as written, without the model. For answers where one wrong
   * word could hurt someone: in testing, the model kept a correct "No" on a
   * compatibility question and then added a false claim beside it, which no
   * anchor check can catch.
   */
  final?: boolean;
};

/* ------------------------------------------------------------------ */
/* Reading the question                                                 */
/* ------------------------------------------------------------------ */

// The sign has to touch the letters: "O-" and "ab+", but not "a - b".
const SYMBOL_GROUP = /(?<![a-z0-9])(ab|a|b|o)([+-])(?![a-z0-9+-])/gi;
// "A positive" is also how a sentence starts ("a positive result"), so the
// spelled-out form needs a capital letter for the single-letter groups.
const WORD_GROUP = /(?<![a-z0-9])(ab|a|b|o)[\s-](positive|negative|pos|neg)\b/gi;

type Mention = { index: number; group: BloodGroupValue };

function groupMentions(message: string): Mention[] {
  const found: Mention[] = [];

  const toGroup = (letters: string, positive: boolean) =>
    `${letters.toUpperCase()}_${positive ? "POSITIVE" : "NEGATIVE"}` as BloodGroupValue;

  for (const match of message.matchAll(SYMBOL_GROUP)) {
    found.push({ index: match.index ?? 0, group: toGroup(match[1], match[2] === "+") });
  }

  for (const match of message.matchAll(WORD_GROUP)) {
    if (match[1] === "a" || match[1] === "b") continue;
    found.push({ index: match.index ?? 0, group: toGroup(match[1], match[2].toLowerCase().startsWith("pos")) });
  }

  const seen = new Set<BloodGroupValue>();
  return found
    .sort((a, b) => a.index - b.index)
    .filter((mention) => !seen.has(mention.group) && Boolean(seen.add(mention.group)));
}

/** Blood groups named in a message, in the order they appear. */
export function groupsMentioned(message: string): BloodGroupValue[] {
  return groupMentions(message).map((mention) => mention.group);
}

const label = (group: BloodGroupValue) => BLOOD_GROUP_LABEL[group];
const labels = (groups: BloodGroupValue[]) => groups.map(label).join(", ");
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** Ways a group might be written in a reply: "O+", "O +", "O positive". */
function groupAnchor(group: BloodGroupValue): string[] {
  const [letters, sign] = label(group).match(/^(AB|A|B|O)([+-])$/)!.slice(1);
  const word = sign === "+" ? "positive" : "negative";
  return [`${letters}${sign}`, `${letters} ${sign}`, `${letters} ${word}`, `${letters}-${word}`];
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Ways a date might be written: "3 Nov", "November 3", "3rd November". */
function dateAnchor(date: Date): string[] {
  const day = date.getDate();
  const month = MONTHS[date.getMonth()];
  const short = month.slice(0, 3);
  const suffix = day % 10 === 1 && day !== 11 ? "st" : day % 10 === 2 && day !== 12 ? "nd" : day % 10 === 3 && day !== 13 ? "rd" : "th";

  return [day, `${day}${suffix}`].flatMap((d) => [`${d} ${short}`, `${short} ${d}`, `${d} ${month}`, `${month} ${d}`]);
}

const numberAnchor = (count: number) => [String(count)];

/* ------------------------------------------------------------------ */
/* Donor questions                                                      */
/* ------------------------------------------------------------------ */

// Words that make a message a compatibility question rather than, say, one
// about when to donate: "when can I donate again?" must not land here.
const COMPATIBILITY =
  /\b(compatib\w*|receiv\w*|accept\w*|transfus\w*|match\w*|who can|(give|donate|go|given|donated) (my )?(blood )?to)\b/;

function compatibilityAnswer(message: string, own: BloodGroupValue | null): SystemAnswer | null {
  const text = message.toLowerCase();

  if (!COMPATIBILITY.test(text)) return null;

  const mentions = groupMentions(message);
  const aboutMe = /\b(i|my|me)\b/.test(text);

  const receiveAt = text.search(/\b(receiv\w*|accept\w*)\b/);

  // "Can O+ give to A-?" or, from a donor, "Can I give to A-?". In "Can A-
  // receive O+?" the patient comes first, so the pair is read the other way.
  const [first, second] = mentions.map((mention) => mention.group);
  const patientFirst = Boolean(second) && receiveAt > mentions[0].index && receiveAt < mentions[1].index;
  const donor = second ? (patientFirst ? second : first) : aboutMe && own && first && first !== own ? own : null;
  const recipient = second ? (patientFirst ? first : second) : donor ? first : null;

  if (donor && recipient) {
    const yes = canDonateTo(donor, recipient);

    return {
      intent: "compatibility-pair",
      text: yes
        ? `**Yes** — ${label(donor)} blood can be given to patients with ${label(recipient)}.`
        : `**No** — ${label(donor)} blood cannot be given to patients with ${label(recipient)}. Patients with ${label(recipient)} can only receive ${labels(compatibleDonorGroups(recipient))}.`,
      anchors: [yes ? ["yes", "can be given", "can give", "can donate", "can receive"] : ["no", "cannot", "can't", "not compatible"]],
      final: true,
    };
  }

  const subject = first ?? (aboutMe ? own : null);
  if (!subject) return null;

  const who = first ? label(subject) : `Your blood (${label(subject)})`;

  // Is the subject the patient ("what can AB- receive?") or the donor ("who
  // can receive O- blood?")? Where the group sits around "receive" decides.
  const asPatient =
    /\breceiv\w*\s+(blood\s+)?from\b|\bfrom whom\b|\b(get|take)\b.*\bfrom\b/.test(text) ||
    (first
      ? receiveAt >= 0 && mentions[0].index < receiveAt
      : /\b(can i|i can|do i|could i) (receive|accept|get)\b/.test(text));

  if (asPatient) {
    const donors = compatibleDonorGroups(subject);
    return {
      intent: "compatibility-receive",
      text: `Patients with ${label(subject)} can receive blood from **${labels(donors)}**.`,
      anchors: donors.map(groupAnchor),
      final: true,
    };
  }

  const recipients = BLOOD_GROUPS.filter((group) => canDonateTo(subject, group));
  return {
    intent: "compatibility-give",
    text: `${who} can be given to patients with **${labels(recipients)}**.`,
    anchors: recipients.map(groupAnchor),
    final: true,
  };
}

function donorAnswer(message: string, facts: DonorFacts, today: Date, centres: CentreFact[]): SystemAnswer | null {
  const text = message.toLowerCase();

  const compatibility = compatibilityAnswer(message, facts.bloodGroup);
  if (compatibility) return compatibility;

  // When can I give again?
  if (
    /\b(when|how long|how soon)\b.*\b(donate|give|donation)\b/.test(text) ||
    /\b(donate|give) again\b|\bnext donation\b|\beligible again\b|\bcan i (donate|give)( blood)? (today|now|yet)\b/.test(text)
  ) {
    const check = facts.latestCheck;

    if (facts.nextEligible && facts.nextEligible > today) {
      return {
        intent: "next-donation",
        text: `You can donate again from **${formatDate(facts.nextEligible)}** — ${facts.lastDonation ? `your last donation was on ${formatDate(facts.lastDonation)}, and ` : ""}donors wait at least the full interval between whole blood donations. You can book that date from **Book a donation** once it is within the booking window.`,
        anchors: [dateAnchor(facts.nextEligible)],
      };
    }

    if (check && check.status !== "ELIGIBLE") {
      const waiting = check.daysRemaining > 0 ? ` for another ${plural(check.daysRemaining, "day")}` : "";
      return {
        intent: "next-donation",
        text:
          check.status === "MEDICAL_REVIEW"
            ? `Your latest eligibility check (${formatDate(check.date)}) needs **medical review** by institute staff before you can donate${check.reasons.length ? `: ${check.reasons.join("; ")}` : ""}. Contact your health institute through **Chat with institute**.`
            : `Your latest eligibility check (${formatDate(check.date)}) deferred you${waiting}${check.reasons.length ? ` — ${check.reasons.join("; ")}` : ""}. Take a new **Eligibility check** once that has passed.`,
        anchors: [check.status === "MEDICAL_REVIEW" ? ["medical review", "review"] : ["defer", "deferred", "wait", "not yet"]],
      };
    }

    return {
      intent: "next-donation",
      text: `The donation interval is **not a barrier** — you can donate now. ${check ? "Book a slot from **Book a donation**." : "Complete the **Eligibility check** first, then book from **Book a donation**."}`,
      anchors: [["now", "today", "any time", "anytime", "not a barrier", "already"]],
    };
  }

  // Appointment status (not "how do I book/cancel")
  if (
    /\bappointment/.test(text) &&
    !/\b(how|cancel|reschedul\w*|change|move)\b/.test(text) &&
    /\b(when|what time|where|my|next|do i have|booked|upcoming)\b/.test(text)
  ) {
    const next = facts.nextAppointment;
    return next
      ? {
          intent: "appointment",
          text: `Your next appointment is on **${formatDate(next.date)} at ${next.time}**, at ${next.centre} (${next.city}).`,
          anchors: [dateAnchor(next.date), [next.time]],
        }
      : {
          intent: "appointment",
          text: "You have **no appointment booked**. You can book one from **Book a donation**.",
          anchors: [["no appointment", "not have", "don't have", "do not have", "no upcoming", "none"]],
        };
  }

  // Where is my blood needed?
  const aboutCentres = /\b(centres?|centers?|hospitals?|clinics?|institutes?|blood banks?)\b/.test(text);
  const aboutNeed = /\bneed\w*\b|\bhelp\b|\bshort\w*\b|\brequests?\b/.test(text);
  if (
    (aboutCentres && aboutNeed) ||
    /\b(where|which)\b.*\b(needed|need)\b/.test(text) ||
    /\bneeds? my blood\b|\bmy blood (is )?needed\b/.test(text)
  ) {
    if (!facts.bloodGroup) {
      return {
        intent: "centres",
        text: "I can't match centres to you yet because your **blood group isn't set**. Add it on **My profile**, or see every centre on **Donation centres**.",
        anchors: [["blood group"]],
      };
    }

    const own = facts.bloodGroup;
    const needing = centres.filter((centre) => centre.openGroups.some((group) => canDonateTo(own, group)));

    return needing.length
      ? {
          intent: "centres",
          text: `Your ${label(own)} blood is needed at ${needing.map((centre) => `**${centre.name}** (${centre.city})`).join(", ")}.`,
          anchors: needing.map((centre) => [centre.name]),
        }
      : {
          intent: "centres",
          text: `No centre has an open request your ${label(own)} blood can meet right now. Every active centre is listed on **Donation centres**.`,
          anchors: [["no centre", "none", "no open", "not currently", "no current", "no active request", "no requests"]],
        };
  }

  // How many donations / consultations
  if (/\bhow many (donations|times)\b|\bconsultation/.test(text) || /\bhave i donated\b/.test(text)) {
    const towardsNext = facts.donationsPerConsultation - (facts.donationCount % facts.donationsPerConsultation);
    return {
      intent: "donation-count",
      text: `You have completed **${plural(facts.donationCount, "donation")}** and earned **${plural(facts.consultationsEarned, "free consultation")}**. ${plural(towardsNext, "more donation")} will earn the next one.`,
      anchors: [numberAnchor(facts.donationCount)],
    };
  }

  // Profile completeness
  if (/\bprofile\b.*\b(complete|missing|finish\w*)\b|\bwhat('s| is) missing\b/.test(text)) {
    return facts.missingFields.length
      ? {
          intent: "profile",
          text: `Your profile is still missing: **${facts.missingFields.join(", ")}**. Add them on **My profile**.`,
          anchors: facts.missingFields.map((field) => [field]),
        }
      : { intent: "profile", text: "Your profile is **complete**.", anchors: [["complete"]] };
  }

  // Eligibility status
  if (/\bam i eligible\b|\bmy eligibility\b|\beligibility (status|result)\b/.test(text)) {
    const check = facts.latestCheck;
    if (!check) {
      return {
        intent: "eligibility",
        text: facts.markedEligible
          ? "You are **marked eligible**."
          : "You **haven't taken the eligibility check** yet. Take it on **Eligibility check** before booking.",
        anchors: [facts.markedEligible ? ["eligible"] : ["eligibility check", "not taken", "haven't", "have not"]],
      };
    }

    const word = { ELIGIBLE: "eligible", TEMPORARILY_DEFERRED: "temporarily deferred", MEDICAL_REVIEW: "sent to medical review" }[check.status] ?? check.status;
    return {
      intent: "eligibility",
      text: `Your latest eligibility check (${formatDate(check.date)}) found you **${word}**${check.reasons.length ? `: ${check.reasons.join("; ")}` : ""}.`,
      anchors: [[word.split(" ")[0]]],
    };
  }

  return null;
}

/* ------------------------------------------------------------------ */
/* Staff and admin questions                                            */
/* ------------------------------------------------------------------ */

function staffAnswer(message: string, facts: StaffFacts): SystemAnswer | null {
  const text = message.toLowerCase();
  const here = facts.institute;

  const compatibility = compatibilityAnswer(message, null);
  if (compatibility) return compatibility;

  if (/\bhow many donors\b|\bdonors?\b.*\b(eligible|available|can (donate|give)|ready)\b/.test(text)) {
    return {
      intent: "donor-count",
      text: `**${facts.readyNow}** donors can give today, out of ${facts.markedEligible} who passed their eligibility check and ${facts.totalDonors} active donors platform-wide.`,
      anchors: [numberAnchor(facts.readyNow)],
    };
  }

  if (facts.platform && /\bhow many (institutes|hospitals|centres|centers)\b/.test(text)) {
    return {
      intent: "institute-count",
      text: `**${facts.platform.institutes}** institutes are registered, and ${facts.platform.activeInstitutes} of them are active.`,
      anchors: [numberAnchor(facts.platform.institutes)],
    };
  }

  if (facts.platform && /\bhow many (staff|accounts|users|admins)\b/.test(text)) {
    return {
      intent: "staff-count",
      text: `There are **${facts.platform.staffAccounts}** active staff and admin accounts, and ${facts.totalDonors} active donors.`,
      anchors: [numberAnchor(facts.platform.staffAccounts)],
    };
  }

  if (!here) return null;

  if (/\b(focus|priorit\w*|urgent|what should i (do|work on)|needs? (doing|attention)|to do)\b/.test(text)) {
    return here.priorities.length
      ? {
          intent: "priorities",
          text: `In order: ${here.priorities.map((item, index) => `**${index + 1}.** ${item}`).join("; ")}.`,
          anchors: [[here.priorities[0].split(" ").slice(0, 2).join(" ")]],
        }
      : { intent: "priorities", text: "**Nothing** at this institute needs attention today.", anchors: [["nothing", "no urgent", "all clear"]] };
  }

  if (/\b(most (needed|requested|in demand)|needed most|highest demand|most demand)\b/.test(text)) {
    return here.mostRequested
      ? {
          intent: "most-requested",
          text: `**${label(here.mostRequested.group)}** is the most requested here — ${plural(here.mostRequested.units, "unit")} across open requests.`,
          anchors: [groupAnchor(here.mostRequested.group)],
        }
      : { intent: "most-requested", text: "There are **no open blood requests** here right now.", anchors: [["no open", "none", "no blood requests", "no requests"]] };
  }

  if (/\b(low|lowest|running (low|out)|short\w*)\b/.test(text) && /\b(stock|blood|group|units?|inventory|supply)\b/.test(text)) {
    return here.lowestStock
      ? {
          intent: "lowest-stock",
          text: `**${label(here.lowestStock.group)}** is lowest here, at ${plural(here.lowestStock.units, "unit")}.`,
          anchors: [groupAnchor(here.lowestStock.group)],
        }
      : { intent: "lowest-stock", text: "No blood stock has been recorded here yet.", anchors: [["no", "not", "nothing"]] };
  }

  if (here.stock && /\b(stock|inventory|how much blood|how many units)\b/.test(text)) {
    return here.stock.length
      ? {
          intent: "stock",
          text: `Blood stock here: ${here.stock.map((row) => `${label(row.group)} **${row.units}**`).join(", ")} units.`,
          anchors: here.stock.slice(0, 1).map((row) => groupAnchor(row.group)),
        }
      : { intent: "stock", text: "No blood stock has been recorded here yet.", anchors: [["no", "not", "nothing"]] };
  }

  if (/\b(open|active|pending) (blood )?requests\b|\bhow many requests\b/.test(text)) {
    return here.openRequests.length
      ? {
          intent: "open-requests",
          text: `**${plural(here.openRequests.length, "open request")}** here: ${here.openRequests
            .map((request) => `${label(request.group)} ${plural(request.units, "unit")} (${request.urgency.toLowerCase()})`)
            .join(", ")}.`,
          anchors: [numberAnchor(here.openRequests.length)],
        }
      : { intent: "open-requests", text: "There are **no open blood requests** here.", anchors: [["no open", "none", "no blood requests", "no requests"]] };
  }

  if (/\bhow many appointments\b|\bappointments? (today|upcoming|booked|coming)\b|\bupcoming appointments\b/.test(text)) {
    return {
      intent: "appointments",
      text: `**${plural(here.upcomingAppointments, "upcoming appointment")}** are booked at this institute.`,
      anchors: [numberAnchor(here.upcomingAppointments)],
    };
  }

  if (here.unrecorded !== null && /\b(unrecorded|not (yet )?recorded|(waiting|awaiting|need\w*) (for )?(a )?(donation )?record)/.test(text)) {
    return {
      intent: "unrecorded",
      text: `**${here.unrecorded}** completed appointment${here.unrecorded === 1 ? " still needs" : "s still need"} a donation record, on the **Workspace** page.`,
      anchors: [numberAnchor(here.unrecorded)],
    };
  }

  return null;
}

/* ------------------------------------------------------------------ */
/* Public API                                                           */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Health and topic: the rules the model would not keep                 */
/* ------------------------------------------------------------------ */

/*
  Asked "Is it safe to donate if I have a cold?", the model answered "Yes" —
  the opposite of BloodBridge's own screening (src/lib/eligibility.ts), which
  defers anyone with a current illness. The rule was in its prompt. So these
  answers come from the screening rules themselves and never pass through the
  model. Each names the step that settles it for this person, because the
  screening and the staff decide, not the chat.
*/
const HEALTH_RULES: { pattern: RegExp; intent: string; text: string }[] = [
  {
    pattern: /\b(cold|flu|fever|sick|ill|illness|unwell|cough\w*|infection|infected|malaria|covid|sore throat|diarrh\w*|vomit\w*|typhoid)\b/,
    intent: "health-illness",
    text: "**Not while you are unwell.** BloodBridge defers anyone with a current fever, infection or illness, including a cold or flu. Wait until you have fully recovered, then take the **Eligibility check** again. If you are unsure, ask your health institute through **Chat with institute**.",
  },
  {
    pattern: /\b(pregnan\w*|gave birth|given birth|childbirth|breastfeed\w*)\b/,
    intent: "health-pregnancy",
    text: "**Not during pregnancy or soon after giving birth.** BloodBridge defers donors in that situation temporarily. Your health institute can tell you when you can donate again — ask through **Chat with institute**.",
  },
  {
    pattern: /\b(tattoo\w*|pierc\w*|surgery|operation|transfusion|medication|medicine|antibiotic\w*|pills?|drugs?|hiv|hepatitis|diabet\w*|hypertension|blood pressure|asthma|epilep\w*|condition)\b/,
    intent: "health-review",
    text: "**That needs a medical review before you donate.** BloodBridge sends donors with a medical condition, current medication, recent surgery or transfusion, a new tattoo or piercing, or possible exposure to a blood-borne infection to the institute's staff, who decide case by case. Mention it in the **Eligibility check**, or ask your institute through **Chat with institute**.",
  },
  {
    pattern: /\b(weigh\w*|kg|kilos?|underweight)\b/,
    intent: "health-weight",
    text: "You need to weigh **at least 50 kg** to donate with BloodBridge. The **Eligibility check** asks for your weight.",
  },
];

// Health words only matter when the question is about donating.
const ABOUT_DONATING = /\b(donat\w*|give blood|giving blood|donor|eligib\w*|allowed|safe|can i)\b/;

function healthAnswer(message: string): SystemAnswer | null {
  const text = message.toLowerCase();
  if (!ABOUT_DONATING.test(text) || groupsMentioned(message).length) return null;

  const rule = HEALTH_RULES.find((candidate) => candidate.pattern.test(text));
  return rule ? { intent: rule.intent, text: rule.text, anchors: [], final: true } : null;
}

/*
  What the assistant is for. Told to stay on topic, the model still explained
  what a cat is and who won the World Cup, so the system checks the topic
  before the model sees the question. The list is broad on purpose: a
  genuine question wrongly turned away is worse than a stray one answered.
*/
const ON_TOPIC =
  /\b(blood|donat\w*|donor\w*|give|giving|eligib\w*|appointment\w*|book\w*|slot\w*|centres?|centers?|hospitals?|clinics?|institut\w*|reward\w*|consult\w*|profile|password|account|request\w*|stock|inventory|units?|group|type|health\w*|iron|haemo\w*|hemo\w*|eat\w*|drink\w*|food|meal|water|weigh\w*|age|old|tattoo\w*|pierc\w*|medic\w*|sick|ill|pregnan\w*|safe\w*|pain|needle\w*|arm|faint\w*|dizz\w*|recover\w*|rest|exercis\w*|alcohol|smok\w*|travel\w*|test\w*|result\w*|record\w*|patient\w*|transfus\w*|plasma|platelet\w*|staff|notification\w*|message\w*|chat|page|log\s?in|sign\w*|dashboard|workspace|forecast\w*|match\w*|schedul\w*|cancel\w*|reschedul\w*|focus\w*|priorit\w*|urgent\w*|need\w*|short\w*|low\w*|supply|demand|shift|task\w*|work\w*|missing|complete\w*|bloodbridge|sang|donner|donneur|rendez|h[oô]pital)\b/;

// Greetings and questions about the assistant itself.
const SMALL_TALK =
  /^\s*(hi|hello|hey|good (morning|afternoon|evening)|thanks?|thank you|ok(ay)?|bye|bonjour|merci)\b|\b(what can you|who are you|what do you do|help me|how does this work)\b/;

export const OFF_TOPIC_REPLY =
  "I can only help with blood donation and using BloodBridge — for example your eligibility, appointments, donation centres, or where your blood is needed.";

export function isOffTopic(message: string): boolean {
  const text = message.toLowerCase();
  return !ON_TOPIC.test(text) && !SMALL_TALK.test(text) && groupsMentioned(message).length === 0;
}

/**
 * The answer the system can give from its own records, or null when the
 * question needs the model's judgement (how-tos, explanations, anything
 * general). Deliberately conservative: a question it is unsure about is left
 * to the model rather than answered wrongly.
 */
export function systemAnswer(message: string, facts: AssistantFacts): SystemAnswer | null {
  const health = healthAnswer(message);
  if (health) return health;

  // Before the topic check: "where is Yaounde" names a city with centres in it.
  const city = cityAnswer(message, facts);
  if (city) return city;

  if (isOffTopic(message)) return { intent: "off-topic", text: OFF_TOPIC_REPLY, anchors: [], final: true };

  const centres = centreAnswer(message, facts);
  if (centres) return centres;

  if (facts.donor) return donorAnswer(message, facts.donor, facts.today, facts.centres);
  if (facts.staff) return staffAnswer(message, facts.staff);
  return null;
}

/* ------------------------------------------------------------------ */
/* Centres — for every role                                             */
/* ------------------------------------------------------------------ */

/*
  Listing centres is the system's job outright (final). Asked for "the
  available donation centers", the model pasted its notes into the chat; and
  a medical staff account, which was never given the list, answered "I can't
  provide specific information about donation centers".
*/
const accentless = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function centreLines(centres: CentreFact[], own: BloodGroupValue | null) {
  return centres
    .map((centre) => {
      const helps = own && centre.openGroups.some((group) => canDonateTo(own, group));
      return `- **${centre.name}**, ${centre.city}${helps ? ` — needs blood your ${label(own!)} can give` : ""}`;
    })
    .join("\n");
}

function nextStep(facts: AssistantFacts) {
  return facts.donor
    ? "Book a visit at any of them from **Book a donation**."
    : "Donors book their visits from their own account.";
}

function centreAnswer(message: string, facts: AssistantFacts): SystemAnswer | null {
  const text = message.toLowerCase();
  const own = facts.donor?.bloodGroup ?? null;
  const aboutCentres = /\b(centres?|centers?|hospitals?|clinics?|institutes?|blood banks?|laborator\w*|labs?)\b/.test(text);
  const aboutNeed = /\bneed\w*\b|\bshort\w*\b|\brequests?\b/.test(text);

  // "In which hospital can I analyse my blood?" / "How can I know my blood type?"
  const aboutTesting =
    /\b(analy[sz]\w*|test\w*|screen\w*|check\w*|know|find out|determine|discover)\b/.test(text) &&
    /\bblood\b|\bblood (type|group)\b|\bgroupe sanguin\b/.test(text) &&
    !/\beligib\w*\b/.test(text);

  if (aboutTesting && (aboutCentres || /\b(where|which|how)\b/.test(text))) {
    const list = facts.centres.length
      ? `The health institutes on BloodBridge are:\n${centreLines(facts.centres, null)}`
      : "There are no active health institutes on BloodBridge right now.";
    return {
      intent: "blood-test",
      text: `Your blood group is determined by a simple laboratory test at a health institute, and it is confirmed every time you donate. ${list}\n\nOnce you know it, add it to ${facts.donor ? "**My profile**" : "the donor's profile"} so BloodBridge can match it to requests.`,
      anchors: [],
      final: true,
    };
  }

  if (
    (aboutCentres && /\b(what|which|where|list|available|all|near\w*|show|are there|any)\b/.test(text) && !aboutNeed) ||
    /\bwhere (can|do|should) i (donate|give)\b/.test(text)
  ) {
    if (!facts.centres.length) {
      return { intent: "centre-list", text: "There are **no active donation centres** right now.", anchors: [], final: true };
    }
    return {
      intent: "centre-list",
      text:
        `There ${facts.centres.length === 1 ? "is" : "are"} **${plural(facts.centres.length, "active donation centre")}** on BloodBridge:\n` +
        centreLines(facts.centres, own) +
        `\n\n${nextStep(facts)}`,
      anchors: [],
      final: true,
    };
  }

  return null;
}

/** "Where is Yaounde?" — the centres in a city BloodBridge covers. */
function cityAnswer(message: string, facts: AssistantFacts): SystemAnswer | null {
  const text = accentless(message);
  const cities = [...new Set(facts.centres.map((centre) => centre.city))];
  const city = cities.find((name) => new RegExp(`\\b${accentless(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(text));
  if (!city) return null;

  const here = facts.centres.filter((centre) => centre.city === city);
  return {
    intent: "city",
    text: `BloodBridge has **${plural(here.length, "active donation centre")}** in ${city}:\n${centreLines(here, facts.donor?.bloodGroup ?? null)}\n\n${nextStep(facts)}`,
    anchors: [],
    final: true,
  };
}

const normalise = (value: string) =>
  value
    .toLowerCase()
    .replace(/\*\*/g, "")
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ");

function contains(reply: string, variant: string) {
  const needle = normalise(variant);
  // Numbers must stand alone: "5" should not be found inside "15".
  if (/^\d+$/.test(needle)) return new RegExp(`(?<!\\d)${needle}(?!\\d)`).test(reply);
  // Short words must be whole words: "no" should not be found inside "know".
  if (/^[a-z]{1,4}$/.test(needle)) return new RegExp(`\\b${needle}\\b`).test(reply);
  return reply.includes(needle);
}

/** True when the model's reply still carries every key fact of the answer. */
export function replyKeepsAnswer(reply: string, answer: SystemAnswer): boolean {
  const text = normalise(reply);
  return answer.anchors.every((variants) => variants.some((variant) => contains(text, variant)));
}

/** The line added under a reply that lost the verified answer. */
export const verifiedNote = (answer: SystemAnswer) => `\n\n**From BloodBridge's records:** ${answer.text}`;

/** What the model is told when the system has already settled the question. */
export const promptForAnswer = (answer: SystemAnswer) => `

Verified answer from BloodBridge's records, worked out by the system for the user's latest message:
${answer.text}

This is correct. Build your reply on it: give this answer first, keeping every figure, date, blood group and name exactly as written, then add at most one or two sentences of useful context or the next step. Never contradict it or replace it with your own figures.`;
