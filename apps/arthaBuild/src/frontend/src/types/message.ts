export type Role = "user" | "assistant" | "system" | "thinking";

export type Message = {
  id: string;
  role: Role;
  content: string;
  createdAt: string;
  removeLoading?: () => void;
  intent?: string;
};