"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  ChatFrame,
  Composer,
  ConversationRail,
  MessageStream,
  NoThreadSelected,
  ThreadHeader,
  type ChatMessage,
  type ChatSummary,
} from "@/src/components/chat/ChatUI";

type ConversationResponse = {
  id: string;
  donor: { firstName: string; lastName: string; email: string };
  lastMessage: { body: string; createdAt: string; senderId: string } | null;
  unreadCount: number;
};

function StaffChatContent() {
  const searchParams = useSearchParams();
  const requestedConversationId = searchParams.get("conversationId");

  const [conversations, setConversations] = useState<ChatSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(requestedConversationId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // Medical staff and institute admins share this page but return to
  // different workspaces.
  const [me, setMe] = useState<{ id: string; role: string } | null>(null);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const loadConversations = useCallback(async () => {
    try {
      const response = await fetch("/api/conversations", { credentials: "include", cache: "no-store" });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error ?? "Unable to load conversations.");

      setConversations(
        (data.conversations ?? []).map((conversation: ConversationResponse) => ({
          id: conversation.id,
          title: `${conversation.donor.firstName} ${conversation.donor.lastName}`,
          subtitle: conversation.donor.email,
          lastMessage: conversation.lastMessage,
          unreadCount: conversation.unreadCount,
        })),
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load conversations.");
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setMe(data?.user ? { id: data.user.id, role: data.user.role } : null))
      .catch(() => setMe(null));

    // Kicked off after the effect returns, so the first render is not
    // interrupted by the state it sets.
    const first = setTimeout(() => void loadConversations(), 0);
    const interval = setInterval(() => void loadConversations(), 15000);

    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [loadConversations]);

  useEffect(() => {
    if (!activeId) return;

    let cancelled = false;

    const load = (initial: boolean) => {
      if (initial) setLoadingMessages(true);

      fetch(`/api/conversations/${activeId}/messages`, { credentials: "include", cache: "no-store" })
        .then((response) => response.json().then((data) => ({ response, data })))
        .then(({ response, data }) => {
          if (cancelled) return;
          if (!response.ok) throw new Error(data.error ?? "Unable to load messages.");
          setMessages(data.messages ?? []);
        })
        .catch((loadError) => {
          if (!cancelled && initial) {
            setError(loadError instanceof Error ? loadError.message : "Unable to load messages.");
          }
        })
        .finally(() => {
          if (!cancelled && initial) setLoadingMessages(false);
        });
    };

    load(true);
    const interval = setInterval(() => load(false), 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [activeId]);

  async function sendMessage() {
    if (!activeId || !draft.trim()) return;

    const body = draft.trim();
    setSending(true);
    setDraft("");

    try {
      const response = await fetch(`/api/conversations/${activeId}/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error ?? "Unable to send message.");

      setMessages((current) => [...current, data.message]);
      void loadConversations();
    } catch (sendError) {
      setDraft(body);
      setError(sendError instanceof Error ? sendError.message : "Unable to send message.");
    } finally {
      setSending(false);
    }
  }

  const currentUserId = me?.id ?? null;
  const workspaceHref = me?.role === "MEDICAL_STAFF" ? "/portal/medical-staff" : "/portal/institute-admin";
  const active = conversations.find((conversation) => conversation.id === activeId) ?? null;
  const waiting = conversations.filter((conversation) => conversation.unreadCount > 0).length;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-[30px] leading-tight font-semibold tracking-[-0.02em] text-slate-950">
              Donor messages
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
              {waiting > 0
                ? `${waiting} conversation${waiting === 1 ? "" : "s"} waiting for a reply.`
                : "Answer donor questions about appointments, eligibility and donations."}
            </p>
          </div>

          <Link
            href={workspaceHref}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-[13px] font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
            Back to workspace
          </Link>
        </div>

        {error && (
          <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        )}

        <div className="mt-5">
          <ChatFrame>
            <ConversationRail
              conversations={conversations}
              activeId={activeId}
              onSelect={setActiveId}
              loading={loadingConversations}
              search={search}
              onSearch={setSearch}
              currentUserId={currentUserId}
              emptyMessage="No donor has messaged your institute yet. You can also start one from the donor list."
              hiddenOnMobile={Boolean(active)}
            />

            {!active ? (
              <NoThreadSelected
                title="No conversation open"
                body="Pick a donor on the left to read their messages and reply."
              />
            ) : (
              <div className="flex min-h-0 flex-col">
                <ThreadHeader
                  title={active.title}
                  subtitle={active.subtitle}
                  onBack={() => setActiveId(null)}
                />

                <MessageStream
                  messages={messages}
                  currentUserId={currentUserId}
                  loading={loadingMessages}
                  emptyTitle={`No messages with ${active.title} yet`}
                  emptyBody="Send the first message; the donor sees it in their BloodBridge account."
                />

                <Composer
                  value={draft}
                  onChange={setDraft}
                  onSend={sendMessage}
                  sending={sending}
                  placeholder="Reply to this donor"
                />
              </div>
            )}
          </ChatFrame>
        </div>
      </div>
    </main>
  );
}

export default function StaffChatPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-50" />}>
      <StaffChatContent />
    </Suspense>
  );
}
