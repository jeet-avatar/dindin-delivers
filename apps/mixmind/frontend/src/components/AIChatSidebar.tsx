// src/components/AIChatSidebar.tsx
import { useState, useRef, useEffect } from 'react';
import { sidecarPost } from '../hooks/useSidecar';
import { AIPlaylistItem, Track } from '../types/track';

// ── Transition scoring helpers ────────────────────────────────────────────────

/**
 * Compute Camelot wheel distance between two keys.
 * Returns 2 (perfect), 1 (ok), or 0 (clash).
 *
 * Same key = 2, relative major/minor (same number, different letter) = 2,
 * +/-1 step same letter = 2, +/-2 steps same letter = 1, else 0.
 * Unknown keys = 1 (neutral).
 */
function camelotScore(a: string, b: string): 0 | 1 | 2 {
  if (!a || !b) return 1;
  const numA = parseInt(a.slice(0, -1), 10);
  const letterA = a.slice(-1).toUpperCase();
  const numB = parseInt(b.slice(0, -1), 10);
  const letterB = b.slice(-1).toUpperCase();

  if (isNaN(numA) || isNaN(numB) || !['A', 'B'].includes(letterA) || !['A', 'B'].includes(letterB)) {
    return 1; // unknown key format
  }

  // Same key
  if (numA === numB && letterA === letterB) return 2;
  // Relative major/minor (same number, different letter)
  if (numA === numB && letterA !== letterB) return 2;

  // Same letter — circular distance on 12-position wheel
  if (letterA === letterB) {
    const dist = Math.min(
      Math.abs(numA - numB),
      12 - Math.abs(numA - numB)
    );
    if (dist <= 1) return 2;
    if (dist <= 2) return 1;
    return 0;
  }

  // Different letter and different number
  return 0;
}

interface TransitionScore {
  keyScore: 0 | 1 | 2;
  bpmJumpPct: number;
  overall: 'perfect' | 'ok' | 'clash';
}

function scoreTransition(
  fromCamelot: string,
  fromBpm: number,
  toCamelot: string,
  toBpm: number,
): TransitionScore {
  const keyScore = camelotScore(fromCamelot, toCamelot);
  const avgBpm = (fromBpm + toBpm) / 2;
  const bpmJumpPct = avgBpm > 0 ? (Math.abs(fromBpm - toBpm) / avgBpm) * 100 : 0;

  let overall: 'perfect' | 'ok' | 'clash';
  if (keyScore === 0 || bpmJumpPct >= 6) {
    overall = 'clash';
  } else if (keyScore === 2 && bpmJumpPct < 3) {
    overall = 'perfect';
  } else {
    overall = 'ok';
  }

  return { keyScore, bpmJumpPct, overall };
}

// ── Component types ───────────────────────────────────────────────────────────

interface Message {
  role: 'user' | 'assistant';
  text: string;
  playlist?: AIPlaylistItem[];
  resolvedTracks?: (Track | null)[];
  transitionScores?: (TransitionScore | null)[];
}

interface Props {
  onPlaylistCreated: (name: string, items: AIPlaylistItem[]) => void;
  tracks: Track[];
}

// ── Color constants ───────────────────────────────────────────────────────────

const TRANSITION_COLORS: Record<'perfect' | 'ok' | 'clash', string> = {
  perfect: '#34d399',
  ok: '#fbbf24',
  clash: '#f87171',
};

// ── Component ─────────────────────────────────────────────────────────────────

