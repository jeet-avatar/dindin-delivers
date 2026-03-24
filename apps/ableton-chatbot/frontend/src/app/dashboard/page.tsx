"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getUser, getToken, clearAuth, apiFetch, API_URL } from "@/lib/auth";
import type { User } from "@/lib/auth";
import Link from "next/link";
import { WaveformIcon, LogoutIcon, CreditCardIcon } from "@/components/Icons";
import BridgeSetup from "@/components/BridgeSetup";

interface ToolCall {
  tool: string;
  input: Record<string, unknown>;
  result: Record<string, unknown>;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [bridgeConnected, setBridgeConnected] = useState(false);
  const [showTools, setShowTools] = useState<string | null>(null);
  const [trialBanner, setTrialBanner] = useState(false);
  const [hasUsedBefore, setHasUsedBefore] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const u = getUser();
    if (!u || !getToken()) {
      router.replace("/login");
      return;
    }
    setUser(u);
    if (u.subscription_status !== "active" && u.trial_ends_at) {
      setTrialBanner(true);
    }
    // Check if returning user (has used bridge before)
    const bridgeUsed = localStorage.getItem("beatmind_bridge_used");
    if (bridgeUsed) setHasUsedBefore(true);
  }, [router]);

  // Poll bridge/health
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(`${API_URL}/api/health`);
        const data = await res.json();
        const connected = data.bridges_connected > 0;
        setBridgeConnected(connected);
        if (connected) {
          localStorage.setItem("beatmind_bridge_used", "true");
          setHasUsedBefore(true);
        }
      } catch {
        setBridgeConnected(false);
      }
    };
    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    try {
      const res = await apiFetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ message: text, session_id: sessionId }),
      });
      if (res.status === 402) {
        const checkoutRes = await apiFetch("/api/stripe/checkout", {
          method: "POST",
          body: JSON.stringify({ email: user?.email }),
        });
        const checkout = await checkoutRes.json();
        if (checkout.url) window.location.href = checkout.url;
        return;
      }
      if (res.status === 401) {
        clearAuth();
        router.replace("/login");
        return;
      }
      const data = await res.json();
      setSessionId(data.session_id);
      setBridgeConnected(data.bridge_connected);
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: data.response,
        toolCalls: data.tool_calls,
      }]);
    } catch (err) {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, sessionId, user, router]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleLogout = () => {
    clearAuth();
    router.push("/");
  };

  const openBillingPortal = async () => {
    if (!user) return;
    const res = await apiFetch("/api/stripe/portal", {
      method: "POST",
      body: JSON.stringify({ email: user.email }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  };

  const PROMPTS = [
    "Make me an Afro House track at 122 BPM",
    "Create a dark melodic techno loop in Am",
    "Build a deep house groove with warm bass",
    "Get the current session state",
  ];

  // Determine if we show the full onboarding wizard or the chat
  const showOnboarding = !bridgeConnected && !hasUsedBefore && messages.length === 0;

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto">
      {/* Trial banner */}
      {trialBanner && (
        <div role="alert" className="text-xs text-center px-4 py-2 flex items-center justify-center gap-3"
          style={{ background: "#1a1000", color: "#fbbf24", borderBottom: "1px solid #3d2800" }}>
          <span>Trial active &mdash; {user?.trial_ends_at
            ? (() => {
                const days = Math.max(0, Math.ceil((new Date(user.trial_ends_at).getTime() - Date.now()) / 86400000));
                return days === 0 ? "expires today" : `${days} day${days !== 1 ? "s" : ""} remaining`;
              })()
            : "7 days"} free. </span>
          <button onClick={openBillingPortal} className="underline font-semibold transition-opacity duration-150 hover:opacity-80">Subscribe now</button>
          <button onClick={() => setTrialBanner(false)} className="opacity-50 hover:opacity-100 transition-opacity duration-150" aria-label="Dismiss trial banner">
            &times;
          </button>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
        <Link href="/" className="flex items-center gap-2 font-bold text-lg" aria-label="BeatMind home">
          <span className="w-7 h-7 rounded flex items-center justify-center text-xs font-black" style={{ background: "var(--accent)", color: "#fff" }} aria-hidden="true">B</span>
          beatmind
        </Link>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5" role="status" aria-live="polite" aria-label={bridgeConnected ? "Ableton connected" : "Bridge offline"}>
            <div className="w-2 h-2 rounded-full" style={{ background: bridgeConnected ? "#22c55e" : "#ef4444" }} aria-hidden="true" />
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {bridgeConnected ? "Ableton connected" : "Bridge offline"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs hidden md:block" style={{ color: "var(--text-secondary)" }}>{user?.name}</span>
            <button
              onClick={openBillingPortal}
              aria-label="Open billing portal"
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-opacity duration-150 hover:opacity-80"
              style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
              <CreditCardIcon size={14} />
              <span className="hidden sm:inline">Billing</span>
            </button>
            <button
              onClick={handleLogout}
              aria-label="Sign out"
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-opacity duration-150 hover:opacity-80"
              style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
              <LogoutIcon size={14} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Bridge setup: full onboarding (new user) or compact reconnect (returning user) */}
      {showOnboarding ? (
        <BridgeSetup bridgeConnected={bridgeConnected} />
      ) : (
        <>
          {/* Returning user: compact bridge reconnect prompt */}
          {!bridgeConnected && hasUsedBefore && (
            <BridgeSetup bridgeConnected={bridgeConnected} isReturningUser />
          )}

          {/* Messages */}
          <main className="flex-1 overflow-y-auto px-6 py-4 space-y-4" aria-label="Conversation" aria-live="polite">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "var(--bg-secondary)", color: "var(--accent)" }}>
                  <WaveformIcon size={28} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold mb-1">What do you want to create?</h2>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    Describe your track and I&apos;ll build it in Ableton Live
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full">
                  {PROMPTS.map((p) => (
                    <button key={p} onClick={() => { setInput(p); inputRef.current?.focus(); }}
                      className="text-left text-sm p-3 rounded-xl border transition-colors duration-150 hover:border-[var(--accent)]"
                      style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-secondary)" }}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[80%] rounded-2xl px-4 py-3"
                  style={{ background: msg.role === "user" ? "var(--accent)" : "var(--bg-secondary)", color: msg.role === "user" ? "#fff" : "var(--text-primary)" }}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <div className="mt-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                      <button
                        onClick={() => setShowTools(showTools === `${i}` ? null : `${i}`)}
                        aria-expanded={showTools === `${i}`}
                        aria-controls={`tools-${i}`}
                        className="text-xs flex items-center gap-1"
                        style={{ color: msg.role === "user" ? "rgba(255,255,255,0.7)" : "var(--accent)" }}>
                        {msg.toolCalls.length} Ableton action{msg.toolCalls.length > 1 ? "s" : ""}
                        <span className="text-[10px]" aria-hidden="true">{showTools === `${i}` ? "\u25b2" : "\u25bc"}</span>
                      </button>
                      {showTools === `${i}` && (
                        <div id={`tools-${i}`} className="mt-2 space-y-1">
                          {msg.toolCalls.map((tc, j) => (
                            <div key={j} className="text-xs font-mono p-2 rounded" style={{ background: "var(--bg-primary)" }}>
                              <span style={{ color: "var(--accent)" }}>{tc.tool}</span>
                              <span style={{ color: "var(--text-secondary)" }}>({JSON.stringify(tc.input).slice(0, 80)})</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start" aria-label="BeatMind is thinking" role="status">
                <div className="rounded-2xl px-4 py-3" style={{ background: "var(--bg-secondary)" }}>
                  <div className="flex gap-1.5" aria-hidden="true">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="w-2 h-2 rounded-full typing-dot" style={{ background: "var(--accent)" }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </main>

          {/* Input */}
          <div className="px-6 py-4 border-t" style={{ borderColor: "var(--border)" }}>
            <div className="flex gap-3 items-end">
              <label htmlFor="chat-input" className="sr-only">Message BeatMind</label>
              <textarea
                id="chat-input"
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe what you want to create..."
                rows={1}
                className="flex-1 resize-none rounded-xl px-4 py-3 text-sm outline-none"
                style={{ background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
                onInput={(e) => {
                  const t = e.target as HTMLTextAreaElement;
                  t.style.height = "auto";
                  t.style.height = Math.min(t.scrollHeight, 120) + "px";
                }}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                aria-label="Send message"
                className="px-4 py-3 rounded-xl text-sm font-medium transition-opacity duration-150 disabled:opacity-30"
                style={{ background: "var(--accent)", color: "#fff" }}>
                Send
              </button>
            </div>
            <p className="text-xs mt-2 text-center" style={{ color: "var(--text-secondary)" }}>
              Press Enter to send &middot; Shift+Enter for new line
            </p>
          </div>
        </>
      )}
    </div>
  );
}
