const bloodGroups = [
  "A_POSITIVE",
  "A_NEGATIVE",
  "B_POSITIVE",
  "B_NEGATIVE",
  "AB_POSITIVE",
  "AB_NEGATIVE",
  "O_POSITIVE",
  "O_NEGATIVE",
] as const;

export type BloodGroup = (typeof bloodGroups)[number];

export type RecommendationPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "OK";

export type BloodGroupRecommendation = {
  bloodGroup: BloodGroup;
  units: number;
  openDemand: number;
  recentDonations: number;
  priority: RecommendationPriority;
  message: string;
};

const CRITICAL_THRESHOLD = 5;
const LOW_THRESHOLD = 10;

/**
 * Deterministic, rule-based analysis of an institute's blood stock.
 * This runs entirely offline (no external dependency), so it always
 * produces a usable result even when no AI API key is configured.
 */
export function buildRuleBasedRecommendations(input: {
  inventory: { bloodGroup: BloodGroup; units: number }[];
  openDemandByGroup: Partial<Record<BloodGroup, number>>;
  recentDonationsByGroup: Partial<Record<BloodGroup, number>>;
}): BloodGroupRecommendation[] {
  return bloodGroups.map((bloodGroup) => {
    const units = input.inventory.find((row) => row.bloodGroup === bloodGroup)?.units ?? 0;
    const openDemand = input.openDemandByGroup[bloodGroup] ?? 0;
    const recentDonations = input.recentDonationsByGroup[bloodGroup] ?? 0;
    const shortfall = openDemand - units;

    let priority: RecommendationPriority = "OK";
    let message = `Stock is healthy (${units} units on hand).`;

    if (shortfall > 0 && units < CRITICAL_THRESHOLD) {
      priority = "CRITICAL";
      message = `Only ${units} unit${units === 1 ? "" : "s"} on hand against ${openDemand} requested. Prioritise donor outreach immediately.`;
    } else if (units < CRITICAL_THRESHOLD) {
      priority = "HIGH";
      message = `Stock is critically low (${units} unit${units === 1 ? "" : "s"}). Recommend an urgent donation drive.`;
    } else if (shortfall > 0) {
      priority = "HIGH";
      message = `Open requests exceed supply by ${shortfall} unit${shortfall === 1 ? "" : "s"}. Recommend prioritising this group.`;
    } else if (units < LOW_THRESHOLD) {
      priority = "MEDIUM";
      message = `Stock is on the lower side (${units} units). Consider encouraging more donations.`;
    } else if (recentDonations === 0 && units < LOW_THRESHOLD * 2) {
      priority = "LOW";
      message = `No recent donations recorded. Keep an eye on this group over the coming weeks.`;
    }

    return { bloodGroup, units, openDemand, recentDonations, priority, message };
  });
}

/**
 * Optionally asks an external AI API to phrase a short natural-language
 * summary of the rule-based analysis above. This is the "AI API"
 * integration shown in the BloodBridge use case diagram.
 *
 * Configure with AI_API_KEY (and optionally AI_API_URL / AI_API_MODEL,
 * which default to Anthropic's Messages API). If no key is configured,
 * or the request fails for any reason, this returns null and the caller
 * should fall back to the rule-based recommendations alone - the feature
 * must keep working without a paid API key.
 */
export async function generateAiSummary(
  recommendations: BloodGroupRecommendation[],
  instituteName: string,
): Promise<string | null> {
  const apiKey = process.env.AI_API_KEY;

  if (!apiKey) {
    return null;
  }

  const apiUrl = process.env.AI_API_URL ?? "https://api.anthropic.com/v1/messages";
  const model = process.env.AI_API_MODEL ?? "claude-3-5-haiku-latest";

  const priorityOrder: RecommendationPriority[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "OK"];
  const summaryLines = [...recommendations]
    .sort((a, b) => priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority))
    .map(
      (item) =>
        `${item.bloodGroup.replace("_", " ")}: ${item.units} units on hand, ${item.openDemand} units requested, priority ${item.priority}.`,
    )
    .join("\n");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: `You are a blood bank supply analyst for ${instituteName}, part of the BloodBridge platform. Based on this per-blood-group stock data, write a short (3-4 sentence) plain-English recommendation for the laboratory team on what to prioritise this week. Be specific about blood groups and don't repeat the raw numbers back verbatim.\n\n${summaryLines}`,
          },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error("AI RECOMMENDATION API ERROR:", response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const text = data?.content?.[0]?.text;

    return typeof text === "string" ? text.trim() : null;
  } catch (error) {
    console.error("AI RECOMMENDATION REQUEST FAILED:", error);
    return null;
  }
}
