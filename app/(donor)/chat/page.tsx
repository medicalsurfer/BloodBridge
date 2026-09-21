"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, Plus, X } from "lucide-react";
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

type Institute = {
  id: string;
  name: string;
  city: string;
};

type ConversationResponse = {
  id: string;
  healthInstitute: { name: string; city: string };
  lastMessage: { body: string; createdAt: string; senderId: string } | null;
  unreadCount: number;
};

export default function ChatPage() {
  const [conversations, setConversations] = useState<ChatSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [institutes, setInstitutes] = useState<Institute[]>([]);

  const loadConversations = useCallback(async () => {
    try {
      const response = await fetch("/api/conversations", { credentials: "include", cache: "no-store" });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error ?? "Unable to load conversations.");

      setConversations(
        (data.conversations ?? []).map((conversation: ConversationResponse) => ({
          id: conversation.id,
          title: conversation.healthInstitute.name,
          subtitle: conversation.healthInstitute.city,
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
      .then((data) => setCurrentUserId(data?.user?.id ?? null))
      .catch(() => setCurrentUserId(null));

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

  function openNewChat() {
    setShowNewChat(true);

    if (institutes.length === 0) {
      // Only centres with staff who can answer (see /api/institutes).
      fetch("/api/institutes?withStaff=1", { credentials: "include", cache: "no-store" })
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => setInstitutes(data?.institutes ?? []))
        .catch(() => {});
    }
  }

  async function startConversation(healthInstituteId: string) {
    const response = await fetch("/api/conversations", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ healthInstituteId }),
    });
    const data = await response.json();

    if (response.ok) {
      setShowNewChat(false);
      setActiveId(data.conversation.id);
      void loadConversations();
    } else {
      setError(data.error ?? "Unable to start conversation.");
    }
  }

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

  const active = conversations.find((conversation) => conversation.id === activeId) ?? null;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-[30px] leading-tight font-semibold tracking-[-0.02em] text-slate-950">
            Messages
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
            Ask your donation centre about appointments, eligibility or your donations.
          </p>
        </div>

        <button
          type="button"
          onClick={openNewChat}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-red-950 px-5 text-[13px] font-semibold text-white transition hover:brightness-125"
        >
          <Plus size={15} />
          New conversation
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {showNewChat && (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13.5px] font-semibold text-slate-900">Choose a donation centre</p>

            <button
              type="button"
              onClick={() => setShowNewChat(false)}
              aria-label="Close centre picker"
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={16} />
            </button>
          </div>

          {institutes.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-slate-300 px-5 py-6 text-center text-xs leading-5 text-slate-500">
              No donation centre has staff on BloodBridge yet, so there is nobody to reply. Please
              contact your centre directly for now.
            </p>
          ) : (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {institutes.map((institute) => (
                <button
                  key={institute.id}
                  type="button"
                  onClick={() => startConversation(institute.id)}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition hover:border-red-200 hover:bg-red-50"
                >
                  <Building2 size={16} className="shrink-0 text-red-800" aria-hidden />
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] font-semibold text-slate-900">
                      {institute.name}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-slate-500">
                      {institute.city}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
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
            emptyMessage="No conversations yet. Start one with “New conversation”."
            hiddenOnMobile={Boolean(active)}
          />

          {!active ? (
            <NoThreadSelected
              title="No conversation open"
              body="Pick a centre on the left to read its messages and reply."
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
                emptyTitle={`Start a conversation with ${active.title}`}
                emptyBody="Staff at the centre will see your message and reply here."
              />

              <Composer value={draft} onChange={setDraft} onSend={sendMessage} sending={sending} />
            </div>
          )}
        </ChatFrame>
      </div>
    </div>
  );
}
