/**
 * Shared API layer — memory-only token storage per CLAUDE.md project law.
 * Token is wiped on page refresh (user must re-login). Never persisted to disk.
 */

// In-memory token storage — cleared on page refresh, safe from XSS
let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }
  return headers;
}

export interface ChatResponse {
  response: string;
  intent: string;
  sources?: Array<{ page_content: string; metadata: Record<string, unknown> }>;
  session_id: string;
  latency_ms?: number;
}

export interface ChatSession {
  id: number;
  title: string;
  updated_at: string;
  created_at?: string;
}

export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  intent?: string;
  created_at: string;
}

export async function sendChatMessage(
  message: string,
  sessionId?: string,
  chatSessionId?: number | null
): Promise<ChatResponse> {
  const resp = await fetch("/api/chatbot/process", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      message,
      session_id: sessionId,
      ...(chatSessionId ? { chat_session_id: chatSessionId } : {}),
    }),
  });

  if (resp.status === 401) {
    accessToken = null;
    window.dispatchEvent(new CustomEvent("auth:logout"));
    throw new Error("Session expired — please log in again");
  }
  if (resp.status === 402) {
    const err = await resp.json().catch(() => ({})) as { detail?: string };
    throw new Error(err.detail || "License required");
  }
  if (resp.status === 503) {
    throw new Error("AI model is still loading — please wait a moment");
  }
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({})) as { detail?: string; error?: string };
    throw new Error(err.detail || err.error || "Request failed");
  }

  const data = await resp.json().catch(() => null);
  if (!data) throw new Error("Invalid response from server");
  return data;
}

export async function listChats(): Promise<ChatSession[]> {
  const resp = await fetch("/api/chats", { headers: authHeaders() });
  if (resp.status === 401) {
    accessToken = null;
    window.dispatchEvent(new CustomEvent("auth:logout"));
    throw new Error("Session expired — please log in again");
  }
  if (!resp.ok) throw new Error("Failed to load chats");
  return resp.json();
}

export async function createChatSession(title = "New Chat"): Promise<ChatSession> {
  const resp = await fetch("/api/chats", {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!resp.ok) throw new Error("Failed to create chat");
  return resp.json();
}

export async function getChatMessages(sessionId: number): Promise<ChatMessage[]> {
  const resp = await fetch(`/api/chats/${sessionId}/messages`, { headers: authHeaders() });
  if (!resp.ok) throw new Error("Failed to load messages");
  return resp.json();
}

export async function renameChatSession(sessionId: number, title: string): Promise<void> {
  const resp = await fetch(`/api/chats/${sessionId}`, {
    method: "PATCH",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!resp.ok) throw new Error("Failed to rename chat");
}

export async function deleteChatSession(sessionId: number): Promise<void> {
  const resp = await fetch(`/api/chats/${sessionId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!resp.ok) throw new Error("Failed to delete chat");
}
