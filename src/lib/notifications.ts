import { prisma } from "./prisma";

export type NotificationType =
  | "APPOINTMENT"
  | "DONATION"
  | "BLOOD_REQUEST"
  | "REWARD"
  | "STAFF"
  | "CHAT"
  | "SYSTEM";

/**
 * Creates a single in-app notification for one user.
 * Failures are swallowed (logged only) so a notification problem never
 * blocks the primary action that triggered it (booking an appointment,
 * recording a donation, etc.).
 */
export async function notifyUser(data: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}) {
  try {
    return await prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        link: data.link ?? null,
      },
    });
  } catch (error) {
    console.error("NOTIFY USER ERROR:", error);
    return null;
  }
}

/**
 * Creates the same notification for many users at once (e.g. every
 * eligible donor for a new blood request). Capped to avoid accidentally
 * fanning out to the entire donor base in one request.
 */
export async function notifyUsers(
  userIds: string[],
  data: {
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
  },
  limit = 250
) {
  const targetIds = userIds.slice(0, limit);

  if (targetIds.length === 0) {
    return { count: 0 };
  }

  try {
    return await prisma.notification.createMany({
      data: targetIds.map((userId) => ({
        userId,
        type: data.type,
        title: data.title,
        message: data.message,
        link: data.link ?? null,
      })),
    });
  } catch (error) {
    console.error("NOTIFY USERS ERROR:", error);
    return { count: 0 };
  }
}
