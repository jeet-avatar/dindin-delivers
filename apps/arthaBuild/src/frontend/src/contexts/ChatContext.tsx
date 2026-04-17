/**
 * ChatContext — single shared source of truth for chat list state.
 *
 * Before this, Sidebar and Chat.tsx each called useChat() independently,
 * giving them separate state instances. Creating a chat in Chat.tsx never
 * updated the Sidebar's list. This context fixes that.
 *
 * Usage: wrap ChatLayout with <ChatProvider>. All descendants that call
 * useChat() will share the same chats state and refresh function.
 */
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ChatSession } from "../services/chatService";
import { chatService } from "../services/chatService";
import { getChatMessages } from "../services/api";
import type { Chat } from "../types/chat";
import type { Message } from "../types/message";

function toChat(s: ChatSession): Chat {
  return {
    id: String(s.id),
    title: s.title,
    messages: [],
    createdAt: s.created_at ?? s.updated_at,
    updatedAt: s.updated_at,
  };
}

interface ChatContextValue {
  chats: Chat[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  createChat: (title?: string) => Chat;
  getChat: (id: string) => Chat | null;
  addMessage: (chatId: string, message: Message) => Chat | null;
  updateTitle: (chatId: string, title: string) => void;
  remove: (chatId: string) => void;
  search: (query: string) => Array<{ id: string; title: string; date?: string }>;
  starChat: (id: string) => Chat | null;
  loadMessages: (chatId: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const sessions = await chatService.list();
      setChats(sessions.map(toChat));
    } catch (err) {
      console.error("Failed to load chats", err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    setIsLoading(true);
    refresh().finally(() => setIsLoading(false));
  }, []);

  function createChat(title?: string): Chat {
    const placeholder: Chat = {
      id: `temp-${Date.now()}`,
      title: title || "New Chat",
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    chatService.create(title).then((session) => {
      const real = toChat(session);
      setChats((prev) => {
        const without = prev.filter((c) => c.id !== placeholder.id);
        return [real, ...without];
      });
      placeholder.id = real.id;
    }).catch((err) => {
      console.error("Failed to create chat session", err);
      setChats((prev) => prev.filter((c) => c.id !== placeholder.id));
    });
    setChats((prev) => [placeholder, ...prev]);
    return placeholder;
  }

  function getChat(id: string): Chat | null {
    return chats.find((c) => c.id === id) ?? null;
  }

  function addMessage(chatId: string, message: Message): Chat | null {
    let updated: Chat | null = null;
    setChats((prev) =>
      prev.map((c) => {
        if (c.id !== chatId) return c;
        let newTitle = c.title;
        const allMsgs = [...c.messages, message];
        if (newTitle === "New Chat" && message.role === "user") {
          const words = message.content.trim().split(/\s+/).slice(0, 5);
          newTitle = words.join(" ");
          const numId = parseInt(chatId, 10);
          if (!isNaN(numId)) {
            chatService.updateTitle(numId, newTitle).catch(() => {});
          }
        }
        const result = { ...c, messages: allMsgs, title: newTitle, updatedAt: new Date().toISOString() };
        updated = result;
        return result;
      })
    );
    return updated;
  }

  function updateTitle(chatId: string, title: string): void {
    setChats((prev) =>
      prev.map((c) => c.id === chatId ? { ...c, title, updatedAt: new Date().toISOString() } : c)
    );
    const numId = parseInt(chatId, 10);
    if (!isNaN(numId)) {
      chatService.updateTitle(numId, title).catch((err) => console.error("Failed to rename chat", err));
    }
  }

  function remove(chatId: string): void {
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    const numId = parseInt(chatId, 10);
    if (!isNaN(numId)) {
      chatService.remove(numId).catch((err) => console.error("Failed to delete chat", err));
    }
  }

  function search(query: string): Array<{ id: string; title: string; date?: string }> {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return chats
      .filter((c) => c.title.toLowerCase().includes(q))
      .map((c) => ({ id: c.id, title: c.title }));
  }

  function starChat(id: string): Chat | null {
    return chats.find((c) => c.id === id) ?? null;
  }

  async function loadMessages(chatId: string): Promise<void> {
    const numId = parseInt(chatId, 10);
    if (isNaN(numId)) return;
    try {
      const msgs = await getChatMessages(numId);
      setChats((prev) =>
        prev.map((c) => {
          if (c.id !== chatId) return c;
          return {
            ...c,
            messages: msgs.map((m) => ({
              id: String(m.id),
              role: m.role as "user" | "assistant",
              content: m.content,
              intent: m.intent,
              createdAt: m.created_at,
            })),
          };
        })
      );
    } catch (err) {
      console.error("Failed to load messages for chat", chatId, err);
    }
  }

  const value: ChatContextValue = {
    chats,
    isLoading,
    refresh,
    createChat,
    getChat,
    addMessage,
    updateTitle,
    remove,
    search,
    starChat,
    loadMessages,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used inside <ChatProvider>");
  return ctx;
}
