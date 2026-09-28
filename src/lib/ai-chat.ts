import { prisma } from "./prisma";
import { DONATIONS_PER_CONSULTATION } from "./consultation";
import { aiEnabled, aiProviderLabel, streamChat } from "./ai-client";
import { BLOOD_GROUPS, canDonateTo, type BloodGroupValue } from "./blood-compatibility";
import {
  BLOOD_GROUP_LABEL,
  formatDate,
  promptForAnswer,
  replyKeepsAnswer,
  systemAnswer,
  verifiedNote,
  type AssistantFacts,
  type StaffFacts,
} from "./assistant-answers";
import { ELIGIBILITY_VALID_FOR_MS, MIN_DAYS_BETWEEN_DONATIONS } from "./eligibility";
import { APPOINTMENT_TIMES, MAX_DAYS_AHEAD } from "./appointment-slots";
import { ACTIVE_INSTITUTE } from "./institutes";

// Small models have short context windows, so only the latest turns are sent.
const MODEL_HISTORY_LIMIT = Number(process.env.AI_HISTORY_LIMIT ?? 10);

export const FALLBACK_MESSAGE =
  "I'm unable to reach the assistant service right now. For anything urgent, please contact your health institute directly, or try again shortly.";

/** The reply when no model is deployed and the system has no answer of its own. */
export const SYSTEM_ONLY_MESSAGE =
  "I can answer questions about your eligibility, when you can donate again, your appointments, donation centres, where your blood is needed, blood-group compatibility and your donations. For anything else, ask your health institute through **Chat with institute**.";

const SYSTEM_PROMPT = `You are the BloodBridge Assistant, built into BloodBridge, a platform that connects blood donors with participating health institutions in Cameroon.

You help donors, medical staff, lab technicians, health institute administrators and system administrators use the platform: checking donation eligibility, booking and managing appointments, finding donation centres, understanding blood requests and rewards, and general blood-donation information.

How to answer:
- Lead with the answer. The first sentence resolves the question; everything after it has to earn its place.
- Be specific, and use the real figures. "5 of the 11 registered donors can give today" is an answer; "several donors are eligible" is not. Quote the number, the date, the blood group or the name from the account details rather than describing it in general terms.
- Say what follows from it. If the answer implies something to do, name the action and the page to do it on.
- Two to five sentences for most questions. Use a short dash list when the answer really is several items, and put a figure or a page name in **bold** when it is the thing being looked for.
- Never pad. If one sentence answers it, give one sentence and stop. Do not restate the question, do not open with a pleasantry, and do not close by offering further help.
- No headings and no tables: this is a narrow panel.
- Use the account details provided below to personalise answers (for example, say when their next appointment is, or which centres currently need their blood group). Never invent account data that isn't there; if something is missing, say so and point to where they can add or check it.
- When pointing somewhere in the app, give the page name only, written exactly as the page list at the end of the account details writes it. Never write a URL, a path or anything beginning with a slash: people read page names, not addresses.
- You give general information and platform guidance only. You cannot book, cancel or change anything yourself; explain how the user can do it.
- Stay on topic. You help only with blood donation, health questions that bear on donating, and using BloodBridge. If asked about anything else, say in one sentence that you can only help with blood donation and BloodBridge, and answer nothing more.
- Never copy the account details below into a reply as they are written. They are notes for you; answer in your own words.
- You are not a substitute for professional medical judgment. For questions about a specific person's fitness to donate, symptoms, medication or other health concerns, give general context if helpful, then direct them to the staff at their health institute or a medical professional. In an emergency, tell them to contact emergency services.

BloodBridge rules (answer from these; do not substitute general figures from elsewhere):
- Donors must wait at least ${MIN_DAYS_BETWEEN_DONATIONS} days (${MIN_DAYS_BETWEEN_DONATIONS / 7} weeks) between whole blood donations.
- Blood group compatibility: O- can give to everyone; AB+ can receive from everyone; Rh-negative patients need Rh-negative blood.
- The account details below are live, read from the database for this request. Answer from them and give the figure. Never say you lack access to current data when it is there, and never state a count, total or blood group that is not written there.

Pages: the account details end with the list of pages this user has. That list is the only source of page names. Copy a name from it word for word, or name no page at all. Never invent a page name, never combine two, never write its address, and never describe what is on a page beyond what that list says.`;

