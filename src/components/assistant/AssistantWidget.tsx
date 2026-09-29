"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useId, useRef, useState } from "react";
import styles from "./AssistantWidget.module.css";

/*
  Pages the assistant stays off.

  These are the public face of BloodBridge — the ones someone reads before
  they have an account, or while signing in. A signed-in person visiting the
  landing page is still on a marketing page, so the widget hides there too:
  the assistant belongs to the application, not to the shopfront.
*/
const PUBLIC_ROUTES = [
  "/",
  "/landing",
  "/login",
  "/register",
  "/privacy",
  "/terms",
  "/forgot-password",
  "/reset-password",
];

type ChatMessage = {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  createdAt: string;
};

type AuthUser = {
  id: string;
  firstName: string;
  role: string;
  bloodGroup: string | null;
  eligibilityStatus: boolean | null;
  donations: number | null;
  upcomingAppointment: {
    appointmentDate: string;
    appointmentTime: string;
    healthInstitute: { name: string };
  } | null;
  /** Staff and admins: the institute they work for. */
  institute: { name: string; city: string } | null;
  /** Lab technicians only: the two figures their shift turns on. */
  labSnapshot: {
    lowestStock: { bloodGroup: string; units: number } | null;
    awaitingRecord: number;
  } | null;
};

const ROLE_LABELS: Record<string, string> = {
  DONOR: "Donor",
  MEDICAL_STAFF: "Medical staff",
  LAB_TECHNICIAN: "Lab technician",
  HEALTH_INSTITUTE_ADMIN: "Institute admin",
  SYSTEM_ADMIN: "System admin",
};

const SUGGESTIONS_BY_ROLE: Record<string, string[]> = {
  DONOR: [
    "When can I donate again?",
    "Where is my blood needed?",
    "How do rewards work?",
    "How do I book a donation?",
  ],
  /*
    Staff prompts lead with questions the assistant can answer from live
    figures, because it now reads the institute's own stock, requests and
    donor counts. The how-to questions follow.
  */
  MEDICAL_STAFF: [
    "What blood do we need most right now?",
    "How many donors can donate today?",
    "How do I create a blood request?",
  ],
  LAB_TECHNICIAN: [
    "Which blood group is running low?",
    "What is waiting for a donation record?",
    "How do I record a donation?",
  ],
  HEALTH_INSTITUTE_ADMIN: [
    "What is our blood stock right now?",
    "How do I invite staff?",
    "How do I validate a donation reward?",
  ],
  SYSTEM_ADMIN: [
    "How many institutes are active?",
    "How many donors are registered?",
    "Where can I see the audit logs?",
  ],
};

type ConversationSummary = {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
};

function formatWhen(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return sameDay
    ? date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: date.getFullYear() === today.getFullYear() ? undefined : "numeric" });
}

/** Ids and timestamps for the optimistic pair, created outside render. */
function newTurn(content: string): [ChatMessage, ChatMessage] {
  const stamp = Date.now();
  const now = new Date().toISOString();

  return [
    { id: `local-${stamp}`, role: "USER", content, createdAt: now },
    { id: `reply-${stamp}`, role: "ASSISTANT", content: "", createdAt: now },
  ];
}

