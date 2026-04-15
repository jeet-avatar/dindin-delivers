import { getAccessToken } from "./api";

function adminHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getAccessToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: "admin" | "user";
  created_at: string;
}

export interface AdminChat {
  id: number;
  title: string;
  updated_at: string;
  user_email: string;
  user_name: string;
}

export async function listTeamMembers(): Promise<TeamMember[]> {
  const resp = await fetch("/api/admin/team", { headers: adminHeaders() });
  if (!resp.ok) throw new Error("Failed to load team members");
  return resp.json();
}

export async function listAllTeamChats(): Promise<AdminChat[]> {
  const resp = await fetch("/api/admin/chats", { headers: adminHeaders() });
  if (!resp.ok) throw new Error("Failed to load team chats");
  return resp.json();
}

export async function inviteMember(email: string): Promise<{ message: string }> {
  const resp = await fetch("/api/admin/team/invite", {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({ email }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({})) as { detail?: string };
    throw new Error(err.detail || "Invite failed");
  }
  return resp.json();
}

export async function removeMember(userId: number): Promise<void> {
  const resp = await fetch(`/api/admin/team/${userId}`, {
    method: "DELETE",
    headers: adminHeaders(),
  });
  if (!resp.ok) throw new Error("Failed to remove member");
}

// ---- New interfaces ----

export interface AdminStats {
  total_users: number;
  total_chats: number;
  active_sessions: number;
  scripts_deployed: number;
}

export interface AuditEntry {
  id: number;
  action: string;
  actor_email: string;
  target_user_id: number | null;
  detail: string | null;
  created_at: string;
  // Phase 12 additions — SOC2 audit expansion
  actor_role?: string;
  result?: string;       // 'success' | 'failure'
  ip_address?: string;
  target?: string;       // dot-notation target e.g. 'user.123'
}

// ---- New functions ----

export async function getStats(): Promise<AdminStats> {
  const resp = await fetch("/api/admin/stats", { headers: adminHeaders() });
  if (!resp.ok) throw new Error("Failed to load stats");
  return resp.json();
}

export async function listUsers(): Promise<TeamMember[]> {
  const resp = await fetch("/api/admin/users", { headers: adminHeaders() });
  if (!resp.ok) throw new Error("Failed to load users");
  return resp.json();
}

export async function changeRole(userId: number, role: "admin" | "user"): Promise<void> {
  const resp = await fetch(`/api/admin/users/${userId}/role`, {
    method: "PATCH",
    headers: adminHeaders(),
    body: JSON.stringify({ role }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({})) as { detail?: string };
    throw new Error(err.detail || "Failed to change role");
  }
}

export async function deleteUser(userId: number): Promise<void> {
  const resp = await fetch(`/api/admin/users/${userId}`, {
    method: "DELETE",
    headers: adminHeaders(),
  });
  if (!resp.ok) throw new Error("Failed to remove user");
}

export async function getAuditLog(): Promise<AuditEntry[]> {
  const resp = await fetch("/api/admin/audit", { headers: adminHeaders() });
  if (!resp.ok) throw new Error("Failed to load audit log");
  return resp.json();
}

export async function sendPasswordReset(userId: number): Promise<void> {
  const resp = await fetch(`/api/admin/users/${userId}/send-reset`, {
    method: "POST",
    headers: adminHeaders(),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({})) as { detail?: string };
    throw new Error(err.detail || "Failed to send password reset email");
  }
}