/*
  How donating works, from the donor's side.

  Only ever shown to a donor. A staff member asked how to book an appointment
  was told to go to the messages page and pick a date "up to 90 days in
  advance" — numbers lifted straight out of these rules. The model repeats
  what it can see, so the cure is not to warn it off donor mechanics but to
  keep them out of a staff member's prompt entirely.
*/
const DONOR_RULES = `
- The preliminary eligibility check requires a weight of at least 50 kg and feeling well, with no current fever, infection or illness, and not being pregnant or having recently given birth. Any of these defers the donor temporarily.
- A reported medical condition, current medication, recent surgery, transfusion, tattoo or piercing, or possible exposure to a blood-borne infection sends the donor to medical review by institute staff.
- An eligibility result is valid for ${ELIGIBILITY_VALID_FOR_MS / 3_600_000} hours and must be passed before booking. It is preliminary, not permanent medical clearance; staff confirm fitness on the day.
- Appointments can be booked up to ${MAX_DAYS_AHEAD} days ahead, at ${APPOINTMENT_TIMES.join(", ")}. A donor holds one upcoming appointment at a time, and reschedules or cancels it from their own appointments page.
- Every participating institute grants one free medical consultation for every ${DONATIONS_PER_CONSULTATION} completed donations.
- Donors change their details and password on their own profile page, in the "Change password" section.`;

/** The prompt for one role: donor mechanics are for donors only. */
function systemPromptFor(role: string) {
  return role === "DONOR" ? `${SYSTEM_PROMPT}${DONOR_RULES}` : SYSTEM_PROMPT;
}

export type AiChatTurn = {
  role: "USER" | "ASSISTANT";
  content: string;
};

/*
  The pages each role can actually open.

  Given to the model per user rather than as one list in the prompt, because
  the 1.5B model will happily reach for a path it can see even when told not
  to: asked where to check stock, an institute admin was sent to the donor
  Blood requests page. A list it cannot see is one it cannot suggest.

  These mirror the routes under app/ — keep them in step when routes move.
*/
const PAGES_BY_ROLE: Record<string, string[]> = {
  DONOR: [
    "Dashboard",
    "My profile",
    "Appointments",
    "Book a donation",
    "My donations",
    "Blood requests",
    "Donation centres",
    "Rewards",
    "Eligibility check",
    "Chat with institute",
    "Notifications",
  ],
  MEDICAL_STAFF: [
    "Workspace — the donor list and search, blood requests, and appointments for this institute are all on this one page",
  ],
  LAB_TECHNICIAN: [
    "Workspace — blood inventory, donations waiting to be recorded, and recent donations",
    "Stock forecast and donor matching",
  ],
  HEALTH_INSTITUTE_ADMIN: [
    "Workspace — this is where this institute's own blood stock, statistics and staff are shown",
    "Institute profile — the institute's own name, address and contact details only; no stock here",
    "Rewards to validate",
    "Donor messages",
  ],
  SYSTEM_ADMIN: [
    "Overview",
    "Users",
    "Institutes",
    "Register an institute",
    "Invite an institute administrator",
    "System logs",
    "Settings",
  ],
};

/** Pages every signed-in staff or admin account shares. */
const STAFF_SHARED_PAGES = [
  "Account settings — their own name, phone and password, reached by clicking their name at the foot of the sidebar",
  "Messages with donors",
];

