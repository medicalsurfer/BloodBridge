import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthenticatedUserFromToken } from "@/src/lib/auth";
import { PageHeader } from "@/src/components/ui/Page";
import { AccountSettings } from "@/src/components/account/AccountSettings";

export const dynamic = "force-dynamic";

// Staff portals are single-page workspaces, so account settings live here.
const HOME_BY_ROLE: Record<string, { href: string; label: string }> = {
  MEDICAL_STAFF: { href: "/portal/medical-staff", label: "Medical staff portal" },
  LAB_TECHNICIAN: { href: "/portal/lab-technician", label: "Lab technician portal" },
  HEALTH_INSTITUTE_ADMIN: { href: "/portal/institute-admin", label: "Institute admin portal" },
};

export default async function AccountPage() {
  const token = (await cookies()).get("bloodbridge_session")?.value;

  if (!token) redirect("/login");

  const authentication = await getAuthenticatedUserFromToken(token);

  if (!authentication.user) redirect("/login");

  // Donors and system admins have account settings inside their own layouts.
  if (authentication.user.role === "DONOR") redirect("/profile");
  if (authentication.user.role === "SYSTEM_ADMIN") redirect("/system-admin/settings");

  const home = HOME_BY_ROLE[authentication.user.role] ?? { href: "/", label: "Home" };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link href={home.href} className="text-xs font-semibold text-red-900 hover:underline">
          ← Back to {home.label}
        </Link>

        <div className="mt-5">
          <PageHeader
            eyebrow="Account"
            title="Account settings"
            description="Update your name and phone number, or change your password."
          />
        </div>

        <div className="mt-8">
          <AccountSettings />
        </div>
      </div>
    </main>
  );
}
