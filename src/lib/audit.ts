import { prisma } from "./prisma";

export type AuditAction =
  | "USER_REGISTERED"
  | "USER_LOGGED_IN"
  | "USER_CREATED"
  | "USER_UPDATED"
  | "USER_DELETED"
  | "INSTITUTE_CREATED"
  | "INSTITUTE_UPDATED"
  | "INSTITUTE_STATUS_CHANGED"
  | "INSTITUTE_DELETED"
  | "STAFF_INVITED"
  | "STAFF_REMOVED"
  | "APPOINTMENT_BOOKED"
  | "APPOINTMENT_CANCELLED"
  | "APPOINTMENT_RESCHEDULED"
  | "DONATION_RECORDED"
  | "BLOOD_REQUEST_CREATED"
  | "REWARD_VALIDATED"
  | "REWARD_REJECTED";

/**
 * Records one entry in the system audit trail (System Admin > System logs).
 * This is intentionally best-effort: a logging failure must never prevent
 * the action it is describing from completing.
 */
export async function logAudit(entry: {
  actorId?: string | null;
  action: AuditAction;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: entry.actorId ?? null,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId ?? null,
        metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
      },
    });
  } catch (error) {
    console.error("AUDIT LOG ERROR:", error);
  }
}