/*
  What is true right now, for a staff or admin account.

  Without this the assistant had one line to go on — the name of the institute
  — so any question about the platform's actual state ("how many donors are
  eligible?") could only be answered by refusing or by inventing something.
  The figures are counted from the database on each request and handed over as
  plain sentences, which a small model reads far more reliably than it calls a
  tool.

  Each role is given what its own job needs and no more. Donor names and
  contact details are deliberately absent: staff who need those have a donor
  list built for it, with the access rules that belong there.
*/
async function staffFigures(
  role: string,
  healthInstituteId: string | null,
): Promise<{ lines: string[]; facts: StaffFacts }> {
  const lines: string[] = [];
  const intervalStart = new Date();
  intervalStart.setDate(intervalStart.getDate() - MIN_DAYS_BETWEEN_DONATIONS);

  // Donors are registered to the platform rather than to one institute, so
  // these counts are platform-wide and are described that way.
  const [totalDonors, markedEligible, readyNow] = await Promise.all([
    prisma.user.count({ where: { role: "DONOR", isActive: true } }),
    prisma.user.count({
      where: { role: "DONOR", isActive: true, donorProfile: { is: { eligibilityStatus: true } } },
    }),
    prisma.user.count({
      where: {
        role: "DONOR",
        isActive: true,
        donorProfile: {
          is: {
            eligibilityStatus: true,
            OR: [{ lastDonationDate: null }, { lastDonationDate: { lte: intervalStart } }],
          },
        },
      },
    }),
  ]);

  lines.push(
    `Donors registered platform-wide: ${totalDonors} active.`,
    `Donors who passed their eligibility check: ${markedEligible}.`,
    `Of those, able to donate today (also clear of the ${MIN_DAYS_BETWEEN_DONATIONS}-day interval): ${readyNow}.`,
  );

  const facts: StaffFacts = { totalDonors, markedEligible, readyNow, intervalDays: MIN_DAYS_BETWEEN_DONATIONS };

  if (role === "SYSTEM_ADMIN") {
    const [staffCount, institutes, activeInstitutes] = await Promise.all([
      prisma.user.count({ where: { role: { not: "DONOR" }, isActive: true } }),
      prisma.healthInstitute.count(),
      prisma.healthInstitute.count({ where: ACTIVE_INSTITUTE }),
    ]);

    lines.push(
      `Staff and admin accounts: ${staffCount} active.`,
      `Health institutes: ${institutes} registered, ${activeInstitutes} currently active.`,
    );

    facts.platform = { staffAccounts: staffCount, institutes, activeInstitutes };

    return { lines, facts };
  }

  if (!healthInstituteId) return { lines, facts };

  const [openRequests, upcomingAppointments, inventory, unrecorded] = await Promise.all([
    prisma.bloodRequest.findMany({
      where: { healthInstituteId, status: "OPEN" },
      select: { bloodGroup: true, unitsNeeded: true, urgency: true },
    }),
    prisma.appointment.count({
      where: {
        healthInstituteId,
        status: { in: ["SCHEDULED", "CONFIRMED"] },
        appointmentDate: { gte: new Date(new Date().toDateString()) },
      },
    }),
    prisma.bloodInventory.findMany({
      where: { healthInstituteId },
      select: { bloodGroup: true, units: true },
      orderBy: { units: "asc" },
    }),
    prisma.appointment.count({
      where: { healthInstituteId, status: "COMPLETED", donation: { is: null } },
    }),
  ]);

  lines.push(`Upcoming appointments booked at this institute: ${upcomingAppointments}.`);

  lines.push(
    openRequests.length
      ? `Open blood requests here: ${openRequests
          .map(
            (request) =>
              `${BLOOD_GROUP_LABEL[request.bloodGroup]} ${request.unitsNeeded} unit${request.unitsNeeded === 1 ? "" : "s"} (${request.urgency.toLowerCase()})`,
          )
          .join(", ")}.`
      : "Open blood requests here: none.",
  );

  /*
    "What do we need most?" is a question about a list, and a small model asked
    to rank one will answer confidently and wrongly — it read a stock list
    topped by AB- and an request list topped by O+, and said O-. So the answer
    is worked out here and handed over as a sentence, the same principle the
    stock forecast follows.
  */
  let mostRequested: { group: BloodGroupValue; units: number } | null = null;

  if (openRequests.length) {
    const byGroup = new Map<BloodGroupValue, number>();
    for (const request of openRequests) {
      byGroup.set(
        request.bloodGroup,
        (byGroup.get(request.bloodGroup) ?? 0) + request.unitsNeeded,
      );
    }

    const [group, units] = [...byGroup.entries()].sort((a, b) => b[1] - a[1])[0];
    mostRequested = { group, units };

    lines.push(
      `Most requested blood group here right now: ${BLOOD_GROUP_LABEL[group]}, ${units} unit${units === 1 ? "" : "s"} across all open requests. If asked what is needed most by demand, this is the answer.`,
    );
  }

  if (inventory.length) {
    // `inventory` is already ordered by units ascending.
    const lowest = inventory[0];

    lines.push(
      `Lowest stock here: ${BLOOD_GROUP_LABEL[lowest.bloodGroup]} at ${lowest.units} unit${lowest.units === 1 ? "" : "s"}. If asked which group is running low, this is the answer.`,
    );
  }

  if (role === "LAB_TECHNICIAN" || role === "HEALTH_INSTITUTE_ADMIN") {
    lines.push(
      inventory.length
        ? `Blood stock here, by group: ${inventory
            .map((row) => `${BLOOD_GROUP_LABEL[row.bloodGroup]} ${row.units}`)
            .join(", ")} units.`
        : "Blood stock here: nothing recorded yet.",
      `Completed appointments still waiting for a donation record: ${unrecorded}.`,
    );
  }

  /*
    "What should I focus on?" is a judgement across several lists, and a small
    model asked to make one wanders: it told a laboratory technician to book an
    appointment and prepare a blood sample, which is a donor's job. So the
    shortlist is assembled here, in the order a shift would work through it,
    and the model is told to answer from it rather than reason its own way to
    one.
  */
  const priorities: string[] = [];

  if (inventory.length && inventory[0].units < 5) {
    priorities.push(
      `${BLOOD_GROUP_LABEL[inventory[0].bloodGroup]} stock is down to ${inventory[0].units} unit${inventory[0].units === 1 ? "" : "s"}`,
    );
  }

  if (unrecorded > 0 && (role === "LAB_TECHNICIAN" || role === "HEALTH_INSTITUTE_ADMIN")) {
    priorities.push(
      `${unrecorded} completed appointment${unrecorded === 1 ? " still needs" : "s still need"} a donation record`,
    );
  }

  if (openRequests.length) {
    priorities.push(
      `${openRequests.length} blood request${openRequests.length === 1 ? "" : "s"} are still open`,
    );
  }

  if (upcomingAppointments === 0) {
    priorities.push("no donor appointments are booked, so no new blood is due in");
  }

  lines.push(
    priorities.length
      ? `Worth attention here today, in this order: ${priorities.join("; ")}. If asked what to focus on, what needs doing, or what is urgent, answer from this list and nothing else.`
      : "Nothing at this institute needs attention today. If asked what to focus on, say so plainly.",
  );

  const managesStock = role === "LAB_TECHNICIAN" || role === "HEALTH_INSTITUTE_ADMIN";

  facts.institute = {
    openRequests: openRequests.map((request) => ({
      group: request.bloodGroup,
      units: request.unitsNeeded,
      urgency: request.urgency,
    })),
    mostRequested,
    lowestStock: inventory.length ? { group: inventory[0].bloodGroup, units: inventory[0].units } : null,
    stock: managesStock ? inventory.map((row) => ({ group: row.bloodGroup, units: row.units })) : null,
    upcomingAppointments,
    unrecorded: managesStock ? unrecorded : null,
    priorities,
  };

  return { lines, facts };
}

