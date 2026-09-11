import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthenticatedUserFromToken } from "@/src/lib/auth";
import { SidebarNav } from "@/src/components/dashboard/SidebarNav";

const PRIMARY_RED = "oklch(27.1% 0.105 12.094)";

export default async function SystemAdminLayout({
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

  if (
    !authentication.user ||
    authentication.user.role !== "SYSTEM_ADMIN"
  ) {
    redirect("/home");
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 lg:h-screen lg:overflow-hidden">
      <section className="mx-auto max-w-375 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:flex lg:h-full lg:flex-col">

        <header className="flex shrink-0 flex-col gap-4 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/system-admin" className="flex items-center gap-3">

            <div
              style={{ backgroundColor: PRIMARY_RED }}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
            >
              <BloodDropIcon />
            </div>

            <div>
              <p className="text-lg font-bold text-slate-950">
                BloodBridge
              </p>

              <p className="text-[10px] text-slate-400">
                System Administration
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-bold text-slate-800">
                System Administrator
              </p>

              <p className="mt-0.5 text-[10px] text-slate-400">
                Platform administration
              </p>
            </div>

            <div
              style={{ backgroundColor: PRIMARY_RED }}
              className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white"
            >
              SA
            </div>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[230px_1fr]">

          <SidebarNav />

          <section className="overflow-y-auto bg-slate-50/70 p-6 lg:p-8">
            {children}
          </section>

        </div>

      </section>
    </main>
  );
}

function BloodDropIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M12 3.5c2.8 3.8 7 8.9 7 12.5a7 7 0 1 1-14 0c0-3.6 4.2-8.7 7-12.5Z" />
    </svg>
  );
}
