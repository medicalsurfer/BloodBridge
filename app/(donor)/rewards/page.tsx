"use client";

import { useEffect, useState } from "react";
import {
  PageHeader,
  StatGrid,
  Stat,
  Panel,
  Row,
  RowTitle,
  RowMeta,
  Pill,
  EmptyState,
  type PillTone,
} from "@/src/components/ui/Page";
import { Droplet, Clock, CheckCircle2, XCircle } from "lucide-react";

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

const statusStyles: Record<RewardStatus, { tone: PillTone; icon: React.ReactNode; label: string }> = {
  PENDING: { tone: "warn", icon: <Clock size={13} />, label: "Pending validation" },
  VALIDATED: { tone: "good", icon: <CheckCircle2 size={13} />, label: "Validated" },
  REJECTED: { tone: "critical", icon: <XCircle size={13} />, label: "Not approved" },
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
    <div className="mx-auto max-w-6xl">
        <PageHeader
          eyebrow="Rewards"
          title="Donation rewards"
          description="Every recorded donation earns points once the health institute validates it."
        />

        <div className="mt-7 mb-8">
          <StatGrid>
            <Stat
              label="Validated points"
              value={String(validatedPoints)}
              foot="Confirmed by an institute"
              tone={validatedPoints > 0 ? "good" : "default"}
            />
            <Stat
              label="Pending points"
              value={String(pendingPoints)}
              foot="Awaiting validation"
              tone={pendingPoints > 0 ? "warn" : "default"}
            />
            <Stat
              label="Total awarded"
              value={String(validatedPoints + pendingPoints)}
              foot="All time"
            />
            <Stat
              label="Rewards"
              value={String(rewards.length)}
              foot="Records on file"
            />
          </StatGrid>
        </div>

        {error && <p className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

        <Panel label="Points ledger" padded={false}>
          <div className="mt-5 border-t border-slate-100">
            {loading ? (
              <p className="px-6 py-8 text-sm text-slate-500">Loading rewards…</p>
            ) : rewards.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="No rewards yet"
                  description="Book and complete a donation to start earning points."
                />
              </div>
            ) : (
              rewards.map((reward) => {
                const status = statusStyles[reward.status];
                return (
                  <Row key={reward.id}>
                    <div className="flex min-w-0 gap-4">
                      <div
                        aria-hidden
                        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-800"
                      >
                        <Droplet size={17} />
                      </div>

                      <div className="min-w-0">
                        <RowTitle>
                          +{reward.points} points
                          {reward.donation && (
                            <span className="ml-2 font-normal text-slate-500">
                              {bloodGroupLabels[reward.donation.bloodGroup] ??
                                reward.donation.bloodGroup}{" "}
                              donation
                            </span>
                          )}
                        </RowTitle>

                        <RowMeta>
                          {reward.healthInstitute.name} · {reward.healthInstitute.city}
                        </RowMeta>

                        <p className="mt-2 text-[11px] text-slate-400">
                          {formatDate(reward.donation?.donatedAt ?? reward.createdAt)}
                        </p>
                      </div>
                    </div>

                    <Pill tone={status.tone}>
                      {status.icon}
                      {status.label}
                    </Pill>
                  </Row>
                );
              })
            )}
          </div>
        </Panel>
    </div>
  );
}
