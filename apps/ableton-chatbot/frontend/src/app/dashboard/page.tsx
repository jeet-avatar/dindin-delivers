"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getUser, getToken, clearAuth, apiFetch, API_URL } from "@/lib/auth";
import type { User } from "@/lib/auth";
import Link from "next/link";
import ProductionLog, { type ProductionAction } from "@/components/ProductionLog";
import FailedAudition from "@/components/FailedAudition";
import ReviewMessage from "@/components/ReviewMessage";
import Recordings, { useRecordings, type Recording } from "@/components/Recordings";
import ChatTimestamp from "@/components/ChatTimestamp";
import { messageRecordingIds } from "@/lib/chat-recordings";
import NewSongDialog from "@/components/NewSongDialog";
import References from "@/components/References";
import ChatComparisons from "@/components/ChatComparisons";
import BridgeLaunch from "@/components/BridgeLaunch";
import { useBridgeStatus } from "@/lib/use-bridge-status";
import { bridgeStatusLabel } from "@/lib/bridge-status";
import { restoreChatIndex, unmatchedServerChats, type ChatEntry } from "@/lib/chat-index";
import { acceptedSound, type MusicChoice } from "@/lib/music-workflow";

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
interface Message {
  id?: string;
  createdAt?: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ProductionAction[];
  choices?: MusicChoice[];
  event?: "sound-accepted";
  requestStatus?: import("@/lib/production-status").RequestStatus;
}
type Nav = "home" | "beatmind" | "mixmind" | "downloads" | "account" | "recordings" | "references";
interface SavedChat {
  messages: Message[]; sessionId: string | null; input: string;
  running?: boolean; runningId?: string;
  project?: SongProject | null; referenceId?: string | null;
}
interface SongProject {
  title: string; starting_point: "reference" | "idea" | null;
  live_set: { title: string; choice: string } | null;
}

function writeChat(userId: number, id: string, snapshot: SavedChat): ChatEntry[] {
  const prefix = `beatmind_chats_v2_${userId}`;
  const index = JSON.parse(localStorage.getItem(prefix) || '{"chats":[]}');
  const title = snapshot.project?.title || snapshot.messages.find(m => m.role === "user")?.content.slice(0, 70) || "New song";
  const restored = restoreChatIndex(index.chats, chatId => localStorage.getItem(`${prefix}_${chatId}`));
  if (!snapshot.sessionId && !snapshot.messages.length && !snapshot.input.trim() && !snapshot.project) return restored;
  const chats: ChatEntry[] = [...restored.filter(c => c.id !== id), { id, title, sessionId: snapshot.sessionId }];
  // Save the conversation before changing the active pointer; failed storage must not erase it.
  localStorage.setItem(`${prefix}_${id}`, JSON.stringify(snapshot));
  localStorage.setItem(`beatmind_chat_v1_${userId}`, JSON.stringify(snapshot));
  localStorage.setItem(prefix, JSON.stringify({ activeId: id, chats }));
  return chats;
}

