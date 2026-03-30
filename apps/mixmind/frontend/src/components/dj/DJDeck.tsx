// src/components/dj/DJDeck.tsx
// Self-contained CDJ-3000 deck: screen + pads + transport + pitch + loop + beat jump + grid

import { useState, useEffect, useRef } from 'react';
import { Track, HotCueEntry, DualAnlzData } from '../../types/track';
import { DJWaveformView } from '../DJWaveformView';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import { sidecarGet } from '../../hooks/useSidecar';

type DeckId = 'A' | 'B';

interface DJDeckProps {
  deck: DeckId;
  track: Track | null;
  onClose?: () => void;
}

const PITCH_RANGES = [6, 10, 16, 100] as const;

const PAD_COLORS: Record<string, { bg: string; border: string; color: string }> = {
  A: { bg: 'rgba(0,224,0,.12)', border: 'rgba(0,224,0,.35)', color: '#00E000' },
  B: { bg: 'rgba(255,0,110,.12)', border: 'rgba(255,0,110,.35)', color: '#FF006E' },
  C: { bg: 'rgba(0,229,255,.12)', border: 'rgba(0,229,255,.35)', color: '#00E5FF' },
  D: { bg: 'rgba(255,225,0,.12)', border: 'rgba(255,225,0,.35)', color: '#FFE100' },
  E: { bg: 'rgba(255,140,0,.12)', border: 'rgba(255,140,0,.35)', color: '#FF8C00' },
  F: { bg: 'rgba(0,80,255,.12)', border: 'rgba(0,80,255,.35)', color: '#0050FF' },
  G: { bg: 'rgba(170,0,255,.12)', border: 'rgba(170,0,255,.35)', color: '#AA00FF' },
  H: { bg: 'rgba(255,0,0,.12)', border: 'rgba(255,0,0,.35)', color: '#FF0000' },
};
const PAD_EMPTY = { bg: 'rgba(255,255,255,.02)', border: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,.15)' };
const SLOTS = ['A','B','C','D','E','F','G','H'];
const AUTO_LOOPS = [0.5, 1, 2, 4, 8, 16, 32];
const BEAT_JUMP_VALUES = [1/16, 1/4, 1, 4, 16, 64];

function fmt(sec: number) {
  const neg = sec < 0;
  const abs = Math.abs(sec);
  const m = Math.floor(abs / 60);
  const s = Math.floor(abs % 60);
  return `${neg ? '-' : ''}${m}:${s.toString().padStart(2, '0')}`;
}

