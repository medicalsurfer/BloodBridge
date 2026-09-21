// Audit actions, mirroring the AuditAction enum in prisma/schema.prisma.
// Pure module: safe to import from client components.
export const AUDIT_ACTIONS = [
  "USER_REGISTERED",
  "USER_LOGGED_IN",
  "USER_CREATED",
  "USER_UPDATED",
  "USER_DELETED",
  "INSTITUTE_CREATED",
  "INSTITUTE_UPDATED",
  "INSTITUTE_STATUS_CHANGED",
  "INSTITUTE_DELETED",
  "STAFF_INVITED",
  "STAFF_REMOVED",
  "APPOINTMENT_BOOKED",
  "APPOINTMENT_CANCELLED",
  "APPOINTMENT_RESCHEDULED",
  "APPOINTMENT_CONFIRMED",
  "APPOINTMENT_COMPLETED",
  "DONATION_RECORDED",
  "BLOOD_REQUEST_CREATED",
  "BLOOD_REQUEST_UPDATED",
  "INVENTORY_ADJUSTED",
  "REWARD_VALIDATED",
  "REWARD_REJECTED",
  "PASSWORD_RESET_REQUESTED",
  "PASSWORD_RESET_COMPLETED",
  "PASSWORD_CHANGED",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export function isAuditAction(value: unknown): value is AuditAction {
  return typeof value === "string" && (AUDIT_ACTIONS as readonly string[]).includes(value);
}
