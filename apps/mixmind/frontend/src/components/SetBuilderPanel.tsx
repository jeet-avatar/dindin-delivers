// src/components/SetBuilderPanel.tsx
import { useState, useRef } from 'react';
import { Track } from '../types/track';

// ── Transition scoring (local copy — matches AIChatSidebar logic) ────────────

function camelotScore(a: string, b: string): 0 | 1 | 2 {
  if (!a || !b) return 1;
  const numA = parseInt(a.slice(0, -1), 10);
  const letterA = a.slice(-1).toUpperCase();
  const numB = parseInt(b.slice(0, -1), 10);
  const letterB = b.slice(-1).toUpperCase();

  if (isNaN(numA) || isNaN(numB) || !['A', 'B'].includes(letterA) || !['A', 'B'].includes(letterB)) {
    return 1;
  }

  if (numA === numB && letterA === letterB) return 2;
  if (numA === numB && letterA !== letterB) return 2;

  if (letterA === letterB) {
    const dist = Math.min(Math.abs(numA - numB), 12 - Math.abs(numA - numB));
    if (dist <= 1) return 2;
    if (dist <= 2) return 1;
    return 0;
  }

  return 0;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const TRANSITION_COLORS: Record<string, string> = {
  perfect: '#34d399',
  ok: '#fbbf24',
  clash: '#f87171',
};

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  tracks: Track[];
  onRemove: (contentId: string) => void;
  onReorder: (fromIdx: number, toIdx: number) => void;
  onClear: () => void;
  onExportToUsb?: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export function SetBuilderPanel({ tracks, onRemove, onReorder, onClear, onExportToUsb }: Props) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const dragOverIdx = useRef<number | null>(null);

  // ── CSV export ──

  function exportCSV() {
    const header = 'title,artist,bpm,camelot,duration,genre,label';
    const rows = tracks.map(t => {
      const esc = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`;
      return [
        esc(t.title), esc(t.artist), Math.round(t.bpm),
        esc(t.camelot), formatDuration(t.duration_sec),
        esc(t.genre ?? ''), esc(t.label ?? ''),
      ].join(',');
    });
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mixmind-set-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Drag handlers ──

  function handleDragStart(idx: number) {
    setDragIdx(idx);
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    dragOverIdx.current = idx;
  }

  function handleDrop() {
    if (dragIdx !== null && dragOverIdx.current !== null && dragIdx !== dragOverIdx.current) {
      onReorder(dragIdx, dragOverIdx.current);
    }
    setDragIdx(null);
    dragOverIdx.current = null;
  }

  // ── Transition scoring ──

  function getTransition(fromTrack: Track, toTrack: Track) {
    const score = camelotScore(fromTrack.camelot, toTrack.camelot);
    const avgBpm = (fromTrack.bpm + toTrack.bpm) / 2;
    const bpmJump = avgBpm > 0 ? (Math.abs(fromTrack.bpm - toTrack.bpm) / avgBpm) * 100 : 0;

    let overall: 'perfect' | 'ok' | 'clash';
    if (score === 0 || bpmJump >= 6) {
      overall = 'clash';
    } else if (score === 2 && bpmJump < 3) {
      overall = 'perfect';
    } else {
      overall = 'ok';
    }

    return { score, bpmJump, overall };
  }

  // ── Totals ──

  const totalMin = Math.round(tracks.reduce((s, t) => s + t.duration_sec, 0) / 60);

  // ── BPM arc ──

  function renderBpmArc() {
    if (tracks.length < 2) return null;
    const bpms = tracks.map(t => t.bpm);
    const minBpm = Math.min(...bpms);
    const maxBpm = Math.max(...bpms);
    const range = maxBpm - minBpm || 1;

    return (
      <div style={{ padding: '0 16px 8px' }}>
        <div style={{ fontSize: '9px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
          BPM Arc
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '32px' }}>
          {tracks.map((t, i) => {
            const ratio = (t.bpm - minBpm) / range;
            const height = Math.max(4, ratio * 28 + 4);
            let barColor: string;
            if (ratio < 0.4) barColor = '#a855f7';
            else if (ratio < 0.7) barColor = '#fbbf24';
            else barColor = '#f87171';
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                <div style={{
                  width: '100%', maxWidth: '14px',
                  height: `${height}px`, borderRadius: '2px',
                  background: barColor, opacity: 0.85,
                }} />
                <span style={{ fontSize: '7px', color: 'var(--text-secondary)', lineHeight: 1 }}>
                  {Math.round(t.bpm)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Render ──

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-void)' }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px',
        borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        <div style={{
          width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
          background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Set Builder</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            {tracks.length} tracks {totalMin > 0 && <>&middot; {totalMin} min</>}
          </div>
        </div>
        {tracks.length > 0 && (
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={exportCSV}
              style={{
                fontSize: '11px', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer',
                background: 'rgba(124,58,237,0.15)', color: '#a78bfa',
                border: '1px solid rgba(124,58,237,0.25)', fontFamily: 'var(--font)', fontWeight: 500,
              }}
            >
              Export CSV
            </button>
            {onExportToUsb && (
              <button
                onClick={onExportToUsb}
                style={{
                  fontSize: '11px', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer',
                  background: 'rgba(74,170,255,0.15)', color: '#4af',
                  border: '1px solid rgba(74,170,255,0.3)', fontFamily: 'var(--font)', fontWeight: 500,
                }}
                title="Export selected tracks to a Pioneer-format USB (CDJ-3000 compatible)"
              >
                💾 Export to USB
              </button>
            )}
            <button
              onClick={onClear}
              style={{
                fontSize: '11px', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer',
                background: 'rgba(248,113,113,0.1)', color: '#f87171',
                border: '1px solid rgba(248,113,113,0.2)', fontFamily: 'var(--font)', fontWeight: 500,
              }}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* BPM Arc */}
      {renderBpmArc()}

      {/* Track list or empty state */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
        {tracks.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            height: '100%', gap: '12px', color: 'var(--text-secondary)',
          }}>
            <div style={{
              width: '48px', height: '48px', background: 'var(--bg-surface)', borderRadius: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.75" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </div>
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>No tracks in set</div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textAlign: 'center', maxWidth: '220px' }}>
              Click the <span style={{ color: '#a78bfa', fontWeight: 600 }}>+ Set</span> button on any track row to add it here
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {tracks.map((t, i) => {
              const prevTrack = i > 0 ? tracks[i - 1] : null;
              const transition = prevTrack ? getTransition(prevTrack, t) : null;
              const transColor = transition ? TRANSITION_COLORS[transition.overall] : '';

              return (
                <div key={t.content_id}>
                  {/* Transition indicator */}
                  {transition && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '3px 0 3px 30px', fontSize: '9px', color: transColor,
                    }}>
                      <span style={{ fontSize: '8px' }}>{'\u2193'}</span>
                      <span style={{
                        padding: '1px 5px', borderRadius: '3px',
                        background: `${transColor}18`, fontWeight: 600,
                      }}>
                        {prevTrack!.camelot}{'\u2192'}{t.camelot}
                      </span>
                      <span style={{ opacity: 0.8 }}>{transition.bpmJump.toFixed(1)}%</span>
                      <span style={{
                        padding: '1px 5px', borderRadius: '3px',
                        background: `${transColor}25`, fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.03em',
                      }}>
                        {transition.overall}
                      </span>
                    </div>
                  )}

                  {/* Track row */}
                  <div
                    draggable
                    onDragStart={() => handleDragStart(i)}
                    onDragOver={e => handleDragOver(e, i)}
                    onDrop={handleDrop}
                    onDragEnd={() => { setDragIdx(null); dragOverIdx.current = null; }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '7px 8px', borderRadius: '6px',
                      background: dragIdx === i ? 'rgba(124,58,237,0.08)' : 'transparent',
                      cursor: 'grab', transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => {
                      if (dragIdx === null) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
                    }}
                    onMouseLeave={e => {
                      if (dragIdx !== i) (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }}
                  >
                    {/* Drag handle */}
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', cursor: 'grab', flexShrink: 0, userSelect: 'none' }}>
                      {'\u2801\u2801\u2801'}
                    </span>

                    {/* Index */}
                    <span style={{
                      fontSize: '11px', color: 'var(--text-secondary)', width: '18px',
                      textAlign: 'right', flexShrink: 0, fontFeatureSettings: '"tnum"',
                    }}>
                      {i + 1}
                    </span>

                    {/* Title + Artist */}
                    <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                      <div style={{
                        fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {t.title}
                      </div>
                      <div style={{
                        fontSize: '10px', color: 'var(--text-secondary)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {t.artist}
                      </div>
                    </div>

                    {/* Camelot badge */}
                    <span style={{
                      fontSize: '10px', fontWeight: 600, padding: '1px 6px', borderRadius: '4px',
                      background: 'rgba(124,58,237,0.12)', color: '#a78bfa', flexShrink: 0,
                    }}>
                      {t.camelot}
                    </span>

                    {/* BPM */}
                    <span style={{
                      fontSize: '11px', color: 'var(--text-secondary)', fontFeatureSettings: '"tnum"',
                      flexShrink: 0, width: '36px', textAlign: 'right',
                    }}>
                      {Math.round(t.bpm)}
                    </span>

                    {/* Duration */}
                    <span style={{
                      fontSize: '10px', color: 'var(--text-tertiary)', fontFeatureSettings: '"tnum"',
                      flexShrink: 0, width: '36px', textAlign: 'right',
                    }}>
                      {formatDuration(t.duration_sec)}
                    </span>

                    {/* Remove button */}
                    <button
                      onClick={e => { e.stopPropagation(); onRemove(t.content_id); }}
                      style={{
                        width: '22px', height: '22px', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', borderRadius: '4px', cursor: 'pointer',
                        color: 'var(--text-tertiary)', background: 'none', border: 'none', flexShrink: 0,
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.color = '#f87171';
                        (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.1)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)';
                        (e.currentTarget as HTMLElement).style.background = 'none';
                      }}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
