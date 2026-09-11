import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "./auth";

/**
 * A user counts as "institute staff" for chat purposes if they're an active
 * medical staff member or the health institute administrator assigned to
 * that institute. Lab technicians and system admins aren't tied to a single
 * institute's donor conversations, so they're excluded here.
 */
export async function getAuthenticatedChatParticipant(request: NextRequest) {
  const authentication = await getAuthenticatedUser(request);

  if (!authentication.user) {
    return authentication;
  }

  const { role, healthInstituteId } = authentication.user;

  if (role === "DONOR") {
    return authentication as {
      user: NonNullable<typeof authentication.user>;
      status: 200;
      error: null;
    };
  }

  if ((role === "MEDICAL_STAFF" || role === "HEALTH_INSTITUTE_ADMIN") && healthInstituteId) {
    return authentication as {
      user: NonNullable<typeof authentication.user> & { healthInstituteId: string };
      status: 200;
      error: null;
    };
  }

  return {
    user: null,
    status: 403,
    error: "Chat is only available to donors and institute staff.",
  } as const;
}