export function AssistantWidget() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  /** The open conversation; null until the first message of a new chat. */
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [view, setView] = useState<"chat" | "history">("chat");
  const [conversations, setConversations] = useState<ConversationSummary[] | null>(null);
  const msgsRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef<HTMLTextAreaElement>(null);

  const pathname = usePathname();
  const onPublicPage = PUBLIC_ROUTES.includes(pathname);

  /*
    Whose chat this is.

    The widget lives in the root layout, so it is not remounted when someone
    signs out and another person signs in: it kept the first person's
    messages in memory and showed them to the second. Everything is wiped the
    moment the app reaches a public page (sign-out lands on /login) and again
    whenever the signed-in account changes. Both are done while rendering,
    React's pattern for resetting state when an input changes.
  */
  const [wasOnPublicPage, setWasOnPublicPage] = useState(onPublicPage);
  if (wasOnPublicPage !== onPublicPage) {
    setWasOnPublicPage(onPublicPage);
    if (onPublicPage) {
      setUser(null);
      setCheckedAuth(false);
    }
  }

  const [chatOwner, setChatOwner] = useState<string | null>(null);
  if ((user?.id ?? null) !== chatOwner) {
    setChatOwner(user?.id ?? null);
    setOpen(false);
    setMessages([]);
    setHistoryLoaded(false);
    setConversationId(null);
    setConversations(null);
    setView("chat");
    setDraft("");
  }

  useEffect(() => {
    // Nothing to ask on a page the assistant will not appear on.
    if (onPublicPage) return;

    fetch("/api/auth/me", { credentials: "include", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setUser(data?.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setCheckedAuth(true));
  }, [onPublicPage]);

  // First open: reopen the most recent conversation.
  useEffect(() => {
    if (!open || historyLoaded || !user) return;

    fetch("/api/ai-chat", { credentials: "include", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { messages: [] }))
      .then((data) => {
        setMessages(data.messages ?? []);
        setConversationId(data.conversation?.id ?? null);
      })
      .catch(() => setMessages([]))
      .finally(() => setHistoryLoaded(true));
  }, [open, historyLoaded, user]);

  useEffect(() => {
    msgsRef.current?.scrollTo({ top: msgsRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  // Grow the composer with the draft, up to the height the stylesheet caps.
  useEffect(() => {
    const node = draftRef.current;
    if (!node) return;

    node.style.height = "0px";
    node.style.height = `${Math.min(node.scrollHeight, 110)}px`;
  }, [draft, open]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (onPublicPage || !checkedAuth || !user) return null;

  async function send(text: string) {
    const content = text.trim();
    if (!content || sending) return;

    const [question, reply] = newTurn(content);
    const replyId = reply.id;

    setSending(true);
    setDraft("");
    setMessages((current) => [...current, question, reply]);

    const setReply = (update: (previous: string) => string) =>
      setMessages((current) =>
        current.map((message) =>
          message.id === replyId ? { ...message, content: update(message.content) } : message,
        ),
      );

    try {
      const response = await fetch("/api/ai-chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, conversationId }),
      });

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => null);
        setReply(() => data?.error ?? "Something went wrong. Please try again.");
        return;
      }

      // A new chat gets its id with the first reply.
      const startedId = response.headers.get("X-Conversation-Id");
      if (startedId) setConversationId(startedId);
      setConversations(null);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        setReply((previous) => previous + decoder.decode(value, { stream: true }));
      }
    } catch {
      setReply(
        (previous) => previous || "Couldn't reach the assistant. Check your connection and try again.",
      );
    } finally {
      setSending(false);
    }
  }

  function newChat() {
    if (sending) return;
    setConversationId(null);
    setMessages([]);
    setHistoryLoaded(true);
    setView("chat");
    draftRef.current?.focus();
  }

  async function showHistory() {
    if (sending) return;
    setView("history");
    const response = await fetch("/api/ai-chat/conversations", { credentials: "include", cache: "no-store" }).catch(
      () => null,
    );
    const data = response?.ok ? await response.json().catch(() => null) : null;
    setConversations(data?.conversations ?? []);
  }

  async function openConversation(id: string) {
    // Not via historyLoaded: clearing it would re-run the first-open load,
    // which fetches the latest conversation and overwrites this one.
    setView("chat");
    setMessages([]);
    const response = await fetch(`/api/ai-chat?conversationId=${encodeURIComponent(id)}`, {
      credentials: "include",
      cache: "no-store",
    }).catch(() => null);
    const data = response?.ok ? await response.json().catch(() => null) : null;
    setMessages(data?.messages ?? []);
    setConversationId(data?.conversation?.id ?? null);
  }

  async function deleteConversation(id: string) {
    if (sending) return;
    if (!window.confirm("Delete this conversation? This can't be undone.")) return;

    const response = await fetch(`/api/ai-chat?conversationId=${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "include",
    }).catch(() => null);
    if (!response?.ok) return;

    setConversations((current) => current?.filter((conversation) => conversation.id !== id) ?? null);
    if (id === conversationId) {
      setConversationId(null);
      setMessages([]);
    }
  }

  const suggestions = SUGGESTIONS_BY_ROLE[user.role] ?? [];
  const showSuggestions = suggestions.length > 0 && messages.length <= 1;
  const awaitingFirstToken =
    sending && messages.at(-1)?.role === "ASSISTANT" && messages.at(-1)?.content === "";

  return (
    <>
      <button
        type="button"
        className={`${styles.launcher} ${open ? styles.isOpen : ""}`}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label={open ? "Close BloodBridge Assistant" : "Open BloodBridge Assistant"}
      >
        <span className={styles.icChat}>
          <Mascot size={34} />
        </span>
        <svg className={styles.icClose} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
        <span className={styles.launcherLabel}>Ask BloodBridge</span>
      </button>

      <div
        className={`${styles.panel} ${open ? styles.open : ""} ${expanded ? styles.expanded : ""}`}
        role="dialog"
        aria-label="BloodBridge Assistant"
        aria-hidden={!open}
      >
        <div className={styles.head}>
          <div className={styles.headIcon}>
            <Mascot size={34} mood={sending ? "thinking" : "idle"} />
            <span className={styles.headStatus} aria-hidden />
          </div>

          <div className={styles.headText}>
            <div className={styles.headTitle}>BloodBridge Assistant</div>
            <div className={styles.headSub}>{sending ? "Thinking…" : "Online · here to help"}</div>
          </div>

          <div className={styles.headActions}>
            <button
              type="button"
              className={`${styles.headBtn} ${view === "history" ? styles.headBtnActive : ""}`}
              onClick={() => (view === "history" ? setView("chat") : showHistory())}
              disabled={sending}
              aria-label="Past conversations"
              aria-pressed={view === "history"}
              title="Past conversations"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M3.5 12a8.5 8.5 0 1 0 2.5-6M3.5 4v4h4M12 8v4l3 2" />
              </svg>
            </button>

            <button
              type="button"
              className={styles.headBtn}
              onClick={newChat}
              disabled={sending}
              aria-label="New chat"
              title="New chat"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>

            {view === "chat" && conversationId && (
              <button
                type="button"
                className={styles.headBtn}
                onClick={() => deleteConversation(conversationId)}
                disabled={sending}
                aria-label="Delete this conversation"
                title="Delete this conversation"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                </svg>
              </button>
            )}

            <button
              type="button"
              className={`${styles.headBtn} ${styles.expandBtn} ${expanded ? styles.isExpanded : ""}`}
              onClick={() => setExpanded((current) => !current)}
              aria-label={expanded ? "Collapse assistant" : "Expand assistant"}
            >
              <svg className={styles.icExpand} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" />
              </svg>
              <svg className={styles.icCompress} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M4 9h5V4M20 9h-5V4M4 15h5v5M20 15h-5v5" />
              </svg>
            </button>

            <button
              type="button"
              className={styles.headBtn}
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
        </div>

        <div className={styles.body}>
          <div className={styles.main}>
            {view === "history" && (
              <div className={styles.history}>
                <div className={styles.historyHead}>
                  <span className={styles.infoLabel}>Past conversations</span>
                  <button type="button" className={styles.historyNew} onClick={newChat}>
                    + New chat
                  </button>
                </div>

                {conversations === null ? (
                  <div className={styles.typing} aria-label="Loading conversations">
                    <span />
                    <span />
                    <span />
                  </div>
                ) : conversations.length === 0 ? (
                  <p className={styles.introBody}>No past conversations yet. Ask a question to start one.</p>
                ) : (
                  <ul className={styles.historyList}>
                    {conversations.map((conversation) => (
                      <li key={conversation.id} className={styles.historyItem}>
                        <button
                          type="button"
                          className={`${styles.historyOpen} ${conversation.id === conversationId ? styles.historyCurrent : ""}`}
                          onClick={() => openConversation(conversation.id)}
                        >
                          <span className={styles.historyTitle}>{conversation.title}</span>
                          <span className={styles.historyMeta}>
                            {formatWhen(conversation.updatedAt)} · {conversation.messageCount} message
                            {conversation.messageCount === 1 ? "" : "s"}
                          </span>
                        </button>
                        <button
                          type="button"
                          className={styles.headBtn}
                          onClick={() => deleteConversation(conversation.id)}
                          aria-label={`Delete conversation: ${conversation.title}`}
                          title="Delete"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                            <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {view === "chat" && (
            <div className={styles.msgs} ref={msgsRef}>
              {!historyLoaded ? (
                <div className={styles.typing} aria-label="Loading">
                  <span />
                  <span />
                  <span />
                </div>
              ) : messages.length === 0 ? (
                <div className={styles.intro}>
                  <span className={styles.introMascot}>
                    <Mascot size={76} mood="happy" />
                  </span>
                  <p className={styles.introTitle}>Hi {user.firstName}!</p>
                  <p className={styles.introBody}>
                    Ask me about eligibility, appointments, donation centres or rewards. General guidance
                    only — your health institute answers medical questions.
                  </p>
                </div>
              ) : (
                messages.map((message, index) => {
                  if (message.role === "USER") {
                    return (
                      <div key={message.id} className={`${styles.msg} ${styles.msgUser}`}>
                        {message.content}
                      </div>
                    );
                  }

                  if (!message.content) return null;

                  // The last reply is the one still arriving, so it carries
                  // the cursor until the stream finishes.
                  const streaming = sending && index === messages.length - 1;

                  return (
                    <div key={message.id} className={styles.botRow}>
                      <span className={styles.botAvatar} aria-hidden>
                        <Mascot size={30} mood={streaming ? "thinking" : "happy"} />
                      </span>

                      <div className={`${styles.msg} ${styles.msgBot} ${styles.botBody}`}>
                        <ReplyText text={message.content} />
                        {streaming && <span className={styles.cursor} aria-hidden />}
                      </div>
                    </div>
                  );
                })
              )}

              {awaitingFirstToken && (
                /* Waiting sits where the reply will appear, behind the same avatar. */
                <div className={styles.botRow}>
                  <span className={styles.botAvatar} aria-hidden>
                    <Mascot size={30} mood="thinking" />
                  </span>

                  <div className={`${styles.typing} ${styles.typingBubble}`} aria-label="The assistant is typing">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              )}
            </div>
            )}

            {view === "chat" && showSuggestions && (
              <div className={styles.suggested}>
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className={styles.suggestedChip}
                    disabled={sending}
                    onClick={() => send(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            {view === "chat" && (
            <div className={styles.inputRow}>
              <label htmlFor="assistant-draft" className="sr-only">
                Ask the assistant
              </label>

              <textarea
                id="assistant-draft"
                ref={draftRef}
                rows={1}
                value={draft}
                placeholder="Ask a question"
                maxLength={2000}
                disabled={sending}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    send(draft);
                  }
                }}
              />

              <button
                type="button"
                className={styles.send}
                disabled={sending || !draft.trim()}
                onClick={() => send(draft)}
                aria-label="Send"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="m3 12 18-8-8 18-2-8-8-2Z" />
                </svg>
              </button>
            </div>
            )}

            <p className={styles.disclaimer}>Not medical advice.</p>
          </div>

          <aside className={styles.info}>
            {user.role === "DONOR" && (
              <div>
                <div className={styles.infoLabel}>Your snapshot</div>
                <div className={styles.infoStats}>
                  <div className={styles.infoStat}>
                    <div className={styles.infoStatLabel}>Blood group</div>
                    <div className={styles.infoStatValue}>{user.bloodGroup ?? "Not set"}</div>
                  </div>
                  <div className={styles.infoStat}>
                    <div className={styles.infoStatLabel}>Eligibility</div>
                    <div className={`${styles.infoStatValue} ${user.eligibilityStatus ? styles.ok : ""}`}>
                      {user.eligibilityStatus ? "Eligible" : "Not yet eligible"}
                    </div>
                  </div>
                  {user.upcomingAppointment && (
                    <div className={styles.infoStat}>
                      <div className={styles.infoStatLabel}>Next appointment</div>
                      <div className={styles.infoStatValueSmall}>
                        {new Date(user.upcomingAppointment.appointmentDate).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })}{" "}
                        · {user.upcomingAppointment.appointmentTime}
                      </div>
                    </div>
                  )}
                  <div className={styles.infoStat}>
                    <div className={styles.infoStatLabel}>Donations</div>
                    <div className={styles.infoStatValue}>{user.donations ?? 0}</div>
                  </div>
                </div>
              </div>
            )}

            {/*
              The same column, for everyone who is not a donor. It used to
              render nothing at all for staff, which made the assistant look
              like it was not meant for them.
            */}
            {user.role !== "DONOR" && (
              <div>
                <div className={styles.infoLabel}>Your workspace</div>
                <div className={styles.infoStats}>
                  <div className={styles.infoStat}>
                    <div className={styles.infoStatLabel}>Signed in as</div>
                    <div className={styles.infoStatValueSmall}>
                      {ROLE_LABELS[user.role] ?? user.role}
                    </div>
                  </div>

                  {user.institute && (
                    <div className={styles.infoStat}>
                      <div className={styles.infoStatLabel}>Institute</div>
                      <div className={styles.infoStatValueSmall}>
                        {user.institute.name} · {user.institute.city}
                      </div>
                    </div>
                  )}

                  {user.labSnapshot?.lowestStock && (
                    <div className={styles.infoStat}>
                      <div className={styles.infoStatLabel}>Lowest stock</div>
                      <div className={styles.infoStatValue}>
                        {user.labSnapshot.lowestStock.bloodGroup}{" "}
                        <span className={styles.infoStatValueSmall}>
                          {user.labSnapshot.lowestStock.units} units
                        </span>
                      </div>
                    </div>
                  )}

                  {user.labSnapshot && user.labSnapshot.awaitingRecord > 0 && (
                    <div className={styles.infoStat}>
                      <div className={styles.infoStatLabel}>Awaiting a record</div>
                      <div className={styles.infoStatValue}>
                        {user.labSnapshot.awaitingRecord}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {suggestions.length > 0 && (
              <div>
                <div className={styles.infoLabel}>Ask about</div>
                <div className={styles.suggested} style={{ padding: "10px 0 0", border: 0, flexWrap: "wrap" }}>
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className={styles.suggestedChip}
                      disabled={sending}
                      onClick={() => send(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}

// Replies are plain text; render **bold** and turn in-app paths like
// "(/profile)" into links so the assistant can point people to pages.
const REPLY_TOKEN = /(\*\*[^*]+\*\*|(?<![\w/])\/[a-z][a-z0-9-]*(?:\/[a-z0-9-]+)*)/g;

/*
  The assistant's face: a blood drop with eyes and a smile. It blinks on its
  own every few seconds, bobs while it is thinking, and grins when it has
  just answered — so the panel feels like someone is there. Drawn in SVG from
  the brand colours; the eyes and mouth are white so it reads on the garnet.
*/
type Mood = "idle" | "thinking" | "happy";

function Mascot({ size = 28, mood = "idle" }: { size?: number; mood?: Mood }) {
  const gradientId = `bbMascot${useId().replace(/:/g, "")}`;
  return (
    <svg
      className={`${styles.mascot} ${mood === "thinking" ? styles.mascotThinking : ""}`}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="oklch(66% 0.2 18)" />
          <stop offset="0.55" stopColor="oklch(50% 0.19 15)" />
          <stop offset="1" stopColor="oklch(34% 0.14 5)" />
        </linearGradient>
      </defs>
      <path
        d="M24 3c7 8.4 14.5 16.2 14.5 24.8A14.5 14.5 0 0 1 9.5 27.8C9.5 19.2 17 11.4 24 3Z"
        fill={`url(#${gradientId})`}
      />
      {/* Shine */}
      <path d="M15 24c-.9 2.6-.7 5.4.6 7.6" stroke="#fff" strokeOpacity="0.55" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Eyes */}
      <g className={styles.mascotEyes}>
        <ellipse cx="19.5" cy="27" rx="2.1" ry="2.7" fill="#fff" />
        <ellipse cx="28.5" cy="27" rx="2.1" ry="2.7" fill="#fff" />
        <circle cx="20" cy="27.6" r="1.05" fill="oklch(22% 0.06 12)" />
        <circle cx="29" cy="27.6" r="1.05" fill="oklch(22% 0.06 12)" />
      </g>
      {/* Mouth */}
      {mood === "thinking" ? (
        <circle cx="24" cy="34.2" r="1.5" fill="#fff" />
      ) : (
        <path
          d={mood === "happy" ? "M19.5 32.6c2.6 3.4 6.4 3.4 9 0" : "M20.5 33.2c2 2 5 2 7 0"}
          stroke="#fff"
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
        />
      )}
      {/* Cheeks */}
      <circle cx="15.5" cy="31.5" r="1.9" fill="oklch(78% 0.13 20)" opacity="0.55" />
      <circle cx="32.5" cy="31.5" r="1.9" fill="oklch(78% 0.13 20)" opacity="0.55" />
    </svg>
  );
}

function ReplyText({ text }: { text: string }) {
  return (
    <>
      {text.split(REPLY_TOKEN).map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
          return <strong key={index}>{part.slice(2, -2)}</strong>;
        }
        if (index % 2 === 1 && part.startsWith("/")) {
          return (
            <Link key={index} href={part} className={styles.msgLink}>
              {part}
            </Link>
          );
        }
        return <Fragment key={index}>{part}</Fragment>;
      })}
    </>
  );
}
