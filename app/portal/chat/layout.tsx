import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthenticatedUserFromToken } from "@/src/lib/auth";

const REDIRECT_BY_ROLE: Record<string, string> = {
  DONOR: "/chat",
  LAB_TECHNICIAN: "/portal/lab-technician",
  SYSTEM_ADMIN: "/system-admin",
};

// Donor conversations belong to an institute, so both the medical staff who
// care for donors and the institute administrator can answer them.
export default async function PortalChatLayout({ children }: { children: React.ReactNode }) {
  const token = (await cookies()).get("bloodbridge_session")?.value;

  if (!token) redirect("/login");

  const authentication = await getAuthenticatedUserFromToken(token);

  if (!authentication.user) redirect("/login");

  const { role, healthInstituteId } = authentication.user;

  if (role !== "MEDICAL_STAFF" && role !== "HEALTH_INSTITUTE_ADMIN") {
    redirect(REDIRECT_BY_ROLE[role] ?? "/login");
  }

  if (!healthInstituteId) redirect("/login");

  return <>{children}</>;
}
