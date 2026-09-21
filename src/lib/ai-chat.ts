import { prisma } from "./prisma";
import { DONATIONS_PER_CONSULTATION } from "./consultation";
import { aiProviderLabel, streamChat } from "./ai-client";
import { BLOOD_GROUPS, canDonateTo } from "./blood-compatibility";
import { ELIGIBILITY_VALID_FOR_MS, MIN_DAYS_BETWEEN_DONATIONS } from "./eligibility";
import { APPOINTMENT_TIMES, MAX_DAYS_AHEAD } from "./appointment-slots";
import { ACTIVE_INSTITUTE } from "./institutes";

// Small models have short context windows, so only the latest turns are sent.
const MODEL_HISTORY_LIMIT = Number(process.env.AI_HISTORY_LIMIT ?? 10);

export const FALLBACK_MESSAGE =
  "I'm unable to reach the assistant service right now. For anything urgent, please contact your health institute directly, or try again shortly.";

const SYSTEM_PROMPT = `You are the BloodBridge Assistant, built into BloodBridge, a platform that connects blood donors with participating health institutions in Cameroon.

You help donors, medical staff, lab technicians, health institute administrators and system administrators use the platform: checking donation eligibility, booking and managing appointments, finding donation centres, understanding blood requests and rewards, and general blood-donation information.

How to answer:
- Keep replies short and conversational: a few sentences, or a brief list when steps are involved. This is a small chat panel, so avoid headings and tables.
- Use the account details provided below to personalise answers (for example, say when their next appointment is, or which centres currently need their blood group). Never invent account data that isn't there; if something is missing, say so and point to where they can add or check it.
- When pointing somewhere in the app, name the page and its path, e.g. "My profile (/profile)".
- You give general information and platform guidance only. You cannot book, cancel or change anything yourself; explain how the user can do it.
- You are not a substitute for professional medical judgment. For questions about a specific person's fitness to donate, symptoms, medication or other health concerns, give general context if helpful, then direct them to the staff at their health institute or a medical professional. In an emergency, tell them to contact emergency services.

BloodBridge rules (answer from these; do not substitute general figures from elsewhere):
- Donors must wait at least ${MIN_DAYS_BETWEEN_DONATIONS} days (${MIN_DAYS_BETWEEN_DONATIONS / 7} weeks) between whole blood donations.
- The preliminary eligibility check (/eligibility) requires a weight of at least 50 kg and feeling well, with no current fever, infection or illness, and not being pregnant or having recently given birth. Any of these defers the donor temporarily.
- A reported medical condition, current medication, recent surgery, transfusion, tattoo or piercing, or possible exposure to a blood-borne infection sends the donor to medical review by institute staff.
- An eligibility result is valid for ${ELIGIBILITY_VALID_FOR_MS / 3_600_000} hours and must be passed before booking. It is preliminary, not permanent medical clearance; staff confirm fitness on the day.
- Appointments are booked at /appointments/book, up to ${MAX_DAYS_AHEAD} days ahead, at ${APPOINTMENT_TIMES.join(", ")}. A donor can hold one upcoming appointment at a time and can reschedule or cancel it at /appointments.
- Blood group compatibility: O- can give to everyone; AB+ can receive from everyone; Rh-negative patients need Rh-negative blood.
- Every participating institute grants one free medical consultation for every ${DONATIONS_PER_CONSULTATION} completed donations.
- Account settings: donors change their details and password on My profile (/profile), in the "Change password" section.
- If you don't know an answer, say so and suggest asking the health institute via Chat with institute (/chat).
- Only state facts about the user that appear in the account details below. Do not mention appointments, dates or results that are not listed there.

Donor pages: Dashboard (/home), My profile (/profile), Appointments (/appointments), Book a donation (/appointments/book), My donations (/donations), Blood requests (/request), Donation centres (/donor/centers), Rewards (/rewards), Eligibility check (/eligibility), Chat with institute (/chat), Notifications (/notification).
Staff and admin users work from their portal at /portal/... (medical staff, lab technicians, institute admins) or /system-admin (system administrators).`;

