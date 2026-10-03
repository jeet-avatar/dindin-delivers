export interface ChatEntry { id: string; title: string; sessionId?: string | null }

export function refreshPlaceholderTitles(local: ChatEntry[], server: ChatEntry[]): ChatEntry[] {
  const titles = new Map(server.map(chat => [chat.id, chat.title]));
  return local.map(chat => chat.title === "New song" && chat.sessionId && titles.get(chat.sessionId)
    ? { ...chat, title: titles.get(chat.sessionId)! } : chat);
}

export function restoreChatIndex(entries: ChatEntry[], read: (id: string) => string | null): ChatEntry[] {
  return entries.map(entry => {
    if (entry.sessionId) return entry;
    try {
      const saved = JSON.parse(read(entry.id) || "null");
      return typeof saved?.sessionId === "string" ? { ...entry, sessionId: saved.sessionId } : entry;
    } catch { return entry; }
  });
}

export function unmatchedServerChats(local: ChatEntry[], server: ChatEntry[], activeSession: string | null): ChatEntry[] {
  const sessions = new Set(local.map(entry => entry.sessionId).filter(Boolean));
  if (activeSession) sessions.add(activeSession);
  return server.filter(entry => !sessions.has(entry.id));
}
