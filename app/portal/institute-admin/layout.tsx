import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthenticatedUserFromToken } from "@/src/lib/auth";

const REDIRECT_BY_ROLE: Record<string, string> = {
  DONOR: "/home",
  MEDICAL_STAFF: "/portal/medical-staff",
  LAB_TECHNICIAN: "/portal/lab-technician",
  SYSTEM_ADMIN: "/system-admin",
};

export default async function InstituteAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("bloodbridge_session")?.value;

  if (!token) {
    redirect("/login");
  }

  const authentication = await getAuthenticatedUserFromToken(token);

  if (!authentication.user) {
    redirect("/login");
  }

  if (authentication.user.role !== "HEALTH_INSTITUTE_ADMIN") {
    redirect(REDIRECT_BY_ROLE[authentication.user.role] ?? "/login");
  }

  return <>{children}</>;
}
