/**
 * NotificationBanner — Phase 17
 * Polls /health/detail every 60 seconds and displays a yellow dismissible
 * banner when the system has a problem (Ollama down, disk low, license invalid).
 *
 * Renders nothing if:
 *   - No warnings are detected
 *   - /health/detail returns 401 (non-admin user)
 *   - The banner has been dismissed by the user
 */
import React, { useEffect, useState, useCallback } from "react";
import { AlertTriangle, X } from "lucide-react";
import { getAccessToken } from "../services/api";

interface HealthDetail {
  ai_ready?: boolean;
  disk_free_gb?: number;
  license_valid?: boolean;
}

const POLL_INTERVAL_MS = 60_000; // 60 seconds

export default function NotificationBanner() {
  const [warnings, setWarnings] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState(false);

  const checkHealth = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;

    try {
      const res = await fetch("/health/detail", {
        headers: { Authorization: `Bearer ${token}` },
      });

      // 401 = non-admin user; render nothing
      if (res.status === 401 || res.status === 403) return;
      if (!res.ok) return;

      const data: HealthDetail = await res.json();
      const found: string[] = [];

      if (data.ai_ready === false) {
        found.push("AI model unavailable — answers may be degraded");
      }
      if (typeof data.disk_free_gb === "number" && data.disk_free_gb < 5) {
        found.push(
          `Disk space low (${data.disk_free_gb.toFixed(1)} GB free) — contact your admin`
        );
      }
      if (data.license_valid === false) {
        found.push("License invalid — some features may be restricted");
      }

      if (found.length > 0) {
        setWarnings(found);
        setDismissed(false); // re-show if new warnings appear after dismiss
      } else {
        setWarnings([]);
      }
    } catch {
      // non-fatal — network errors should not surface to user
    }
  }, []);

  // Initial check + polling
  useEffect(() => {
    checkHealth();
    const timer = setInterval(checkHealth, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [checkHealth]);

  if (dismissed || warnings.length === 0) return null;

  return (
    <div className="flex items-start gap-3 px-4 py-3 bg-amber-900/30 border-b border-amber-700/40 text-amber-200">
      <AlertTriangle
        size={16}
        className="text-amber-400 flex-shrink-0 mt-0.5"
      />
      <div className="flex-1 text-xs leading-relaxed space-y-0.5">
        {warnings.map((w, i) => (
          <div key={i}>{w}</div>
        ))}
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="p-0.5 rounded text-amber-400 hover:text-amber-200 transition-colors flex-shrink-0"
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </div>
  );
}
