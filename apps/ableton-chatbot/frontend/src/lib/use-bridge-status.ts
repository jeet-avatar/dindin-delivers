"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "./auth";
import { bridgeStatusFromResponse, type BridgeStatus } from "./bridge-status";

export function useBridgeStatus(userId: number | undefined) {
  const [snapshot, setSnapshot] = useState<{ userId?: number; status: BridgeStatus }>({ status: "checking" });
  const checkRef = useRef<(() => void) | null>(null);
  const refresh = useCallback(() => checkRef.current?.(), []);

  useEffect(() => {
    if (userId === undefined) return;
    let active = true;
    let inFlight = false;
    let controller: AbortController | null = null;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const check = async () => {
      if (!active || inFlight) return;
      inFlight = true;
      controller = new AbortController();
      timeout = setTimeout(() => controller?.abort(), 8000);
      try {
        const response = await apiFetch("/api/bridge/status", { signal: controller.signal });
        const data: unknown = await response.json().catch(() => null);
        if (active) setSnapshot({ userId, status: bridgeStatusFromResponse(response.status, data) });
      } catch {
        if (active) setSnapshot({ userId, status: "unavailable" });
      } finally {
        clearTimeout(timeout);
        inFlight = false;
      }
    };
    const visible = () => { if (document.visibilityState === "visible") void check(); };
    checkRef.current = check;
    void check();
    const poll = setInterval(check, 5000);
    window.addEventListener("focus", check);
    window.addEventListener("online", check);
    document.addEventListener("visibilitychange", visible);
    return () => {
      active = false;
      controller?.abort();
      clearTimeout(timeout);
      clearInterval(poll);
      checkRef.current = null;
      window.removeEventListener("focus", check);
      window.removeEventListener("online", check);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [userId]);

  // An account change must not briefly show the previous account's connection.
  return { status: snapshot.userId === userId ? snapshot.status : "checking" as BridgeStatus, refresh };
}
