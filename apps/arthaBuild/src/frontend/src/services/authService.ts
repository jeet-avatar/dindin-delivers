import { storage } from "../lib/storage";
import { setAccessToken, getAccessToken } from "./api";

interface RegisterPayload {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  organization: string;
}

interface UserCheckResponse {
  success: boolean;
}

export function loginWithGoogle(): void {
  window.location.href = "/api/auth/google";
}

export async function checkEmail(email: string): Promise<boolean> {
  const resp = await fetch("/api/auth/check-user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!resp.ok) throw new Error("Failed to check email");
  const data: UserCheckResponse = await resp.json();
  return Boolean(data.success);
}

export async function login(credentials: { username: string; password: string }) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || "Invalid email or password");
  }

  const data = await response.json();

  // Token in memory only — never localStorage (CLAUDE.md law)
  setAccessToken(data.access_token);

  // User profile (non-sensitive) stored for UI display
  const user = {
    name: data.first_name + " " + data.last_name,
    first_name: data.first_name,
    last_name: data.last_name,
    role: (data.role as "admin" | "user") || "user",
    email: data.email,
  };
  storage.set("auth_user", user);

  return { ...data, user };
}

export async function register(payload: RegisterPayload) {
  const resp = await fetch("/api/user/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.detail || err.message || "Failed to register");
  }
  return resp.json();
}

export async function forgotPassword(email: string): Promise<void> {
  const resp = await fetch("/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!resp.ok) throw new Error("Failed to send reset link");
}

export async function resetPassword(token: string, password: string) {
  const resp = await fetch("/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });
  if (!resp.ok) throw new Error("Failed to reset password");
  return resp.json();
}

export async function logout() {
  try {
    const token = getAccessToken();
    if (token) {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
      });
    }
  } catch {
    // Ignore errors — always clean up client state regardless
  }
  setAccessToken(null);
  storage.remove("auth_user");
}

export function currentUser() {
  return storage.get("auth_user");
}

export async function getProfile(): Promise<{
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  is_verified: boolean;
}> {
  const token = getAccessToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const resp = await fetch("/api/user/me", { headers });
  if (!resp.ok) throw new Error("Failed to load profile");
  return resp.json();
}

export async function changePassword(old_password: string, new_password: string): Promise<void> {
  const token = getAccessToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const resp = await fetch("/api/user/change-password", {
    method: "POST",
    headers,
    body: JSON.stringify({ old_password, new_password }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({})) as { detail?: string };
    throw new Error(err.detail || "Failed to change password");
  }
}

export async function resendVerification(email: string): Promise<void> {
  const resp = await fetch("/api/user/resend-verification", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({})) as { detail?: string };
    throw new Error(err.detail || "Failed to resend verification");
  }
}

export async function patchUser(data: { first_name?: string; last_name?: string }): Promise<void> {
  const token = getAccessToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const resp = await fetch("/api/user/me", {
    method: "PATCH",
    headers,
    body: JSON.stringify(data),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({})) as { detail?: string };
    throw new Error(err.detail || "Failed to update profile");
  }
}
