import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthenticatedUserFromToken } from "@/src/lib/auth";
import { DonorSidebarShell } from "@/src/components/dashboard/DonorSidebarShell";

const REDIRECT_BY_ROLE: Record<string, string> = {
  MEDICAL_STAFF: "/portal/medical-staff",
  LAB_TECHNICIAN: "/portal/lab-technician",
  HEALTH_INSTITUTE_ADMIN: "/portal/institute-admin",
  SYSTEM_ADMIN: "/system-admin",
};

export default async function DonorLayout({
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

  if (authentication.user.role !== "DONOR") {
    redirect(REDIRECT_BY_ROLE[authentication.user.role] ?? "/login");
  }

  return (
    <DonorSidebarShell
      user={{
        firstName: authentication.user.firstName,
        lastName: authentication.user.lastName,
      }}
    >
      {children}
    </DonorSidebarShell>
  );
}