export function DJDeck({ deck, track, onClose }: DJDeckProps) {
  const [audio, actions] = useAudioEngine(track?.file_path ?? null, track?.bpm ?? 128);
  const deckColor = deck === 'A' ? '#FF8C00' : '#00E5FF';

  // ── Hot cues (local state — will sync with backend later) ──
  const [hotCues, setHotCues] = useState<(HotCueEntry | null)[]>(Array(8).fill(null));
  const [anlzData, setAnlzData] = useState<DualAnlzData | null>(null);
  const [padMode, setPadMode] = useState<'hotcue' | 'beatloop' | 'beatjump'>('hotcue');

  // Load hot cues from Rekordbox/MixMind ANLZ data when track changes
  useEffect(() => {
    if (!track?.content_id) { setAnlzData(null); setHotCues(Array(8).fill(null)); return; }
    sidecarGet<DualAnlzData>(`/api/tracks/${track.content_id}/anlz`)
      .then(data => {
        setAnlzData(data);
        // Load hot cues from rekordbox data (or mixmind auto_cues mapped to HotCueEntry)
        const source = data.rekordbox ?? data.mixmind;
        if (source) {
          const rbCues: HotCueEntry[] = 'hot_cues' in source
            ? (source as { hot_cues: HotCueEntry[] }).hot_cues
            : ('auto_cues' in source
              ? (source as { auto_cues: { slot: string; time_ms: number; color_hex: string; label: string }[] }).auto_cues.map(c => ({
                  slot: c.slot, time_ms: c.time_ms, color_hex: c.color_hex,
                  label: c.label, is_loop: false, loop_out_ms: null,
                }))
              : []);
          const padState: (HotCueEntry | null)[] = Array(8).fill(null);
          for (const cue of rbCues) {
            const idx = SLOTS.indexOf(cue.slot);
            if (idx >= 0 && idx < 8) padState[idx] = cue;
          }
          setHotCues(padState);
        }
      })
      .catch(() => setAnlzData(null));
  }, [track?.content_id]);

  // ── Loop state ──
  const [loopActive, setLoopActive] = useState(false);
  const [loopIn, setLoopIn] = useState<number | null>(null);
  const [loopOut, setLoopOut] = useState<number | null>(null);
  const [autoLoopBeats, setAutoLoopBeats] = useState(4);

  // ── Beat jump ──
  const [beatJumpValue, setBeatJumpValue] = useState(1);

  // ── Grid offset ──
  const [gridOffset, setGridOffset] = useState(0);

  // ── Pitch fader drag state ──
  const [isDraggingPitch, setIsDraggingPitch] = useState(false);
  const pitchTrackRef = useRef<HTMLDivElement>(null);

  // ── CUE button timing refs ──
  const cueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cueHoldRef = useRef(false);

  const msPerBeat = audio.effectiveBpm > 0 ? 60000 / audio.effectiveBpm : 500;

  // ── Pad press handler ──
  function handlePadPress(index: number) {
    if (padMode === 'hotcue') {
      const cue = hotCues[index];
      if (cue) {
        // Jump to cue
        actions.seek(cue.time_ms / 1000);
      } else {
        // Set cue at current position
        const slot = SLOTS[index];
        const colors = PAD_COLORS[slot];
        setHotCues(prev => {
          const next = [...prev];
          next[index] = {
            slot,
            time_ms: Math.round(audio.currentTime * 1000),
            color_hex: colors.color,
            label: '',
            is_loop: false,
            loop_out_ms: null,
          };
          return next;
        });
      }
    } else if (padMode === 'beatloop') {
      const beats = [1/16, 1/8, 1/4, 1/2, 1, 2, 4, 8][index];
      const lengthSec = (beats * msPerBeat) / 1000;
      const start = audio.currentTime;
      setLoopIn(start);
      setLoopOut(start + lengthSec);
      setLoopActive(true);
    } else if (padMode === 'beatjump') {
      const values = [1/16, 1/8, 1/4, 1/2, 1, 2, 4, 8];
      const jumpSec = (values[index] * msPerBeat) / 1000;
      if (index < 4) {
        actions.seek(audio.currentTime - jumpSec);
      } else {
        actions.seek(audio.currentTime + jumpSec);
      }
    }
  }

  // Delete hot cue (shift+click)
  function handlePadDelete(index: number) {
    setHotCues(prev => { const next = [...prev]; next[index] = null; return next; });
  }

  // ── Sync loop state to audio engine (enforcement runs in RAF tick) ──
  useEffect(() => {
    actions.setLoop(loopActive, loopIn, loopOut);
  }, [loopActive, loopIn, loopOut, actions]);

  function handleLoopIn() {
    setLoopIn(audio.currentTime);
    if (loopOut !== null && audio.currentTime < loopOut) setLoopActive(true);
  }
  function handleLoopOut() {
    setLoopOut(audio.currentTime);
    if (loopIn !== null) setLoopActive(true);
  }
  function handleReloop() {
    if (loopActive) { setLoopActive(false); }
    else if (loopIn !== null && loopOut !== null) { setLoopActive(true); actions.seek(loopIn); }
  }
  function handleAutoLoop(beats: number) {
    const lengthSec = (beats * msPerBeat) / 1000;
    const start = audio.currentTime;
    setLoopIn(start);
    setLoopOut(start + lengthSec);
    setLoopActive(true);
    setAutoLoopBeats(beats);
  }
  function handleLoopHalve() {
    if (loopIn !== null && loopOut !== null) {
      const half = (loopOut - loopIn) / 2;
      setLoopOut(loopIn + half);
    }
  }
  function handleLoopDouble() {
    if (loopIn !== null && loopOut !== null) {
      const doubled = (loopOut - loopIn) * 2;
      setLoopOut(loopIn + doubled);
    }
  }

  // ── Beat jump ──
  function handleBeatJump(direction: -1 | 1) {
    const jumpSec = (beatJumpValue * msPerBeat) / 1000;
    actions.seek(audio.currentTime + direction * jumpSec);
  }

  // ── Grid nudge ──
  function handleGridNudge(direction: -1 | 1) {
    setGridOffset(prev => prev + direction);
  }

  // ── Pitch fader drag helpers ──
  function pitchFromMouseY(clientY: number) {
    const el = pitchTrackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    // 0=top=+max, 1=bottom=-max
    const pct = audio.pitchRange - ratio * 2 * audio.pitchRange;
    actions.setPitchPercent(pct);
  }

  useEffect(() => {
    if (!isDraggingPitch) return;
    const handleMove = (e: MouseEvent) => { e.preventDefault(); pitchFromMouseY(e.clientY); };
    const handleUp = () => setIsDraggingPitch(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDraggingPitch, audio.pitchRange]);

  // ── Pitch range cycle ──
  function cycleRange() {
    const idx = PITCH_RANGES.indexOf(audio.pitchRange);
    const next = PITCH_RANGES[(idx + 1) % PITCH_RANGES.length];
    actions.setPitchRange(next);
  }

  // ── Styles ──
  const S = {
    root: {
      background: '#0a0a0a', display: 'flex' as const, flexDirection: 'column' as const,
      border: `1px solid ${deckColor}22`, borderRadius: '6px', overflow: 'hidden',
      minWidth: '420px',
    } as React.CSSProperties,
    label: {
      textAlign: 'center' as const, padding: '3px', fontSize: '8px', fontWeight: 700,
      letterSpacing: '2px', color: deckColor, background: `${deckColor}08`,
    } as React.CSSProperties,
    section: {
      padding: '2px 6px',
    },
    sectionLabel: {
      fontSize: '6px', color: '#333', letterSpacing: '1.5px', fontWeight: 600,
      margin: '3px 0 1px',
    } as React.CSSProperties,
    padRow: {
      display: 'flex', gap: '2px', height: '28px',
    } as React.CSSProperties,
    pad: (c: typeof PAD_EMPTY, active: boolean) => ({
      flex: 1, borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '9px', fontWeight: 800, cursor: 'pointer', fontFamily: 'ui-monospace, monospace',
      background: active ? c.bg : c.bg, border: `1.5px solid ${c.border}`, color: c.color,
      transition: 'all 0.08s', userSelect: 'none' as const,
    }) as React.CSSProperties,
    padMode: (active: boolean) => ({
      flex: 1, fontSize: '5px', fontWeight: 600, letterSpacing: '.3px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', borderRadius: '2px', fontFamily: 'ui-monospace, monospace',
      background: active ? 'rgba(0,230,118,.1)' : 'rgba(255,255,255,.02)',
      border: `1px solid ${active ? 'rgba(0,230,118,.25)' : 'rgba(255,255,255,.05)'}`,
      color: active ? '#00E676' : 'rgba(255,255,255,.2)',
    }) as React.CSSProperties,
    btn: (color: string, active = false) => ({
      flex: 1, height: '28px', borderRadius: '4px', display: 'flex', alignItems: 'center',
      justifyContent: 'center', cursor: 'pointer', fontSize: '9px', fontWeight: 700,
      letterSpacing: '.5px', fontFamily: '-apple-system, sans-serif',
      background: active ? `${color}33` : `${color}15`,
      border: `2px solid ${color}55`, color: active ? '#fff' : color,
      boxShadow: active ? `0 0 8px ${color}33` : 'none',
      transition: 'all 0.1s', userSelect: 'none' as const,
    }) as React.CSSProperties,
    smBtn: (active = false) => ({
      flex: 1, height: '16px', borderRadius: '2px', fontSize: '6px', fontWeight: 600,
      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: active ? 'rgba(0,230,118,.1)' : 'rgba(255,255,255,.02)',
      border: `1px solid ${active ? 'rgba(0,230,118,.25)' : 'rgba(255,255,255,.06)'}`,
      color: active ? '#00E676' : 'rgba(255,255,255,.25)',
      fontFamily: 'ui-monospace, monospace', userSelect: 'none' as const,
    }) as React.CSSProperties,
    pitchTrack: {
      width: '6px', height: '120px', background: '#141414', borderRadius: '3px',
      position: 'relative' as const, cursor: 'pointer', border: '1px solid #1a1a1a',
    } as React.CSSProperties,
  };

  if (!track) {
    return (
      <div style={{ ...S.root, height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <div style={S.label}>DECK {deck}</div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '14px', color: '#222', letterSpacing: '2px' }}>NO TRACK LOADED</span>
        </div>
      </div>
    );
  }

  const timeRemaining = audio.duration > 0 ? -(audio.duration - audio.currentTime) : 0;
  const pitchHandleTop = 50 - (audio.pitchPercent / audio.pitchRange) * 50; // 0% = top, 100% = bottom

  return (
    <div style={S.root}>
      <div style={S.label}>DECK {deck}</div>

      {/* ── CDJ SCREEN (waveform display) ── */}
      <DJWaveformView
        track={track}
        currentTime={audio.currentTime}
        duration={audio.duration}
        onSeek={actions.seek}
        hotCues={hotCues.filter((c): c is HotCueEntry => c !== null)}
      />

      {/* ── 8 PERFORMANCE PADS ── */}
      <div style={S.section}>
        <div style={S.padRow}>
          {SLOTS.slice(0, 4).map((slot, i) => {
            const cue = hotCues[i];
            const colors = cue ? PAD_COLORS[slot] : PAD_EMPTY;
            return (
              <div key={slot} style={S.pad(colors, !!cue)}
                onClick={() => handlePadPress(i)}
                onContextMenu={e => { e.preventDefault(); handlePadDelete(i); }}
              >{slot}</div>
            );
          })}
        </div>
        <div style={{ ...S.padRow, marginTop: '2px' }}>
          {SLOTS.slice(4, 8).map((slot, i) => {
            const idx = i + 4;
            const cue = hotCues[idx];
            const colors = cue ? PAD_COLORS[slot] : PAD_EMPTY;
            return (
              <div key={slot} style={S.pad(colors, !!cue)}
                onClick={() => handlePadPress(idx)}
                onContextMenu={e => { e.preventDefault(); handlePadDelete(idx); }}
              >{slot}</div>
            );
          })}
        </div>
        {/* Pad mode selector */}
        <div style={{ display: 'flex', gap: '1px', marginTop: '2px', height: '14px' }}>
          {(['hotcue', 'beatloop', 'beatjump'] as const).map(m => (
            <div key={m} style={S.padMode(padMode === m)} onClick={() => setPadMode(m)}>
              {m === 'hotcue' ? 'HOT CUE' : m === 'beatloop' ? 'BEAT LOOP' : 'BEAT JUMP'}
            </div>
          ))}
        </div>
      </div>

      {/* ── NEEDLE SEARCH ── */}
      <div style={{ height: '6px', margin: '2px 6px', background: '#060606', border: '1px solid #1a1a1a', borderRadius: '1px', cursor: 'pointer', position: 'relative' }}
        onClick={e => {
          const rect = e.currentTarget.getBoundingClientRect();
          const ratio = (e.clientX - rect.left) / rect.width;
          actions.seek(ratio * audio.duration);
        }}
      >
        <div style={{ position: 'absolute', left: `${audio.duration > 0 ? (audio.currentTime / audio.duration) * 100 : 0}%`, top: 0, bottom: 0, width: '2px', background: deckColor }} />
      </div>

      {/* ── LOWER AREA: Transport | Controls | Pitch ── */}
      <div style={{ display: 'flex', padding: '4px 6px', gap: '6px', alignItems: 'flex-start' }}>

        {/* Transport column */}
        <div style={{ width: '50px', display: 'flex', flexDirection: 'column', gap: '3px', paddingTop: '8px' }}>
          <div style={S.btn('#FF8C00')}
            onMouseDown={e => {
              if (e.button !== 0) return;
              cueHoldRef.current = false;
              if (audio.isPlaying) {
                // Playing: return to cue immediately on press
                actions.returnToCue();
                return;
              }
              // Paused: start a timer — if held >150ms, it's a preview hold
              cueTimerRef.current = setTimeout(() => {
                cueHoldRef.current = true;
                actions.cuePreviw();
              }, 150);
            }}
            onMouseUp={() => {
              if (cueTimerRef.current) {
                clearTimeout(cueTimerRef.current);
                cueTimerRef.current = null;
              }
              if (cueHoldRef.current) {
                // Was a hold-preview — return to cue
                actions.cueRelease();
                cueHoldRef.current = false;
              } else if (!audio.isPlaying) {
                // Was a short tap while paused — set cue point
                actions.setCuePoint();
              }
            }}
            onMouseLeave={() => {
              // If mouse leaves while holding, treat as release
              if (cueHoldRef.current) {
                if (cueTimerRef.current) clearTimeout(cueTimerRef.current);
                actions.cueRelease();
                cueHoldRef.current = false;
              }
            }}
          >CUE</div>
          <div style={S.btn('#00E676', audio.isPlaying)} onClick={actions.togglePlay}>
            {audio.isPlaying ? '⏸' : '▶'}
          </div>
        </div>

        {/* Center controls */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>

          {/* Loop */}
          <div style={S.sectionLabel}>LOOP</div>
          <div style={{ display: 'flex', gap: '1px' }}>
            <div style={S.smBtn(loopIn !== null)} onClick={handleLoopIn}>IN</div>
            <div style={S.smBtn(loopOut !== null)} onClick={handleLoopOut}>OUT</div>
            <div style={{
              ...S.smBtn(loopActive),
              color: loopActive ? '#FF8C00' : undefined,
              borderColor: loopActive ? 'rgba(255,140,0,.3)' : undefined,
            }} onClick={handleReloop}>
              {loopActive ? 'EXIT' : 'RELOOP'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1px' }}>
            {AUTO_LOOPS.map(b => (
              <div key={b} style={S.smBtn(loopActive && loopIn !== null && loopOut !== null &&
                Math.abs((loopOut - loopIn) * 1000 - b * msPerBeat) < 10)}
                onClick={() => handleAutoLoop(b)}>
                {b === 0.5 ? '½' : b}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '1px' }}>
            <div style={S.smBtn()} onClick={handleLoopHalve}>÷2</div>
            <div style={S.smBtn()} onClick={handleLoopDouble}>×2</div>
          </div>

          {/* Beat Jump */}
          <div style={S.sectionLabel}>BEAT JUMP</div>
          <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
            <div style={{ ...S.smBtn(), width: '20px', flex: 'none', fontSize: '8px' }}
              onClick={() => handleBeatJump(-1)}>◀</div>
            <div style={{ display: 'flex', gap: '1px', flex: 1 }}>
              {BEAT_JUMP_VALUES.map(v => (
                <div key={v} style={S.smBtn(beatJumpValue === v)}
                  onClick={() => setBeatJumpValue(v)}>
                  {v < 1 ? `1/${Math.round(1/v)}` : v}
                </div>
              ))}
            </div>
            <div style={{ ...S.smBtn(), width: '20px', flex: 'none', fontSize: '8px' }}
              onClick={() => handleBeatJump(1)}>▶</div>
          </div>

          {/* Beat Grid */}
          <div style={S.sectionLabel}>BEAT GRID</div>
          <div style={{ display: 'flex', gap: '1px' }}>
            <div style={S.smBtn()} onClick={() => handleGridNudge(-1)}>◀ GRID</div>
            <div style={S.smBtn()} onClick={() => handleGridNudge(1)}>GRID ▶</div>
          </div>

          {/* Sync row */}
          <div style={{ display: 'flex', gap: '2px', marginTop: '2px' }}>
            <div style={{ ...S.smBtn(), color: '#FF006E', borderColor: 'rgba(255,0,110,.2)' }}>SYNC</div>
            <div style={{ ...S.smBtn(), color: '#FFE100', borderColor: 'rgba(255,225,0,.2)' }}>MASTER</div>
            <div style={{ ...S.smBtn(), color: '#AA00FF', borderColor: 'rgba(170,0,255,.2)' }}>QUANT</div>
            <div style={{ ...S.smBtn(), color: '#00E5FF', borderColor: 'rgba(0,229,255,.15)' }}>SLIP</div>
          </div>
        </div>

        {/* Pitch fader */}
        <div style={{ width: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', paddingTop: '4px' }}>
          <div style={{ fontSize: '5px', color: '#444', letterSpacing: '1px' }}>TEMPO</div>
          <div style={{ fontSize: '11px', color: '#00E676', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            {audio.pitchPercent >= 0 ? '+' : ''}{audio.pitchPercent.toFixed(2)}%
          </div>
          <div style={{ fontSize: '5px', color: '#333', letterSpacing: '.5px', cursor: 'pointer' }}
            onClick={cycleRange}>±{audio.pitchRange}%</div>
          <div style={S.pitchTrack}
            ref={pitchTrackRef}
            onMouseDown={e => { e.preventDefault(); setIsDraggingPitch(true); pitchFromMouseY(e.clientY); }}
          >
            <div style={{ position: 'absolute', top: '50%', left: '-2px', right: '-2px', height: '1px', background: 'rgba(255,255,255,.15)' }} />
            <div style={{
              position: 'absolute', top: `${pitchHandleTop}%`, left: '-5px',
              width: '16px', height: '8px',
              background: 'linear-gradient(180deg,#3a3a3a,#2a2a2a)',
              border: '1px solid #4a4a4a', borderRadius: '2px', cursor: 'grab',
              transform: 'translateY(-4px)',
            }} />
          </div>
          <div style={{ fontSize: '9px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            {audio.effectiveBpm.toFixed(2)}
          </div>
          <div style={{ fontSize: '6px', color: '#444' }}>{(track.bpm ?? 0).toFixed(2)}</div>
          <div style={{
            fontSize: '5px', padding: '1px 4px', borderRadius: '2px', marginTop: '2px', cursor: 'pointer',
            ...(audio.masterTempo
              ? { background: 'rgba(0,230,118,.1)', border: '1px solid rgba(0,230,118,.2)', color: '#00E676' }
              : { background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)', color: 'rgba(255,255,255,.2)' }
            ),
          }} onClick={actions.toggleMasterTempo}>M.TEMPO</div>
        </div>
      </div>

      {/* ── Close button ── */}
      {onClose && (
        <div style={{ position: 'absolute', top: 2, right: 4, cursor: 'pointer', fontSize: '10px', color: '#333', zIndex: 10 }}
          onClick={onClose}>✕</div>
      )}
    </div>
  );
}
