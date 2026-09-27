"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "./auth";
import type { BridgeStatus } from "./bridge-status";
import { liveSetMessage } from "./live-set-status";

export function useAbletonLaunch(status: BridgeStatus, userId?: number) {
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    setWaiting(false); setMessage(""); setFailed(false); setBusy(false);
    return () => { const controller = request.current; request.current = null; controller?.abort(); };
  }, [userId]);
  const open = useCallback(async () => {
    if (request.current) return false;
    setFailed(false);
    if (status !== "connected") {
      setWaiting(status !== "signed-out");
      setMessage(status === "signed-out" ? "Sign-in required to open Ableton." : "Ableton launch waiting for Bridge connection.");
      return false;
    }
    const controller = new AbortController(); request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 30000);
    setWaiting(false); setBusy(true); setMessage("Opening Ableton...");
    try {
      const response = await apiFetch("/api/live-set", { method: "POST", signal: controller.signal, body: JSON.stringify({ operation: "activate" }) });
      const result = await response.json();
      if (!response.ok || !["observed", "verified"].includes(result.status)) {
        throw new Error(typeof result.detail === "string" ? result.detail : result.summary || "Ableton launch was not confirmed.");
      }
      if (controller.signal.aborted) return false;
      setMessage(result.summary || "Ableton launch confirmed. No Live Set was changed.");
      return true;
    } catch (error) {
      if (request.current === controller) {
        setFailed(true); setMessage(liveSetMessage(error instanceof Error && error.name !== "AbortError" ? error.message : "Ableton launch was not confirmed. Check the application before retrying."));
      }
      return false;
    } finally { clearTimeout(timeout); if (request.current === controller) { request.current = null; setBusy(false); } }
  }, [status]);
  useEffect(() => { if (waiting && status === "connected") void open(); }, [waiting, status, open]);
  useEffect(() => { if (status === "signed-out") setWaiting(false); }, [status]);
  return { open, busy, waiting, message, failed, cancel: () => { setWaiting(false); setMessage("Ableton launch canceled."); } };
}
