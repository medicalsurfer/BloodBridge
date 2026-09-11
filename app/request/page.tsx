"use client";

import { useEffect, useState } from "react";
import { Droplet, MapPin } from "lucide-react";

type BloodGroup =
  | "A_POSITIVE"
  | "A_NEGATIVE"
  | "B_POSITIVE"
  | "B_NEGATIVE"
  | "AB_POSITIVE"
  | "AB_NEGATIVE"
  | "O_POSITIVE"
  | "O_NEGATIVE";

type Urgency = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

type BloodRequestItem = {
  id: string;
  bloodGroup: BloodGroup;
  unitsNeeded: number;
  urgency: Urgency;
  notes: string | null;
  createdAt: string;
  healthInstitute: {
    id: string;
    name: string;
    city: string;
    region: string | null;
    address: string | null;
  };
};

const bloodGroupLabels: Record<BloodGroup, string> = {
  A_POSITIVE: "A+",
  A_NEGATIVE: "A-",
  B_POSITIVE: "B+",
  B_NEGATIVE: "B-",
  AB_POSITIVE: "AB+",
  AB_NEGATIVE: "AB-",
  O_POSITIVE: "O+",
  O_NEGATIVE: "O-",
};

const urgencyStyles: Record<Urgency, string> = {
  LOW: "bg-slate-100 text-slate-700",
  MEDIUM: "bg-amber-50 text-amber-700",
  HIGH: "bg-orange-50 text-orange-700",
  CRITICAL: "bg-red-50 text-red-700",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<BloodRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/blood-requests", { credentials: "include", cache: "no-store" })
      .then((response) => response.json().then((data) => ({ response, data })))
      .then(({ response, data }) => {
        if (!response.ok) throw new Error(data.error ?? "Unable to load blood requests.");
        setRequests(data.requests ?? []);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load blood requests."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-red-700">
            Blood requests
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Current blood requests
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Active requests submitted by participating health institutes. Consider booking an appointment if your blood type is needed.
          </p>
        </div>

        {error && <p className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {loading ? (
            <p className="text-sm text-slate-500">Loading blood requests...</p>
          ) : requests.length === 0 ? (
            <div className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center">
              <p className="text-sm font-medium text-slate-500">No active blood requests right now.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {requests.map((request) => (
                <div key={request.id} className="flex flex-wrap items-start justify-between gap-4 py-5 first:pt-0 last:pb-0">
                  <div className="flex gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-800">
                      <Droplet size={20} />
                    </div>
                    <div>
                      <p className="flex items-center gap-2 font-bold text-slate-900">
                        {bloodGroupLabels[request.bloodGroup]} needed · {request.unitsNeeded} unit{request.unitsNeeded > 1 ? "s" : ""}
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${urgencyStyles[request.urgency]}`}>
                          {request.urgency}
                        </span>
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                        <MapPin size={14} />
                        {request.healthInstitute.name} · {[request.healthInstitute.address, request.healthInstitute.city].filter(Boolean).join(", ")}
                      </p>
                      {request.notes && <p className="mt-2 text-sm text-slate-600">{request.notes}</p>}
                      <p className="mt-2 text-xs text-slate-400">Posted {formatDate(request.createdAt)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
