// Red-cell donation compatibility (FR-23): which donor groups can give to a
// recipient group. O- is the universal donor; AB+ the universal recipient.

export const BLOOD_GROUPS = [
  "A_POSITIVE",
  "A_NEGATIVE",
  "B_POSITIVE",
  "B_NEGATIVE",
  "AB_POSITIVE",
  "AB_NEGATIVE",
  "O_POSITIVE",
  "O_NEGATIVE",
] as const;

export type BloodGroupValue = (typeof BLOOD_GROUPS)[number];

const DONORS_FOR_RECIPIENT: Record<BloodGroupValue, BloodGroupValue[]> = {
  O_NEGATIVE: ["O_NEGATIVE"],
  O_POSITIVE: ["O_POSITIVE", "O_NEGATIVE"],
  A_NEGATIVE: ["A_NEGATIVE", "O_NEGATIVE"],
  A_POSITIVE: ["A_POSITIVE", "A_NEGATIVE", "O_POSITIVE", "O_NEGATIVE"],
  B_NEGATIVE: ["B_NEGATIVE", "O_NEGATIVE"],
  B_POSITIVE: ["B_POSITIVE", "B_NEGATIVE", "O_POSITIVE", "O_NEGATIVE"],
  AB_NEGATIVE: ["AB_NEGATIVE", "A_NEGATIVE", "B_NEGATIVE", "O_NEGATIVE"],
  AB_POSITIVE: [...BLOOD_GROUPS],
};

export function isBloodGroup(value: unknown): value is BloodGroupValue {
  return typeof value === "string" && (BLOOD_GROUPS as readonly string[]).includes(value);
}

/** Donor groups whose blood a patient of `recipient` group can receive. */
export function compatibleDonorGroups(recipient: BloodGroupValue): BloodGroupValue[] {
  return DONORS_FOR_RECIPIENT[recipient];
}

export function canDonateTo(donor: BloodGroupValue, recipient: BloodGroupValue): boolean {
  return DONORS_FOR_RECIPIENT[recipient].includes(donor);
}
