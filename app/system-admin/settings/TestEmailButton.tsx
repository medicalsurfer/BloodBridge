"use client";

import { useState } from "react";
import { Panel } from "@/src/components/ui/Page";

export function TestEmailPanel() {
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  async function send() {
    setSending(true);
    setStatus(null);

    try {
      const response = await fetch("/api/system-admin/test-email", {
        method: "POST",
        credentials: "include",
      });
      const data = await response.json();
      setStatus({ ok: response.ok, text: data.message ?? data.error ?? "Unexpected response." });
    } catch {
      setStatus({ ok: false, text: "Couldn't reach the server." });
    } finally {
      setSending(false);
    }
  }

  return (
    <Panel label="Email delivery">
      <p className="mt-4 text-sm leading-6 text-slate-600">
        Send a test message to your own address to confirm the SMTP settings work.
      </p>

      {status && (
        <p
          role={status.ok ? "status" : "alert"}
          className={`mt-4 rounded-xl border px-4 py-3 text-xs ${
            status.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {status.text}
        </p>
      )}

      <button
        type="button"
        onClick={send}
        disabled={sending}
        className="mt-5 h-11 rounded-xl border border-slate-300 px-5 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
      >
        {sending ? "Sending…" : "Send test email"}
      </button>
    </Panel>
  );
}
