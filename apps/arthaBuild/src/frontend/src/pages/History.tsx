import React from "react";
import ChatLayout from "../components/ChatLayout";
import { useChat } from "../hooks/useChat";
import { Link, useNavigate } from "react-router-dom";
import { History as HistoryIcon } from "lucide-react";
import { encodeId } from "../lib/crypto";
import { EmptyState } from "../components/EmptyState";

function HistoryInner() {
  const { chats, isLoading } = useChat();
  const navigate = useNavigate();

  return (
    <main className="flex-1 p-6 overflow-y-auto">
      <h2 className="text-xl font-semibold mb-4">Chat History</h2>

      {isLoading && (
        <div className="text-slate-400 text-sm py-8 text-center">
          Loading history...
        </div>
      )}

      {!isLoading && chats.length === 0 && (
        <EmptyState
          icon={<HistoryIcon className="h-10 w-10 mx-auto opacity-30" />}
          message="No history yet"
          subtext="Your past conversations will appear here"
          ctaLabel="Start a new chat"
          onCta={() => navigate("/chat/new")}
        />
      )}

      {!isLoading && chats.length > 0 && (
        <div className="grid gap-3">
          {chats.map((c) => (
            <Link
              key={c.id}
              to={`/chat/${encodeId(c.id)}`}
              className="p-3 rounded bg-slate-900 hover:bg-slate-800 flex items-center gap-2 transition-colors"
            >
              <HistoryIcon className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <div>
                <div className="font-medium">{c.title}</div>
                <div className="text-xs text-slate-400">
                  {c.messages.length} messages
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

export default function HistoryPage() {
  return (
    <ChatLayout>
      <HistoryInner />
    </ChatLayout>
  );
}
