import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getAuthenticatedUserFromToken } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import InstituteStatusButton from "../InstituteStatusButton";

export const dynamic = "force-dynamic";

export default async function InstituteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
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

  const { id } = await params;

  const institute = await prisma.healthInstitute.findUnique({
    where: { id },
    include: {
      administrators: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          isActive: true,
        },
      },
      _count: {
        select: { appointments: true },
      },
    },
  });

  if (!institute) {
    notFound();
  }

  return (
      <section className="mx-auto max-w-4xl">
        <Link
          href="/system-admin/institutes"
          className="text-sm font-semibold text-slate-600"
        >
          Back to institutes
        </Link>

        <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-950">
                Health institute
              </p>
              <h1 className="mt-2 text-2xl font-bold text-slate-950">
                {institute.name}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                {[institute.address, institute.city, institute.region]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <StatusBadge status={institute.status} />
              <InstituteStatusButton
                id={institute.id}
                isActive={institute.isActive}
              />
            </div>
          </div>

          <div className="grid gap-4 border-b border-slate-100 p-6 sm:grid-cols-3">
            <DetailItem label="Email" value={institute.email || "No email"} />
            <DetailItem
              label="Phone"
              value={institute.phoneNumber || "No phone"}
            />
            <DetailItem
              label="Appointments booked"
              value={String(institute._count.appointments)}
            />
          </div>

          <div className="p-6">
            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-400">
              Institute administrators
            </h2>

            {institute.administrators.length === 0 ? (
              <p className="mt-4 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
                No administrator has been invited for this institute yet.
              </p>
            ) : (
              <div className="mt-4 divide-y divide-slate-100">
                {institute.administrators.map((admin) => (
                  <div
                    key={admin.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {admin.firstName} {admin.lastName}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {admin.email}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        admin.isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {admin.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <Link
              href="/system-admin/invitations/new"
              className="mt-5 inline-flex text-sm font-bold text-red-950"
            >
              Invite an administrator for this institute
            </Link>
          </div>
        </div>
      </section>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: "ACTIVE" | "PENDING" | "INACTIVE";
}) {
  if (status === "ACTIVE") {
    return (
      <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
        Active
      </span>
    );
  }

  if (status === "PENDING") {
    return (
      <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
        Pending
      </span>
    );
  }

  return (
    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
      Inactive
    </span>
  );
}
