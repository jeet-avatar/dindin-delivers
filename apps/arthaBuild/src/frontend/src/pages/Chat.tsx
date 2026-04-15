import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ChatLayout from "../components/ChatLayout";
import ChatMessage from "../components/ChatMessage";
import ChatHeader from "../components/ChatHeader";
import { LicenseBanner } from "../components/LicenseBanner";
import EmailVerificationBanner from "../components/EmailVerificationBanner";
import NotificationBanner from "../components/NotificationBanner";
import OnboardingWizard from "./OnboardingWizard";
import { useChat } from "../hooks/useChat";
import { useAuth } from "../hooks/useAuth";
import { decodeId, encodeId } from "../lib/crypto";
import { Message } from "../types/message";
import { Send, Loader2, Code2, FileText, Clock, MessageSquare } from "lucide-react";
import { sendChatMessage } from "../services/api";
import { chatService } from "../services/chatService";
import logo from "../assets/logo.png";

// ── Suggestion cards ──────────────────────────────────────────────────────────
const SUGGESTIONS = [
  {
    icon: Code2,
    title: "Write a User Event Script",
    description: "SuiteScript 2.x with beforeSubmit & afterSubmit hooks",
    prompt:
      "Write a NetSuite SuiteScript 2.x user event script with beforeSubmit and afterSubmit entry points that validates a required field before save and sends an email notification after submit.",
  },
  {
    icon: FileText,
    title: "Create a Business Requirement",
    description: "Structured BRD with objectives, scope & acceptance criteria",
    prompt:
      "Create a detailed Business Requirement Document (BRD) for a NetSuite customization. Include objectives, scope, functional requirements, and acceptance criteria in a clear structured format.",
  },
  {
    icon: Clock,
    title: "Build a Scheduled Script",
    description: "Batch processing or data sync with governance handling",
    prompt:
      "Build a NetSuite SuiteScript 2.x scheduled script that processes records in batches using the search module and handles governance limits gracefully with the map/reduce pattern.",
  },
  {
    icon: MessageSquare,
    title: "Chat about your project",
    description: "Ask anything about NetSuite or your workflow",
    prompt: "",
  },
] as const;

// ── Landing screen (Claude.ai-style pre-chat state) ───────────────────────────
interface LandingScreenProps {
  input: string;
  onInputChange: (val: string) => void;
  onSend: (text: string) => void;
  loading: boolean;
}

