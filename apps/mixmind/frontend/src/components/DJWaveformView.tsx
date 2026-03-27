// src/components/DJWaveformView.tsx
// Layout C — Pioneer CDJ-3000 style split-pane waveform view
// Left: overview strip (full track). Right: zoomed view (±32 beats).
// Bottom: transport bar with hot cue buttons + Beat 1 anchor.
//
// CDJ-3000 colors:
//   Low band:  #FF2D55  (red)
//   Mid band:  #00E726  (green)
//   High band: #00BFFF  (sky blue)
//   Section overlays: per-kind colors at 0x30 opacity
//   Hot cue markers: per Pioneer ColorTableIndex palette
//   Memory cues:     #33FF9E (mint green)

import { useRef, useEffect, useState, useCallback } from 'react';
import { Track, TrackAnlzData, HotCueEntry, Waveform4Stem } from '../types/track';
import { sidecarGet } from '../hooks/useSidecar';

// ---------------------------------------------------------------------------
// CDJ-3000 Waveform Colors
// ---------------------------------------------------------------------------

const CDJ_LOW   = '#FF2D55';
const CDJ_MID   = '#00E726';
const CDJ_HIGH  = '#00BFFF';
const CDJ_MONO  = '#6366f1'; // fallback purple if no 3-band data
const FIRST_BEAT_COLOR = '#FFD60A'; // gold marker for first downbeat