export function AIChatSidebar({ onPlaylistCreated, tracks }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send() {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setLoading(true);
    try {
      const res = await sidecarPost<{ reply: string; playlist: AIPlaylistItem[] }>('/api/ai/chat', { message: msg });

      // Resolve playlist items to full Track objects
      let resolvedTracks: (Track | null)[] | undefined;
      let transitionScores: (TransitionScore | null)[] | undefined;

      if (res.playlist && res.playlist.length > 0) {
        resolvedTracks = res.playlist.map(item => {
          const found = tracks.find(t =>
            t.title.toLowerCase() === item.title.toLowerCase() &&
            t.artist.toLowerCase() === item.artist.toLowerCase()
          );
          return found ?? null;
        });

        transitionScores = resolvedTracks.map((t, i) => {
          if (i === 0) return null;
          const prev = resolvedTracks![i - 1];
          if (!prev || !t) return null;
          return scoreTransition(prev.camelot, prev.bpm, t.camelot, t.bpm);
        });

        onPlaylistCreated(`AI Set — ${new Date().toLocaleDateString()}`, res.playlist);
      }

      setMessages(prev => [
        ...prev,
        { role: 'assistant', text: res.reply, playlist: res.playlist, resolvedTracks, transitionScores },
      ]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'AI is offline. Check your connection.' }]);
    } finally {
      setLoading(false);
    }
  }

  const suggestions = [
    'Dark techno 128 BPM 2hr set',
    'Build a progressive set',
    'Find similar tracks to\u2026',
  ];

  // ── Render helpers ──────────────────────────────────────────────────────────

  function renderTransitionBadge(score: TransitionScore, fromCamelot: string, toCamelot: string) {
    const color = TRANSITION_COLORS[score.overall];
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '4px',
        padding: '2px 0', marginLeft: '18px',
        fontSize: '9px', color, lineHeight: 1,
      }}>
        <span style={{ fontSize: '8px' }}>{'\u2193'}</span>
        <span style={{
          padding: '1px 4px', borderRadius: '3px',
          background: `${color}18`, fontWeight: 600,
        }}>
          {fromCamelot}{'\u2192'}{toCamelot}
        </span>
        <span style={{ opacity: 0.8 }}>
          {score.bpmJumpPct.toFixed(1)}%
        </span>
        <span style={{
          padding: '1px 4px', borderRadius: '3px',
          background: `${color}25`, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.03em',
        }}>
          {score.overall}
        </span>
      </div>
    );
  }

  function renderEnergyArc(resolved: (Track | null)[]) {
    const bpms = resolved.map(t => t?.bpm ?? 0).filter(b => b > 0);
    if (bpms.length < 2) return null;
    const minBpm = Math.min(...bpms);
    const maxBpm = Math.max(...bpms);
    const range = maxBpm - minBpm || 1;

    return (
      <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid var(--border)' }}>
        <div style={{ fontSize: '9px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
          Energy arc
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '32px' }}>
          {resolved.map((t, i) => {
            const bpm = t?.bpm ?? 0;
            if (bpm <= 0) return <div key={i} style={{ flex: 1 }} />;
            const ratio = (bpm - minBpm) / range;
            const height = Math.max(4, ratio * 28 + 4);
            let barColor: string;
            if (ratio < 0.33) barColor = '#a855f7';       // purple — low energy
            else if (ratio < 0.66) barColor = '#fbbf24';   // yellow — mid
            else barColor = '#f87171';                      // red — high
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                <div style={{
                  width: '100%', maxWidth: '14px',
                  height: `${height}px`, borderRadius: '2px',
                  background: barColor, opacity: 0.85,
                }} />
                <span style={{ fontSize: '7px', color: 'var(--text-secondary)', lineHeight: 1 }}>
                  {Math.round(bpm)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderEnrichedPlaylist(m: Message) {
    if (!m.playlist || m.playlist.length === 0) return null;
    const resolved = m.resolvedTracks ?? m.playlist.map(() => null);
    const scores = m.transitionScores ?? m.playlist.map(() => null);

    return (
      <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid var(--border)' }}>
        {m.playlist.map((item, i) => {
          const t = resolved[i];
          const score = scores[i];
          const prevT = i > 0 ? resolved[i - 1] : null;
          return (
            <div key={i}>
              {/* Transition badge between tracks */}
              {i > 0 && score && prevT && t && renderTransitionBadge(
                score,
                prevT.camelot || '?',
                t.camelot || '?',
              )}
              {/* Track row */}
              <div style={{
                display: 'flex', alignItems: 'baseline', gap: '5px',
                padding: '2px 0',
              }}>
                <span style={{
                  fontSize: '9px', color: 'var(--text-secondary)',
                  width: '14px', textAlign: 'right', flexShrink: 0,
                  fontFeatureSettings: '"tnum"',
                }}>
                  {i + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {item.title}
                  </div>
                  <div style={{
                    fontSize: '10px', color: 'var(--text-secondary)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {item.artist}
                    {t && (
                      <>
                        {' \u00B7 '}
                        <span style={{ color: '#a78bfa', fontWeight: 600 }}>{t.camelot}</span>
                        {' \u00B7 '}
                        <span style={{ fontFeatureSettings: '"tnum"' }}>{Math.round(t.bpm)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Energy arc */}
        {renderEnergyArc(resolved)}
      </div>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────────

  return (
    <div style={{ width: '256px', flexShrink: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg-base)', borderLeft: '1px solid var(--border)' }}>
      {/* Header */}
      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ width: '26px', height: '26px', borderRadius: '8px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
          </svg>
        </div>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>AI Assistant</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Powered by MixMind</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {messages.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '4px' }}>
            <p style={{ fontSize: '12px', lineHeight: '1.6', color: 'var(--text-secondary)', margin: 0 }}>
              Ask anything about your library or request a custom set.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setInput(s)}
                  style={{
                    width: '100%', textAlign: 'left', fontSize: '11px',
                    padding: '7px 10px', borderRadius: '8px', cursor: 'pointer',
                    background: 'var(--bg-surface)', color: 'var(--text-secondary)',
                    border: '1px solid var(--border)', fontFamily: 'var(--font)',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.color = '#c084fc';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(124,58,237,0.3)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '85%', fontSize: '12px', lineHeight: '1.5',
                padding: '8px 10px', borderRadius: '10px',
                ...(m.role === 'user'
                  ? { background: 'rgba(124,58,237,0.2)', color: '#e9d5ff', borderBottomRightRadius: '3px' }
                  : { background: 'var(--bg-surface)', color: 'var(--text-primary)', borderBottomLeftRadius: '3px', border: '1px solid var(--border)' }
                ),
              }}>
                {m.text}
                {renderEnrichedPlaylist(m)}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ padding: '10px 12px', borderRadius: '10px', background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: '5px', height: '5px', borderRadius: '50%',
                    background: 'var(--accent)',
                    animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '10px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '10px', background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Ask AI\u2026"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontSize: '12px', color: 'var(--text-primary)', fontFamily: 'var(--font)',
            }}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            style={{
              width: '24px', height: '24px', borderRadius: '7px', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: input.trim() && !loading ? 'pointer' : 'default',
              background: input.trim() && !loading ? 'linear-gradient(135deg, #7c3aed, #a855f7)' : 'var(--bg-elevated)',
              border: 'none', opacity: loading ? 0.5 : 1,
              transition: 'all 0.15s',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
