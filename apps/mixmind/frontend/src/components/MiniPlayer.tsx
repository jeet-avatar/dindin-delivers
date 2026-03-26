// src/components/MiniPlayer.tsx
// Mini player bar: controls · waveform canvas · Bass/Mid/High energy meters
import { useRef, useEffect, useState, useCallback } from 'react';
import { Track } from '../types/track';
import { sidecarUrl } from '../hooks/useSidecar';

interface Props {
  track: Track | null;
  onClose?: () => void;
  /** Callback fired whenever audio currentTime changes — lifts time into parent */
  onCurrentTimeChange?: (t: number) => void;
  /** Callback fired when audio duration is known — lifts duration into parent */
  onDurationChange?: (d: number) => void;
  /**
   * When this value changes MiniPlayer seeks the audio element to that second.
   * Parent sets this via useState when DJWaveformView calls its onSeek handler.
   */
  seekTo?: number | null;
}

// Camelot → color (reuse from TrackTable)
const CAMELOT_COLORS: Record<string, { bg: string; text: string }> = {
  '1':  { bg: 'rgba(96,165,250,0.15)',   text: '#93c5fd' },
  '2':  { bg: 'rgba(167,139,250,0.15)',  text: '#c4b5fd' },
  '3':  { bg: 'rgba(244,114,182,0.15)',  text: '#f9a8d4' },
  '4':  { bg: 'rgba(251,146,60,0.15)',   text: '#fdba74' },
  '5':  { bg: 'rgba(250,204,21,0.15)',   text: '#fde68a' },
  '6':  { bg: 'rgba(74,222,128,0.15)',   text: '#86efac' },
  '7':  { bg: 'rgba(45,212,191,0.15)',   text: '#5eead4' },
  '8':  { bg: 'rgba(34,211,238,0.15)',   text: '#67e8f9' },
  '9':  { bg: 'rgba(56,189,248,0.15)',   text: '#7dd3fc' },
  '10': { bg: 'rgba(129,140,248,0.15)',  text: '#a5b4fc' },
  '11': { bg: 'rgba(248,113,113,0.15)',  text: '#fca5a5' },
  '12': { bg: 'rgba(251,113,133,0.15)', text: '#fda4af' },
};

