"use client";

import { useEffect, useState } from "react";
import { RefreshCw, ShieldAlert } from "lucide-react";

type LogItem = {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: string | null;
  createdAt: string;
  actor: { firstName: string; lastName: string; email: string; role: string } | null;
};

const actionOptions = [
  "",
  "USER_REGISTERED",
  "USER_LOGGED_IN",
  "USER_CREATED",
  "USER_UPDATED",
  "USER_DELETED",
  "INSTITUTE_CREATED",
  "INSTITUTE_UPDATED",
  "INSTITUTE_STATUS_CHANGED",
  "INSTITUTE_DELETED",
  "STAFF_INVITED",
  "STAFF_REMOVED",
  "APPOINTMENT_BOOKED",
  "APPOINTMENT_CANCELLED",
  "APPOINTMENT_RESCHEDULED",
  "DONATION_RECORDED",
  "BLOOD_REQUEST_CREATED",
  "REWARD_VALIDATED",
  "REWARD_REJECTED",
];

function formatAction(action: string) {
  return action
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function SystemLogsPage() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    const query = action ? `?action=${action}` : "";
    fetch(`/api/system-admin/logs${query}`, { credentials: "include", cache: "no-store" })
      .then((response) => response.json().then((data) => ({ response, data })))
      .then(({ response, data }) => {
        if (!response.ok) throw new Error(data.error ?? "Unable to load system logs.");
        setLogs(data.logs ?? []);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load system logs."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action]);

  return (
        <div>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-950">Audit trail</h1>
              <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">
                Every significant action taken across the platform, most recent first.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={action}
                onChange={(event) => setAction(event.target.value)}
                className="h-10 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700"
              >
                <option value="">All actions</option>
                {actionOptions
                  .filter((option) => option)
                  .map((option) => (
                    <option key={option} value={option}>
                      {formatAction(option)}
                    </option>
                  ))}
              </select>

              <button
                type="button"
                onClick={load}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <RefreshCw size={14} />
                Refresh
              </button>
            </div>
          </div>

          {error && (
            <p className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700">
              <ShieldAlert size={16} />
              {error}
            </p>
          )}

          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full min-w-175 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Target</th>
                  <th className="px-4 py-3">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                      Loading logs...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                      No log entries match this filter.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="align-top">
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {formatAction(log.action)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {log.actor ? (
                          <>
                            {log.actor.firstName} {log.actor.lastName}
                            <span className="block text-xs text-slate-400">{log.actor.email}</span>
                          </>
                        ) : (
                          <span className="text-slate-400">System</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {log.targetType}
                        {log.targetId && (
                          <span className="block truncate text-xs text-slate-400" title={log.targetId}>
                            {log.targetId}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                        {formatDate(log.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
  );
}
