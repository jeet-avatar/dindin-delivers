// src/components/AnalyzeProgress.tsx
// Phase 21-05: Polls sidecar /api/analyze/status every 2s and renders a progress
// bar + ETA + current-track line while a batch is in flight.
//
// Field names match BatchStatus.to_dict() in apps/mixmind/sidecar/analyzer.py:
//   total, analyzed, failed, pending, in_progress, current_track (string),
//   current_index, eta_sec, avg_sec_per_track, failures[].
import { useEffect, useRef, useState } from 'react';
import { sidecarUrl } from '../hooks/useSidecar';

interface AnalyzeStatus {
  total: number;
  analyzed: number;
  failed: number;
  pending: number;
  in_progress: boolean;
  current_track: string;
  current_index: number;
  eta_sec: number;
  avg_sec_per_track: number;
  failures: Array<{ content_id?: string; error?: string }>;
}

export function AnalyzeProgress() {
  const [status, setStatus] = useState<AnalyzeStatus | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const tick = async () => {
      try {
        const res = await fetch(sidecarUrl('/api/analyze/status'));
        if (!res.ok) return;
        const data = (await res.json()) as AnalyzeStatus;
        if (mountedRef.current) setStatus(data);
      } catch {
        // sidecar may be restarting — swallow transient errors
      }
    };
    tick();
    const interval = setInterval(tick, 2000);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

  if (!status) return null;
  // Hide the component when there's no batch history at all (idle startup).
  if (!status.in_progress && status.total === 0) return null;

  const done = status.analyzed + status.failed;
  const pct = status.total > 0 ? Math.floor((done / status.total) * 100) : 0;
  const etaMin = status.eta_sec > 0 ? Math.ceil(status.eta_sec / 60) : 0;

  return (
    <div
      style={{
        padding: 12,
        background: '#1a1a1a',
        border: '1px solid #333',
        borderRadius: 8,
        margin: '8px 12px',
        color: '#eee',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontWeight: 600, fontSize: 13 }}>
          {status.in_progress ? '⚙️ Analyzing tracks' : '✅ Analysis complete'}
        </div>
        <div style={{ fontSize: 11, color: '#aaa' }}>
          {status.analyzed}/{status.total}
          {status.failed > 0 && <span style={{ color: '#f87171' }}> · {status.failed} failed</span>}
          {status.in_progress && etaMin > 0 && <span> · ~{etaMin} min</span>}
        </div>
      </div>

      <div
        style={{
          background: '#333',
          height: 6,
          borderRadius: 3,
          overflow: 'hidden',
          marginTop: 8,
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: '#4af',
            transition: 'width 0.4s ease',
          }}
        />
      </div>

      {status.current_track && status.in_progress && (
        <div
          style={{
            marginTop: 6,
            fontSize: 11,
            color: '#888',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={status.current_track}
        >
          Now: {status.current_track}
        </div>
      )}
    </div>
  );
}