// 4-stem colors (Demucs analysis)
const STEM_DRUMS  = '#FF9500';  // orange
const STEM_BASS   = '#8B00FF';  // deep purple
const STEM_VOCALS = '#00E5FF';  // cyan
const STEM_OTHER  = '#FFD700';  // gold

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DJWaveformViewProps {
  track: Track;
  currentTime: number;   // seconds — from lifted MiniPlayer state
  duration: number;      // seconds
  onSeek: (sec: number) => void;
}

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function drawOverviewCanvas(
  canvas: HTMLCanvasElement,
  anlz: TrackAnlzData,
  duration: number,       // seconds
  currentTime: number,    // seconds
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  const durationMs = duration * 1000;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = 'var(--bg-surface, #0d0d0d)';
  ctx.fillRect(0, 0, W, H);

  if (durationMs <= 0) return;

  const msToX = (ms: number) => (ms / durationMs) * W;

  // ── Section overlays ──────────────────────────────────────────────────────
  for (const section of anlz.sections) {
    const x1 = msToX(section.start_ms);
    const x2 = msToX(section.end_ms);
    ctx.fillStyle = hexToRgba(section.color_hex, 0.18);
    ctx.fillRect(x1, 0, x2 - x1, H);
  }

  // ── Waveform bars ─────────────────────────────────────────────────────────
  const w4 = anlz.waveform_4stem;
  const wb = anlz.waveform_3band;
  const wp = anlz.waveform_preview;
  const waveLen = w4 ? w4.length : (wb ? wb.length : wp.length);

  if (waveLen > 0) {
    const barW = Math.max(1, W / waveLen);

    if (w4) {
      // 4-stem Demucs waveform (priority 1)
      const stems = [
        { key: 'drums'  as const, color: STEM_DRUMS,  weight: 0.30 },
        { key: 'bass'   as const, color: STEM_BASS,   weight: 0.25 },
        { key: 'vocals' as const, color: STEM_VOCALS, weight: 0.25 },
        { key: 'other'  as const, color: STEM_OTHER,  weight: 0.20 },
      ];
      for (let i = 0; i < w4.length; i++) {
        const x = (i / w4.length) * W;
        const col = w4[i];
        let yOffset = 0;
        for (const stem of stems) {
          const stemH = (col[stem.key] / 255) * H * stem.weight;
          ctx.fillStyle = hexToRgba(stem.color, 0.85);
          ctx.fillRect(x, H - yOffset - stemH, barW, stemH);
          yOffset += stemH;
        }
      }
    } else if (wb) {
      // CDJ-style 3-band colored bars
      for (let i = 0; i < wb.length; i++) {
        const x = (i / wb.length) * W;
        const col = wb[i];
        const lowH = (col.low / 255) * H * 0.4;
        ctx.fillStyle = hexToRgba(CDJ_LOW, 0.85);
        ctx.fillRect(x, H - lowH, barW, lowH);
        const midH = (col.mid / 255) * H * 0.3;
        ctx.fillStyle = hexToRgba(CDJ_MID, 0.85);
        ctx.fillRect(x, H - lowH - midH, barW, midH);
        const highH = (col.high / 255) * H * 0.3;
        ctx.fillStyle = hexToRgba(CDJ_HIGH, 0.85);
        ctx.fillRect(x, H - lowH - midH - highH, barW, highH);
      }
    } else if (wp.length > 0) {
      // Mono fallback
      for (let i = 0; i < wp.length; i++) {
        const x = (i / wp.length) * W;
        const barH = (wp[i] / 255) * H;
        ctx.fillStyle = hexToRgba(CDJ_MONO, 0.8);
        ctx.fillRect(x, H - barH, barW, barH);
      }
    }
  }

  // ── Beat grid ticks ───────────────────────────────────────────────────────
  for (const beat of anlz.beat_grid) {
    const x = msToX(beat.time_ms);
    if (beat.beat === 1) {
      // Downbeat: full height, brighter
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillRect(x, 0, 2, H);
    } else {
      // Off-beats: half height, dimmer
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(x, H / 2, 1, H / 2);
    }
  }

  // ── First beat marker (gold) ──────────────────────────────────────────────
  if (anlz.first_beat_ms > 0) {
    const fx = msToX(anlz.first_beat_ms);
    ctx.strokeStyle = FIRST_BEAT_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fx, 0);
    ctx.lineTo(fx, H);
    ctx.stroke();
    // Label "1" above the marker
    ctx.fillStyle = FIRST_BEAT_COLOR;
    ctx.font = 'bold 9px ui-monospace, monospace';
    ctx.fillText('1', fx + 3, 10);
  }

  // ── Memory cue triangles ──────────────────────────────────────────────────
  for (const mc of anlz.memory_cues) {
    const x = msToX(mc.time_ms);
    ctx.fillStyle = mc.color_hex;
    ctx.beginPath();
    ctx.moveTo(x, H);
    ctx.lineTo(x - 5, H - 9);
    ctx.lineTo(x + 5, H - 9);
    ctx.closePath();
    ctx.fill();
  }

  // ── Hot cue triangles ─────────────────────────────────────────────────────
  for (const hc of anlz.hot_cues) {
    const x = msToX(hc.time_ms);
    ctx.fillStyle = hc.color_hex;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x - 5, 9);
    ctx.lineTo(x + 5, 9);
    ctx.closePath();
    ctx.fill();
    // Slot letter
    ctx.fillStyle = '#000';
    ctx.font = 'bold 7px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(hc.slot, x, 8);
    ctx.textAlign = 'left';
  }

  // ── Playhead ──────────────────────────────────────────────────────────────
  if (duration > 0) {
    const px = (currentTime / duration) * W;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, H);
    ctx.stroke();
  }
}

