"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, Building2, Plus, X } from "lucide-react";

type Institute = {
  id: string;
  name: string;
  city: string;
};

type ConversationSummary = {
  id: string;
  healthInstitute: { name: string; city: string };
  lastMessage: { body: string; createdAt: string } | null;
  unreadCount: number;
};

type Message = {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
};

export default function ChatPage() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadConversations = () => {
    fetch("/api/conversations", { credentials: "include", cache: "no-store" })
      .then((response) => response.json().then((data) => ({ response, data })))
      .then(({ response, data }) => {
        if (!response.ok) throw new Error(data.error ?? "Unable to load conversations.");
        setConversations(data.conversations ?? []);
        if (!activeId && data.conversations?.length) {
          setActiveId(data.conversations[0].id);
        }
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load conversations."))
      .finally(() => setLoadingConversations(false));
  };

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setCurrentUserId(data?.user?.id ?? null))
      .catch(() => setCurrentUserId(null));

    loadConversations();
    const interval = setInterval(loadConversations, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeId) return;

    setLoadingMessages(true);
    fetch(`/api/conversations/${activeId}/messages`, { credentials: "include", cache: "no-store" })
      .then((response) => response.json().then((data) => ({ response, data })))
      .then(({ response, data }) => {
        if (!response.ok) throw new Error(data.error ?? "Unable to load messages.");
        setMessages(data.messages ?? []);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load messages."))
      .finally(() => setLoadingMessages(false));

    const interval = setInterval(() => {
      fetch(`/api/conversations/${activeId}/messages`, { credentials: "include", cache: "no-store" })
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => data && setMessages(data.messages ?? []))
        .catch(() => {});
    }, 5000);

    return () => clearInterval(interval);
  }, [activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const openNewChat = () => {
    setShowNewChat(true);
    if (institutes.length === 0) {
      fetch("/api/institutes", { credentials: "include", cache: "no-store" })
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => setInstitutes(data?.institutes ?? []))
        .catch(() => {});
    }
  };

  const startConversation = async (healthInstituteId: string) => {
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
      loadConversations();
    } else {
      setError(data.error ?? "Unable to start conversation.");
    }
  };

  const sendMessage = async () => {
    if (!activeId || !draft.trim()) return;

    setSending(true);
    const body = draft.trim();
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
      loadConversations();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Unable to send message.");
    } finally {
      setSending(false);
    }
  };

  const activeConversation = conversations.find((conversation) => conversation.id === activeId);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-red-700">
              Chat
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Message your donation centre
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Ask questions about appointments, eligibility or your donations directly.
            </p>
          </div>

          <button
            type="button"
            onClick={openNewChat}
            className="flex h-10 items-center gap-2 rounded-xl bg-red-950 px-4 text-xs font-semibold text-white transition hover:brightness-125"
          >
            <Plus size={15} />
            New conversation
          </button>
        </div>

        {error && <p className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

        {showNewChat && (
          <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-900">Start a conversation with...</p>
              <button type="button" onClick={() => setShowNewChat(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {institutes.map((institute) => (
                <button
                  key={institute.id}
                  type="button"
                  onClick={() => startConversation(institute.id)}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-left text-sm transition hover:border-red-200 hover:bg-red-50/40"
                >
                  <Building2 size={16} className="text-red-800" />
                  <span>
                    {institute.name}
                    <span className="block text-xs text-slate-400">{institute.city}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <section className="grid overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm md:grid-cols-[280px_1fr]">
          <div className="border-b border-slate-100 md:border-b-0 md:border-r">
            <div className="max-h-100 overflow-y-auto md:max-h-160">
              {loadingConversations ? (
                <p className="p-5 text-sm text-slate-500">Loading conversations...</p>
              ) : conversations.length === 0 ? (
                <p className="p-5 text-sm text-slate-500">No conversations yet. Start one above.</p>
              ) : (
                conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => setActiveId(conversation.id)}
                    className={`flex w-full items-start gap-3 border-b border-slate-50 p-4 text-left transition hover:bg-slate-50 ${
                      activeId === conversation.id ? "bg-red-50/50" : ""
                    }`}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-950 text-white">
                      <Building2 size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-slate-900">
                        {conversation.healthInstitute.name}
                      </p>
                      <p className="mt-1 truncate text-xs text-slate-400">
                        {conversation.lastMessage?.body ?? "No messages yet"}
                      </p>
                    </div>
                    {conversation.unreadCount > 0 && (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                        {conversation.unreadCount}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="flex min-h-100 flex-col md:min-h-160">
            {!activeConversation ? (
              <div className="flex flex-1 items-center justify-center p-8 text-center">
                <div>
                  <MessageCircle className="mx-auto text-slate-300" size={32} />
                  <p className="mt-3 text-sm font-medium text-slate-500">
                    Select a conversation to view messages.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="border-b border-slate-100 p-4">
                  <p className="text-sm font-bold text-slate-900">
                    {activeConversation.healthInstitute.name}
                  </p>
                  <p className="text-xs text-slate-400">{activeConversation.healthInstitute.city}</p>
                </div>

                <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
                  {loadingMessages ? (
                    <p className="text-sm text-slate-500">Loading messages...</p>
                  ) : messages.length === 0 ? (
                    <p className="text-sm text-slate-400">Say hello to get started.</p>
                  ) : (
                    messages.map((message) => {
                      const isMine = message.senderId === currentUserId;
                      return (
                        <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-75 rounded-2xl px-4 py-2.5 text-sm leading-5 ${
                              isMine
                                ? "bg-red-950 text-white"
                                : "bg-slate-100 text-slate-800"
                            }`}
                          >
                            {message.body}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="flex items-center gap-2 border-t border-slate-100 p-4">
                  <input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Type a message..."
                    className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-red-300 focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={sending || !draft.trim()}
                    onClick={sendMessage}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-950 text-white transition hover:brightness-125 disabled:opacity-50"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
