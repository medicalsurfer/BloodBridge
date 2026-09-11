import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthenticatedUserFromToken } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

const PRIMARY_RED = "oklch(27.1% 0.105 12.094)";

export const dynamic = "force-dynamic";

export default async function InstitutesPage() {
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

  const institutes = await prisma.healthInstitute.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-950">
              System Administration
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-950">
              Health Institutes
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              View and manage health institutes registered on BloodBridge.
            </p>
          </div>

          <Link
            href="/system-admin/institutes/new"
            style={{ backgroundColor: PRIMARY_RED }}
            className="inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold text-white"
          >
            Add health institute
          </Link>
        </div>

        <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {institutes.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm font-bold text-slate-800">
                No health institutes found
              </p>

              <p className="mt-2 text-xs text-slate-500">
                Add your first health institute to get started.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500">
                      Institute
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500">
                      Location
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500">
                      Contact
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500">
                      Status
                    </th>

                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {institutes.map((institute) => (
                    <tr
                      key={institute.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-6 py-5">
                        <p className="text-sm font-bold text-slate-900">
                          {institute.name}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {institute.id}
                        </p>
                      </td>

                      <td className="px-6 py-5">
                        <p className="text-sm text-slate-700">
                          {institute.city}
                        </p>

                        {institute.region && (
                          <p className="mt-1 text-xs text-slate-400">
                            {institute.region}
                          </p>
                        )}
                      </td>

                      <td className="px-6 py-5">
                        <p className="text-sm text-slate-700">
                          {institute.email || "No email"}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {institute.phoneNumber || "No phone"}
                        </p>
                      </td>

                      <td className="px-6 py-5">
                        <StatusBadge status={institute.status} />
                      </td>

                      <td className="px-6 py-5 text-right">
                        <Link
                          href={`/system-admin/institutes/${institute.id}`}
                          className="text-sm font-bold text-red-950"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
    </>
  );
}

function StatusBadge({
  status,
}: {
  status: "ACTIVE" | "PENDING" | "INACTIVE";
}) {
  if (status === "ACTIVE") {
    return (
      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
        Active
      </span>
    );
  }

  if (status === "PENDING") {
    return (
      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
        Pending
      </span>
    );
  }

  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
      Inactive
    </span>
  );
}