"use client";

import { KeyboardEvent, ReactNode, useEffect, useRef } from "react";
import { ArrowLeft, Check, CheckCheck, Search, Send } from "lucide-react";

/*
  The messaging surface, shared by the donor screen and the institute one.

  A conversation is read as a stream, not as a table: the list rail is quiet so
  the thread carries the eye, messages group into runs by sender and time, and
  the day breaks the stream where a reader expects it to. Sent messages sit in
  brand garnet on the right; received ones keep the page surface on the left.
*/

export type ChatMessage = {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
  readAt?: string | null;
};

export type ChatSummary = {
  id: string;
  title: string;
  subtitle: string;
  lastMessage: { body: string; createdAt: string; senderId?: string } | null;
  unreadCount: number;
};

/* ── time ─────────────────────────────────────────────────────────────── */

const timeFormat = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" });

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

export function dayLabel(iso: string) {
  const date = new Date(iso);
  const days = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000);

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return date.toLocaleDateString("en-GB", { weekday: "long" });

  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

/** Clock time for a message, or a coarser stamp for a conversation row. */
export function listStamp(iso: string) {
  const date = new Date(iso);
  const days = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000);

  if (days === 0) return timeFormat.format(date);
  if (days === 1) return "Yesterday";
  if (days < 7) return date.toLocaleDateString("en-GB", { weekday: "short" });

  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

