import { Chat } from "../types/chat";
import { Message } from "../types/message";

const now = new Date();

const makeMessage = (role: "user" | "ai", text: string, minutesAgo = 0): Message => ({
  id: Math.random().toString(36).slice(2, 9),
  role,
  text,
  createdAt: new Date(now.getTime() - minutesAgo * 60 * 1000).toISOString(),
});

export const mockChats: Chat[] = [
  // {
  //   id: "c1",
  //   title: "Shopping list assistant",
  //   messages: [
  //     makeMessage("user", "Help me plan a grocery list for a week", 120),
  //     makeMessage("ai", "Here's a suggested list...", 118),
  //   ],
  //   createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString(),
  //   updatedAt: now.toISOString(),
  // },
  // {
  //   id: "c2",
  //   title: "React hooks help",
  //   messages: [
  //     makeMessage("user", "Explain useEffect vs useLayoutEffect", 60),
  //     makeMessage("ai", "useEffect runs after paint...", 58),
  //   ],
  //   createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 48).toISOString(),
  //   updatedAt: now.toISOString(),
  // },
];
