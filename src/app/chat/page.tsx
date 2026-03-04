"use client";

import React from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { useAppContext } from "@/lib/app-context";
import { formatDateTimeInPH, getCurrentPHIsoString } from "@/lib/time";

type ChatMessage = {
  id: string;
  sender: string;
  message: string;
  createdAt: string;
};

const CHAT_KEY = "ascend_chat_messages";

export default function ChatPage() {
  const { profile } = useAppContext();
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [text, setText] = React.useState("");

  React.useEffect(() => {
    const raw = localStorage.getItem(CHAT_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as ChatMessage[];
      setMessages(parsed);
    } catch {
      setMessages([]);
    }
  }, []);

  React.useEffect(() => {
    localStorage.setItem(CHAT_KEY, JSON.stringify(messages));
  }, [messages]);

  const sendMessage = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = text.trim();
    if (!value) return;

    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        sender: profile.name,
        message: value,
        createdAt: getCurrentPHIsoString(),
      },
    ]);
    setText("");
  };

  return (
    <DashboardShell
      sectionLabel="Chat"
      title="Team Chat"
      subtitle="Send internal updates and operational notes"
    >
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-950">
        <div className="border-b border-slate-200 p-4 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Messages</h2>
        </div>

        <div className="h-[420px] space-y-3 overflow-auto p-4">
          {messages.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No messages yet.</p>
          ) : (
            messages.map((row) => (
              <article key={row.id} className="rounded-md border border-slate-200 p-3 dark:border-slate-700">
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{row.sender}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formatDateTimeInPH(row.createdAt)}
                  </p>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-200">{row.message}</p>
              </article>
            ))
          )}
        </div>

        <form onSubmit={sendMessage} className="border-t border-slate-200 p-4 dark:border-slate-800">
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-colors duration-200 focus:border-[#253b39] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
            <button
              type="submit"
              className="rounded-md bg-[#253b39] px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#1f3130]"
            >
              Send
            </button>
          </div>
        </form>
      </section>
    </DashboardShell>
  );
}
