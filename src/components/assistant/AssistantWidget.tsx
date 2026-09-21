"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import styles from "./AssistantWidget.module.css";

type ChatMessage = {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  createdAt: string;
};

type AuthUser = {
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
};

const SUGGESTIONS_BY_ROLE: Record<string, string[]> = {
  DONOR: [
    "When can I donate again?",
    "Where is my blood needed?",
    "How do rewards work?",
    "How do I book a donation?",
  ],
  MEDICAL_STAFF: ["How do I create a blood request?", "How do I find eligible donors?"],
  LAB_TECHNICIAN: ["How do I record a donation?", "What do the AI recommendations mean?"],
  HEALTH_INSTITUTE_ADMIN: ["How do I invite staff?", "How do I validate a donation reward?"],
  SYSTEM_ADMIN: ["How do I manage health institutes?", "Where can I see the audit logs?"],
};

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
  const msgsRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setUser(data?.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setCheckedAuth(true));
  }, []);

  useEffect(() => {
    if (!open || historyLoaded || !user) return;

    fetch("/api/ai-chat", { credentials: "include", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { messages: [] }))
      .then((data) => setMessages(data.messages ?? []))
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

  if (!checkedAuth || !user) return null;

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
        body: JSON.stringify({ message: content }),
      });

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => null);
        setReply(() => data?.error ?? "Something went wrong. Please try again.");
        return;
      }

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

  async function clearChat() {
    if (sending || messages.length === 0) return;
    if (!window.confirm("Clear this conversation? This can't be undone.")) return;

    const response = await fetch("/api/ai-chat", { method: "DELETE", credentials: "include" }).catch(
      () => null,
    );

    if (response?.ok) setMessages([]);
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
        <svg className={styles.icChat} width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M4 5h16v11H8l-4 4V5Z" />
          <path d="M9 10.5h6M9 13h3" />
        </svg>
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
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
              <path d="M12 3.5c2.8 3.8 7 8.9 7 12.5a7 7 0 1 1-14 0c0-3.6 4.2-8.7 7-12.5Z" />
            </svg>
            <span className={styles.headStatus} aria-hidden />
          </div>

          <div className={styles.headText}>
            <div className={styles.headTitle}>BloodBridge Assistant</div>
            <div className={styles.headSub}>Usually answers in a few seconds</div>
          </div>

          <div className={styles.headActions}>
            {messages.length > 0 && (
              <button
                type="button"
                className={styles.headBtn}
                onClick={clearChat}
                disabled={sending}
                aria-label="Clear conversation"
                title="Clear conversation"
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
            <div className={styles.msgs} ref={msgsRef}>
              {!historyLoaded ? (
                <div className={styles.typing} aria-label="Loading">
                  <span />
                  <span />
                  <span />
                </div>
              ) : messages.length === 0 ? (
                <div className={styles.intro}>
                  <p className={styles.introTitle}>Hello {user.firstName}</p>
                  <p className={styles.introBody}>
                    Ask about eligibility, appointments, donation centres or rewards. General guidance
                    only — your health institute answers medical questions.
                  </p>
                </div>
              ) : (
                messages.map((message) =>
                  message.role === "ASSISTANT" && !message.content ? null : (
                    <div
                      key={message.id}
                      className={`${styles.msg} ${message.role === "USER" ? styles.msgUser : styles.msgBot}`}
                    >
                      {message.role === "ASSISTANT" ? <ReplyText text={message.content} /> : message.content}
                    </div>
                  ),
                )
              )}

              {awaitingFirstToken && (
                <div className={styles.typing} aria-label="The assistant is typing">
                  <span />
                  <span />
                  <span />
                </div>
              )}
            </div>

            {showSuggestions && (
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