function camelotNum(c: string) { return c.replace(/[AB]/i, '').trim(); }

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function MiniPlayer({ track, onClose, onCurrentTimeChange, onDurationChange, seekTo }: Props) {
  // ── Audio ──────────────────────────────────────────────────
  const audioRef    = useRef<HTMLAudioElement | null>(null);
  const ctxRef      = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef      = useRef<number>(0);
  const canvasRef   = useRef<HTMLCanvasElement>(null);

  const [isPlaying,   setIsPlaying]   = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration,    setDuration]    = useState(0);

  // Energy levels 0–1
  const [bass, setBass] = useState(0);
  const [mid,  setMid]  = useState(0);
  const [high, setHigh] = useState(0);

  // ── Build audio + analyser when track changes ──────────────
  useEffect(() => {
    if (!track?.file_path) return;

    // Tear down previous
    cancelAnimationFrame(rafRef.current);
    audioRef.current?.pause();
    ctxRef.current?.close();

    const src = sidecarUrl(`/api/audio/stream?path=${encodeURIComponent(track.file_path)}`);
    const audio = new Audio(src);
    audio.crossOrigin = 'anonymous';
    audioRef.current = audio;

    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.82;

    const source = ctx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(ctx.destination);

    ctxRef.current  = ctx;
    analyserRef.current = analyser;

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
      onCurrentTimeChange?.(audio.currentTime);
    });
    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
      onDurationChange?.(audio.duration);
    });
    audio.addEventListener('ended', () => { setIsPlaying(false); setCurrentTime(0); });
    audio.addEventListener('error', () => setIsPlaying(false));

    ctx.resume().then(() => {
      audio.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    });

    startLoop(analyser);

    return () => {
      cancelAnimationFrame(rafRef.current);
      audio.pause();
      source.disconnect();
      analyser.disconnect();
      ctx.close().catch(() => {});
    };
  }, [track?.content_id]);

  // ── External seek (from DJWaveformView via parent state) ───
  // Parent passes a new `seekTo` value when a cue/overview click occurs.
  // We watch for non-null changes and apply them to the audio element.
  const prevSeekTo = useRef<number | null | undefined>(undefined);
  useEffect(() => {
    if (seekTo !== null && seekTo !== undefined && seekTo !== prevSeekTo.current) {
      prevSeekTo.current = seekTo;
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = seekTo;
      }
    }
  }, [seekTo]);

  // ── Canvas animation loop ──────────────────────────────────
  const startLoop = useCallback((analyser: AnalyserNode) => {
    const data = new Uint8Array(analyser.frequencyBinCount);

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(data);
      drawWaveform(data);
      updateEnergy(data, analyser.context.sampleRate);
    };
    draw();
  }, []);

  function drawWaveform(data: Uint8Array) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width: W, height: H } = canvas;

    ctx.clearRect(0, 0, W, H);

    const barW   = 2;
    const gap    = 1;
    const stride = barW + gap;
    const count  = Math.floor(W / stride);
    const step   = Math.floor(data.length / count);

    for (let i = 0; i < count; i++) {
      const value  = data[i * step] / 255;
      const barH   = Math.max(2, value * H);
      const x      = i * stride;
      const y      = H - barH;

      // Gradient: purple → lavender based on value
      const alpha  = 0.4 + value * 0.6;
      const r = Math.round(124 + (167 - 124) * value);
      const g = Math.round(58  + (139 - 58)  * value);
      const b = Math.round(237);
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, 1);
      ctx.fill();
    }
  }

  function updateEnergy(data: Uint8Array, sampleRate: number) {
    const binHz   = sampleRate / (data.length * 2);
    const bassEnd = Math.round(250  / binHz);
    const midEnd  = Math.round(2000 / binHz);
    const highEnd = Math.round(8000 / binHz);

    const avg = (from: number, to: number) => {
      let sum = 0;
      const end = Math.min(to, data.length);
      for (let i = from; i < end; i++) sum += data[i];
      return end > from ? sum / ((end - from) * 255) : 0;
    };

    setBass(avg(0,       bassEnd));
    setMid (avg(bassEnd, midEnd));
    setHigh(avg(midEnd,  highEnd));
  }

  // ── Controls ───────────────────────────────────────────────
  function togglePlay() {
    const audio = audioRef.current;
    const ctx   = ctxRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      ctx?.resume();
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audio.currentTime = ratio * duration;
  }

  // ── Sizing the canvas correctly ────────────────────────────
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const wrap   = wrapRef.current;
      if (!canvas || !wrap) return;
      canvas.width  = wrap.clientWidth;
      canvas.height = wrap.clientHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  if (!track) return null;

  const camelotColor = CAMELOT_COLORS[camelotNum(track.camelot)] ?? { bg: 'rgba(255,255,255,0.07)', text: '#9ca3af' };
  const progress = duration ? currentTime / duration : 0;

  // Energy bar height as % (min 4%, max 100%)
  const bassH = `${Math.max(4, bass * 100)}%`;
  const midH  = `${Math.max(4, mid  * 100)}%`;
  const highH = `${Math.max(4, high * 100)}%`;

  return (
    <div style={{
      height: '80px', flexShrink: 0,
      display: 'flex', alignItems: 'center',
      background: 'var(--bg-surface)',
      borderTop: '1px solid var(--border)',
      boxShadow: '0 -6px 24px rgba(124,58,237,0.07)',
      padding: '0 16px',
      gap: '16px',
      position: 'relative',
      zIndex: 20,
    }}>

      {/* ── Track Info ──────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '240px', flexShrink: 0, minWidth: 0 }}>
        {/* Disc icon */}
        <div style={{
          width: '42px', height: '42px', borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(168,85,247,0.15))',
          border: '1px solid rgba(124,58,237,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: isPlaying ? 'spin 4s linear infinite' : 'none',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.75" strokeLinecap="round">
            <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
          </svg>
        </div>

        {/* Title / Artist / Badges */}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {track.title}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
            {track.artist}
          </div>
          <div style={{ display: 'flex', gap: '5px', marginTop: '4px' }}>
            <span style={{ fontSize: '10px', fontWeight: 600, padding: '1px 6px', borderRadius: '4px', background: 'rgba(124,58,237,0.15)', color: '#a78bfa', fontFeatureSettings: '"tnum"' }}>
              {Math.round(track.bpm)}
            </span>
            <span style={{ fontSize: '10px', fontWeight: 600, padding: '1px 6px', borderRadius: '4px', background: camelotColor.bg, color: camelotColor.text }}>
              {track.camelot}
            </span>
          </div>
        </div>
      </div>

      {/* ── Controls + Progress ─────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', width: '180px', flexShrink: 0 }}>
        {/* Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Prev */}
          <button
            aria-label="Previous"
            onClick={() => { if (audioRef.current) audioRef.current.currentTime = 0; }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '6px', borderRadius: '6px', display: 'flex', transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 20L9 12l10-8v16zm-10 0H7V4h2v16z"/></svg>
          </button>

          {/* Play/Pause */}
          <button
            aria-label={isPlaying ? 'Pause' : 'Play'}
            onClick={togglePlay}
            style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: isPlaying ? '0 0 14px rgba(124,58,237,0.5)' : 'none',
              transition: 'box-shadow 0.2s, transform 0.1s',
              flexShrink: 0,
            }}
            onMouseDown={e => (e.currentTarget as HTMLElement).style.transform = 'scale(0.93)'}
            onMouseUp={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1)'}
          >
            {isPlaying ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>
            )}
          </button>

          {/* Next (skip to end) */}
          <button
            aria-label="Next"
            onClick={() => { if (audioRef.current && duration) audioRef.current.currentTime = duration - 1; }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '6px', borderRadius: '6px', display: 'flex', transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M5 4l10 8-10 8V4zm10 0h2v16h-2V4z"/></svg>
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontFeatureSettings: '"tnum"', flexShrink: 0 }}>{formatTime(currentTime)}</span>
          <div
            onClick={seek}
            style={{ flex: 1, height: '3px', background: 'var(--bg-elevated)', borderRadius: '2px', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
          >
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0,
              width: `${progress * 100}%`,
              background: 'linear-gradient(90deg, #7c3aed, #a855f7)',
              borderRadius: '2px',
              transition: 'width 0.25s linear',
            }} />
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontFeatureSettings: '"tnum"', flexShrink: 0 }}>{formatTime(duration)}</span>
        </div>
      </div>

      {/* ── Waveform Canvas ──────────────────────────────── */}
      <div ref={wrapRef} style={{ flex: 1, height: '48px', minWidth: '120px', alignSelf: 'center' }}>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />
      </div>

      {/* ── Energy Meters ─────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '48px', flexShrink: 0 }}>
        {([
          { label: 'BASS', height: bassH, color: '#7c3aed', glow: 'rgba(124,58,237,0.4)' },
          { label: 'MID',  height: midH,  color: '#a78bfa', glow: 'rgba(167,139,250,0.3)' },
          { label: 'HIGH', height: highH, color: '#c4b5fd', glow: 'rgba(196,181,253,0.2)' },
        ] as const).map(({ label, height, color, glow }) => (
          <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            {/* Bar track */}
            <div style={{
              width: '8px', height: '36px', borderRadius: '4px',
              background: 'var(--bg-elevated)',
              position: 'relative', overflow: 'hidden',
            }}>
              {/* Fill */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                height,
                background: color,
                borderRadius: '4px',
                boxShadow: isPlaying ? `0 0 6px ${glow}` : 'none',
                transition: 'height 60ms ease-out, box-shadow 0.2s',
              }} />
            </div>
            <span style={{ fontSize: '8px', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* ── Close button ─────────────────────────────────── */}
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Close player"
          style={{
            position: 'absolute', top: '8px', right: '8px',
            width: '20px', height: '20px', borderRadius: '50%',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      )}
    </div>
  );
}
