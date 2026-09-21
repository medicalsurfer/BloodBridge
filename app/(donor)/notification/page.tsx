"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PageHeader,
  StatGrid,
  Stat,
  Panel,
  RowTitle,
  Pill,
  EmptyState,
} from "@/src/components/ui/Page";
import {
  Bell,
  Calendar,
  Droplet,
  Gift,
  MessageCircle,
  ShieldAlert,
  UserCog,
} from "lucide-react";

type NotificationType =
  | "APPOINTMENT"
  | "DONATION"
  | "BLOOD_REQUEST"
  | "REWARD"
  | "STAFF"
  | "CHAT"
  | "SYSTEM";

type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

const typeStyles: Record<NotificationType, { icon: React.ReactNode; classes: string }> = {
  APPOINTMENT: { icon: <Calendar size={17} />, classes: "bg-blue-50 text-blue-700" },
  DONATION: { icon: <Droplet size={17} />, classes: "bg-red-50 text-red-700" },
  BLOOD_REQUEST: { icon: <ShieldAlert size={17} />, classes: "bg-orange-50 text-orange-700" },
  REWARD: { icon: <Gift size={17} />, classes: "bg-emerald-50 text-emerald-700" },
  STAFF: { icon: <UserCog size={17} />, classes: "bg-indigo-50 text-indigo-700" },
  CHAT: { icon: <MessageCircle size={17} />, classes: "bg-purple-50 text-purple-700" },
  SYSTEM: { icon: <Bell size={17} />, classes: "bg-slate-100 text-slate-700" },
};

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [markingAll, setMarkingAll] = useState(false);

  const load = () => {
    fetch("/api/notifications", { credentials: "include", cache: "no-store" })
      .then((response) => response.json().then((data) => ({ response, data })))
      .then(({ response, data }) => {
        if (!response.ok) throw new Error(data.error ?? "Unable to load notifications.");
        setNotifications(data.notifications ?? []);
      })
      .catch((loadError) =>
        setError(loadError instanceof Error ? loadError.message : "Unable to load notifications."),
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  const markAsRead = async (id: string) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id ? { ...notification, isRead: true } : notification,
      ),
    );

    try {
      await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        credentials: "include",
      });
    } catch {
      // The optimistic update already reflects the intent; a background retry
      // isn't essential for this list view.
    }
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    setNotifications((current) => current.map((notification) => ({ ...notification, isRead: true })));

    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
        <PageHeader
          eyebrow="Notifications"
          title="Your notifications"
          description="Appointment reminders, eligibility updates, blood request alerts and reward status, all in one place."
          actions={
            unreadCount > 0 ? (
              <button
                type="button"
                onClick={markAllRead}
                disabled={markingAll}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 px-5 text-[13px] font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-60"
              >
                Mark all as read
              </button>
            ) : undefined
          }
        />

        <div className="mt-7 mb-8">
          <StatGrid>
            <Stat
              label="Unread"
              value={loading ? "—" : String(unreadCount)}
              foot={unreadCount > 0 ? "Needs your attention" : "All caught up"}
              tone={unreadCount > 0 ? "warn" : "good"}
            />
            <Stat
              label="Total"
              value={loading ? "—" : String(notifications.length)}
              foot="In your inbox"
            />
            <Stat
              label="Appointments"
              value={
                loading ? "—" : String(notifications.filter((n) => n.type === "APPOINTMENT").length)
              }
              foot="Scheduling updates"
            />
            <Stat
              label="Requests"
              value={
                loading
                  ? "—"
                  : String(notifications.filter((n) => n.type === "BLOOD_REQUEST").length)
              }
              foot="Blood request alerts"
            />
          </StatGrid>
        </div>

        {error && <p className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

        <Panel label="Inbox" padded={false}>
          <div className="mt-5 border-t border-slate-100">
            {loading ? (
              <p className="px-6 py-8 text-sm text-slate-500">Loading notifications…</p>
            ) : notifications.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="You're all caught up"
                  description="New notifications will appear here."
                />
              </div>
            ) : (
              notifications.map((notification) => {
                const style = typeStyles[notification.type] ?? typeStyles.SYSTEM;

                // Unread is carried by a brand stripe on the leading edge rather
                // than a wash across the row, so the list keeps one flat ground.
                const content = (
                  <div
                    className={`flex gap-4 border-l-2 py-4 pr-6 pl-6 ${
                      notification.isRead ? "border-l-transparent" : "border-l-red-950"
                    }`}
                  >
                    <div
                      aria-hidden
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${style.classes}`}
                    >
                      {style.icon}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <RowTitle>{notification.title}</RowTitle>
                        {!notification.isRead && <Pill tone="critical">New</Pill>}
                      </div>

                      <p className="mt-1 text-xs leading-5 text-slate-600">{notification.message}</p>
                      <p className="mt-2 text-[11px] text-slate-400">
                        {formatDate(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                );

                return (
                  <div key={notification.id} className="border-b border-slate-100 last:border-b-0">
                    {notification.link ? (
                      <Link
                        href={notification.link}
                        onClick={() => !notification.isRead && markAsRead(notification.id)}
                        className="block transition hover:bg-slate-50"
                      >
                        {content}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => !notification.isRead && markAsRead(notification.id)}
                        className="block w-full text-left transition hover:bg-slate-50"
                      >
                        {content}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </Panel>
    </div>
  );
}
