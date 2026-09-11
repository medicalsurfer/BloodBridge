import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthenticatedUserFromToken } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

const PRIMARY_RED = "oklch(27.1% 0.105 12.094)";

export const dynamic = "force-dynamic";

export default async function DonationCentresPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("bloodbridge_session")?.value;

  if (!token) {
    redirect("/login");
  }

  const authentication = await getAuthenticatedUserFromToken(token);

  if (!authentication.user || authentication.user.role !== "DONOR") {
    redirect("/home");
  }

  const centres = await prisma.healthInstitute.findMany({
    where: {
      status: "ACTIVE",
      isActive: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <section className="mx-auto max-w-6xl">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-950">
              BloodBridge
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-950">
              Donation Centres
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Find participating healthcare institutions where you can book and
              complete your blood donation.
            </p>
          </div>

          <Link
            href="/home"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700"
          >
            Back to dashboard
          </Link>
        </div>

        {centres.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-950">
              <HospitalIcon />
            </div>

            <h2 className="mt-5 text-lg font-bold text-slate-900">
              No donation centres available
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              There are currently no active healthcare institutions available
              for blood donation.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {centres.map((centre) => (
              <article
                key={centre.id}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-950">
                    <HospitalIcon />
                  </div>

                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                    Active
                  </span>
                </div>

                <h2 className="mt-5 text-lg font-bold text-slate-950">
                  {centre.name}
                </h2>

                <div className="mt-4 space-y-3">
                  <CentreDetail
                    label="Location"
                    value={
                      centre.region
                        ? `${centre.city}, ${centre.region}`
                        : centre.city
                    }
                  />

                  {centre.address && (
                    <CentreDetail
                      label="Address"
                      value={centre.address}
                    />
                  )}

                  {centre.phoneNumber && (
                    <CentreDetail
                      label="Phone"
                      value={centre.phoneNumber}
                    />
                  )}

                  {centre.email && (
                    <CentreDetail
                      label="Email"
                      value={centre.email}
                    />
                  )}
                </div>

                <Link
                  href={`/appointments/book?instituteId=${centre.id}`}
                  style={{ backgroundColor: PRIMARY_RED }}
                  className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-semibold text-white transition hover:brightness-125"
                >
                  Book donation
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function CentreDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm text-slate-700">
        {value}
      </p>
    </div>
  );
}

function HospitalIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M5 21V6h14v15" />
      <path d="M3 21h18" />
      <path d="M9 10h6M12 7v6" />
      <path d="M8 21v-4h8v4" />
    </svg>
  );
}