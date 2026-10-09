import { observePollingResponse } from "./background-polling";

const TOKEN_KEY = "beatmind_token";
const USER_KEY = "beatmind_user";

export interface User {
  id: number;
  email: string;
  name: string;
  subscription_status: string;
  trial_ends_at: string | null;
  subscribed: boolean;
  plan?: string | null;
  /** MixMind is included in the user's plan (Studio, MixMind or a combo). */
  mixmind_access?: boolean;
}

export function saveAuth(token: string, user: User) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const url = path.startsWith("/") ? `${API_URL}${path}` : path;
  const res = await fetch(url, { ...options, headers });
  observePollingResponse(res);
  return res;
}
