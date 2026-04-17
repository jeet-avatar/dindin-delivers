/**
 * NetSuite TBA session service.
 * Reads JWT from in-memory token via api.ts (never localStorage — CLAUDE.md law).
 */
import { getAccessToken } from "./api";

export interface TBACredentials {
  account_id: string;
  token_key: string;
  token_secret: string;
  consumer_key: string;
  consumer_secret: string;
}

export interface NetSuiteStatus {
  authenticated: boolean;
  account_name?: string;
  account_id?: string;
  authenticated_at?: string;
}

export interface AuthenticateResponse {
  authenticated: boolean;
  account_name?: string;
  message: string;
}

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export const netsuiteService = {
  authenticate: async (creds: TBACredentials): Promise<AuthenticateResponse> => {
    const resp = await fetch("/api/netsuite/authenticate", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(creds),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ detail: "Connection failed" }));
      throw new Error(err.detail || "Authentication failed");
    }
    return resp.json();
  },

  getStatus: async (): Promise<NetSuiteStatus> => {
    const resp = await fetch("/api/netsuite/status", {
      headers: authHeaders(),
    });
    if (!resp.ok) {
      return { authenticated: false };
    }
    return resp.json();
  },

  logout: async (): Promise<{ message: string }> => {
    const resp = await fetch("/api/netsuite/logout", {
      method: "POST",
      headers: authHeaders(),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ detail: "Logout failed" }));
      throw new Error(err.detail || "Logout failed");
    }
    return resp.json();
  },
};