export function messageTime(iso: string) {
  return timeFormat.format(new Date(iso));
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

/* ── frame ────────────────────────────────────────────────────────────── */

export function ChatFrame({ children }: { children: ReactNode }) {
  return (
    <section className="grid h-[min(76dvh,820px)] min-h-125 overflow-hidden rounded-2xl border border-slate-200 bg-white md:grid-cols-[clamp(260px,28%,340px)_1fr]">
      {children}
    </section>
  );
}

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full bg-red-50 font-semibold text-red-900 ${
        size === "sm" ? "h-9 w-9 text-[11px]" : "h-10 w-10 text-xs"
      }`}
    >
      {initials(name) || "?"}
    </span>
  );
}

/* ── conversation rail ────────────────────────────────────────────────── */

export function ConversationRail({
  conversations,
  activeId,
  onSelect,
  loading,
  search,
  onSearch,
  emptyMessage,
  action,
  currentUserId,
  hiddenOnMobile,
}: {
  conversations: ChatSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
  search: string;
  onSearch: (value: string) => void;
  emptyMessage: string;
  action?: ReactNode;
  currentUserId: string | null;
  hiddenOnMobile: boolean;
}) {
  const visible = conversations.filter((conversation) =>
    `${conversation.title} ${conversation.subtitle} ${conversation.lastMessage?.body ?? ""}`
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );

  return (
    <div
      className={`min-h-0 flex-col border-slate-200 md:flex md:border-r ${
        hiddenOnMobile ? "hidden" : "flex"
      }`}
    >
      <div className="flex items-center gap-2 border-b border-slate-100 p-3">
        <div className="relative flex-1">
          <Search
            size={15}
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
          />
          <label htmlFor="chat-search" className="sr-only">
            Search conversations
          </label>
          <input
            id="chat-search"
            type="search"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search"
            className="h-10 w-full rounded-full border border-slate-200 bg-slate-50 pr-3 pl-9 text-[13px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-950 focus:bg-white"
          />
        </div>

        {action}
      </div>

      <div className="bbScroll min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-1 p-3">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-center gap-3 rounded-xl px-2 py-2.5">
                <span className="h-10 w-10 animate-pulse rounded-full bg-slate-100" />
                <span className="flex-1 space-y-2">
                  <span className="block h-2.5 w-2/5 animate-pulse rounded bg-slate-100" />
                  <span className="block h-2 w-3/5 animate-pulse rounded bg-slate-100" />
                </span>
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <p className="px-5 py-8 text-center text-xs leading-5 text-slate-500">
            {search.trim() ? "No conversation matches that search." : emptyMessage}
          </p>
        ) : (
          <ul className="p-2">
            {visible.map((conversation) => {
              const active = conversation.id === activeId;
              const mine = conversation.lastMessage?.senderId === currentUserId;

              return (
                <li key={conversation.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(conversation.id)}
                    aria-current={active}
                    className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition ${
                      active ? "bg-red-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <Avatar name={conversation.title} />

                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[13.5px] font-semibold text-slate-900">
                          {conversation.title}
                        </span>
                        {conversation.lastMessage && (
                          <span
                            className={`shrink-0 text-[11px] tabular-nums ${
                              conversation.unreadCount > 0 ? "font-semibold text-red-900" : "text-slate-400"
                            }`}
                          >
                            {listStamp(conversation.lastMessage.createdAt)}
                          </span>
                        )}
                      </span>

                      <span className="mt-0.5 flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-xs text-slate-500">
                          {conversation.lastMessage
                            ? `${mine ? "You: " : ""}${conversation.lastMessage.body}`
                            : conversation.subtitle}
                        </span>

                        {conversation.unreadCount > 0 && (
                          <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-950 px-1.5 text-[10px] font-semibold tabular-nums text-white">
                            {conversation.unreadCount}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ── thread ───────────────────────────────────────────────────────────── */

export function ThreadHeader({
  title,
  subtitle,
  onBack,
  action,
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
  action?: ReactNode;
}) {
  return (
    <header className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back to conversations"
        className="-ml-1 flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 md:hidden"
      >
        <ArrowLeft size={18} />
      </button>

      <Avatar name={title} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-slate-900">{title}</p>
        <p className="truncate text-[11.5px] text-slate-500">{subtitle}</p>
      </div>

      {action}
    </header>
  );
}

export function MessageStream({
  messages,
  currentUserId,
  loading,
  emptyTitle,
  emptyBody,
}: {
  messages: ChatMessage[];
  currentUserId: string | null;
  loading: boolean;
  emptyTitle: string;
  emptyBody: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastId = messages.at(-1)?.id;

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [lastId, loading]);

  return (
    <div
      ref={scrollRef}
      // The canvas is one shade off the panel so bubbles read as objects on a
      // surface rather than boxes drawn on the same plane.
      className="bbChatCanvas bbScroll min-h-0 flex-1 overflow-y-auto px-4 py-5"
    >
      {loading ? (
        <p className="py-6 text-center text-xs text-slate-500">Loading messages…</p>
      ) : messages.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center px-6 text-center">
          <p className="text-sm font-semibold text-slate-700">{emptyTitle}</p>
          <p className="mt-1.5 max-w-xs text-xs leading-5 text-slate-500">{emptyBody}</p>
        </div>
      ) : (
        <ol className="mx-auto flex max-w-2xl flex-col gap-0.5">
          {messages.map((message, index) => {
            const previous = messages[index - 1];
            const next = messages[index + 1];
            const mine = message.senderId === currentUserId;

            const newDay =
              !previous || dayLabel(previous.createdAt) !== dayLabel(message.createdAt);

            // A run is the same sender within five minutes: only its last
            // bubble gets the tail and the timestamp.
            const sameRunAsNext =
              next !== undefined &&
              next.senderId === message.senderId &&
              new Date(next.createdAt).getTime() - new Date(message.createdAt).getTime() < 300_000 &&
              dayLabel(next.createdAt) === dayLabel(message.createdAt);

            return (
              <li key={message.id} className="contents">
                {newDay && (
                  <div className="my-3 flex justify-center">
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10.5px] font-semibold tracking-[0.04em] text-slate-500 uppercase">
                      {dayLabel(message.createdAt)}
                    </span>
                  </div>
                )}

                <div
                  className={`flex ${mine ? "justify-end" : "justify-start"} ${
                    sameRunAsNext ? "" : "mb-2"
                  }`}
                >
                  <div
                    className={`relative max-w-[min(78%,34rem)] px-3.5 py-2 text-[13.5px] leading-[1.45] shadow-sm ${
                      mine
                        ? `bg-red-950 text-white ${
                            sameRunAsNext ? "rounded-2xl" : "rounded-2xl rounded-br-sm"
                          }`
                        : `border border-slate-200 bg-white text-slate-800 ${
                            sameRunAsNext ? "rounded-2xl" : "rounded-2xl rounded-bl-sm"
                          }`
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.body}</p>

                    {!sameRunAsNext && (
                      <p
                        className={`mt-1 flex items-center justify-end gap-1 text-[10.5px] tabular-nums ${
                          mine ? "text-red-200" : "text-slate-400"
                        }`}
                      >
                        {messageTime(message.createdAt)}
                        {mine &&
                          (message.readAt ? (
                            <CheckCheck size={13} aria-label="Read" className="text-sky-300" />
                          ) : (
                            <Check size={13} aria-label="Sent" />
                          ))}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

export function Composer({
  value,
  onChange,
  onSend,
  sending,
  placeholder = "Type a message",
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  sending: boolean;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Grow with the draft, up to roughly five lines, then scroll.
  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    node.style.height = "0px";
    node.style.height = `${Math.min(node.scrollHeight, 132)}px`;
    // No scrollbar until the draft actually outgrows the box.
    node.style.overflowY = node.scrollHeight > 132 ? "auto" : "hidden";
  }, [value]);

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSend();
    }
  }

  return (
    <div className="flex items-end gap-2 border-t border-slate-100 bg-white p-3">
      <label htmlFor="chat-draft" className="sr-only">
        Message
      </label>

      <textarea
        id="chat-draft"
        ref={ref}
        rows={1}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="bbScroll max-h-33 min-h-11 flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-[13.5px] leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-950 focus:bg-white"
      />

      <button
        type="button"
        onClick={onSend}
        disabled={sending || !value.trim()}
        aria-label="Send message"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-950 text-white transition hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Send size={17} />
      </button>
    </div>
  );
}

export function NoThreadSelected({ title, body }: { title: string; body: string }) {
  return (
    <div className="bbChatCanvas hidden min-h-0 flex-1 items-center justify-center p-8 md:flex">
      <div className="max-w-xs text-center">
        <p className="text-sm font-semibold text-slate-700">{title}</p>
        <p className="mt-1.5 text-xs leading-5 text-slate-500">{body}</p>
      </div>
    </div>
  );
}
