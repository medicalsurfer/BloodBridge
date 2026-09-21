import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthenticatedUserFromToken } from "@/src/lib/auth";
import { PageHeader } from "@/src/components/ui/Page";
import { AccountSettings } from "@/src/components/account/AccountSettings";
import { TestEmailPanel } from "./TestEmailButton";

export default async function SystemAdminSettingsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("bloodbridge_session")?.value;

  if (!token) {
    redirect("/login");
  }

  const authentication = await getAuthenticatedUserFromToken(token);

  if (
    !authentication.user ||
    authentication.user.role !== "SYSTEM_ADMIN"
  ) {
    redirect("/home");
  }

  return (
    <section className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="System administration"
        title="Settings"
        description="Your administrator account, and a check that platform email is working."
      />

      <div className="mt-8 space-y-6">
        <AccountSettings />
        <TestEmailPanel />
      </div>
    </section>
  );
}
