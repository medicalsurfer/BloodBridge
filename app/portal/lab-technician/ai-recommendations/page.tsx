"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  RefreshCw,
  Sparkles,
} from "lucide-react";

const PRIMARY_RED = "oklch(27.1% 0.105 12.094)";

type Priority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "OK";

type Recommendation = {
  bloodGroup: string;
  units: number;
  openDemand: number;
  recentDonations: number;
  priority: Priority;
  message: string;
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

const priorityStyles: Record<Priority, string> = {
  CRITICAL: "bg-red-100 text-red-800 border-red-200",
  HIGH: "bg-orange-50 text-orange-700 border-orange-200",
  MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
  LOW: "bg-blue-50 text-blue-700 border-blue-200",
  OK: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const priorityOrder: Priority[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "OK"];

export default function AiRecommendationsPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    fetch("/api/lab-tech/ai-recommendations", { credentials: "include", cache: "no-store" })
      .then((response) => response.json().then((data) => ({ response, data })))
      .then(({ response, data }) => {
        if (!response.ok) throw new Error(data.error ?? "Unable to load recommendations.");
        setRecommendations(
          [...(data.recommendations ?? [])].sort(
            (a: Recommendation, b: Recommendation) =>
              priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority),
          ),
        );
        setAiSummary(data.aiSummary ?? null);
        setAiConfigured(Boolean(data.aiConfigured));
      })
      .catch((loadError) =>
        setError(loadError instanceof Error ? loadError.message : "Unable to load recommendations."),
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-red-800">
              <Activity size={14} strokeWidth={2.5} />
              BloodBridge / laboratory
            </div>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
              AI stock recommendations
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Inventory levels compared against open blood requests, with a suggested priority
              per blood group.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={load}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-red-300 hover:text-red-800"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
            <Link
              href="/portal/lab-technician"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-red-300 hover:text-red-800"
            >
              <ArrowLeft size={16} />
              Back to workspace
            </Link>
          </div>
        </header>

        {error && <p className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

        <section
          style={{ backgroundColor: PRIMARY_RED }}
          className="mb-6 overflow-hidden rounded-3xl p-6 text-white shadow-lg shadow-red-950/10 sm:p-7"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-200">
                AI summary
              </p>
              {loading ? (
                <p className="mt-2 text-sm text-red-100/80">Analysing current stock...</p>
              ) : aiSummary ? (
                <p className="mt-2 max-w-2xl text-sm leading-6 text-red-50">{aiSummary}</p>
              ) : aiConfigured ? (
                <p className="mt-2 max-w-2xl text-sm leading-6 text-red-100/80">
                  The AI summary is temporarily unavailable. The rule-based priorities below are
                  still up to date.
                </p>
              ) : (
                <p className="mt-2 max-w-2xl text-sm leading-6 text-red-100/80">
                  No AI API key is configured, so this view is powered entirely by the rule-based
                  priority engine below. Set AI_API_KEY to enable a narrative summary.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {loading ? (
            <p className="text-sm text-slate-500">Loading recommendations...</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {recommendations.map((recommendation) => (
                <div
                  key={recommendation.bloodGroup}
                  className="flex flex-wrap items-center justify-between gap-4 py-5 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-lg font-black text-red-800">
                      {bloodGroupLabels[recommendation.bloodGroup] ?? recommendation.bloodGroup}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">
                        {recommendation.units} unit{recommendation.units === 1 ? "" : "s"} in stock
                        {recommendation.openDemand > 0 && (
                          <span className="ml-2 text-sm font-normal text-slate-500">
                            · {recommendation.openDemand} requested
                          </span>
                        )}
                      </p>
                      <p className="mt-1 max-w-xl text-sm leading-5 text-slate-600">
                        {recommendation.message}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${priorityStyles[recommendation.priority]}`}
                  >
                    {recommendation.priority}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
