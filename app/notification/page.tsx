"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  APPOINTMENT: { icon: <Calendar size={18} />, classes: "bg-blue-50 text-blue-700" },
  DONATION: { icon: <Droplet size={18} />, classes: "bg-red-50 text-red-700" },
  BLOOD_REQUEST: { icon: <ShieldAlert size={18} />, classes: "bg-orange-50 text-orange-700" },
  REWARD: { icon: <Gift size={18} />, classes: "bg-emerald-50 text-emerald-700" },
  STAFF: { icon: <UserCog size={18} />, classes: "bg-indigo-50 text-indigo-700" },
  CHAT: { icon: <MessageCircle size={18} />, classes: "bg-purple-50 text-purple-700" },
  SYSTEM: { icon: <Bell size={18} />, classes: "bg-slate-100 text-slate-700" },
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
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-red-700">
              Notifications
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Your notifications
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Appointment reminders, eligibility updates, blood request alerts and reward status,
              all in one place.
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              disabled={markingAll}
              className="flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              Mark all as read
            </button>
          )}
        </div>

        {error && <p className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {loading ? (
            <p className="text-sm text-slate-500">Loading notifications...</p>
          ) : notifications.length === 0 ? (
            <div className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center">
              <div>
                <p className="text-sm font-medium text-slate-500">You're all caught up.</p>
                <p className="mt-1 text-xs text-slate-400">New notifications will appear here.</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map((notification) => {
                const style = typeStyles[notification.type] ?? typeStyles.SYSTEM;
                const content = (
                  <div
                    className={`flex gap-4 py-5 first:pt-0 last:pb-0 ${
                      notification.isRead ? "" : "bg-red-50/30"
                    }`}
                  >
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${style.classes}`}>
                      {style.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-bold text-slate-900">{notification.title}</p>
                        {!notification.isRead && (
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-600" />
                        )}
                      </div>
                      <p className="mt-1 text-sm leading-5 text-slate-600">{notification.message}</p>
                      <p className="mt-2 text-xs text-slate-400">{formatDate(notification.createdAt)}</p>
                    </div>
                  </div>
                );

                return (
                  <div key={notification.id} className="-mx-2 px-2">
                    {notification.link ? (
                      <Link
                        href={notification.link}
                        onClick={() => !notification.isRead && markAsRead(notification.id)}
                        className="block rounded-xl transition hover:bg-slate-50"
                      >
                        {content}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => !notification.isRead && markAsRead(notification.id)}
                        className="block w-full rounded-xl text-left transition hover:bg-slate-50"
                      >
                        {content}
                      </button>
                    )}
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
