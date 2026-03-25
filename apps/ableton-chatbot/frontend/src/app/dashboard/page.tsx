"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getUser, getToken, clearAuth, apiFetch, API_URL } from "@/lib/auth";
import type { User } from "@/lib/auth";
import Link from "next/link";

// ─── Inline icons (avoids prop-type conflicts with existing Icons.tsx) ────────
function HomeIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function WaveIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
function DJIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
    </svg>
  );
}
function DownloadIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
function UserIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function SignOutIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
function SendIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}
function CheckIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function AlertIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
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
type Nav = "home" | "beatmind" | "mixmind" | "downloads" | "account";

const NAV: { id: Nav; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { id: "home",      label: "Home",      Icon: HomeIcon },
  { id: "beatmind",  label: "BeatMind",  Icon: WaveIcon },
  { id: "mixmind",   label: "MixMind",   Icon: DJIcon },
  { id: "downloads", label: "Downloads", Icon: DownloadIcon },
  { id: "account",   label: "Account",   Icon: UserIcon },
];

const PROMPTS = [
  "Make me an Afro House track at 122 BPM",
  "Create a dark melodic techno loop in Am",
  "Build a deep house groove with warm bass",
  "Get the current session state",
];

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [nav, setNav] = useState<Nav>("home");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [bridgeConnected, setBridgeConnected] = useState(false);
  const [showTools, setShowTools] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const u = getUser();
    if (!u || !getToken()) { router.replace("/login"); return; }
    setUser(u);
  }, [router]);

  useEffect(() => {
    const check = async () => {
      try {
        const data = await (await fetch(`${API_URL}/api/health`)).json();
        setBridgeConnected(data.bridges_connected > 0);
      } catch { setBridgeConnected(false); }
    };
    check();
    const iv = setInterval(check, 5000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setMessages(p => [...p, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    try {
      const res = await apiFetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ message: text, session_id: sessionId }),
      });
      if (res.status === 402) {
        const { url } = await (await apiFetch("/api/stripe/checkout", { method: "POST", body: JSON.stringify({}) })).json();
        if (url) window.location.href = url;
        return;
      }
      if (res.status === 401) { clearAuth(); router.replace("/login"); return; }
      const data = await res.json();
      setSessionId(data.session_id);
      setBridgeConnected(data.bridge_connected);
      setMessages(p => [...p, { role: "assistant", content: data.response, toolCalls: data.tool_calls }]);
    } catch (err) {
      setMessages(p => [...p, { role: "assistant", content: `Error: ${err instanceof Error ? err.message : "Unknown"}` }]);
    } finally { setLoading(false); }
  }, [input, loading, sessionId, router]);

  const openBilling = async () => {
    if (!user) return;
    const { url } = await (await apiFetch("/api/stripe/portal", { method: "POST", body: JSON.stringify({ email: user.email }) })).json();
    if (url) window.location.href = url;
  };

  const logout = () => { clearAuth(); router.push("/"); };

  // Derived subscription state
  const isSubscribed = user?.subscribed || user?.subscription_status === "active";
  const trialDays = user?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(user.trial_ends_at).getTime() - Date.now()) / 86400000))
    : null;
  const trialActive = !isSubscribed && trialDays !== null && trialDays > 0;

  // ──────────────────────────────────────────────────────────────────────────
  // HOME
  // ──────────────────────────────────────────────────────────────────────────
  const renderHome = () => (
    <div className="p-8 max-w-4xl w-full">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">
          Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {isSubscribed
            ? "Pro plan · Full access to BeatMind + MixMind"
            : trialActive
              ? `Free trial · ${trialDays} day${trialDays !== 1 ? "s" : ""} remaining`
              : "Your trial has ended — subscribe to continue"}
        </p>
      </div>

      {/* Subscription CTA banner */}
      {!isSubscribed && (
        <div className="mb-8 rounded-2xl p-5 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          style={{ background: "linear-gradient(135deg,#0d1f3c 0%,#1a1000 100%)", borderColor: "#1e3a5f" }}>
          <div>
            <p className="font-semibold text-sm mb-1" style={{ color: "#93c5fd" }}>
              {trialActive ? `🎵 ${trialDays} day${trialDays !== 1 ? "s" : ""} left on your free trial` : "⚠️ Trial ended — subscribe to keep access"}
            </p>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              $19/mo · Unlimited BeatMind + MixMind · Cancel any time
            </p>
          </div>
          <button onClick={openBilling}
            className="flex-shrink-0 px-6 py-2.5 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90"
            style={{ background: "var(--accent)", color: "#fff" }}>
            Subscribe now →
          </button>
        </div>
      )}

      {/* Product cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        {/* BeatMind */}
        <div className="rounded-2xl border p-6 flex flex-col" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--accent)" }}>
              <WaveIcon size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">BeatMind</h3>
                <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: "#0d2035", color: "#60a5fa" }}>AI</span>
              </div>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Music producer for Ableton Live</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <div className="w-2 h-2 rounded-full" style={{ background: bridgeConnected ? "#22c55e" : "#ef4444" }} />
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                {bridgeConnected ? "Live" : "Offline"}
              </span>
            </div>
          </div>
          <p className="text-xs mb-5 flex-1" style={{ color: "var(--text-secondary)", lineHeight: "1.65" }}>
            Describe music in plain English. BeatMind generates full tracks, controls BPM and instruments, and executes commands directly in Ableton Live.
          </p>
          <div className="flex gap-2">
            <button onClick={() => setNav("beatmind")}
              className="flex-1 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: "var(--accent)", color: "#fff" }}>
              Open chat →
            </button>
            <a href="/BeatMind-Bridge.dmg" download
              className="px-3 py-2 rounded-xl text-xs border flex items-center gap-1.5 transition-opacity hover:opacity-70"
              style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
              <DownloadIcon size={13} />
              Bridge
            </a>
          </div>
        </div>

        {/* MixMind */}
        <div className="rounded-2xl border p-6 flex flex-col" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#7c3aed" }}>
              <DJIcon size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">MixMind</h3>
                <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: "#1e0a3c", color: "#a78bfa" }}>Desktop</span>
              </div>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>DJ library manager</p>
            </div>
          </div>
          <p className="text-xs mb-5 flex-1" style={{ color: "var(--text-secondary)", lineHeight: "1.65" }}>
            AI-powered DJ library organizer with smart playlists, duplicate finder, BPM/key analysis, and Rekordbox + USB export.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <a href="/MixMind-mac.dmg" download
              className="py-2 rounded-xl text-sm font-semibold text-center flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90"
              style={{ background: "#7c3aed", color: "#fff" }}>
              <DownloadIcon size={13} />
              Mac
            </a>
            <a href="/MixMind-Setup-win.exe" download
              className="py-2 rounded-xl text-sm font-semibold text-center flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90"
              style={{ background: "#5b21b6", color: "#fff" }}>
              <DownloadIcon size={13} />
              Windows
            </a>
          </div>
        </div>
      </div>

      {/* Quick prompts */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-secondary)" }}>
          Jump right in
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PROMPTS.map(p => (
            <button key={p} onClick={() => { setInput(p); setNav("beatmind"); }}
              className="text-left text-sm p-3 rounded-xl border transition-colors hover:border-blue-500"
              style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-secondary)" }}>
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // ──────────────────────────────────────────────────────────────────────────
  // BEATMIND CHAT
  // ──────────────────────────────────────────────────────────────────────────
  const renderBeatMind = () => (
    <div className="flex flex-col flex-1 h-full overflow-hidden">
      {/* Bridge offline banner */}
      {!bridgeConnected && (
        <div className="mx-6 mt-4 flex-shrink-0 rounded-xl border p-3 flex items-center justify-between gap-3"
          style={{ background: "#1a1000", borderColor: "#3d2800" }}>
          <div className="flex items-center gap-2 min-w-0">
            <span style={{ color: "#f59e0b", flexShrink: 0 }}><AlertIcon size={14} /></span>
            <p className="text-xs truncate" style={{ color: "#fbbf24" }}>
              Ableton not connected — open Ableton Live and launch BeatMind Bridge
            </p>
          </div>
          <a href="/BeatMind-Bridge.dmg" download
            className="flex-shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-90"
            style={{ background: "var(--accent)", color: "#fff" }}>
            <DownloadIcon size={12} />
            Download Bridge
          </a>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4" aria-live="polite">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "var(--bg-secondary)", color: "var(--accent)" }}>
              <WaveIcon size={28} />
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-1">What do you want to create?</h2>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Describe your track and I&apos;ll build it in Ableton Live
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full">
              {PROMPTS.map(p => (
                <button key={p} onClick={() => { setInput(p); inputRef.current?.focus(); }}
                  className="text-left text-sm p-3 rounded-xl border transition-colors hover:border-blue-500"
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
                <div className="mt-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.12)" }}>
                  <button onClick={() => setShowTools(showTools === `${i}` ? null : `${i}`)}
                    className="text-xs flex items-center gap-1"
                    style={{ color: msg.role === "user" ? "rgba(255,255,255,0.7)" : "var(--accent)" }}>
                    {msg.toolCalls.length} Ableton action{msg.toolCalls.length > 1 ? "s" : ""}
                    <span className="text-[10px]">{showTools === `${i}` ? "▲" : "▼"}</span>
                  </button>
                  {showTools === `${i}` && (
                    <div className="mt-2 space-y-1">
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
          <div className="flex justify-start" role="status" aria-label="Thinking">
            <div className="rounded-2xl px-4 py-3" style={{ background: "var(--bg-secondary)" }}>
              <div className="flex gap-1.5" aria-hidden="true">
                {[0, 1, 2].map(i => <div key={i} className="w-2 h-2 rounded-full typing-dot" style={{ background: "var(--accent)" }} />)}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="px-6 py-4 border-t flex-shrink-0" style={{ borderColor: "var(--border)" }}>
        <div className="flex gap-3 items-end">
          <label htmlFor="chat-input" className="sr-only">Message BeatMind</label>
          <textarea
            id="chat-input" ref={inputRef} value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Describe what you want to create..."
            rows={1}
            className="flex-1 resize-none rounded-xl px-4 py-3 text-sm outline-none"
            style={{ background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
            onInput={e => {
              const t = e.target as HTMLTextAreaElement;
              t.style.height = "auto";
              t.style.height = Math.min(t.scrollHeight, 120) + "px";
            }}
          />
          <button onClick={sendMessage} disabled={loading || !input.trim()}
            aria-label="Send"
            className="px-4 py-3 rounded-xl transition-opacity disabled:opacity-30 flex items-center justify-center"
            style={{ background: "var(--accent)", color: "#fff" }}>
            <SendIcon />
          </button>
        </div>
        <p className="text-xs mt-2 text-center" style={{ color: "var(--text-secondary)" }}>
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );

  // ──────────────────────────────────────────────────────────────────────────
  // MIXMIND
  // ──────────────────────────────────────────────────────────────────────────
  const renderMixMind = () => (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "#7c3aed" }}>
          <DJIcon size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold">MixMind</h2>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>DJ library manager for Rekordbox</p>
        </div>
      </div>

      <div className="rounded-2xl border p-6 mb-5" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
        <p className="text-sm mb-5" style={{ color: "var(--text-secondary)", lineHeight: "1.7" }}>
          MixMind is a native desktop app — download it for your platform and run it alongside your DJ software. No browser required.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <a href="/MixMind-mac.dmg" download
            className="flex flex-col items-center gap-3 p-5 rounded-xl border text-center transition-all hover:border-purple-500"
            style={{ borderColor: "var(--border)", background: "var(--bg-primary)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#7c3aed" }}>
              <DownloadIcon size={18} />
            </div>
            <div>
              <p className="font-semibold text-sm">Mac</p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>macOS 12+ · Universal</p>
            </div>
          </a>
          <a href="/MixMind-Setup-win.exe" download
            className="flex flex-col items-center gap-3 p-5 rounded-xl border text-center transition-all hover:border-purple-500"
            style={{ borderColor: "var(--border)", background: "var(--bg-primary)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#5b21b6" }}>
              <DownloadIcon size={18} />
            </div>
            <div>
              <p className="font-semibold text-sm">Windows</p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Windows 10+ · x64</p>
            </div>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {["Smart AI playlists from your vibe", "Duplicate track detection", "BPM + key analysis", "Rekordbox + USB export"].map(f => (
          <div key={f} className="rounded-xl border p-3 flex items-start gap-2" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
            <span className="flex-shrink-0 mt-0.5" style={{ color: "#4ade80" }}><CheckIcon size={13} /></span>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{f}</p>
          </div>
        ))}
      </div>
    </div>
  );

  // ──────────────────────────────────────────────────────────────────────────
  // DOWNLOADS
  // ──────────────────────────────────────────────────────────────────────────
  const renderDownloads = () => (
    <div className="p-8 max-w-2xl">
      <h2 className="text-xl font-bold mb-1">Downloads</h2>
      <p className="text-sm mb-7" style={{ color: "var(--text-secondary)" }}>All apps included with your subscription.</p>

      <div className="space-y-4">
        {[
          {
            name: "BeatMind Bridge",
            sub: "macOS · 17 MB · Signed app",
            desc: "Connects BeatMind AI to your live Ableton session. Open DMG, drag to Applications, log in.",
            href: "/BeatMind-Bridge.dmg",
            bg: "var(--accent)",
            icon: <WaveIcon size={20} />,
          },
          {
            name: "MixMind for Mac",
            sub: "macOS 12+ · Apple Silicon + Intel",
            desc: "AI DJ library manager. Smart playlists, duplicate finder, Rekordbox export.",
            href: "/MixMind-mac.dmg",
            bg: "#7c3aed",
            icon: <DJIcon size={20} />,
          },
          {
            name: "MixMind for Windows",
            sub: "Windows 10+ · x64 installer",
            desc: "Full feature parity with Mac. Installer includes all required dependencies.",
            href: "/MixMind-Setup-win.exe",
            bg: "#5b21b6",
            icon: <DJIcon size={20} />,
          },
        ].map(app => (
          <div key={app.name} className="rounded-2xl border p-5" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between gap-4 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: app.bg }}>
                  {app.icon}
                </div>
                <div>
                  <p className="font-semibold text-sm">{app.name}</p>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{app.sub}</p>
                </div>
              </div>
              <a href={app.href} download
                className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ background: app.bg, color: "#fff" }}>
                <DownloadIcon size={14} />
                Download
              </a>
            </div>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{app.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );

  // ──────────────────────────────────────────────────────────────────────────
  // ACCOUNT
  // ──────────────────────────────────────────────────────────────────────────
  const renderAccount = () => (
    <div className="p-8 max-w-lg">
      <h2 className="text-xl font-bold mb-6">Account</h2>

      <div className="rounded-2xl border p-5 mb-4" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-secondary)" }}>Profile</p>
        <p className="font-semibold">{user?.name}</p>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>{user?.email}</p>
      </div>

      <div className="rounded-2xl border p-5 mb-4" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-secondary)" }}>Subscription</p>
        {isSubscribed ? (
          <>
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold"
                style={{ background: "#052e16", color: "#4ade80" }}>
                <CheckIcon size={11} />
                Active — Pro
              </span>
              <span className="text-sm" style={{ color: "var(--text-secondary)" }}>$19 / month</span>
            </div>
            <button onClick={openBilling}
              className="text-xs px-4 py-2 rounded-lg border transition-opacity hover:opacity-70"
              style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
              Manage billing →
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
                style={{ background: "#1a1000", color: "#fbbf24" }}>
                {trialActive ? `Free trial · ${trialDays}d left` : "Trial ended"}
              </span>
            </div>
            <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
              {trialActive
                ? `Your trial ends in ${trialDays} day${trialDays !== 1 ? "s" : ""}. Subscribe to keep full access.`
                : "Subscribe to continue using BeatMind and MixMind."}
            </p>
            <button onClick={openBilling}
              className="px-6 py-2.5 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90"
              style={{ background: "var(--accent)", color: "#fff" }}>
              Subscribe · $19 / month
            </button>
          </>
        )}
      </div>

      <div className="rounded-2xl border p-5 mb-6" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-secondary)" }}>Plan includes</p>
        <ul className="space-y-2.5">
          {["BeatMind AI — unlimited prompts", "BeatMind Bridge for Ableton Live", "MixMind for Mac + Windows", "AI playlist generation", "Priority email support"].map(f => (
            <li key={f} className="flex items-center gap-2.5 text-sm">
              <span style={{ color: "#4ade80" }}><CheckIcon size={14} /></span>
              {f}
            </li>
          ))}
        </ul>
      </div>

      <button onClick={logout}
        className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border transition-opacity hover:opacity-70"
        style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
        <SignOutIcon />
        Sign out
      </button>
    </div>
  );

  // ──────────────────────────────────────────────────────────────────────────
  // LAYOUT
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-primary)" }}>

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className="flex flex-col w-52 flex-shrink-0 border-r" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>

        {/* Logo */}
        <div className="px-5 pt-5 pb-4 border-b" style={{ borderColor: "var(--border)" }}>
          <Link href="/" className="flex items-center gap-2 font-bold text-base">
            <span className="w-7 h-7 rounded flex items-center justify-center text-xs font-black" style={{ background: "var(--accent)", color: "#fff" }}>B</span>
            beatmind
          </Link>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-0.5" aria-label="Main navigation">
          {NAV.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setNav(id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left"
              style={{
                background: nav === id ? "var(--bg-primary)" : "transparent",
                color: nav === id ? "var(--text-primary)" : "var(--text-secondary)",
              }}
              aria-current={nav === id ? "page" : undefined}>
              <Icon size={16} />
              {label}
              {id === "beatmind" && bridgeConnected && (
                <span className="ml-auto w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#22c55e" }} aria-label="Connected" />
              )}
            </button>
          ))}
        </nav>

        {/* Subscription status pill */}
        <div className="px-3 pb-5">
          {isSubscribed ? (
            <div className="rounded-xl p-3 border" style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}>
              <p className="text-xs font-semibold mb-0.5" style={{ color: "#4ade80" }}>✓ Pro Plan</p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Full access · Both apps</p>
            </div>
          ) : (
            <button onClick={openBilling}
              className="w-full rounded-xl p-3 text-left transition-opacity hover:opacity-90"
              style={{ background: "linear-gradient(135deg,#1d4ed8,#7c3aed)" }}>
              <p className="text-xs font-bold text-white mb-0.5">
                {trialActive ? `${trialDays}d trial left` : "Trial ended"}
              </p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.65)" }}>
                Tap to subscribe →
              </p>
            </button>
          )}
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-3.5 border-b flex-shrink-0"
          style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}>
          <h1 className="text-sm font-semibold">
            {NAV.find(n => n.id === nav)?.label}
          </h1>
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{user?.name}</span>
        </header>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {nav === "home"      && renderHome()}
          {nav === "beatmind"  && renderBeatMind()}
          {nav === "mixmind"   && renderMixMind()}
          {nav === "downloads" && renderDownloads()}
          {nav === "account"   && renderAccount()}
        </div>
      </div>
    </div>
  );
}
