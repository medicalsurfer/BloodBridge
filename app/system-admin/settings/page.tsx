import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthenticatedUserFromToken } from "@/src/lib/auth";

const PRIMARY_RED = "oklch(27.1% 0.105 12.094)";

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
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-950">
            System Administration
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-950">
            Platform settings
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">
            Platform-wide configuration is not available yet. Health
            institute, invitation and user access controls can be managed
            from the dashboard.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/system-admin/institutes"
              style={{ backgroundColor: PRIMARY_RED }}
              className="inline-flex h-11 items-center rounded-xl px-5 text-sm font-semibold text-white"
            >
              Manage institutes
            </Link>

            <Link
              href="/system-admin/users"
              className="inline-flex h-11 items-center rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700"
            >
              Manage users
            </Link>
          </div>
        </div>
      </section>
  );
}