/**
 * What the assistant may know about this user, twice over: as sentences for
 * the model to read, and as values the system answers from (assistant-answers.ts).
 */
export type UserContext = { text: string; facts: AssistantFacts };

export async function buildUserContext(userId: string): Promise<UserContext> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { donorProfile: true, healthInstitute: { select: { name: true, city: true } } },
  });

  const today = new Date();

  if (!user) return { text: "No account details are available.", facts: { role: "UNKNOWN", today } };

  const lines = [
    `Today is ${formatDate(today)}.`,
    `Signed-in user: ${user.firstName} ${user.lastName} (role: ${user.role}).`,
  ];

  if (user.role !== "DONOR") {
    if (user.healthInstitute) {
      lines.push(`Works at: ${user.healthInstitute.name}, ${user.healthInstitute.city}.`);
    }

    const staff = await staffFigures(user.role, user.healthInstituteId);
    lines.push(...staff.lines, ...pageLines(user.role));

    return { text: lines.join("\n"), facts: { role: user.role, today, staff: staff.facts } };
  }

  const profile = user.donorProfile;
  const bloodGroup = profile?.bloodGroup ?? null;

  const [donationCount, nextAppointment, latestAssessment, centres] = await Promise.all([
    prisma.donation.count({ where: { donorId: userId } }),
    prisma.appointment.findFirst({
      where: { donorId: userId, status: { in: ["SCHEDULED", "CONFIRMED"] }, appointmentDate: { gte: new Date() } },
      orderBy: { appointmentDate: "asc" },
      include: { healthInstitute: { select: { name: true, city: true } } },
    }),
    prisma.eligibilityAssessment.findFirst({
      where: { donorId: userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.healthInstitute.findMany({
      where: ACTIVE_INSTITUTE,
      orderBy: { name: "asc" },
      take: 15,
      select: {
        name: true,
        city: true,
        bloodRequests: { where: { status: "OPEN" }, select: { bloodGroup: true, urgency: true } },
      },
    }),
  ]);

  const missing = [
    !user.phoneNumber && "phone number",
    !profile?.dateOfBirth && "date of birth",
    !profile?.gender && "gender",
    !bloodGroup && "blood group",
    !profile?.city && "city",
    !profile?.address && "address",
  ].filter(Boolean);

  lines.push(
    `Blood group: ${bloodGroup ? BLOOD_GROUP_LABEL[bloodGroup] : "not set"}.`,
    bloodGroup
      ? `This donor's blood can go to patients with: ${BLOOD_GROUPS.filter((group) => canDonateTo(bloodGroup, group))
          .map((group) => BLOOD_GROUP_LABEL[group])
          .join(", ")}.`
      : "Compatibility unknown until the donor adds a blood group.",
    `City: ${profile?.city ?? "not set"}.`,
    missing.length ? `Profile fields still missing: ${missing.join(", ")}.` : "Profile is complete.",
    `Completed donations: ${donationCount}. Free consultations earned: ${Math.floor(donationCount / DONATIONS_PER_CONSULTATION)}.`,
    `Last donation: ${profile?.lastDonationDate ? formatDate(profile.lastDonationDate) : "none recorded"}.`,
  );

  let nextEligible: Date | null = null;

  if (profile?.lastDonationDate) {
    nextEligible = new Date(profile.lastDonationDate);
    nextEligible.setDate(nextEligible.getDate() + MIN_DAYS_BETWEEN_DONATIONS);
    lines.push(
      nextEligible > new Date()
        ? `Can donate again from: ${formatDate(nextEligible)}. Not before.`
        : "Donation interval: already passed, so timing is not a barrier.",
    );
  }

  if (latestAssessment) {
    lines.push(
      `Latest eligibility check (${formatDate(latestAssessment.createdAt)}): ${latestAssessment.status}` +
        (latestAssessment.daysRemaining > 0 ? `, ${latestAssessment.daysRemaining} days until eligible` : "") +
        (latestAssessment.reasons.length ? `. Reasons: ${latestAssessment.reasons.join("; ")}` : "") +
        ".",
    );
  } else {
    lines.push(
      profile?.eligibilityStatus
        ? "Eligibility: marked eligible."
        : "Eligibility: the donor has not completed the eligibility check yet.",
    );
  }

  lines.push(
    nextAppointment
      ? `Next appointment: ${formatDate(nextAppointment.appointmentDate)} at ${nextAppointment.appointmentTime}, ${nextAppointment.healthInstitute.name} (${nextAppointment.healthInstitute.city}).`
      : "Upcoming appointments: NONE. The donor has no appointment booked.",
  );

  if (centres.length) {
    // Plain sentences rather than "name: none" notes, which the model copied
    // into the chat word for word.
    lines.push("Active donation centres:");
    for (const centre of centres) {
      const groups = [...new Set(centre.bloodRequests.map((request) => BLOOD_GROUP_LABEL[request.bloodGroup]))];
      const canHelp = bloodGroup && centre.bloodRequests.some((request) => canDonateTo(bloodGroup, request.bloodGroup));
      lines.push(
        `- ${centre.name} in ${centre.city} ${groups.length ? `is asking for ${groups.join(", ")} blood` : "has no open requests"}${canHelp ? ", and this user's blood can help" : ""}.`,
      );
    }
  } else {
    lines.push("There are no active donation centres right now.");
  }

  lines.push(...pageLines(user.role));

  const facts: AssistantFacts = {
    role: user.role,
    today,
    donor: {
      bloodGroup,
      missingFields: missing.filter((field): field is string => typeof field === "string"),
      donationCount,
      consultationsEarned: Math.floor(donationCount / DONATIONS_PER_CONSULTATION),
      donationsPerConsultation: DONATIONS_PER_CONSULTATION,
      lastDonation: profile?.lastDonationDate ?? null,
      nextEligible,
      latestCheck: latestAssessment
        ? {
            status: latestAssessment.status,
            date: latestAssessment.createdAt,
            daysRemaining: latestAssessment.daysRemaining,
            reasons: latestAssessment.reasons,
          }
        : null,
      markedEligible: Boolean(profile?.eligibilityStatus),
      nextAppointment: nextAppointment
        ? {
            date: nextAppointment.appointmentDate,
            time: nextAppointment.appointmentTime,
            centre: nextAppointment.healthInstitute.name,
            city: nextAppointment.healthInstitute.city,
          }
        : null,
      centres: centres.map((centre) => ({
        name: centre.name,
        city: centre.city,
        openGroups: centre.bloodRequests.map((request) => request.bloodGroup),
      })),
    },
  };

  return { text: lines.join("\n"), facts };
}

/** The pages this user can open — the only page names the model may use. */
function pageLines(role: string): string[] {
  const pages = PAGES_BY_ROLE[role] ?? [];

  if (pages.length === 0) return [];

  const shared = role === "DONOR" ? [] : STAFF_SHARED_PAGES;

  const lines = [
    "Pages this user can open. Refer to them by these names, and never by an address:",
    ...[...pages, ...shared].map((page) => `- ${page}`),
  ];

  /*
    What the account cannot do, stated as plainly as what it can.

    The long rules above already said staff do not book appointments, and the
    model still invented a booking flow on the messages page when asked. A
    small model weighs a line in the account details far more heavily than one
    buried in a wall of policy, so the limits live here beside the pages.
  */
  if (role !== "DONOR") {
    lines.push(
      "This account CANNOT do these, and there is no page for them here: book or cancel a donation appointment, take an eligibility check, or view donation history and rewards. Those belong to donors, who do them for themselves from their own dashboard. If asked how to do one, say it is a donor action and that the donor does it from their own account — do not describe steps, and do not name a page for it.",
    );
  }

  return lines;
}

/**
 * Streams the assistant's reply as text chunks. Never throws (FR-41).
 * Returns the full text once done.
 *
 * The system and the model answer together (see assistant-answers.ts): when
 * the latest question can be settled from live records, the system works the
 * answer out and the model writes the reply around it. The system then checks
 * the reply kept the answer's key facts, and adds the verified answer if not.
 * If the model is unreachable, the system's answer is given on its own.
 */
export async function* streamAssistantReply(
  history: AiChatTurn[],
  context: UserContext,
): AsyncGenerator<string, string> {
  let text = "";

  const question = [...history].reverse().find((turn) => turn.role === "USER")?.content ?? "";
  const verified = systemAnswer(question, context.facts);

  // Safety-critical answers are the system's alone.
  if (verified?.final) {
    yield verified.text;
    return verified.text;
  }

  // No model deployed: the system answers what it can, and says what it can't.
  if (!aiEnabled) {
    const reply = verified?.text ?? SYSTEM_ONLY_MESSAGE;
    yield reply;
    return reply;
  }

  try {
    const recent = history.slice(-MODEL_HISTORY_LIMIT);
    const firstUserTurn = Math.max(recent.findIndex((turn) => turn.role === "USER"), 0);

    const stream = streamChat([
      {
        role: "system",
        content: `${systemPromptFor(context.facts.role)}

Account details for this conversation:
${context.text}${verified ? promptForAnswer(verified) : ""}`,
      },
        ...recent.slice(firstUserTurn).map((turn) => ({
          role: turn.role === "USER" ? ("user" as const) : ("assistant" as const),
          content: turn.content,
        })),
      ],
      // Room for a complete answer. The prompt asks for brevity where brevity
      // is right, so this is a ceiling rather than a target.
      { maxTokens: 800 },
    );

    for await (const delta of stream) {
      text += delta;
      yield delta;
    }

    // The system's check on the model: a reply that lost or changed a
    // verified figure gets the verified answer beneath it.
    if (verified && !replyKeepsAnswer(text, verified)) {
      const note = text.trim() ? verifiedNote(verified) : verified.text;
      text += note;
      yield note;
    }
  } catch (error) {
    console.error(`AI CHAT REQUEST FAILED (${aiProviderLabel}):`, error);

    // The model is down, but the system can still answer what it knows.
    const notice = verified
      ? text
        ? verifiedNote(verified)
        : verified.text
      : text
        ? `\n\n${FALLBACK_MESSAGE}`
        : FALLBACK_MESSAGE;
    text += notice;
    yield notice;
  }

  return text.trim() || FALLBACK_MESSAGE;
}