function LandingScreen({ input, onInputChange, onSend, loading }: LandingScreenProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey && input.trim()) {
      e.preventDefault();
      onSend(input);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8 sm:py-12 bg-[#15181c] overflow-y-auto">
      {/* Logo + product name */}
      <div className="flex items-center gap-3 mb-4 sm:mb-5 mt-8 sm:mt-0">
        <img src={logo} alt="ArthaBuild" className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl shadow-lg" />
        <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight">ArthaBuild</span>
      </div>

      {/* Tagline */}
      <h1 className="text-lg sm:text-xl font-semibold text-white text-center mb-2 max-w-md px-2">
        Your NetSuite AI — from spec to script in seconds.
      </h1>
      <p className="text-slate-500 text-xs sm:text-sm text-center mb-6 sm:mb-10 px-4">
        Powered by local AI. Your data never leaves your server.
      </p>

      {/* Suggestion cards */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full max-w-2xl mb-5 sm:mb-8">
        {SUGGESTIONS.map(({ icon: Icon, title, description, prompt }) => (
          <button
            key={title}
            onClick={() => onSend(prompt || title)}
            disabled={loading}
            className="flex flex-col items-start gap-1.5 sm:gap-2 p-3 sm:p-4 rounded-xl bg-slate-800/60 hover:bg-slate-700/70 border border-slate-700/50 hover:border-indigo-500/40 transition-all duration-150 active:scale-[0.98] text-left disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400 group-hover:text-indigo-300 transition-colors flex-shrink-0" />
            <span className="text-xs sm:text-sm font-semibold text-white leading-snug">{title}</span>
            <span className="hidden sm:block text-xs text-slate-400 leading-relaxed">{description}</span>
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="w-full max-w-2xl px-0">
        {loading && (
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-3">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Setting up your workspace…</span>
          </div>
        )}
        <div className="flex items-center gap-2 sm:gap-3 bg-slate-900 rounded-2xl px-3 sm:px-4 py-3 border border-slate-700/50 focus-within:border-indigo-500/60 transition-colors shadow-lg">
          <input
            className="flex-1 bg-transparent text-white outline-none placeholder-slate-500 text-sm"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about NetSuite…"
            disabled={loading}
            autoFocus
          />
          <button
            onClick={() => input.trim() && onSend(input)}
            disabled={!input.trim() || loading}
            className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Inner component — rendered inside ChatLayout → inside ChatProvider ────────
// Chat() itself cannot call useChat() because ChatProvider lives inside
// ChatLayout (which Chat renders). ChatInner is a child of ChatLayout and
// therefore inside ChatProvider, so useChat() works correctly here.
function ChatInner() {
  const { token } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const { getChat, addMessage, chats, loadMessages, refresh } = useChat();
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [dbSessionId, setDbSessionId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);

  const chatRef = useRef<HTMLDivElement>(null);
  // Guard: suppress the "chat not found → nav /new" check while we're mid-create
  const isCreatingRef = useRef(false);

  const isLanding = token === "new";

  // Load existing chat when URL token changes
  useEffect(() => {
    if (!token || token === "new") {
      setActiveChatId(null);
      setDbSessionId(null);
      return;
    }
    const id = decodeId(token);
    setActiveChatId(id);
    const numId = parseInt(id, 10);
    if (!isNaN(numId)) {
      setDbSessionId(numId);
      loadMessages(id);
    }
  }, [token]);

  // Guard: redirect to /new if the active chat has been deleted
  useEffect(() => {
    if (isCreatingRef.current) return;
    if (activeChatId && chats.length > 0) {
      const found = chats.find((c) => c.id === activeChatId);
      if (!found && !activeChatId.startsWith("temp-")) {
        nav("/chat/new");
      }
    }
  }, [activeChatId, chats]);

  const activeChat = useMemo(
    () => (activeChatId ? getChat(activeChatId) : null),
    [activeChatId, chats]
  );

  useEffect(() => {
    if (activeChat?.id) {
      const numId = parseInt(activeChat.id, 10);
      if (!isNaN(numId)) setDbSessionId(numId);
    }
  }, [activeChat?.id]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (chatRef.current) {
      const el = chatRef.current;
      setTimeout(() => { el.scrollTop = el.scrollHeight; }, 100);
    }
  }, [activeChat?.messages]);

  // Core send logic — shared between landing and regular chat
  const doSend = async (text: string, chatId: string, sessionNum: number) => {
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    addMessage(chatId, userMsg);

    try {
      const result = await sendChatMessage(text, sessionId, sessionNum);
      if (result.session_id) setSessionId(result.session_id);
      addMessage(chatId, {
        id: Date.now().toString(),
        role: "assistant",
        content: result.response,
        createdAt: new Date().toISOString(),
        intent: result.intent,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Request failed";
      addMessage(chatId, {
        id: Date.now().toString(),
        role: "assistant",
        content: `⚠ ${message}`,
        createdAt: new Date().toISOString(),
      });
    }
  };

  // Unified send handler — works from both landing and regular chat
  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;
    setInput("");
    setLoading(true);

    try {
      if (isLanding) {
        // Create a real chat session first, then send
        isCreatingRef.current = true;
        const session = await chatService.create("New Chat");
        const chatId = String(session.id);
        const numId = session.id;

        setActiveChatId(chatId);
        setDbSessionId(numId);
        await refresh(); // sync chat list so addMessage can find the chat

        await doSend(text, chatId, numId);

        // Navigate to real URL — messages are now in DB and local state
        nav(`/chat/${encodeId(chatId)}`, { replace: true });
        isCreatingRef.current = false;
      } else if (activeChatId && dbSessionId != null) {
        await doSend(text, activeChatId, dbSessionId);
      }
    } catch (err) {
      console.error("Send failed:", err);
      isCreatingRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <OnboardingWizard userRole={user?.role} />
      <div className="flex-1 flex flex-col h-full">
        <NotificationBanner />
        <LicenseBanner />
        <EmailVerificationBanner />

        {isLanding ? (
          /* ── Claude.ai-style landing ─────────────────────────────────────── */
          <LandingScreen
            input={input}
            onInputChange={setInput}
            onSend={(t) => handleSend(t)}
            loading={loading}
          />
        ) : (
          /* ── Active chat view ───────────────────────────────────────────── */
          <>
            <ChatHeader />

            <div
              ref={chatRef}
              className="flex-1 overflow-y-auto p-3 sm:p-6 bg-[#15181c]"
              style={{ scrollBehavior: "smooth" }}
            >
              {!activeChat ? (
                <div className="h-full flex items-center justify-center text-slate-500">
                  What&apos;s on the agenda today?
                </div>
              ) : (
                <div className="space-y-4">
                  {activeChat.messages.map((m) => (
                    <ChatMessage key={m.id} m={m} />
                  ))}
                </div>
              )}
            </div>

            <div
              className="flex-shrink-0 px-3 sm:px-6 py-3 sm:py-4 border-t border-slate-800 bg-[#0f1620]"
              style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))' }}
            >
              {loading && (
                <div className="flex justify-start items-center gap-3 mb-3 text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              )}
              <div className="max-w-4xl mx-auto flex items-center gap-2 sm:gap-3">
                <input
                  className="flex-1 rounded-full px-4 py-3 bg-slate-900 text-white outline-none focus:ring-2 focus:ring-indigo-500 text-sm sm:text-base"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || loading}
                  className="p-3 rounded-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ── Shell — provides ChatLayout (and therefore ChatProvider) ──────────────────
export default function Chat() {
  return (
    <ChatLayout>
      <ChatInner />
    </ChatLayout>
  );
}
