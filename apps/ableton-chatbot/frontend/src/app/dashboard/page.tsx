"use client";

import { streamHealth } from "@/lib/stream-health";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getUser, getToken, clearAuth, apiFetch, API_URL } from "@/lib/auth";
import type { User } from "@/lib/auth";
import Link from "next/link";
import ProductionLog, { type ProductionAction } from "@/components/ProductionLog";
import FailedAudition from "@/components/FailedAudition";
import ReviewMessage from "@/components/ReviewMessage";
import Recordings, { useRecordings, type Recording } from "@/components/Recordings";
import ChatTimestamp from "@/components/ChatTimestamp";
import ChatTimeline from "@/components/ChatTimeline";
import { messageRecordingIds } from "@/lib/chat-recordings";
import NewSongDialog from "@/components/NewSongDialog";
import References from "@/components/References";
import ChatComparisons from "@/components/ChatComparisons";
import PlanPicker from "@/components/PlanPicker";
import SubscriptionControls from "@/components/SubscriptionControls";
import BridgeLaunch from "@/components/BridgeLaunch";
import UpdateBanner from "@/components/UpdateBanner";
import { useAbletonLaunch } from "@/lib/use-ableton-launch";
import { useBridgeStatus } from "@/lib/use-bridge-status";
import { bridgeStatusLabel } from "@/lib/bridge-status";
import { STARTER_TEMPLATE_URL } from "@/lib/site";
import { BRIDGE_MAC_DOWNLOAD } from "@/lib/guide";
import { restoreChatIndex, unmatchedServerChats, type ChatEntry } from "@/lib/chat-index";
import { acceptedSound, type MusicChoice } from "@/lib/music-workflow";
import {
  AI_FAIR_USE_LABELS, PLAN_MODEL_ACCESS, MODEL_TIER_LABELS, MIXMIND_AI_LABEL,
  daysLeft, hasMixMindAccess, hasPaidPlan, openBillingPortal, parsePlanIntent, planIntentQuery, planName, useUsage, withoutPlanIntent,
  type ModelTier, type PlanIntent,
} from "@/lib/billing";

// ─── Inline icons (avoids prop-type conflicts with existing Icons.tsx) ────────
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
function DashboardIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}
function MicIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}
function BookmarkIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
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
type Nav = "dashboard" | "beatmind" | "mixmind" | "downloads" | "account" | "recordings" | "references";
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
  localStorage.removeItem(`beatmind_chat_v1_${userId}`);  // legacy duplicate of the active chat
  storeCompact(`${prefix}_${id}`, snapshot);
  localStorage.setItem(prefix, JSON.stringify({ activeId: id, chats }));
  return chats;
}

// Browser storage is a cache of the server's chat history, limited to a few MB per site. Long productions keep
// only their latest messages here, without per-step tool traces; the full chat stays on the server.
function storeCompact(key: string, snapshot: SavedChat) {
  let messages = snapshot.messages.slice(-50).map(m => ({ ...m,
    toolCalls: m.toolCalls?.map(a => ({ ...a, result: a.result ? { ...a.result, steps: undefined } : undefined })),
  }));
  for (;;) {
    const encoded = JSON.stringify({ ...snapshot, messages });
    try {
      if (encoded.length <= 1000000) { localStorage.setItem(key, encoded); return; }
    } catch (error) {
      if (messages.length <= 2) throw error;
    }
    if (messages.length <= 2) throw new Error("This conversation is too large for browser storage.");
    messages = messages.slice(Math.ceil(messages.length / 4));
  }
}