function restoredMessages(saved: SavedChat): Message[] {
  return (saved.messages || []).filter(m => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string")
    .map(m => saved.running && m.id === saved.runningId ? {
      ...m, requestStatus: "interrupted", content: "Connection was interrupted before completion was saved. Some actions may have run. Inspect the action log and Ableton before repeating the command.",
      toolCalls: m.toolCalls?.map(a => a.result ? a : { ...a, result: { status: "unverified", summary: "No completion was saved. Inspect before retrying." } }),
    } : m);
}

const NAV: { id: Nav; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { id: "home",      label: "Home",      Icon: HomeIcon },
  { id: "beatmind",  label: "BeatMind",  Icon: WaveIcon },
  { id: "mixmind",   label: "MixMind",   Icon: DJIcon },
  { id: "recordings", label: "Recordings", Icon: DJIcon },
  { id: "references", label: "References", Icon: WaveIcon },
  { id: "downloads", label: "Downloads", Icon: DownloadIcon },
  { id: "account",   label: "Account",   Icon: UserIcon },
];

const PROMPTS = [
  { text: "Make me an Afro House track at 122 BPM", newSong: true },
  { text: "Create a dark melodic techno loop in Am", newSong: true },
  { text: "Build a deep house groove with warm bass", newSong: true },
  { text: "Get the current session state", newSong: false },
];

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [nav, setNav] = useState<Nav>("beatmind");
  const [messages, setMessages] = useState<Message[]>([]);
  const [songSetup, setSongSetup] = useState<string | null>(null);
  const [project, setProject] = useState<SongProject | null>(null);
  const [referenceId, setReferenceId] = useState<string | null>(null);
  const [projectBusy, setProjectBusy] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [chatId, setChatId] = useState("");
  const [chats, setChats] = useState<ChatEntry[]>([]);
  const [serverChats, setServerChats] = useState<ChatEntry[]>([]);
  const [authStatus, setAuthStatus] = useState("Checking sign-in");
  const explicitRecordingIds = messageRecordingIds(messages);
  const recordings = useRecordings(explicitRecordingIds.flat());
  const recordingIdsByMessage = messageRecordingIds(messages, recordings.items);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const remoteChats = unmatchedServerChats(chats, serverChats, sessionId);
  const { status: bridgeStatus, refresh: refreshBridge } = useBridgeStatus(user?.id);
  const bridgeConnected = bridgeStatus === "connected";
  const [historyReady, setHistoryReady] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const requestRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const u = getUser();
    if (!u || !getToken()) { router.replace("/login"); return; }
    setUser(u);
    let active = true;
    apiFetch("/api/auth/me").then(async response => {
      if (!active) return;
      if (response.status === 401) { clearAuth(); router.replace("/login"); return; }
      if (!response.ok) throw new Error("Sign-in check unavailable");
      const verified = await response.json();
      if (verified.id !== u.id) { clearAuth(); router.replace("/login"); return; }
      if (active) { setUser(verified); setAuthStatus("Signed in"); }
    }).catch(() => { if (active) setAuthStatus("Sign-in check unavailable"); });
    try {
      const prefix = `beatmind_chats_v2_${u.id}`;
      const index = JSON.parse(localStorage.getItem(prefix) || "null");
      const id = index?.activeId || crypto.randomUUID();
      setChatId(id);
      setChats(restoreChatIndex(index?.chats || [], chatId => localStorage.getItem(`${prefix}_${chatId}`)));
      const raw = localStorage.getItem(`${prefix}_${id}`) || localStorage.getItem(`beatmind_chat_v1_${u.id}`);
      if (raw) {
        const saved = JSON.parse(raw);
        if (Array.isArray(saved.messages)) setMessages(restoredMessages(saved));
        if (typeof saved.sessionId === "string") setSessionId(saved.sessionId);
        if (typeof saved.input === "string") setInput(saved.input);
        setProject(saved.project || null); setReferenceId(saved.referenceId || null);
      }
    } catch { setHistoryError("Saved chat could not be restored. Existing Ableton work is unchanged."); }
    setHistoryReady(true);
    return () => { active = false; };
  }, [router]);

  useEffect(() => {
    if (!historyReady || !user || !chatId) return;
    try {
      // Recordings retain full command evidence; keep browser history within storage limits.
      const savedMessages = messages.slice(-50).map(m => ({ ...m,
        toolCalls: m.toolCalls?.map(a => ({ ...a, result: a.result ? { ...a.result, steps: undefined } : undefined })),
      }));
      const snapshot = { messages: savedMessages, sessionId, input, project, referenceId, running: loading,
        runningId: loading ? messages.at(-1)?.id : undefined };
      let encoded = JSON.stringify(snapshot);
      while (encoded.length > 2000000 && snapshot.messages.length > 2) {
        snapshot.messages.splice(0, 2);
        encoded = JSON.stringify(snapshot);
      }
      const savedChats = writeChat(user.id, chatId, JSON.parse(encoded));
      // Draft saves must not trigger another render of an unchanged chat list.
      setChats(previous => previous.length === savedChats.length && previous.every((chat, index) =>
        chat.id === savedChats[index].id && chat.title === savedChats[index].title && chat.sessionId === savedChats[index].sessionId
      ) ? previous : savedChats);
    } catch { setHistoryError("Chat history could not be saved in this browser. Keep this tab open until the request finishes."); }
  }, [historyReady, user, messages, sessionId, input, loading, chatId, project, referenceId]);

  useEffect(() => {
    if (!user?.id || loading) return;
    const controller = new AbortController();
    void apiFetch("/api/chats", { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("Server chat history is unavailable. Browser history is unchanged.");
      const data = await response.json();
      if (!controller.signal.aborted) setServerChats(data.chats || []);
    }).catch(e => { if (!controller.signal.aborted) setHistoryError(e instanceof Error ? e.message : "Server history unavailable."); });
    return () => controller.abort();
  }, [user?.id, loading]);

  const openServerChat = async (id: string) => {
    if (!user || !historyReady || loading || requestRef.current) return;
    setHistoryReady(false);
    try {
      writeChat(user.id, chatId, { messages, sessionId, input, project, referenceId, running: false });
      const response = await apiFetch(`/api/chats/${encodeURIComponent(id)}`);
      if (!response.ok) throw new Error("Saved conversation could not be loaded. Your current chat is unchanged.");
      const data = await response.json();
      const saved: SavedChat = { messages: data.messages, sessionId: data.sessionId, input: "", project: data.project, referenceId: data.referenceId };
      const localId = `server-${id}`;
      setChats(writeChat(user.id, localId, saved));
      document.querySelectorAll("audio").forEach(audio => audio.pause());
      setChatId(localId); setMessages(restoredMessages(saved)); setSessionId(saved.sessionId); setInput("");
      setProject(saved.project || null); setReferenceId(saved.referenceId || null); setNav("beatmind"); setHistoryOpen(false);
      setHistoryError("");
    } catch (e) { setHistoryError(e instanceof Error ? e.message : "Saved conversation unavailable."); }
    finally { setHistoryReady(true); }
  };

  const openChat = (targetId?: string) => {
    if (!user || !historyReady || loading || requestRef.current) return;
    try {
      writeChat(user.id, chatId, { messages, sessionId, input, project, referenceId, running: false });
      const id = targetId || crypto.randomUUID();
      const raw = targetId ? localStorage.getItem(`beatmind_chats_v2_${user.id}_${id}`) : null;
      if (targetId && !raw) throw new Error("Saved conversation is unavailable.");
      const saved: SavedChat = raw ? JSON.parse(raw) : { messages: [], sessionId: null, input: "" };
      const next = { ...saved, messages: restoredMessages(saved), running: false };
      setChats(writeChat(user.id, id, next));
      document.querySelectorAll("audio").forEach(audio => audio.pause());
      setChatId(id); setMessages(next.messages); setSessionId(next.sessionId); setInput(next.input);
      setProject(next.project || null); setReferenceId(next.referenceId || null); setHistoryOpen(false);
      setHistoryError(""); setNav("beatmind");
      inputRef.current?.focus();
      return true;
    } catch { setHistoryError("Could not save or open the conversation. Your current chat is still open."); }
    return false;
  };

  const createProject = useCallback(async (fresh = false) => {
    if (!user) throw new Error("Sign in before starting a song.");
    if (!fresh && sessionId) return sessionId;
    writeChat(user.id, chatId, { messages, sessionId, input, project, referenceId, running: false });
    const response = await apiFetch("/api/chats", { method: "POST" });
    if (!response.ok) throw new Error("Your new song could not be saved. The current song is unchanged.");
    const data = await response.json();
    const id = `server-${data.sessionId}`;
    const snapshot: SavedChat = { messages: [], sessionId: data.sessionId, input: "", project: data.project, referenceId: null };
    setChats(writeChat(user.id, id, snapshot));
    document.querySelectorAll("audio").forEach(audio => audio.pause());
    setChatId(id); setSessionId(data.sessionId); setMessages([]); setInput("");
    setProject(data.project); setReferenceId(null); setHistoryError(""); setHistoryOpen(false); setNav("beatmind");
    return data.sessionId as string;
  }, [user, sessionId, chatId, messages, input, project, referenceId]);

  async function newSong(prompt?: string) {
    if (projectBusy || loading || !historyReady) return;
    setProjectBusy(true);
    try { await createProject(true); if (prompt) setInput(prompt); }
    catch (error) { setHistoryError(error instanceof Error ? error.message : "Could not start a new song."); }
    finally { setProjectBusy(false); }
  }

  async function updateProject(change: { title?: string; starting_point?: "reference" | "idea"; reference_id?: string | null }) {
    const id = await createProject();
    const response = await apiFetch(`/api/chats/${id}/project`, { method: "PATCH", body: JSON.stringify(change) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Could not save the song choice.");
    setProject(data.project); setReferenceId(data.referenceId || null);
    return id;
  }

  async function chooseStart(starting_point: "reference" | "idea") {
    if (projectBusy || loading) return;
    setProjectBusy(true);
    try {
      const id = await updateProject({ starting_point });
      if (starting_point === "reference") setNav("references");
      else await sendMessage("I'd like to start from my own idea, without a reference.", id, null, true);
    } catch (error) { setHistoryError(error instanceof Error ? error.message : "Could not save your choice."); }
    finally { setProjectBusy(false); }
  }

  useEffect(() => () => requestRef.current?.abort(), []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [messages.length]);

  const sendMessage = useCallback(async (messageOverride?: string, continuationSession?: string, selectedReference?: string | null, planningOnly = false) => {
    const text = (messageOverride ?? input).trim();
    if (!text || !historyReady || loading || requestRef.current) return;
    const runId = crypto.randomUUID();
    const controller = new AbortController();
    requestRef.current = controller;
    const createdAt = new Date().toISOString();
    setLoading(true);
    try {
      const activeSession = continuationSession ?? sessionId ?? await createProject();
      setMessages(p => [...p, { role: "user", content: text, createdAt }, { id: runId, role: "assistant", createdAt, requestStatus: "running", content: "Planning the next steps...", toolCalls: [] }]);
      setInput("");
      const res = await apiFetch("/api/chat/stream", {
        method: "POST",
        body: JSON.stringify({ message: text, session_id: activeSession, reference_id: selectedReference, planning_only: planningOnly }),
        signal: controller.signal,
      });
      if (res.status === 402) {
        const { url } = await (await apiFetch("/api/stripe/checkout", { method: "POST", body: JSON.stringify({}) })).json();
        if (url) window.location.href = url;
        throw new Error("A subscription is required to continue.");
      }
      if (res.status === 401) { clearAuth(); router.replace("/login"); return; }
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(typeof error.detail === "string" ? error.detail : `Request failed (${res.status})`);
      }
      if (!res.body) throw new Error("Production stream unavailable.");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let completed = false;
      let narration = "";
      const consume = (line: string) => {
        if (!line.trim()) return;
        const event = JSON.parse(line);
        if (event.type === "session") {
          setSessionId(event.session_id);
          if ("project" in event) setProject(event.project);
          if ("referenceId" in event) setReferenceId(event.referenceId);
          refreshBridge();
        } else if (event.type === "narration") {
          narration += `${narration ? "\n\n" : ""}${event.text}`;
          setMessages(p => p.map(m => m.id === runId ? { ...m, content: narration } : m));
        } else if (event.type === "action_started" || event.type === "action_completed") {
          const action = event.action as ProductionAction;
          setMessages(p => p.map(m => {
            if (m.id !== runId) return m;
            const actions = [...(m.toolCalls || [])];
            const index = actions.findIndex(a => a.id === action.id);
            const now = new Date().toISOString();
            const timed = { ...actions[index], ...action,
              ...(event.type === "action_started" ? { startedReceivedAt: now } : { completedReceivedAt: now }) };
            if (index < 0) actions.push(timed); else actions[index] = timed;
            return { ...m, toolCalls: actions };
          }));
        } else if (event.type === "complete") {
          completed = true;
          setMessages(p => p.map(m => m.id === runId ? { ...m, requestStatus: "complete", content: event.response,
            toolCalls: event.tool_calls.map((action: ProductionAction) => ({ ...m.toolCalls?.find(a => a.id === action.id), ...action })) } : m));
        } else if (event.type === "error") {
          throw new Error(event.message);
        }
      };
      try {
        while (true) {
          const { value, done } = await reader.read();
          buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          lines.forEach(consume);
          if (done) { consume(buffer); break; }
        }
        if (!completed) throw new Error("Connection ended before completion. Review the action log before retrying.");
      } finally {
        await reader.cancel().catch(() => {});
        reader.releaseLock();
      }
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : "Request failed.");
      setMessages(p => p.map(m => {
        if (m.id !== runId) return m;
        const inspectionOnly = !!m.toolCalls?.length && m.toolCalls.every(a => a.result?.status === "observed");
        const stopped = inspectionOnly
          ? "Request stopped. Only inspections are recorded in the action log; no completed music changes are shown."
          : "Request stopped. Any actions already sent may remain in Ableton; inspect the log before continuing.";
        return { ...m, requestStatus: "interrupted", content: controller.signal.aborted ? stopped : `Production interrupted: ${err instanceof Error ? err.message : "Unknown error"}`,
          toolCalls: m.toolCalls?.map(a => a.result ? a : { ...a, result: { status: "unverified", summary: "Interrupted before confirmation. Inspect Ableton before repeating this action." } }) };
      }));
    } finally { requestRef.current = null; setLoading(false); }
  }, [input, historyReady, loading, sessionId, router, refreshBridge, createProject]);

  const openBilling = async () => {
    if (!user) return;
    const { url } = await (await apiFetch("/api/stripe/portal", { method: "POST", body: JSON.stringify({ email: user.email }) })).json();
    if (url) window.location.href = url;
  };

  const logout = () => { clearAuth(); router.push("/"); };

  const reviewRecording = (item: Recording, decision: string) => {
    if (decision === "accepted") {
      const id = `accepted-${item.id}`;
      setMessages(previous => previous.some(message => message.id === id) ? previous : [...previous, {
        id, role: "assistant", event: "sound-accepted", createdAt: new Date().toISOString(), ...acceptedSound(item.track_name),
      }]);
    }
    if (decision === "revise") {
      setInput(`Change the sound on ${item.track_name}: `);
      inputRef.current?.focus();
    }
  };

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
          </div>
          <p className="text-xs mb-5 flex-1" style={{ color: "var(--text-secondary)", lineHeight: "1.65" }}>
            Develop music one part at a time in Ableton Live, with supported instrument controls and captured auditions to review.
          </p>
          <div className="mb-3"><BridgeLaunch status={bridgeStatus} onRetry={refreshBridge} /></div>
          <div className="flex gap-2">
            <button onClick={() => setNav("beatmind")}
              className="flex-1 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: "var(--accent)", color: "#0a0a0a" }}>
              {bridgeConnected ? "Let's make music" : "Open chat"}
            </button>
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
            <button key={p.text} disabled={projectBusy || loading || !historyReady} onClick={() => {
              if (p.newSong) void newSong(p.text);
              else { setInput(p.text); setNav("beatmind"); }
            }}
              className="text-left text-sm p-3 rounded-xl border transition-colors hover:border-blue-500"
              style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-secondary)" }}>
              {p.text}
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
      <div className="mx-3 sm:mx-6 mt-4 shrink-0"><BridgeLaunch status={bridgeStatus} onRetry={refreshBridge} /></div>

      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-4" aria-live="polite">
        {historyError && <p role="alert" className="text-xs text-amber-300">{historyError}</p>}
        {(messages.length === 0 || (project && !project.starting_point)) && (
          <div className="flex flex-col items-center justify-center py-8 gap-6 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "var(--bg-secondary)", color: "var(--accent)" }}>
              <WaveIcon size={28} />
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-1">How would you like to start?</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full">
              <button type="button" disabled={loading || projectBusy || !historyReady} onClick={() => void chooseStart("reference")} className="rounded border p-3 text-sm disabled:opacity-40"
                style={{ borderColor: "var(--border)" }}>Upload a reference track</button>
              <button type="button" disabled={loading || projectBusy || !historyReady} onClick={() => void chooseStart("idea")}
                className="rounded border p-3 text-sm disabled:opacity-40" style={{ borderColor: "var(--border)" }}>Start from an idea</button>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} ref={i === messages.map(m => m.role).lastIndexOf("user") ? messagesEndRef : undefined}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className="min-w-0 max-w-full sm:max-w-[90%] rounded-lg px-4 py-3"
              style={{ background: msg.role === "user" ? "var(--accent)" : "var(--bg-secondary)", color: msg.role === "user" ? "#fff" : "var(--text-primary)" }}>
              <div className="mb-2"><ChatTimestamp value={msg.createdAt} label={msg.role === "user" ? "Sent" : msg.event === "sound-accepted" ? "Decision saved" : "Request started"} /></div>
              {msg.role === "user" ? <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p> : <>
                {!!msg.toolCalls?.length && <ProductionLog actions={msg.toolCalls} requestStatus={msg.requestStatus} />}
                {!!msg.toolCalls?.length && <FailedAudition actions={msg.toolCalls} busy={loading} onInspect={prompt => {
                  setInput(prompt); inputRef.current?.focus();
                }} />}
                <ReviewMessage text={msg.content} actions={msg.toolCalls || []} ids={recordingIdsByMessage[i]} recordings={recordings.items} />
                {i === messages.length - 1 && !!msg.choices?.length && <div className="mt-3 flex flex-wrap gap-2">
                  {msg.choices.map(choice => <button key={choice.label} type="button" disabled={loading || !historyReady}
                    onClick={() => void sendMessage(choice.message, undefined, undefined, true)}
                    className="rounded border px-3 py-2 text-sm disabled:opacity-40" style={{ borderColor: "var(--border)" }}>{choice.label}</button>)}
                </div>}
                <ChatComparisons actions={msg.toolCalls || []} />
                <Recordings items={recordings.items.filter(item => recordingIdsByMessage[i].includes(item.id))}
                  missing={recordingIdsByMessage[i].some(id => !recordings.items.some(item => item.id === id))}
                  initialIds={recordings.initialIds} onDecision={reviewRecording}
                  supersededIds={new Set(recordings.items.flatMap(item => item.supersedes ? [item.supersedes] : []))}
                  onPreview={actions => setMessages(previous => [...previous, { id: crypto.randomUUID(), role: "assistant", createdAt: new Date().toISOString(),
                    content: "Track fader adjusted. Fresh audio recorded from the verified sample.", toolCalls: actions }])} />
              </>}
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
        {recordings.error && <p role="alert" className="text-xs text-red-300">{recordings.error}</p>}
      </div>

      <div className="px-3 sm:px-6 py-4 border-t flex-shrink-0" style={{ borderColor: "var(--border)" }}>
        <div className="flex gap-3 items-end">
          <label htmlFor="chat-input" className="sr-only">Message BeatMind</label>
          <textarea
            id="chat-input" ref={inputRef} value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Message BeatMind..."
            rows={1}
            className="flex-1 min-w-0 resize-none rounded-lg px-4 py-3 text-sm outline-none"
            style={{ background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
            onInput={e => {
              const t = e.target as HTMLTextAreaElement;
              t.style.height = "auto";
              t.style.height = Math.min(t.scrollHeight, 120) + "px";
            }}
          />
          {loading && (
            <button type="button" onClick={() => requestRef.current?.abort()}
              aria-label="Stop production" title="Stop production"
              className="w-12 h-12 flex-shrink-0 rounded-lg border flex items-center justify-center"
              style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}>
              <span className="block w-4 h-4 bg-current" aria-hidden="true" />
            </button>
          )}
          <button type="button" onClick={() => sendMessage()} disabled={loading || !input.trim()}
            aria-label="Send"
            title="Send"
            className="px-4 py-3 rounded-xl transition-opacity disabled:opacity-30 flex items-center justify-center"
            style={{ background: "var(--accent)", color: "#fff" }}>
            <SendIcon />
          </button>
        </div>
        <p className="text-xs mt-2 text-center" style={{ color: "var(--text-secondary)" }}>
          {bridgeStatusLabel[bridgeStatus]}
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
              <p className="text-xs mt-1" style={{ color: "#6b7280" }}>SmartScreen? Click More info → Run anyway</p>
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

      <section aria-label="BeatMind Bridge" className="mb-6 border-b pb-5" style={{ borderColor: "var(--border)" }}>
        <h3 className="font-semibold text-sm">BeatMind Bridge</h3>
        <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>macOS 15+ · Apple Silicon · Notarized</p>
        <BridgeLaunch status={bridgeStatus} onRetry={refreshBridge} />
        {bridgeConnected && <button onClick={() => setNav("beatmind")} className="mt-2 rounded px-4 py-2 text-sm font-semibold" style={{ background: "var(--accent)", color: "#0a0a0a" }}>Let&apos;s make music</button>}
      </section>
      <div className="space-y-4">
        {[
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
            sub: "Windows 10+ · x64 installer · If SmartScreen appears, click 'More info → Run anyway'",
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
    <div className="flex h-dvh overflow-hidden" style={{ background: "var(--bg-primary)" }}>
      {songSetup !== null && sessionId && <NewSongDialog sessionId={sessionId} onCancel={() => setSongSetup(null)}
        onReady={updated => { setProject(updated); setSongSetup(null); }} />}

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className="flex flex-col w-14 sm:w-60 flex-shrink-0 border-r" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>

        {/* Logo */}
        <div className="px-3 sm:px-5 pt-5 pb-4 border-b" style={{ borderColor: "var(--border)" }}>
          <Link href="/" aria-label="Beatmind home" className="flex items-center gap-2 font-bold text-base">
            <span className="w-7 h-7 rounded flex items-center justify-center text-xs font-black" style={{ background: "var(--accent)", color: "#fff" }}>B</span>
            <span className="hidden sm:inline">beatmind</span>
          </Link>
        </div>

        {/* Nav items */}
        <nav className="shrink-0 px-1 sm:px-3 py-4 space-y-0.5" aria-label="Main navigation">
          {NAV.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setNav(id)} title={label} aria-label={label}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left"
              style={{
                background: nav === id ? "var(--bg-primary)" : "transparent",
                color: nav === id ? "var(--text-primary)" : "var(--text-secondary)",
              }}
              aria-current={nav === id ? "page" : undefined}>
              <Icon size={16} />
              <span className="hidden sm:inline">{label}</span>
              {id === "beatmind" && bridgeConnected && (
                <span className="hidden sm:block ml-auto w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#22c55e" }} aria-label="Connected" />
              )}
            </button>
          ))}
        </nav>

        <section aria-label="Saved songs" className={`${historyOpen ? "fixed inset-y-0 left-14 right-0 z-40 shadow-xl" : "hidden"} sm:static sm:flex sm:shadow-none flex-col min-h-0 flex-1 border-t p-3 overflow-y-auto`}
          style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold">Saved songs</h2>
            <button className="sm:hidden text-sm p-2" onClick={() => setHistoryOpen(false)}>Close</button>
          </div>
          <div className="space-y-1">
            {[...chats].reverse().map(chat => <button key={chat.id} type="button" disabled={!historyReady || loading || projectBusy}
              aria-label={`Open saved song: ${chat.title}`}
              onClick={() => chat.sessionId && (chat.id.startsWith("server-") || serverChats.some(item => item.id === chat.sessionId)) ? void openServerChat(chat.sessionId) : openChat(chat.id)}
              aria-current={chat.id === chatId ? "true" : undefined}
              className="block w-full border-l-2 px-3 py-2 text-left text-sm break-words disabled:opacity-40"
              style={{ borderColor: chat.id === chatId ? "#34d399" : "transparent", background: chat.id === chatId ? "var(--bg-primary)" : "transparent" }}>{chat.title}</button>)}
            {remoteChats.map(chat => <button key={`remote:${chat.id}`} type="button" disabled={!historyReady || loading || projectBusy}
              aria-label={`Open saved song: ${chat.title}`}
              onClick={() => void openServerChat(chat.id)} className="block w-full border-l-2 border-transparent px-3 py-2 text-left text-sm break-words disabled:opacity-40">{chat.title}</button>)}
          </div>
        </section>

        {/* Subscription status pill */}
        <div className="hidden sm:block px-3 pb-5">
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
        <header className="flex flex-wrap items-center justify-between gap-3 px-3 sm:px-6 py-3 border-b flex-shrink-0"
          style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}>
          <h1 className="text-sm font-semibold">
            {NAV.find(n => n.id === nav)?.label}
          </h1>
          <button type="button" onClick={() => setNav("account")} title="Open your account"
            aria-label={`Your account: ${user?.email || "Checking sign-in"}`}
            className="flex items-center gap-2 min-w-0 max-w-full text-left">
            <span className="shrink-0"><UserIcon size={20} /></span>
            <span className="min-w-0 text-xs">
              <span className="block font-medium break-all">{user?.email}</span>
              <span className="block" style={{ color: authStatus === "Signed in" ? "#86efac" : "var(--text-secondary)" }}>{authStatus}{user?.name ? ` / ${user.name}` : ""}</span>
            </span>
          </button>
        </header>
        {nav === "beatmind" && <div className="flex flex-wrap items-center gap-2 px-3 sm:px-6 py-3 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
          <button type="button" className="sm:hidden h-10 px-2 text-sm" onClick={() => setHistoryOpen(true)}>Saved songs</button>
          {project ? <input key={`${chatId}-${project.title}`} aria-label="Song name" defaultValue={project.title} maxLength={70}
            disabled={!historyReady || loading || projectBusy} onBlur={async event => {
              const title = event.target.value.trim();
              if (!title || title === project.title) return;
              setProjectBusy(true);
              try { await updateProject({ title }); } catch (error) { setHistoryError(error instanceof Error ? error.message : "Name could not be saved."); }
              finally { setProjectBusy(false); }
            }} className="order-first basis-full sm:order-none sm:basis-auto min-w-0 flex-1 w-32 h-10 bg-transparent border-b px-1 text-sm" style={{ borderColor: "var(--border)" }} /> :
            <p className="min-w-0 flex-1 text-sm break-words">{chats.find(chat => chat.id === chatId)?.title || "New song"}</p>}
          <button type="button" onClick={() => void newSong()} disabled={!historyReady || loading || projectBusy}
            className="h-10 px-3 shrink-0 rounded text-sm font-medium disabled:opacity-40"
            style={{ background: "var(--accent)", color: "white" }}>New song</button>
          {project && <div className="w-full flex flex-wrap items-center gap-3 text-xs">
            <span style={{ color: "var(--text-secondary)" }}>{project.live_set ? `Selected set: ${project.live_set.title}` : "Planning / No Live Set selected"}</span>
            <button disabled={loading || projectBusy || !bridgeConnected} onClick={() => setSongSetup("")} className="underline disabled:opacity-40">Choose Live Set</button>
            {project.starting_point === "reference" && <button onClick={() => setNav("references")} className="underline">Reference review</button>}
          </div>}
        </div>}

        {/* Content area */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {nav === "home"      && renderHome()}
          {nav === "beatmind"  && renderBeatMind()}
          {nav === "mixmind"   && renderMixMind()}
          {nav === "downloads" && renderDownloads()}
          {nav === "references" && <References key={chatId} selectedId={referenceId} guided={Boolean(project)}
            onSelect={async id => {
              if (!project) { setReferenceId(id); return; }
              setProjectBusy(true);
              try { await updateProject({ reference_id: id }); }
              finally { setProjectBusy(false); }
            }} chatBusy={loading || projectBusy || !historyReady} onUse={(id, template) => {
            setReferenceId(id);
            setNav("beatmind");
            void sendMessage(template
              ? "Let's choose the first sound for my reference-inspired track."
              : "Let's talk about what I like in this reference and what I'd change.", undefined, id, true);
          }} />}
          {nav === "recordings" && <section className="p-4 sm:p-6 min-w-0">
            <h2 className="text-lg font-semibold">Saved recordings</h2>
            {recordings.error && <p role="alert" className="text-sm text-red-300">{recordings.error}</p>}
            {!recordings.items.length && <p className="text-sm mt-3">No recordings available.</p>}
            <Recordings items={recordings.items} title="Recording history" allowReview={false}
              initialIds={new Set(recordings.items.map(item => item.id))} onDecision={() => {}} />
          </section>}
          {nav === "account"   && renderAccount()}
        </div>
      </div>
    </div>
  );
}