export type AiChatTurn = {
  role: "USER" | "ASSISTANT";
  content: string;
};

const BLOOD_GROUP_LABEL: Record<string, string> = {
  A_POSITIVE: "A+",
  A_NEGATIVE: "A-",
  B_POSITIVE: "B+",
  B_NEGATIVE: "B-",
  AB_POSITIVE: "AB+",
  AB_NEGATIVE: "AB-",
  O_POSITIVE: "O+",
  O_NEGATIVE: "O-",
};

const formatDate = (date: Date) =>
  date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

/** A plain-text snapshot of what the assistant may know about this user. */
export async function buildUserContext(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { donorProfile: true, healthInstitute: { select: { name: true, city: true } } },
  });

  if (!user) return "No account details are available.";

  const lines = [
    `Today is ${formatDate(new Date())}.`,
    `Signed-in user: ${user.firstName} ${user.lastName} (role: ${user.role}).`,
  ];

  if (user.role !== "DONOR") {
    if (user.healthInstitute) {
      lines.push(`Works at: ${user.healthInstitute.name}, ${user.healthInstitute.city}.`);
    }
    return lines.join("\n");
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

  if (profile?.lastDonationDate) {
    const nextEligible = new Date(profile.lastDonationDate);
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
        : "Eligibility: the donor has not completed the eligibility check yet (/eligibility).",
    );
  }

  lines.push(
    nextAppointment
      ? `Next appointment: ${formatDate(nextAppointment.appointmentDate)} at ${nextAppointment.appointmentTime}, ${nextAppointment.healthInstitute.name} (${nextAppointment.healthInstitute.city}).`
      : "Upcoming appointments: NONE. The donor has no appointment booked.",
  );

  if (centres.length) {
    lines.push("Active donation centres (name, city, open blood requests):");
    for (const centre of centres) {
      const requests = centre.bloodRequests;
      const summary = requests.length
        ? requests.map((request) => `${BLOOD_GROUP_LABEL[request.bloodGroup]} ${request.urgency.toLowerCase()}`).join(", ")
        : "none";
      const canHelp = bloodGroup && requests.some((request) => canDonateTo(bloodGroup, request.bloodGroup));
      lines.push(`- ${centre.name}, ${centre.city}: ${summary}${canHelp ? " (this donor's blood is compatible)" : ""}`);
    }
  } else {
    lines.push("There are no active donation centres right now.");
  }

  return lines.join("\n");
}

/**
 * Streams the assistant's reply as text chunks. Never throws: if the model
 * server is down or returns an error it yields a safe message instead, so the
 * chat degrades gracefully (FR-41). Returns the full text once done.
 */
export async function* streamAssistantReply(
  history: AiChatTurn[],
  userContext: string,
): AsyncGenerator<string, string> {
  let text = "";

  try {
    const recent = history.slice(-MODEL_HISTORY_LIMIT);
    const firstUserTurn = Math.max(recent.findIndex((turn) => turn.role === "USER"), 0);

    const stream = streamChat([
      {
        role: "system",
        content: `${SYSTEM_PROMPT}

Account details for this conversation:
${userContext}`,
      },
      ...recent.slice(firstUserTurn).map((turn) => ({
        role: turn.role === "USER" ? ("user" as const) : ("assistant" as const),
        content: turn.content,
      })),
    ]);

    for await (const delta of stream) {
      text += delta;
      yield delta;
    }
  } catch (error) {
    console.error(`AI CHAT REQUEST FAILED (${aiProviderLabel}):`, error);

    const notice = text ? `\n\n${FALLBACK_MESSAGE}` : FALLBACK_MESSAGE;
    text += notice;
    yield notice;
  }

  return text.trim() || FALLBACK_MESSAGE;
}