function restoredMessages(saved: SavedChat): Message[] {
  return (saved.messages || []).filter(m => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string")
    .map(m => saved.running && m.id === saved.runningId ? {
      ...m, requestStatus: "interrupted", content: "Connection was interrupted before completion was saved. Some actions may have run. Inspect the action log and Ableton before repeating the command.",
      toolCalls: m.toolCalls?.map(a => a.result ? a : { ...a, result: { status: "unverified", summary: "No completion was saved. Inspect before retrying." } }),
    } : m);
}

const NAV: { id: Nav; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { id: "dashboard", label: "Dashboard",  Icon: DashboardIcon },
  { id: "beatmind",  label: "BeatMind",   Icon: WaveIcon },
  { id: "mixmind",   label: "MixMind",    Icon: DJIcon },
  { id: "recordings", label: "Recordings", Icon: MicIcon },
  { id: "references", label: "References", Icon: BookmarkIcon },
  { id: "downloads", label: "Downloads",  Icon: DownloadIcon },
  { id: "account",   label: "Account",    Icon: UserIcon },
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
  const [nav, setNav] = useState<Nav>("dashboard");
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
  const [planReason, setPlanReason] = useState<string | null>(null);
  const [planIntent, setPlanIntent] = useState<PlanIntent | null>(null);
  const { usage, reload: reloadUsage } = useUsage(user?.id);

  // Back from Stripe Checkout: the webhook can land a few seconds after the redirect.
  const [justSubscribed, setJustSubscribed] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("subscribed") && !params.has("purchase")) return;
    setJustSubscribed(params.has("subscribed"));
    const timers = [3000, 10000].map(ms => setTimeout(() => { void reloadUsage().catch(() => undefined); }, ms));
    return () => timers.forEach(clearTimeout);
  }, [reloadUsage]);
  const explicitRecordingIds = messageRecordingIds(messages);
  const recordings = useRecordings(explicitRecordingIds.flat());
  const recordingIdsByMessage = useMemo(() => messageRecordingIds(messages, recordings.items), [messages, recordings.items]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const queuedRef = useRef<string | null>(null);
  const [streamNotice, setStreamNotice] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<ModelTier>("fast");
  const remoteChats = unmatchedServerChats(chats, serverChats, sessionId);
  const { status: bridgeStatus, refresh: refreshBridge } = useBridgeStatus(user?.id);
  const bridgeConnected = bridgeStatus === "connected";
  const ableton = useAbletonLaunch(bridgeStatus, user?.id);
  const [historyReady, setHistoryReady] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const requestRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
  }, [input, nav]);

  useEffect(() => {
    const u = getUser();
    // Keep a plan picked on the public site through a sign-in redirect.
    const loginHref = `/login${planIntentQuery(parsePlanIntent(window.location.search))}`;
    if (!u || !getToken()) { router.replace(loginHref); return; }
    setUser(u);
    let active = true;
    apiFetch("/api/auth/me").then(async response => {
      if (!active) return;
      if (response.status === 401) { clearAuth(); router.replace(loginHref); return; }
      if (!response.ok) throw new Error("Sign-in check unavailable");
      const verified = await response.json();
      if (verified.id !== u.id) { clearAuth(); router.replace(loginHref); return; }
      if (active) { setUser(verified); setAuthStatus("Signed in"); }
    }).catch(() => { if (active) setAuthStatus("Sign-in check unavailable"); });
    let restoreProject: string | null = null;
    const restoreController = new AbortController();
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
        setProject(saved.project || null);
        if (saved.project && saved.sessionId) restoreProject = saved.sessionId;
        else setReferenceId(saved.referenceId || null);
      }
    } catch { setHistoryError("Saved chat could not be restored. Existing Ableton work is unchanged."); }
    if (restoreProject) {
      void apiFetch(`/api/chats/${encodeURIComponent(restoreProject)}`, { signal: restoreController.signal }).then(async response => {
        if (!response.ok) throw new Error("Could not refresh this song's reference. Reload before continuing.");
        const saved = await response.json();
        if (active) { setProject(saved.project || null); setReferenceId(saved.referenceId || null); }
      }).catch(error => { if (active) setHistoryError(error instanceof Error ? error.message : "Song reference unavailable."); })
        .finally(() => { if (active) setHistoryReady(true); });
    } else setHistoryReady(true);
    return () => { active = false; restoreController.abort(); };
  }, [router]);

  // A plan picked on the public site (?plan=&interval=, or the older ?upgrade=): open the picker on it once.
  // Checkout still needs the user's click; BeatMind plans keep the free trial until then.
  useEffect(() => {
    if (!getToken()) return;
    const intent = parsePlanIntent(window.location.search);
    if (!intent) return;
    window.history.replaceState(null, "", `${window.location.pathname}${withoutPlanIntent(window.location.search)}${window.location.hash}`);
    setPlanIntent(intent);
    setPlanReason("");
  }, []);

  useEffect(() => {
    if (!historyReady || !user || !chatId) return;
    try {
      // Recordings retain full command evidence; keep browser history within storage limits.
      const savedChats = writeChat(user.id, chatId, { messages, sessionId, input, project, referenceId, running: loading,
        runningId: loading ? messages.at(-1)?.id : undefined });
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
    if (response.status === 402) {
      const body = await response.json().catch(() => ({}));
      setPlanReason(typeof body.detail === "string" ? body.detail : "Choose a plan to keep making music.");
      throw new Error(body.detail || "Choose a plan to keep making music.");
    }
    if (response.status === 429) {
      const body = await response.json().catch(() => ({}));
      const msg = typeof body.detail === "string" ? body.detail : "Song limit reached. Upgrade your plan for more songs.";
      setPlanReason(msg);
      throw new Error(msg);
    }
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
      else await sendMessage("I want to start from my own idea. Pick a genre and tempo for me and start building the first sound.", id, null, false);
    } catch (error) { setHistoryError(error instanceof Error ? error.message : "Could not save your choice."); }
    finally { setProjectBusy(false); }
  }

  useEffect(() => () => requestRef.current?.abort(), []);

  const sendMessage = useCallback(async (messageOverride?: string, continuationSession?: string, selectedReference?: string | null, planningOnly = false) => {
    const text = (messageOverride ?? input).trim();
    if (!text || !historyReady || loading || requestRef.current) return;
    const runId = crypto.randomUUID();
    const controller = new AbortController();
    requestRef.current = controller;
    const createdAt = new Date().toISOString();
    setLoading(true);
    setStreamNotice("");
    let lastEvent = Date.now();
    let lastProgress = lastEvent;
    const watchdog = window.setInterval(() => {
      const health = streamHealth(Date.now(), lastEvent, lastProgress);
      setStreamNotice(health.notice);
      if (health.disconnected) controller.abort(new Error(health.notice));
    }, 1000);
    try {
      const activeSession = continuationSession ?? sessionId ?? await createProject();
      setMessages(p => [...p, { role: "user", content: text, createdAt }, { id: runId, role: "assistant", createdAt, requestStatus: "running", content: "Planning the next steps...", toolCalls: [] }]);
      setInput("");
      const res = await apiFetch("/api/chat/stream", {
        method: "POST",
        body: JSON.stringify({ message: text, session_id: activeSession, reference_id: selectedReference, planning_only: planningOnly, model_tier: selectedModel }),
        signal: controller.signal,
      });
      if (res.status === 402) {
        const error = await res.json().catch(() => ({}));
        const reason = typeof error.detail === "string" && error.detail !== "Subscription required"
          ? error.detail : "Your free trial has ended. Choose a plan to keep going.";
        setPlanReason(reason);
        throw new Error(reason);
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
        lastEvent = Date.now();
        if (event.type !== "heartbeat") lastProgress = lastEvent;
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
        const timeoutReason = controller.signal.reason;
        return { ...m, requestStatus: "interrupted", content: controller.signal.aborted
          ? (timeoutReason instanceof Error && timeoutReason.name !== "AbortError" ? timeoutReason.message : stopped)
          : `Production interrupted: ${err instanceof Error ? err.message : "Unknown error"}`,
          toolCalls: m.toolCalls?.map(a => a.result ? a : { ...a, result: { status: "unverified", summary: "Interrupted before confirmation. Inspect Ableton before repeating this action." } }) };
      }));
    } finally {
      window.clearInterval(watchdog); requestRef.current = null; setLoading(false); setStreamNotice("");
      const queued = queuedRef.current;
      if (queued) { queuedRef.current = null; setTimeout(() => sendMessage(queued), 50); }
    }
  }, [input, historyReady, loading, sessionId, router, refreshBridge, createProject]);

  // Subscribers manage or change plans in the Stripe portal; everyone else picks a plan.
  const openBilling = async () => {
    try { if (!(await openBillingPortal())) setPlanReason(""); }
    catch (e) { setHistoryError(e instanceof Error ? e.message : "Billing could not open."); }
  };
  const choosePlan = () => setPlanReason("");

  // MixMind has no public download URL: this fetches a presigned link that expires in minutes,
  // valid only for a signed-in account with mixmind_access. Shared by every download button below.
  const [mixmindDownloading, setMixmindDownloading] = useState(false);
  const handleMixMindDownload = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (mixmindDownloading) return;
    setMixmindDownloading(true);
    try {
      const res = await apiFetch("/api/mixmind/download");
      if (res.status === 402) { setPlanReason("MixMind needs a MixMind, BeatMind + MixMind or Studio plan."); return; }
      if (!res.ok) throw new Error();
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      setHistoryError("Couldn't start the MixMind download. Please try again in a moment.");
    } finally {
      setMixmindDownloading(false);
    }
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

  // Typing in the chat box must not re-render every message, recording and waveform (it lagged ~375 ms per key).
  const sendRef = useRef(sendMessage);
  sendRef.current = sendMessage;
  const reviewRef = useRef(reviewRecording);
  reviewRef.current = reviewRecording;
  const supersededIds = useMemo(() => new Set(recordings.items.flatMap(item => item.supersedes ? [item.supersedes] : [])), [recordings.items]);
  const conversationFollowKey = `${chatId}:${messages.filter(m => m.role === "user").length}`;
  const conversation = useMemo(() => (<>
        {messages.map((msg, i) => (
          <div key={i}
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
                    onClick={() => void sendRef.current(choice.message, undefined, undefined, true)}
                    className="rounded border px-3 py-2 text-sm disabled:opacity-40" style={{ borderColor: "var(--border)" }}>{choice.label}</button>)}
                </div>}
                <ChatComparisons actions={msg.toolCalls || []} />
                <Recordings items={recordings.items.filter(item => recordingIdsByMessage[i].includes(item.id))}
                  missing={recordingIdsByMessage[i].some(id => !recordings.items.some(item => item.id === id))}
                  initialIds={recordings.initialIds} onDecision={(item, decision) => reviewRef.current(item, decision)}
                  supersededIds={supersededIds}
                  onPreview={actions => setMessages(previous => [...previous, { id: crypto.randomUUID(), role: "assistant", createdAt: new Date().toISOString(),
                    content: "Track fader adjusted. Fresh audio recorded from the verified sample.", toolCalls: actions }])} />
              </>}
            </div>
          </div>
        ))}
  </>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [messages, recordings, recordingIdsByMessage, supersededIds, loading, historyReady]);


  // Derived subscription state
  // A paid plan, not the free trial (user.subscribed is also true during the trial).
  const isSubscribed = usage ? hasPaidPlan(usage.plan) : ["active", "trialing", "past_due"].includes(user?.subscription_status ?? "");
  const trialDays = daysLeft(user?.trial_ends_at);
  const trialActive = !isSubscribed && trialDays !== null && trialDays > 0;
  // Until the account loads (including the pre-rendered page) we don't know the plan, so show a neutral state.
  const planChecking = !usage && authStatus === "Checking sign-in";
  const checkingPlanText = "Checking your plan…";
  const currentPlan = isSubscribed && usage ? planName(usage.plan) : "BeatMind";
  const trialTracks = usage?.plan?.source === "trial" ? `${usage.allowance_left} of ${usage.included_per_month} tracks left · ` : "";
  const trialSummary = `Free trial · ${trialTracks}${trialDays} day${trialDays !== 1 ? "s" : ""} left`;
  const trialOutOfTracks = usage?.plan?.source === "trial" && usage.allowance_left === 0;
  let trialBanner = "Your free trial has ended";
  if (trialActive) trialBanner = trialOutOfTracks ? `Your free trial includes ${usage?.included_per_month} tracks. Choose a plan to keep going.` : trialSummary;
  const mixmindIncluded = hasMixMindAccess(usage ?? user);
  const tierLabel = usage?.plan?.tier ? AI_FAIR_USE_LABELS[usage.plan.tier] : null;
  const modelNames = usage?.model_access?.map(m => MODEL_TIER_LABELS[m]).join(", ") ?? MODEL_TIER_LABELS.fast;
  const planFeatures = usage && isSubscribed ? [
    `${tierLabel ? tierLabel.songs : usage.included_per_month} songs per month`,
    `AI models: ${modelNames}`,
    ...(tierLabel ? [`$${tierLabel.cap}/mo AI budget`] : []),
    "Unlimited stem separations",
    ...(usage.included_cloud_per_month > 0 ? [`${usage.included_cloud_per_month} Cloud HQ separations per month`] : []),
    "BeatMind Bridge for Ableton Live",
    ...(usage.plan.mixmind ? [`MixMind for Mac · ${MIXMIND_AI_LABEL}`] : []),
  ] : [
    `${usage?.plan?.source === "trial" ? 3 : 3} trial songs`,
    `AI model: ${MODEL_TIER_LABELS.fast} (trial)`, "BeatMind Bridge for Ableton Live",
  ];
  const mixmindLocked = (
    <div className="rounded-xl border p-3 text-xs" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
      MixMind needs a MixMind, BeatMind + MixMind or Studio plan.{" "}
      <button type="button" onClick={choosePlan} className="underline" style={{ color: "#a78bfa" }}>See plans</button>
    </div>
  );

  // ──────────────────────────────────────────────────────────────────────────
  // DASHBOARD
  // ──────────────────────────────────────────────────────────────────────────
  const allSongs = useMemo(() => [...chats, ...remoteChats], [chats, remoteChats]);
  const recStats = useMemo(() => {
    const accepted = recordings.items.filter(r => r.decision === "accepted").length;
    const pending = recordings.items.filter(r => r.decision === "pending").length;
    const revise = recordings.items.filter(r => r.decision === "revise").length;
    return { total: recordings.items.length, accepted, pending, revise };
  }, [recordings.items]);

  const renderDashboard = () => (
    <div className="p-4 sm:p-8 max-w-5xl w-full overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">
            {user?.name ? `${user.name.split(" ")[0]}'s Studio` : "Dashboard"}
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {planChecking ? checkingPlanText
              : isSubscribed ? `${currentPlan} plan`
              : trialActive ? trialSummary
              : "Free trial ended"}
          </p>
        </div>
        <button disabled={projectBusy || loading || !historyReady}
          onClick={() => void newSong()} className="self-start px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{ background: "var(--accent)", color: "#fff" }}>
          + New song
        </button>
      </div>

      {justSubscribed && usage && hasPaidPlan(usage.plan) && (
        <div role="status" className="mb-6 rounded-2xl border p-4 text-sm" style={{ background: "#052e16", borderColor: "#166534" }}>
          <p className="font-semibold" style={{ color: "#4ade80" }}>Subscribed to {currentPlan}.</p>
          {usage.renewal_terms && <p className="mt-1" style={{ color: "var(--text-primary)" }}>{usage.renewal_terms}</p>}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Songs", value: allSongs.length, color: "var(--text-primary)" },
          { label: "Accepted", value: recStats.accepted, color: "#4ade80" },
          { label: "Pending review", value: recStats.pending, color: "#fbbf24" },
          { label: "Needs revision", value: recStats.revise, color: "#f87171" },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl border p-4" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
            <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Connection + usage row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {/* Bridge status */}
        <div className="rounded-xl border p-4 flex items-center justify-between" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: bridgeConnected ? "#22c55e" : "#ef4444" }} />
            <div className="min-w-0">
              <p className="text-sm font-medium">Ableton Bridge</p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{bridgeConnected ? "Connected — ready to produce" : "Not connected"}</p>
            </div>
          </div>
          {bridgeConnected
            ? <button onClick={() => setNav("beatmind")} className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: "var(--accent)", color: "#fff" }}>Open chat</button>
            : <button onClick={() => setNav("downloads")} className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs border" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>Get Bridge</button>}
        </div>

        {/* Usage / billing summary */}
        <div className="rounded-xl border p-4" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
          {planChecking ? <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{checkingPlanText}</p>
          : isSubscribed && usage ? <>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">{currentPlan}</p>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#052e16", color: "#4ade80" }}>Active</span>
            </div>
            <div className="mb-2">
              <div className="flex justify-between text-xs mb-1">
                <span style={{ color: "var(--text-secondary)" }}>Songs this month</span>
                <span>{usage.songs_this_month ?? 0} / {usage.songs_limit ?? 10}</span>
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, ((usage.songs_this_month ?? 0) / Math.max(1, usage.songs_limit ?? 10)) * 100)}%`, background: (usage.songs_this_month ?? 0) >= (usage.songs_limit ?? 10) ? "#f87171" : "#4ade80" }} />
              </div>
            </div>
            {usage.ai_usage && usage.ai_usage.fair_use_cap_usd > 0 && <div className="mb-2">
              <div className="flex justify-between text-xs mb-1">
                <span style={{ color: "var(--text-secondary)" }}>AI budget</span>
                <span>${usage.ai_usage.estimated_usd.toFixed(2)} / ${usage.ai_usage.fair_use_cap_usd.toFixed(0)}</span>
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (usage.ai_usage.estimated_usd / usage.ai_usage.fair_use_cap_usd) * 100)}%`, background: usage.ai_usage.estimated_usd >= usage.ai_usage.fair_use_cap_usd ? "#f87171" : "#60a5fa" }} />
              </div>
            </div>}
            {usage.included_cloud_per_month > 0 && <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{usage.cloud_used} / {usage.included_cloud_per_month} Cloud HQ separations</p>}
            <button onClick={openBilling} className="mt-2 text-xs underline" style={{ color: "var(--text-secondary)" }}>Manage billing</button>
          </>
          : <>
            <p className="text-sm font-medium mb-1">{trialActive ? "Free trial" : "Trial ended"}</p>
            <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>{trialActive ? `${trialDays} day${trialDays !== 1 ? "s" : ""} remaining` : "Choose a plan to continue"}</p>
            <button onClick={choosePlan} className="px-4 py-1.5 rounded-lg text-xs font-semibold" style={{ background: "var(--accent)", color: "#fff" }}>Choose a plan</button>
          </>}
        </div>
      </div>

      {/* Recent songs */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Recent songs</h2>
          {allSongs.length > 6 && <button onClick={() => setNav("recordings")} className="text-xs underline" style={{ color: "var(--text-secondary)" }}>View all recordings</button>}
        </div>
        {allSongs.length === 0 ? (
          <div className="rounded-xl border p-8 text-center" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
            <DashboardIcon size={32} />
            <p className="text-sm font-medium mt-3">No songs yet</p>
            <p className="text-xs mt-1 mb-4" style={{ color: "var(--text-secondary)" }}>Start producing — your songs and track progress will appear here.</p>
            <button disabled={projectBusy || loading || !historyReady}
              onClick={() => void newSong()} className="px-5 py-2 rounded-xl text-sm font-semibold disabled:opacity-40" style={{ background: "var(--accent)", color: "#fff" }}>Create your first song</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...allSongs].reverse().slice(0, 6).map(song => {
              const songRecs = recordings.items.filter(r => {
                const msgs = messages.filter(m => m.toolCalls?.some(tc => tc.result?.recording?.id === r.id));
                return msgs.length > 0 || song.id === chatId;
              });
              const accepted = songRecs.filter(r => r.decision === "accepted").length;
              const pending = songRecs.filter(r => r.decision === "pending").length;
              const revise = songRecs.filter(r => r.decision === "revise").length;
              const total = accepted + pending + revise;
              const isActive = song.id === chatId;
              return (
                <button key={song.id} type="button" disabled={!historyReady || loading || projectBusy}
                  onClick={() => {
                    if (isActive) { setNav("beatmind"); return; }
                    if (song.sessionId && (song.id.startsWith("server-") || serverChats.some(s => s.id === song.sessionId))) void openServerChat(song.sessionId);
                    else openChat(song.id);
                  }}
                  className="rounded-xl border p-4 text-left transition-all hover:border-blue-500 disabled:opacity-40"
                  style={{ background: isActive ? "var(--bg-primary)" : "var(--bg-secondary)", borderColor: isActive ? "var(--accent)" : "var(--border)" }}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-medium break-words line-clamp-2">{song.title || "Untitled"}</p>
                    {isActive && <span className="flex-shrink-0 w-2 h-2 rounded-full mt-1.5" style={{ background: "#22c55e" }} />}
                  </div>
                  {total > 0 ? <>
                    <div className="flex gap-3 text-xs mb-2" style={{ color: "var(--text-secondary)" }}>
                      {accepted > 0 && <span style={{ color: "#4ade80" }}>{accepted} accepted</span>}
                      {pending > 0 && <span style={{ color: "#fbbf24" }}>{pending} pending</span>}
                      {revise > 0 && <span style={{ color: "#f87171" }}>{revise} revision</span>}
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden flex" style={{ background: "var(--border)" }}>
                      {accepted > 0 && <div className="h-full" style={{ width: `${(accepted / total) * 100}%`, background: "#4ade80" }} />}
                      {pending > 0 && <div className="h-full" style={{ width: `${(pending / total) * 100}%`, background: "#fbbf24" }} />}
                      {revise > 0 && <div className="h-full" style={{ width: `${(revise / total) * 100}%`, background: "#f87171" }} />}
                    </div>
                  </> : <p className="text-xs" style={{ color: "var(--text-secondary)" }}>No recordings yet</p>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick start prompts */}
      <div>
        <h2 className="text-sm font-semibold mb-3">Quick start</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PROMPTS.map(p => (
            <button key={p.text} disabled={projectBusy || loading || !historyReady} onClick={() => {
              if (p.newSong) void newSong(p.text);
              else { setInput(p.text); setNav("beatmind"); }
            }}
              className="text-left text-sm p-3 rounded-xl border transition-colors hover:border-blue-500 disabled:opacity-40"
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

      <ChatTimeline followKey={conversationFollowKey}>
        {historyError && <p role="alert" className="text-xs text-amber-300">{historyError}</p>}
        {loading && streamNotice && <p role="status" className="text-xs text-amber-300">{streamNotice}</p>}
        {(messages.length === 0 || (project && !project.starting_point)) && (
          <div className="flex flex-col items-center justify-center py-8 gap-6 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "var(--bg-secondary)", color: "var(--accent)" }}>
              <WaveIcon size={28} />
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-1">How would you like to start?</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full">
              <button type="button" disabled={loading || projectBusy || !historyReady} onClick={() => void chooseStart("reference")} className="rounded border p-3 text-sm text-left disabled:opacity-40"
                style={{ borderColor: "var(--border)" }}>
                <span className="font-medium block mb-1">Upload a reference track</span>
                <span className="text-xs block" style={{ color: "var(--text-secondary)" }}>Upload a song you like. BeatMind will separate it into stems and help you build an original track inspired by it.</span>
              </button>
              <button type="button" disabled={loading || projectBusy || !historyReady} onClick={() => void chooseStart("idea")}
                className="rounded border p-3 text-sm text-left disabled:opacity-40" style={{ borderColor: "var(--border)" }}>
                <span className="font-medium block mb-1">Start from an idea</span>
                <span className="text-xs block" style={{ color: "var(--text-secondary)" }}>Tell BeatMind a genre and vibe, or let it pick for you. It will start building sounds one by one for you to approve.</span>
              </button>
            </div>
          </div>
        )}

        {conversation}

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
      </ChatTimeline>

      <div className="px-3 sm:px-6 py-4 border-t flex-shrink-0" style={{ borderColor: "var(--border)" }}>
        <div className="flex gap-3 items-end">
          <label htmlFor="chat-input" className="sr-only">Message BeatMind</label>
          <textarea
            id="chat-input" ref={inputRef} value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (loading) { queuedRef.current = input.trim() || null; setInput(""); } else sendMessage(); } }}
            placeholder={queuedRef.current ? "Message queued — sending when ready..." : "Message BeatMind..."}
            rows={1}
            className="flex-1 min-w-0 resize-none rounded-lg px-4 py-3 text-sm outline-none"
            style={{ background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
          />
          {loading && (
            <button type="button" onClick={() => requestRef.current?.abort()}
              aria-label="Stop production" title="Stop production"
              className="w-12 h-12 flex-shrink-0 rounded-lg border flex items-center justify-center"
              style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}>
              <span className="block w-4 h-4 bg-current" aria-hidden="true" />
            </button>
          )}
          <button type="button" onClick={() => { if (loading) { queuedRef.current = input.trim() || null; setInput(""); } else sendMessage(); }} disabled={!input.trim()}
            aria-label="Send"
            title="Send"
            className="px-4 py-3 rounded-xl transition-opacity disabled:opacity-30 flex items-center justify-center"
            style={{ background: "var(--accent)", color: "#fff" }}>
            <SendIcon />
          </button>
        </div>
        <p className="text-xs mt-2 text-center" style={{ color: "var(--text-secondary)" }}>
          {queuedRef.current ? `Your message is queued — it will send when the current response finishes.` : bridgeStatusLabel[bridgeStatus]}
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
          MixMind is a native desktop app for Mac — download it and run it alongside your DJ software. No browser required. A Windows version of MixMind is coming soon.
        </p>
        {mixmindIncluded ? (
        <div className="grid grid-cols-1 gap-3">
          <a href="#" onClick={handleMixMindDownload} aria-disabled={mixmindDownloading}
            className="flex flex-col items-center gap-3 p-5 rounded-xl border text-center transition-all hover:border-purple-500"
            style={{ borderColor: "var(--border)", background: "var(--bg-primary)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#7c3aed" }}>
              <DownloadIcon size={18} />
            </div>
            <div>
              <p className="font-semibold text-sm">{mixmindDownloading ? "Preparing…" : "Mac"}</p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Requires a Mac with Apple silicon (M1 or later)</p>
            </div>
          </a>
        </div>
        ) : mixmindLocked}
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
    <div className="p-4 sm:p-8 max-w-2xl w-full">
      <h2 className="text-xl font-bold mb-1">Downloads</h2>
      <p className="text-sm mb-7" style={{ color: "var(--text-secondary)" }}>Desktop apps and templates included with your plan.</p>

      <div className="space-y-4 mb-8">
        {/* BeatMind Bridge */}
        <div className="rounded-2xl border p-5" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#f97316" }}>
                <WaveIcon size={20} />
              </div>
              <div>
                <p className="font-semibold text-sm">BeatMind Bridge</p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>macOS 15+ · Apple Silicon · Notarized</p>
              </div>
            </div>
            {bridgeConnected
              ? <button onClick={() => setNav("beatmind")} className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90" style={{ background: "#22c55e", color: "#fff" }}>Connected</button>
              : <a href={BRIDGE_MAC_DOWNLOAD} download className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90" style={{ background: "#f97316", color: "#fff" }}>
                  <DownloadIcon size={14} /> Download .dmg
                </a>}
          </div>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Connects Ableton Live to BeatMind AI. Drag sounds, build arrangements, and separate stems — all from inside your DAW.
          </p>
        </div>

        {/* MixMind */}
        <div className="rounded-2xl border p-5" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#7c3aed" }}>
                <DJIcon size={20} />
              </div>
              <div>
                <p className="font-semibold text-sm">MixMind</p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>macOS · Apple Silicon (M1 or later)</p>
              </div>
            </div>
            {mixmindIncluded
              ? <a href="#" onClick={handleMixMindDownload} aria-disabled={mixmindDownloading}
                  className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                  style={{ background: "#7c3aed", color: "#fff" }}>
                  <DownloadIcon size={14} />
                  {mixmindDownloading ? "Preparing…" : "Download .dmg"}
                </a>
              : <button type="button" onClick={choosePlan}
                  className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                  style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "#a78bfa" }}>
                  Upgrade plan
                </button>}
          </div>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            AI DJ library manager. Smart playlists, duplicate track detection, BPM + key analysis, and Rekordbox + USB export.
            {!mixmindIncluded && <span style={{ color: "#a78bfa" }}> Requires a MixMind, BeatMind + MixMind, or Studio plan.</span>}
          </p>
        </div>
      </div>

      {/* Starter template */}
      <div className="rounded-2xl border p-5" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <p className="font-semibold text-sm">BeatMind Starter Template</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>Ableton Live 12 · Built-in devices only · 124 BPM · .als file</p>
          </div>
          <a href={STARTER_TEMPLATE_URL} download="BeatMind Starter.als"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90"
            style={{ background: "var(--accent)", color: "#0a0a0a" }}>
            <DownloadIcon size={14} /> Download
          </a>
        </div>
        <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
          A pre-built Ableton Live Set with empty Kick, Drums, Percussion, Bass, Chords, Lead, and FX tracks,
          a muted Reference track, Reverb and Delay returns, and scenes named Intro, Build, Drop, Break, Drop 2 and Outro.
          BeatMind fills these tracks with sounds you approve.
        </p>
        <div className="rounded-xl p-3" style={{ background: "var(--bg-primary)" }}>
          <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>Setup</p>
          <ol className="text-xs space-y-1 list-decimal list-inside" style={{ color: "var(--text-secondary)" }}>
            <li>Double-click the downloaded <code className="px-1 rounded" style={{ background: "var(--bg-secondary)" }}>.als</code> file to open it in Ableton Live.</li>
            <li>Choose File → Save Live Set As Default Set → press Return.</li>
            <li>Every new Live Set (including &quot;Open new Live Set&quot; in BeatMind) starts from this template.</li>
          </ol>
        </div>
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
        <h3 id="billing" className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-secondary)" }}>Billing</h3>
        {planChecking && <p role="status" className="text-sm" style={{ color: "var(--text-secondary)" }}>{checkingPlanText}</p>}
        {!planChecking && (isSubscribed ? (
          <>
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold"
                style={{ background: "#052e16", color: "#4ade80" }}>
                <CheckIcon size={11} />
                {usage?.plan.status === "past_due" ? `Payment failed — ${currentPlan}` : `Active — ${currentPlan}`}
              </span>
              {usage?.plan.interval && <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Billed {usage.plan.interval === "year" ? "yearly" : "monthly"}</span>}
            </div>
            {usage?.plan.status === "past_due" && <p className="text-xs mb-3 text-amber-200">Update your card in Manage billing to keep your plan.</p>}
            {usage && <div className="text-xs mb-3 space-y-1" style={{ color: "var(--text-secondary)" }}>
              <p>{usage.songs_this_month ?? 0} of {usage.songs_limit ?? 10} songs this month{usage.included_cloud_per_month > 0 ? ` · ${usage.cloud_used} of ${usage.included_cloud_per_month} Cloud HQ` : ""}</p>
              {usage.ai_usage && usage.ai_usage.fair_use_cap_usd > 0 && <p>AI budget: ${usage.ai_usage.estimated_usd.toFixed(2)} of ${usage.ai_usage.fair_use_cap_usd.toFixed(0)} used</p>}
              <p>AI models: {modelNames}</p>
            </div>}
            {usage
              ? <SubscriptionControls usage={usage} onChanged={reloadUsage} onManage={openBilling} />
              : <button onClick={openBilling} className="text-xs px-4 py-2 rounded-lg border transition-opacity hover:opacity-70"
                  style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>Manage billing</button>}
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
                style={{ background: "#1a1000", color: "#fbbf24" }}>
                {trialActive ? trialSummary : "Trial ended"}
              </span>
            </div>
            <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
              {trialActive
                ? "No card on file. Your trial ends on its own; choose a plan whenever you're ready."
                : "Choose a plan to keep using BeatMind."}
            </p>
            <button onClick={choosePlan}
              className="px-6 py-2.5 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90"
              style={{ background: "var(--accent)", color: "#fff" }}>
              Start your plan
            </button>
            {usage?.billing_account && <button onClick={openBilling}
              className="ml-3 text-xs px-4 py-2 rounded-lg border transition-opacity hover:opacity-70"
              style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
              Billing history
            </button>}
          </>
        ))}
      </div>

      {!planChecking && <div className="rounded-2xl border p-5 mb-6" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-secondary)" }}>{isSubscribed ? "Plan includes" : "Free trial includes"}</p>
        <ul className="space-y-2.5">
          {planFeatures.map(f => (
            <li key={f} className="flex items-center gap-2.5 text-sm">
              <span style={{ color: "#4ade80" }}><CheckIcon size={14} /></span>
              {f}
            </li>
          ))}
        </ul>
      </div>}

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
      {planReason !== null && <PlanPicker reason={planReason || undefined} inTrial={trialActive} intent={planIntent}
        onClose={() => { setPlanReason(null); setPlanIntent(null); }} />}

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
          {planChecking && (
            <div role="status" className="rounded-xl p-3 border text-xs" style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-secondary)" }}>
              {checkingPlanText}
            </div>
          )}
          {!planChecking && (isSubscribed ? (
            <div className="rounded-xl p-3 border" style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}>
              <p className="text-xs font-semibold mb-0.5" style={{ color: "#4ade80" }}>✓ {currentPlan} plan</p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{usage ? `${usage.songs_this_month ?? 0} / ${usage.songs_limit ?? 10} songs` : "Active"}</p>
              {usage?.ai_usage && usage.ai_usage.fair_use_cap_usd > 0 && <p className="text-xs" style={{ color: "var(--text-secondary)" }}>AI: ${usage.ai_usage.estimated_usd.toFixed(2)} / ${usage.ai_usage.fair_use_cap_usd.toFixed(0)}</p>}
            </div>
          ) : (
            <button onClick={choosePlan}
              className="w-full rounded-xl p-3 text-left transition-opacity hover:opacity-90"
              style={{ background: "linear-gradient(135deg,#1d4ed8,#7c3aed)" }}>
              <p className="text-xs font-bold text-white mb-0.5">
                {trialActive ? trialSummary : "Trial ended"}
              </p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.65)" }}>
                Start your plan →
              </p>
            </button>
          ))}
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
        <UpdateBanner />
        <div className="shrink-0 border-b px-3 sm:px-6" style={{ borderColor: "var(--border)" }}>
          <BridgeLaunch status={bridgeStatus} onRetry={refreshBridge} ableton={ableton} />
        </div>
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
          {project && <button type="button" onClick={() => void chooseStart("reference")} disabled={!historyReady || loading || projectBusy}
            className="h-10 px-3 shrink-0 rounded border text-sm font-medium disabled:opacity-40"
            style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}>Upload song</button>}
          {project && <div className="w-full flex flex-wrap items-center gap-3 text-xs">
            {usage?.model_access && usage.model_access.length > 1 ? (
              <select value={selectedModel} onChange={e => setSelectedModel(e.target.value as ModelTier)}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium appearance-none cursor-pointer"
                style={{ background: selectedModel === "ultra" ? "rgba(168,85,247,0.15)" : selectedModel === "pro" ? "rgba(59,130,246,0.15)" : "rgba(249,115,22,0.15)",
                  color: selectedModel === "ultra" ? "#c084fc" : selectedModel === "pro" ? "#60a5fa" : "#fb923c", border: "none", outline: "none" }}>
                {usage.model_access.map(m => <option key={m} value={m}>{MODEL_TIER_LABELS[m]}</option>)}
              </select>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full" style={{ background: "rgba(249,115,22,0.15)", color: "#fb923c" }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#fb923c" }} />{MODEL_TIER_LABELS[selectedModel]}
              </span>
            )}
            <span style={{ color: "var(--text-secondary)" }}>{project.live_set ? `Selected set: ${project.live_set.title}` : "Planning / No Live Set selected"}</span>
            <button disabled={loading || projectBusy || !bridgeConnected} onClick={() => setSongSetup("")} className="underline disabled:opacity-40">Choose Live Set</button>
            {project.starting_point === "reference" && <button onClick={() => setNav("references")} className="underline">Reference review</button>}
          </div>}
        </div>}

        {/* Content area */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {nav === "dashboard" && renderDashboard()}
          {nav === "beatmind"  && renderBeatMind()}
          {nav === "mixmind"   && renderMixMind()}
          {nav === "downloads" && renderDownloads()}
          {nav === "references" && <References key={chatId} selectedId={referenceId} guided={Boolean(project)} onTemplateApproved={() => void ableton.open()} onOpenChat={() => setNav("beatmind")}
            onSelect={async id => {
              if (!project) { setReferenceId(id); return; }
              setProjectBusy(true);
              try { await updateProject({ starting_point: "reference", reference_id: id }); }
              finally { setProjectBusy(false); }
            }} chatBusy={loading || projectBusy || !historyReady} onUse={(id, template) => {
            setReferenceId(id);
            setNav("beatmind");
            void sendMessage(template
              ? "Let's choose the first sound for my reference-inspired track."
              : "Let's talk about what I like in this reference and what I'd change.", undefined, id, !template);
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