function drawZoomedCanvas(
  canvas: HTMLCanvasElement,
  anlz: TrackAnlzData,
  duration: number,       // seconds
  centerTime: number,     // seconds — playhead or first_beat_ms
  beatsVisible: number,   // total beats to show (e.g. 64 = ±32)
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  const durationMs = duration * 1000;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = 'var(--bg-surface, #0d0d0d)';
  ctx.fillRect(0, 0, W, H);

  if (durationMs <= 0 || anlz.beat_grid.length === 0) return;

  // Compute visible window in ms from center
  const avgBpm = anlz.bpm > 0 ? anlz.bpm : 120;
  const msPerBeat = 60_000 / avgBpm;
  const halfWindowMs = (beatsVisible / 2) * msPerBeat;
  const centerMs = centerTime * 1000;
  const startMs = centerMs - halfWindowMs;
  const endMs   = centerMs + halfWindowMs;
  const windowMs = endMs - startMs;

  const msToX = (ms: number) => ((ms - startMs) / windowMs) * W;

  // ── Section overlays ──────────────────────────────────────────────────────
  for (const section of anlz.sections) {
    if (section.end_ms < startMs || section.start_ms > endMs) continue;
    const x1 = msToX(Math.max(section.start_ms, startMs));
    const x2 = msToX(Math.min(section.end_ms, endMs));
    ctx.fillStyle = hexToRgba(section.color_hex, 0.18);
    ctx.fillRect(x1, 0, x2 - x1, H);
  }

  // ── Waveform bars ─────────────────────────────────────────────────────────
  const w4 = anlz.waveform_4stem;
  const wb = anlz.waveform_3band;
  const wp = anlz.waveform_preview;
  const waveLen = w4 ? w4.length : (wb ? wb.length : wp.length);

  if (waveLen > 0) {
    // Map waveform column index to ms
    const iToMs = (i: number) => (i / waveLen) * durationMs;
    const startIdx = Math.max(0, Math.floor((startMs / durationMs) * waveLen));
    const endIdx   = Math.min(waveLen, Math.ceil((endMs / durationMs) * waveLen));
    const visibleLen = endIdx - startIdx;

    if (visibleLen > 0) {
      const barW = Math.max(1, W / visibleLen);

      if (w4) {
        // 4-stem Demucs waveform (priority 1)
        const stems = [
          { key: 'drums'  as const, color: STEM_DRUMS,  weight: 0.30 },
          { key: 'bass'   as const, color: STEM_BASS,   weight: 0.25 },
          { key: 'vocals' as const, color: STEM_VOCALS, weight: 0.25 },
          { key: 'other'  as const, color: STEM_OTHER,  weight: 0.20 },
        ];
        for (let i = startIdx; i < endIdx; i++) {
          const x = msToX(iToMs(i));
          const col = w4[i];
          let yOffset = 0;
          for (const stem of stems) {
            const stemH = (col[stem.key] / 255) * H * stem.weight;
            ctx.fillStyle = hexToRgba(stem.color, 0.85);
            ctx.fillRect(x, H - yOffset - stemH, barW, stemH);
            yOffset += stemH;
          }
        }
      } else if (wb) {
        for (let i = startIdx; i < endIdx; i++) {
          const x = msToX(iToMs(i));
          const col = wb[i];
          const lowH  = (col.low  / 255) * H * 0.4;
          const midH  = (col.mid  / 255) * H * 0.3;
          const highH = (col.high / 255) * H * 0.3;
          ctx.fillStyle = hexToRgba(CDJ_LOW,  0.85);
          ctx.fillRect(x, H - lowH, barW, lowH);
          ctx.fillStyle = hexToRgba(CDJ_MID,  0.85);
          ctx.fillRect(x, H - lowH - midH, barW, midH);
          ctx.fillStyle = hexToRgba(CDJ_HIGH, 0.85);
          ctx.fillRect(x, H - lowH - midH - highH, barW, highH);
        }
      } else {
        for (let i = startIdx; i < endIdx; i++) {
          const x = msToX(iToMs(i));
          const barH = (wp[i] / 255) * H;
          ctx.fillStyle = hexToRgba(CDJ_MONO, 0.8);
          ctx.fillRect(x, H - barH, barW, barH);
        }
      }
    }
  }

  // ── Beat grid ticks ───────────────────────────────────────────────────────
  for (const beat of anlz.beat_grid) {
    if (beat.time_ms < startMs || beat.time_ms > endMs) continue;
    const x = msToX(beat.time_ms);
    if (beat.beat === 1) {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillRect(x, 0, 2, H);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(x, H / 2, 1, H / 2);
    }
  }

  // ── First beat marker ─────────────────────────────────────────────────────
  if (anlz.first_beat_ms >= startMs && anlz.first_beat_ms <= endMs) {
    const fx = msToX(anlz.first_beat_ms);
    ctx.strokeStyle = FIRST_BEAT_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fx, 0);
    ctx.lineTo(fx, H);
    ctx.stroke();
    ctx.fillStyle = FIRST_BEAT_COLOR;
    ctx.font = 'bold 9px ui-monospace, monospace';
    ctx.fillText('1', fx + 3, 10);
  }

  // ── Memory cues ───────────────────────────────────────────────────────────
  for (const mc of anlz.memory_cues) {
    if (mc.time_ms < startMs || mc.time_ms > endMs) continue;
    const x = msToX(mc.time_ms);
    ctx.fillStyle = mc.color_hex;
    ctx.beginPath();
    ctx.moveTo(x, H);
    ctx.lineTo(x - 6, H - 11);
    ctx.lineTo(x + 6, H - 11);
    ctx.closePath();
    ctx.fill();
  }

  // ── Hot cues ──────────────────────────────────────────────────────────────
  for (const hc of anlz.hot_cues) {
    if (hc.time_ms < startMs || hc.time_ms > endMs) continue;
    const x = msToX(hc.time_ms);
    ctx.fillStyle = hc.color_hex;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x - 6, 11);
    ctx.lineTo(x + 6, 11);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.font = 'bold 8px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(hc.slot, x, 10);
    ctx.textAlign = 'left';
  }

  // ── Playhead (always centered) ────────────────────────────────────────────
  const px = W / 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(px, 0);
  ctx.lineTo(px, H);
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function DJWaveformView({ track, currentTime, duration, onSeek }: DJWaveformViewProps) {
  const [anlzData, setAnlzData]     = useState<TrackAnlzData | null>(null);
  const [loading,  setLoading]      = useState(false);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [zoomCenter, setZoomCenter] = useState<number>(0); // seconds — zoomed view center

  const overviewCanvasRef = useRef<HTMLCanvasElement>(null);
  const zoomedCanvasRef   = useRef<HTMLCanvasElement>(null);
  const overviewWrapRef   = useRef<HTMLDivElement>(null);
  const zoomedWrapRef     = useRef<HTMLDivElement>(null);
  const rafRef            = useRef<number>(0);

  // ── Fetch ANLZ data when track changes ────────────────────────────────────
  useEffect(() => {
    setAnlzData(null);
    setFetchFailed(false);
    if (!track.content_id) return;
    setLoading(true);

    sidecarGet<TrackAnlzData>(`/api/tracks/${track.content_id}/anlz`)
      .then(data => {
        setAnlzData(data);
        setFetchFailed(false);
        // Center zoomed view on first downbeat initially
        setZoomCenter(data.first_beat_ms / 1000);
      })
      .catch((err) => {
        console.error('[DJWaveformView] ANLZ fetch failed for', track.content_id, err);
        setAnlzData(null);
        setFetchFailed(true);
      })
      .finally(() => setLoading(false));
  }, [track.content_id]);

  // Keep zoom center tracking playhead during playback
  useEffect(() => {
    if (duration > 0 && currentTime > 0) {
      setZoomCenter(currentTime);
    }
  }, [currentTime, duration]);

  // ── Canvas resize helper ──────────────────────────────────────────────────
  const resizeCanvas = useCallback((canvas: HTMLCanvasElement | null, wrap: HTMLDivElement | null) => {
    if (!canvas || !wrap) return;
    canvas.width  = wrap.clientWidth;
    canvas.height = wrap.clientHeight;
  }, []);

  useEffect(() => {
    const resizeAll = () => {
      resizeCanvas(overviewCanvasRef.current, overviewWrapRef.current);
      resizeCanvas(zoomedCanvasRef.current, zoomedWrapRef.current);
    };
    resizeAll();
    window.addEventListener('resize', resizeAll);
    return () => window.removeEventListener('resize', resizeAll);
  }, [resizeCanvas]);

  // ── Render loop ───────────────────────────────────────────────────────────
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);

    const render = () => {
      rafRef.current = requestAnimationFrame(render);
      if (!anlzData) return;

      const ov = overviewCanvasRef.current;
      const zm = zoomedCanvasRef.current;

      if (ov && ov.width > 0) {
        drawOverviewCanvas(ov, anlzData, duration, currentTime);
      }
      if (zm && zm.width > 0) {
        drawZoomedCanvas(zm, anlzData, duration, zoomCenter, 64);
      }
    };

    render();
    return () => cancelAnimationFrame(rafRef.current);
  }, [anlzData, duration, currentTime, zoomCenter]);

  // ── Overview click → seek ─────────────────────────────────────────────────
  function handleOverviewClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = overviewCanvasRef.current;
    if (!canvas || duration <= 0) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const seekSec = ratio * duration;
    onSeek(seekSec);
    setZoomCenter(seekSec);
  }

  // ── Format helpers ────────────────────────────────────────────────────────
  function formatTime(sec: number) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  // ── No-show states ────────────────────────────────────────────────────────
  const noAnlz = !loading && fetchFailed;

  return (
    <div style={{
      background: 'var(--bg-surface, #0d0d0d)',
      borderTop: '1px solid var(--border, #1e1e1e)',
      borderBottom: '1px solid var(--border, #1e1e1e)',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* ── Track info bar ──────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '8px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        minHeight: '36px',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary, #e5e7eb)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {track.title}
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-secondary, #6b7280)', whiteSpace: 'nowrap' }}>
          {track.artist}
        </span>
        {anlzData && (
          <>
            <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', background: 'rgba(124,58,237,0.15)', color: '#a78bfa', whiteSpace: 'nowrap', fontFeatureSettings: '"tnum"' }}>
              {Math.round(anlzData.bpm > 0 ? anlzData.bpm : track.bpm)} BPM
            </span>
            <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary, #6b7280)', whiteSpace: 'nowrap' }}>
              {track.camelot}
            </span>
          </>
        )}
        <span style={{ fontSize: '10px', color: 'var(--text-tertiary, #374151)', fontFeatureSettings: '"tnum"', whiteSpace: 'nowrap' }}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      {/* ── Waveform panes ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', height: '88px', position: 'relative' }}>

        {/* Loading spinner */}
        {loading && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)', zIndex: 10,
          }}>
            <div style={{
              width: '20px', height: '20px',
              border: '2px solid #7c3aed', borderTopColor: 'transparent',
              borderRadius: '50%', animation: 'spin 0.8s linear infinite',
            }} />
          </div>
        )}

        {/* Partial ANLZ banner — waveform file not on this Mac */}
        {anlzData?.partial && (
          <div style={{
            position: 'absolute', top: 4, left: 8, right: 8,
            display: 'flex', alignItems: 'center', gap: '6px',
            pointerEvents: 'none', zIndex: 2,
          }}>
            <span style={{ fontSize: '10px', color: '#6b7280' }}>
              Waveform file not on this Mac — re-analyze in Rekordbox to see waveform
            </span>
          </div>
        )}

        {/* Hard fetch failure */}
        {noAnlz && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '8px',
          }}>
            <span style={{ fontSize: '11px', color: '#4b5563' }}>
              Could not load waveform data
            </span>
          </div>
        )}

        {/* Left pane: overview strip */}
        <div
          ref={overviewWrapRef}
          style={{ flex: '0 0 55%', borderRight: '1px solid rgba(255,255,255,0.06)', position: 'relative' }}
        >
          <canvas
            ref={overviewCanvasRef}
            onClick={handleOverviewClick}
            style={{ width: '100%', height: '100%', display: 'block', cursor: 'pointer' }}
          />
          {/* Section legend on hover could go here */}
          {anlzData?.waveform_4stem && (
            <div style={{
              position: 'absolute', top: 4, right: 4, display: 'flex', gap: '6px',
              fontSize: '8px', opacity: 0.7, pointerEvents: 'none',
            }}>
              {[
                { label: 'Drums', color: STEM_DRUMS },
                { label: 'Bass', color: STEM_BASS },
                { label: 'Vocals', color: STEM_VOCALS },
                { label: 'Other', color: STEM_OTHER },
              ].map(s => (
                <span key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '2px', color: 'rgba(255,255,255,0.7)' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
                  {s.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right pane: zoomed view */}
        <div
          ref={zoomedWrapRef}
          style={{ flex: '0 0 45%', position: 'relative' }}
        >
          <canvas
            ref={zoomedCanvasRef}
            style={{ width: '100%', height: '100%', display: 'block' }}
          />
          {/* Center playhead label */}
          {anlzData && (
            <div style={{
              position: 'absolute', bottom: '3px', left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '9px', color: 'rgba(255,255,255,0.3)',
              pointerEvents: 'none', whiteSpace: 'nowrap',
            }}>
              ZOOMED
            </div>
          )}
        </div>
      </div>

      {/* ── Transport bar ───────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '6px 12px',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        flexWrap: 'wrap',
        minHeight: '38px',
        flexShrink: 0,
      }}>

        {/* Hot cue buttons */}
        {anlzData && anlzData.hot_cues.length > 0 && (
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {anlzData.hot_cues.map((cue: HotCueEntry) => (
              <button
                key={cue.slot}
                onClick={() => {
                  const seekSec = cue.time_ms / 1000;
                  onSeek(seekSec);
                  setZoomCenter(seekSec);
                }}
                title={cue.label || `Hot Cue ${cue.slot}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: '28px', height: '22px',
                  background: hexToRgba(cue.color_hex, 0.2),
                  border: `1px solid ${hexToRgba(cue.color_hex, 0.5)}`,
                  borderRadius: '4px',
                  color: cue.color_hex,
                  fontSize: '10px', fontWeight: 700, fontFamily: 'ui-monospace, monospace',
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = hexToRgba(cue.color_hex, 0.35)}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = hexToRgba(cue.color_hex, 0.2)}
              >
                {cue.slot}
              </button>
            ))}
          </div>
        )}

        {/* Beat 1 anchor button */}
        {anlzData && (
          <button
            onClick={() => {
              const seekSec = anlzData.first_beat_ms / 1000;
              onSeek(seekSec);
              setZoomCenter(seekSec);
            }}
            title="Jump to first downbeat"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              padding: '3px 10px', height: '22px',
              background: 'rgba(255,214,10,0.12)',
              border: '1px solid rgba(255,214,10,0.35)',
              borderRadius: '4px',
              color: FIRST_BEAT_COLOR,
              fontSize: '10px', fontWeight: 700, fontFamily: 'ui-monospace, monospace',
              cursor: 'pointer',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,214,10,0.22)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,214,10,0.12)'}
          >
            <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3" stroke="#000" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
            Beat 1
          </button>
        )}

        {/* Spacer + section legend */}
        {anlzData && anlzData.sections.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto', flexWrap: 'wrap' }}>
            {Array.from(new Map(anlzData.sections.map(s => [s.kind, s]))).map(([, s]) => (
              <span
                key={s.kind}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  fontSize: '9px', color: 'rgba(255,255,255,0.45)',
                  letterSpacing: '0.04em',
                }}
              >
                <span style={{
                  width: '8px', height: '8px', borderRadius: '2px',
                  background: hexToRgba(s.color_hex, 0.6),
                  display: 'inline-block',
                }} />
                {s.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
