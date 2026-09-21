import { prisma } from "./prisma";

/*
  What counts as a donation centre donors may use.

  Health institutes are registered by a system administrator (/system-admin/
  institutes) and can later be set to PENDING or INACTIVE. Only an institute
  that is both registered and currently ACTIVE may be listed to donors, booked,
  messaged, or have its blood requests shown (FR-17, FR-11, FR-36).

  Every donor-facing query uses this filter so the definition lives in one
  place. Staff and system-admin screens deliberately query directly: they need
  to see their own institute, or every institute regardless of status.
*/
export const ACTIVE_INSTITUTE = { status: "ACTIVE", isActive: true } as const;

/** Nested form, for filtering another model by its institute. */
export const AT_ACTIVE_INSTITUTE = { healthInstitute: { is: ACTIVE_INSTITUTE } } as const;

const centreFields = {
  id: true,
  name: true,
  email: true,
  phoneNumber: true,
  address: true,
  city: true,
  region: true,
} as const;

/** Registered, active centres, in name order. */
export async function getActiveInstitutes() {
  return prisma.healthInstitute.findMany({
    where: ACTIVE_INSTITUTE,
    orderBy: { name: "asc" },
    select: centreFields,
  });
}

/**
 * Registered, active centres that have at least one active medical staff
 * member or institute administrator — the roles that can answer a donor's
 * message. A centre with nobody to reply would leave the donor waiting.
 */
export async function getInstitutesWithStaff() {
  return prisma.healthInstitute.findMany({
    where: {
      ...ACTIVE_INSTITUTE,
      administrators: {
        some: { isActive: true, role: { in: ["MEDICAL_STAFF", "HEALTH_INSTITUTE_ADMIN"] } },
      },
    },
    orderBy: { name: "asc" },
    select: centreFields,
  });
}

/** One registered, active centre, or null. Use before booking or messaging. */
export async function getActiveInstitute(id: string) {
  return prisma.healthInstitute.findFirst({
    where: { id, ...ACTIVE_INSTITUTE },
    select: centreFields,
  });
}
