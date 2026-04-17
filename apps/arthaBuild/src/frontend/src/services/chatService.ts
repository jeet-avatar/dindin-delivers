import { listChats, createChatSession, getChatMessages, renameChatSession, deleteChatSession } from "./api";
import type { ChatSession, ChatMessage } from "./api";

// Re-export types for consumers
export type { ChatSession, ChatMessage };

// askAI remains a thin wrapper around sendChatMessage for backward compat
export { sendChatMessage as askAI } from "./api";

export const chatService = {
  async list(): Promise<ChatSession[]> {
    return listChats();
  },

  async getById(id: number): Promise<{ session: ChatSession; messages: ChatMessage[] } | null> {
    try {
      const [sessions, messages] = await Promise.all([
        listChats(),
        getChatMessages(id),
      ]);
      const session = sessions.find((s) => s.id === id) || null;
      if (!session) return null;
      return { session, messages };
    } catch {
      return null;
    }
  },

  async create(title = "New Chat"): Promise<ChatSession> {
    return createChatSession(title);
  },

  // Messages are persisted server-side via /api/chatbot/process with chat_session_id.
  // This is a no-op in the client-side service.
  async addMessage(_sessionId: number, _message: ChatMessage): Promise<void> {
    // no-op — server handles persistence
  },

  async updateTitle(sessionId: number, title: string): Promise<void> {
    return renameChatSession(sessionId, title);
  },

  async remove(sessionId: number): Promise<void> {
    return deleteChatSession(sessionId);
  },

  // search is best-effort: filter already-loaded sessions by title
  search(sessions: ChatSession[], query: string): ChatSession[] {
    const q = query.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) => s.title.toLowerCase().includes(q));
  },
};
