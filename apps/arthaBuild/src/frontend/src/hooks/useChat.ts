// Re-export from shared context so all existing imports keep working.
// State now lives in ChatContext (ChatProvider) — a single shared instance
// that both Sidebar and Chat.tsx consume. Creating/refreshing chats in one
// component is immediately reflected in the other.
export { useChat } from "../contexts/ChatContext";
