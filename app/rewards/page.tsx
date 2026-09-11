"use client";

import { useEffect, useState } from "react";
import { Gift, Droplet, Clock, CheckCircle2, XCircle } from "lucide-react";

type RewardStatus = "PENDING" | "VALIDATED" | "REJECTED";

type RewardItem = {
  id: string;
  points: number;
  status: RewardStatus;
  createdAt: string;
  healthInstitute: { name: string; city: string };
  donation: { donatedAt: string; bloodGroup: string } | null;
};

const bloodGroupLabels: Record<string, string> = {
  A_POSITIVE: "A+",
  A_NEGATIVE: "A-",
  B_POSITIVE: "B+",
  B_NEGATIVE: "B-",
  AB_POSITIVE: "AB+",
  AB_NEGATIVE: "AB-",
  O_POSITIVE: "O+",
  O_NEGATIVE: "O-",
};

const statusStyles: Record<RewardStatus, { classes: string; icon: React.ReactNode; label: string }> = {
  PENDING: { classes: "bg-amber-50 text-amber-700", icon: <Clock size={14} />, label: "Pending validation" },
  VALIDATED: { classes: "bg-emerald-50 text-emerald-700", icon: <CheckCircle2 size={14} />, label: "Validated" },
  REJECTED: { classes: "bg-red-50 text-red-700", icon: <XCircle size={14} />, label: "Not approved" },
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function RewardsPage() {
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [validatedPoints, setValidatedPoints] = useState(0);
  const [pendingPoints, setPendingPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/donor/rewards", { credentials: "include", cache: "no-store" })
      .then((response) => response.json().then((data) => ({ response, data })))
      .then(({ response, data }) => {
        if (!response.ok) throw new Error(data.error ?? "Unable to load rewards.");
        setRewards(data.rewards ?? []);
        setValidatedPoints(data.validatedPoints ?? 0);
        setPendingPoints(data.pendingPoints ?? 0);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load rewards."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-red-700">
            Rewards
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Track your donation reward
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Every recorded donation earns reward points once the institute validates it.
          </p>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl bg-red-950 p-6 text-white shadow-lg shadow-red-950/10">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
              <Gift size={20} />
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-red-100/70">
              Validated points
            </p>
            <p className="mt-1 text-3xl font-bold">{validatedPoints}</p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <Clock size={20} />
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Pending points
            </p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{pendingPoints}</p>
          </div>
        </div>

        {error && <p className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {loading ? (
            <p className="text-sm text-slate-500">Loading rewards...</p>
          ) : rewards.length === 0 ? (
            <div className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center">
              <div>
                <p className="text-sm font-medium text-slate-500">No rewards yet.</p>
                <p className="mt-1 text-xs text-slate-400">Book and complete a donation to start earning points.</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {rewards.map((reward) => {
                const style = statusStyles[reward.status];
                return (
                  <div key={reward.id} className="flex flex-wrap items-start justify-between gap-4 py-5 first:pt-0 last:pb-0">
                    <div className="flex gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-800">
                        <Droplet size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">
                          +{reward.points} points
                          {reward.donation && (
                            <span className="ml-2 text-sm font-normal text-slate-500">
                              {bloodGroupLabels[reward.donation.bloodGroup] ?? reward.donation.bloodGroup} donation
                            </span>
                          )}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {reward.healthInstitute.name} · {reward.healthInstitute.city}
                        </p>
                        <p className="mt-2 text-xs text-slate-400">
                          {formatDate(reward.donation?.donatedAt ?? reward.createdAt)}
                        </p>
                      </div>
                    </div>

                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${style.classes}`}>
                      {style.icon}
                      {style.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
