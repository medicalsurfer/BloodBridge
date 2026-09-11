"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  Droplet,
  XCircle,
} from "lucide-react";

type RewardStatus = "PENDING" | "VALIDATED" | "REJECTED";

type RewardItem = {
  id: string;
  points: number;
  status: RewardStatus;
  createdAt: string;
  donor: { firstName: string; lastName: string; email: string };
  donation: { donatedAt: string; bloodGroup: string; volumeMl: number } | null;
  validatedBy: { firstName: string; lastName: string } | null;
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

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function InstituteRewardsPage() {
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [filter, setFilter] = useState<RewardStatus | "ALL">("PENDING");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [decidingId, setDecidingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    const query = filter === "ALL" ? "" : `?status=${filter}`;
    fetch(`/api/institute-admin/rewards${query}`, { credentials: "include", cache: "no-store" })
      .then((response) => response.json().then((data) => ({ response, data })))
      .then(({ response, data }) => {
        if (!response.ok) throw new Error(data.error ?? "Unable to load rewards.");
        setRewards(data.rewards ?? []);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load rewards."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const decide = async (id: string, status: "VALIDATED" | "REJECTED") => {
    setDecidingId(id);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`/api/institute-admin/rewards/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to update reward.");
      }

      setNotice(status === "VALIDATED" ? "Reward validated." : "Reward rejected.");
      setRewards((current) => current.filter((reward) => reward.id !== id));
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : "Unable to update reward.");
    } finally {
      setDecidingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#f4f1ef] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-red-800">
              <Activity size={14} strokeWidth={2.5} />
              BloodBridge / operations
            </div>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
              Validate donation rewards
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Confirm reward points earned by donors at your institute before they're credited.
            </p>
          </div>
          <Link
            href="/portal/institute-admin"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-red-300 hover:text-red-800"
          >
            <ArrowLeft size={16} />
            Back to workspace
          </Link>
        </header>

        <div className="mb-6 flex flex-wrap gap-2">
          {(["PENDING", "VALIDATED", "REJECTED", "ALL"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                filter === option
                  ? "bg-red-950 text-white"
                  : "border border-slate-300 bg-white text-slate-700 hover:border-red-300"
              }`}
            >
              {option === "ALL" ? "All" : option.charAt(0) + option.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {error && <p className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {notice && <p className="mb-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</p>}

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {loading ? (
            <p className="text-sm text-slate-500">Loading rewards...</p>
          ) : rewards.length === 0 ? (
            <div className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center">
              <p className="text-sm font-medium text-slate-500">Nothing to show for this filter.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {rewards.map((reward) => (
                <div key={reward.id} className="flex flex-wrap items-center justify-between gap-4 py-5 first:pt-0 last:pb-0">
                  <div className="flex gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-800">
                      <Droplet size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">
                        {reward.donor.firstName} {reward.donor.lastName}
                        <span className="ml-2 text-sm font-normal text-slate-500">
                          +{reward.points} points
                        </span>
                      </p>
                      <p className="mt-1 text-sm text-slate-500">{reward.donor.email}</p>
                      {reward.donation && (
                        <p className="mt-1 text-xs text-slate-400">
                          {bloodGroupLabels[reward.donation.bloodGroup] ?? reward.donation.bloodGroup} ·{" "}
                          {reward.donation.volumeMl}ml · {formatDate(reward.donation.donatedAt)}
                        </p>
                      )}
                      {reward.validatedBy && (
                        <p className="mt-1 text-xs text-slate-400">
                          Decided by {reward.validatedBy.firstName} {reward.validatedBy.lastName}
                        </p>
                      )}
                    </div>
                  </div>

                  {reward.status === "PENDING" ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={decidingId === reward.id}
                        onClick={() => decide(reward.id, "VALIDATED")}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <CheckCircle2 size={14} />
                        Validate
                      </button>
                      <button
                        type="button"
                        disabled={decidingId === reward.id}
                        onClick={() => decide(reward.id, "REJECTED")}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                      >
                        <XCircle size={14} />
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                        reward.status === "VALIDATED"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {reward.status === "VALIDATED" ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                      {reward.status === "VALIDATED" ? "Validated" : "Rejected"}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
