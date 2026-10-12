"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "./auth";
import { backgroundPollingAllowed } from "./background-polling";
import { bridgeStatusFromResponse, type BridgeStatus } from "./bridge-status";

export function useBridgeStatus(userId: number | undefined) {
  const [snapshot, setSnapshot] = useState<{ userId?: number; status: BridgeStatus; liveSet?: string | null; liveSetIssue?: string | null }>({ status: "checking" });
  const checkRef = useRef<(() => void) | null>(null);
  const refresh = useCallback(() => checkRef.current?.(), []);

  useEffect(() => {
    if (userId === undefined) return;
    let active = true;
    let inFlight = false;
    let controller: AbortController | null = null;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let poll: ReturnType<typeof setTimeout> | undefined;
    let currentStatus: BridgeStatus = "checking";
    const check = async () => {
      if (!active || inFlight) return;
      if (!backgroundPollingAllowed()) {
        clearTimeout(poll);
        poll = setTimeout(check, 5000);
        return;
      }
      clearTimeout(poll);
      inFlight = true;
      controller = new AbortController();
      timeout = setTimeout(() => controller?.abort(), 8000);
      try {
        const response = await apiFetch("/api/bridge/status?include_live_set=false", { signal: controller.signal });
        const data = await response.json().catch(() => null) as Record<string, unknown> | null;
        currentStatus = bridgeStatusFromResponse(response.status, data);
        if (active) setSnapshot(previous => ({ userId, status: currentStatus,
          liveSet: currentStatus === "connected" && previous.userId === userId ? previous.liveSet : null,
          liveSetIssue: currentStatus === "connected" && previous.userId === userId ? previous.liveSetIssue : null }));
      } catch {
        currentStatus = "unavailable";
        if (active) setSnapshot({ userId, status: currentStatus });
      } finally {
        clearTimeout(timeout);
        inFlight = false;
        if (active) poll = setTimeout(check, currentStatus === "disconnected" || currentStatus === "checking" ? 1000 : 5000);
      }
    };
    const visible = () => { if (document.visibilityState === "visible") void check(); };
    checkRef.current = check;
    void check();

    window.addEventListener("focus", check);
    window.addEventListener("online", check);
    document.addEventListener("visibilitychange", visible);
    return () => {
      active = false;
      controller?.abort();
      clearTimeout(timeout);
      clearTimeout(poll);
      checkRef.current = null;
      window.removeEventListener("focus", check);
      window.removeEventListener("online", check);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [userId]);

  // Ableton inspection can take several seconds. It must never delay the connection badge.
  const connected = snapshot.userId === userId && snapshot.status === "connected";
  useEffect(() => {
    if (userId === undefined || !connected) return;
    let active = true;
    let inFlight = false;
    let controller: AbortController | null = null;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const inspect = async () => {
      if (!active || inFlight || !backgroundPollingAllowed()) return;
      inFlight = true;
      controller = new AbortController();
      timeout = setTimeout(() => controller?.abort(), 8000);
      try {
        const response = await apiFetch("/api/bridge/status", { signal: controller.signal });
        const data = await response.json().catch(() => null) as Record<string, unknown> | null;
        if (!active || bridgeStatusFromResponse(response.status, data) !== "connected") return;
        const liveSet = typeof data?.live_set === "string" ? data.live_set : null;
        const liveSetIssue = typeof data?.live_set_issue === "string" ? data.live_set_issue : null;
        setSnapshot(previous => previous.userId === userId && previous.status === "connected"
          ? { ...previous, liveSet, liveSetIssue } : previous);
      } catch {
        // A slow or unavailable Ableton inspection is separate from Bridge connectivity.
        if (active) setSnapshot(previous => previous.userId === userId && previous.status === "connected"
          ? { ...previous, liveSet: null, liveSetIssue: "Unable to check the open Ableton set." } : previous);
      } finally {
        clearTimeout(timeout);
        inFlight = false;
      }
    };
    const visible = () => { if (document.visibilityState === "visible") void inspect(); };
    void inspect();
    const poll = setInterval(inspect, 15000);
    window.addEventListener("focus", inspect);
    document.addEventListener("visibilitychange", visible);
    return () => {
      active = false;
      controller?.abort();
      clearTimeout(timeout);
      clearInterval(poll);
      window.removeEventListener("focus", inspect);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [userId, connected]);

  const match = snapshot.userId === userId;
  return { status: match ? snapshot.status : "checking" as BridgeStatus, liveSet: match ? snapshot.liveSet : null,
    liveSetIssue: match ? snapshot.liveSetIssue : null, refresh };
}
