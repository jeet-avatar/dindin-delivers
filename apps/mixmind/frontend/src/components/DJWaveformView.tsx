// src/components/DJWaveformView.tsx
// CDJ-3000 style split-pane waveform view with:
// - Selectable waveform color styles (3Band / RGB / Blue)
// - Black beat grid lines with 4/8/16/32 bar phrase markers
// - Zoom controls with position slider
// - RB / MM / Auto source toggle
// - 4-stem Demucs rendering when available

import { useRef, useEffect, useState, useCallback } from 'react';
import { Track, TrackAnlzData, HotCueEntry, Waveform4Stem, DualAnlzData, MixMindAnalysis, AutoCueEntry } from '../types/track';
import { sidecarGet } from '../hooks/useSidecar';

type AnlzSource = 'rb' | 'mm' | 'auto';
type WfStyle = '3band' | 'rgb' | 'blue';

// CDJ-3000 3Band base colors
const BAND_BLUE   = { r: 0x00, g: 0x55, b: 0xE1 };  // #0055E1 — bass
const BAND_ORANGE = { r: 0xFF, g: 0xA6, b: 0x00 };  // #FFA600 — mid
const BAND_WHITE  = { r: 0xFF, g: 0xFF, b: 0xFF };  // #FFFFFF — high

// 4-stem colors (Demucs)
const STEM_DRUMS  = '#FF3D00';
const STEM_BASS   = '#AA00FF';
const STEM_VOCALS = '#00E5FF';
const STEM_OTHER  = '#FFEA00';

// Playhead position: 35% from left edge
const PLAYHEAD_RATIO = 0.35;

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ---------------------------------------------------------------------------
// 3Band color blend helper — CDJ-3000 algorithm
// ---------------------------------------------------------------------------

function blend3Band(low: number, mid: number, high: number): { r: number; g: number; b: number; brightness: number } {
  const total = low + mid + high;
  if (total === 0) return { r: 0, g: 0, b: 0, brightness: 0 };
  const wl = low / total;
  const wm = mid / total;
  const wh = high / total;
  const r = Math.round(BAND_BLUE.r * wl + BAND_ORANGE.r * wm + BAND_WHITE.r * wh);
  const g = Math.round(BAND_BLUE.g * wl + BAND_ORANGE.g * wm + BAND_WHITE.g * wh);
  const b = Math.round(BAND_BLUE.b * wl + BAND_ORANGE.b * wm + BAND_WHITE.b * wh);
  const brightness = Math.min(1, total / 400);
  return { r, g, b, brightness };
}

// ---------------------------------------------------------------------------
// Waveform drawing — supports 3 styles: 3band, rgb, blue
// ---------------------------------------------------------------------------

function drawWaveformBars(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  anlz: TrackAnlzData, startIdx: number, endIdx: number,
  msToX: (ms: number) => number, iToMs: (i: number) => number,
  wfStyle: WfStyle,
) {
  const w4 = anlz.waveform_4stem;
  const wb = anlz.waveform_3band;
  const wp = anlz.waveform_preview;
  const centerY = H / 2;

  // Center line (barely visible)
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, Math.floor(centerY), W, 1);

  if (w4 && startIdx < w4.length) {
    // 4-stem Demucs — mirrored from center
    const visLen = Math.min(endIdx, w4.length) - startIdx;
    const barW = Math.max(1, W / visLen);
    for (let i = startIdx; i < Math.min(endIdx, w4.length); i++) {
      const x = msToX(iToMs(i));
      const c = w4[i];
      const total = c.drums + c.bass + c.vocals + c.other;
      const barHeight = (total / (255 * 4)) * H * 0.85;
      const halfBar = barHeight / 2;

      // Use weighted stem color
      const stemTotal = Math.max(total, 1);
      const stems = [
        { val: c.drums, r: 0xFF, g: 0x3D, b: 0x00 },
        { val: c.bass, r: 0xAA, g: 0x00, b: 0xFF },
        { val: c.vocals, r: 0x00, g: 0xE5, b: 0xFF },
        { val: c.other, r: 0xFF, g: 0xEA, b: 0x00 },
      ];
      let r = 0, g = 0, b = 0;
      for (const s of stems) {
        const w = s.val / stemTotal;
        r += s.r * w; g += s.g * w; b += s.b * w;
      }
      ctx.fillStyle = `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
      ctx.fillRect(x, centerY - halfBar, barW, halfBar);
      ctx.fillRect(x, centerY, barW, halfBar);
    }
  } else if (wb && startIdx < wb.length) {
    // 3-band waveform — mirrored bars from center, 3Band color blend
    const barW = 3;
    for (let i = startIdx; i < Math.min(endIdx, wb.length); i++) {
      const x = msToX(iToMs(i));
      if (x < -barW || x > W + barW) continue;
      const c = wb[i];
      const total = c.low + c.mid + c.high;
      if (total === 0) continue;

      const barHeight = (total / (255 * 3)) * H * 0.85;
      const halfBar = barHeight / 2;

      // Color depends on wfStyle — 3band is default, rgb and blue fall through to 3band for now
      const blend = blend3Band(c.low, c.mid, c.high);
      const br = blend.brightness;
      ctx.fillStyle = `rgba(${blend.r},${blend.g},${blend.b},${(0.5 + br * 0.5).toFixed(2)})`;

      // Draw mirrored bars from center
      ctx.fillRect(x, centerY - halfBar, barW, halfBar);
      ctx.fillRect(x, centerY, barW, halfBar);
    }
  } else if (wp && wp.length > 0) {
    // Mono waveform preview — fallback, monochrome blue, mirrored from center
    const barW = 3;
    for (let i = startIdx; i < Math.min(endIdx, wp.length); i++) {
      const x = msToX(iToMs(i));
      if (x < -barW || x > W + barW) continue;
      const amp = wp[i];
      if (amp === 0) continue;
      const barHeight = (amp / 255) * H * 0.85;
      const halfBar = barHeight / 2;
      const alpha = (0.5 + (amp / 255) * 0.5).toFixed(2);
      ctx.fillStyle = `rgba(0,85,225,${alpha})`;
      ctx.fillRect(x, centerY - halfBar, barW, halfBar);
      ctx.fillRect(x, centerY, barW, halfBar);
    }
  }
}

// ---------------------------------------------------------------------------
// Beat grid drawing — black lines, phrase markers
// ---------------------------------------------------------------------------

function drawBeatGrid(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  beats: TrackAnlzData['beat_grid'],
  startMs: number, endMs: number,
  _zoomed?: boolean,
) {
  // CDJ-3000 subtle beat grid — 3 levels of white lines only
  // Count bars even outside visible range so phrase markers align correctly
  let barCount = 0;

  for (const beat of beats) {
    const isDown = beat.beat === 1;
    if (isDown) barCount++;

    // Skip beats outside visible range (after counting)
    if (beat.time_ms < startMs || beat.time_ms > endMs) continue;

    const x = ((beat.time_ms - startMs) / (endMs - startMs)) * W;

    if (isDown && barCount % 16 === 1) {
      // Phrase marker — every 16 bars
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 2;
    } else if (isDown) {
      // Downbeat — bar boundary
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1.5;
    } else {
      // Regular beat (2, 3, 4)
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
    }

    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
}

// ---------------------------------------------------------------------------
// Overview canvas
// ---------------------------------------------------------------------------

function drawOverviewCanvas(
  canvas: HTMLCanvasElement, anlz: TrackAnlzData,
  duration: number, currentTime: number, wfStyle: WfStyle,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = canvas.width, H = canvas.height;
  const durationMs = duration * 1000;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, W, H);
  if (durationMs <= 0) return;

  const waveLen = anlz.waveform_4stem?.length ?? anlz.waveform_3band?.length ?? anlz.waveform_preview.length;
  const msToX = (ms: number) => (ms / durationMs) * W;
  const iToMs = (i: number) => (i / waveLen) * durationMs;

  // Section overlays
  for (const s of anlz.sections) {
    ctx.fillStyle = hexToRgba(s.color_hex, 0.18);
    ctx.fillRect(msToX(s.start_ms), 0, msToX(s.end_ms) - msToX(s.start_ms), H);
  }

  // Waveform
  drawWaveformBars(ctx, W, H, anlz, 0, waveLen, msToX, iToMs, wfStyle);

  // Beat grid
  drawBeatGrid(ctx, W, H, anlz.beat_grid, 0, durationMs, false);

  // Memory cue triangles
  for (const mc of anlz.memory_cues) {
    const x = msToX(mc.time_ms);
    ctx.fillStyle = mc.color_hex;
    ctx.beginPath(); ctx.moveTo(x, H); ctx.lineTo(x - 5, H - 9); ctx.lineTo(x + 5, H - 9); ctx.closePath(); ctx.fill();
  }

  // Hot cue triangles
  for (const hc of anlz.hot_cues) {
    const x = msToX(hc.time_ms);
    ctx.fillStyle = hc.color_hex;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x - 5, 9); ctx.lineTo(x + 5, 9); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#000'; ctx.font = 'bold 7px ui-monospace, monospace';
    ctx.textAlign = 'center'; ctx.fillText(hc.slot, x, 8); ctx.textAlign = 'left';
  }

  // Playhead
  if (duration > 0) {
    const px = (currentTime / duration) * W;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, H); ctx.stroke();
  }
}

// ---------------------------------------------------------------------------
// Zoomed canvas
// ---------------------------------------------------------------------------

function drawZoomedCanvas(
  canvas: HTMLCanvasElement, anlz: TrackAnlzData,
  duration: number, centerTime: number, beatsVisible: number, wfStyle: WfStyle,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = canvas.width, H = canvas.height;
  const durationMs = duration * 1000;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, W, H);
  if (durationMs <= 0 || anlz.beat_grid.length === 0) return;

  const avgBpm = anlz.bpm > 0 ? anlz.bpm : 120;
  const msPerBeat = 60_000 / avgBpm;
  const totalWindowBeats = beatsVisible;
  const centerMs = centerTime * 1000;
  // Playhead at 35% from left — asymmetric window
  const leftMs = (totalWindowBeats * PLAYHEAD_RATIO) * msPerBeat;
  const rightMs = (totalWindowBeats * (1 - PLAYHEAD_RATIO)) * msPerBeat;
  const startMs = centerMs - leftMs;
  const endMs = centerMs + rightMs;
  const windowMs = endMs - startMs;

  const waveLen = anlz.waveform_4stem?.length ?? anlz.waveform_3band?.length ?? anlz.waveform_preview.length;
  const msToX = (ms: number) => ((ms - startMs) / windowMs) * W;
  const iToMs = (i: number) => (i / waveLen) * durationMs;
  const startIdx = Math.max(0, Math.floor((startMs / durationMs) * waveLen));
  const endIdx = Math.min(waveLen, Math.ceil((endMs / durationMs) * waveLen));

  // Section overlays
  for (const s of anlz.sections) {
    if (s.end_ms < startMs || s.start_ms > endMs) continue;
    const x1 = msToX(Math.max(s.start_ms, startMs));
    const x2 = msToX(Math.min(s.end_ms, endMs));
    ctx.fillStyle = hexToRgba(s.color_hex, 0.18);
    ctx.fillRect(x1, 0, x2 - x1, H);
  }

  // Waveform
  drawWaveformBars(ctx, W, H, anlz, startIdx, endIdx, msToX, iToMs, wfStyle);

  // Beat grid — ZOOMED mode (thick black lines, labels)
  drawBeatGrid(ctx, W, H, anlz.beat_grid, startMs, endMs, true);

  // Memory cues
  for (const mc of anlz.memory_cues) {
    if (mc.time_ms < startMs || mc.time_ms > endMs) continue;
    const x = msToX(mc.time_ms);
    ctx.fillStyle = mc.color_hex;
    ctx.beginPath(); ctx.moveTo(x, H); ctx.lineTo(x - 6, H - 11); ctx.lineTo(x + 6, H - 11); ctx.closePath(); ctx.fill();
  }

  // Hot cues
  for (const hc of anlz.hot_cues) {
    if (hc.time_ms < startMs || hc.time_ms > endMs) continue;
    const x = msToX(hc.time_ms);
    ctx.fillStyle = hc.color_hex;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x - 6, 11); ctx.lineTo(x + 6, 11); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#000'; ctx.font = 'bold 8px ui-monospace, monospace';
    ctx.textAlign = 'center'; ctx.fillText(hc.slot, x, 10); ctx.textAlign = 'left';
  }

  // Playhead at 35% from left with glow
  const px = W * PLAYHEAD_RATIO;
  // Glow (6px wide, 15% opacity)
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(px - 3, 0, 6, H);
  // Solid playhead line (2px white)
  ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, H); ctx.stroke();
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface DJWaveformViewProps {
  track: Track;
  currentTime: number;
  duration: number;
  onSeek: (sec: number) => void;
}

export function DJWaveformView({ track, currentTime, duration, onSeek }: DJWaveformViewProps) {
  const [dualData, setDualData] = useState<DualAnlzData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [zoomCenter, setZoomCenter] = useState<number>(0);
  const [anlzSource, setAnlzSource] = useState<AnlzSource>('auto');
  const [wfStyle, setWfStyle] = useState<WfStyle>('3band');
  const [zoomBeats, setZoomBeats] = useState<number>(64);

  const overviewCanvasRef = useRef<HTMLCanvasElement>(null);
  const zoomedCanvasRef = useRef<HTMLCanvasElement>(null);
  const overviewWrapRef = useRef<HTMLDivElement>(null);
  const zoomedWrapRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  // Derive effective anlz data from dual response
  function mmToAnlz(mm: MixMindAnalysis): TrackAnlzData {
    return {
      beat_grid: mm.beat_grid,
      first_beat_ms: mm.beat_grid.length > 0 ? mm.beat_grid[0].time_ms : 0,
      waveform_preview: [],
      waveform_3band: null,
      sections: mm.sections,
      hot_cues: mm.auto_cues.map((c: AutoCueEntry): HotCueEntry => ({
        slot: c.slot, time_ms: c.time_ms, color_hex: c.color_hex,
        label: c.label, is_loop: false, loop_out_ms: null,
      })),
      memory_cues: [],
      bpm: mm.bpm,
      waveform_4stem: mm.waveform_4stem ?? undefined,
      essentia: mm.essentia ?? undefined,
    };
  }

  let anlzData: TrackAnlzData | null = null;
  if (dualData) {
    if (anlzSource === 'mm' && dualData.mixmind) {
      anlzData = mmToAnlz(dualData.mixmind);
    } else if (anlzSource === 'rb' && dualData.rekordbox) {
      anlzData = dualData.rekordbox;
    } else {
      anlzData = dualData.mixmind ? mmToAnlz(dualData.mixmind) : dualData.rekordbox;
    }
  }

  // Fetch ANLZ data
  useEffect(() => {
    setDualData(null); setFetchFailed(false);
    if (!track.content_id) return;
    setLoading(true);
    sidecarGet<DualAnlzData>(`/api/tracks/${track.content_id}/anlz`)
      .then(data => {
        if (!('rekordbox' in data) && 'beat_grid' in data) {
          const flat = data as unknown as TrackAnlzData;
          setDualData({ rekordbox: flat, mixmind: null, active_source: 'rekordbox' });
          setZoomCenter(flat.first_beat_ms / 1000);
        } else {
          setDualData(data);
          const primary = data.mixmind
            ? (data.mixmind.beat_grid[0]?.time_ms ?? 0) / 1000
            : (data.rekordbox?.first_beat_ms ?? 0) / 1000;
          setZoomCenter(primary);
        }
        setFetchFailed(false);
      })
      .catch(() => { setDualData(null); setFetchFailed(true); })
      .finally(() => setLoading(false));
  }, [track.content_id]);

  useEffect(() => {
    if (duration > 0 && currentTime > 0) setZoomCenter(currentTime);
  }, [currentTime, duration]);

  const resizeCanvas = useCallback((canvas: HTMLCanvasElement | null, wrap: HTMLDivElement | null) => {
    if (!canvas || !wrap) return;
    canvas.width = wrap.clientWidth;
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

  // Render loop
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    const render = () => {
      rafRef.current = requestAnimationFrame(render);
      if (!anlzData) return;
      const ov = overviewCanvasRef.current;
      const zm = zoomedCanvasRef.current;
      if (ov && ov.width > 0) drawOverviewCanvas(ov, anlzData, duration, currentTime, wfStyle);
      if (zm && zm.width > 0) drawZoomedCanvas(zm, anlzData, duration, zoomCenter, zoomBeats, wfStyle);
    };
    render();
    return () => cancelAnimationFrame(rafRef.current);
  }, [anlzData, duration, currentTime, zoomCenter, wfStyle, zoomBeats]);

  function handleOverviewClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = overviewCanvasRef.current;
    if (!canvas || duration <= 0) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    onSeek(ratio * duration);
    setZoomCenter(ratio * duration);
  }

  function formatTime(sec: number) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  const noAnlz = !loading && fetchFailed;
  const btnStyle = (active: boolean, color: string, available = true): React.CSSProperties => ({
    fontSize: '9px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px',
    border: 'none', cursor: available ? 'pointer' : 'default',
    fontFamily: 'ui-monospace, monospace',
    background: active ? hexToRgba(color, 0.25) : 'transparent',
    color: active ? color : (available ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)'),
    transition: 'all 0.12s',
  });

  return (
    <div style={{
      background: '#000000', borderTop: '1px solid #1a1a2e', borderBottom: '1px solid #1a1a2e',
      flexShrink: 0, display: 'flex', flexDirection: 'column',
    }}>
      {/* ── Header bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.04)', minHeight: '34px', flexShrink: 0, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#e5e7eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
          {track.title}
        </span>
        <span style={{ fontSize: '10px', color: '#6b7280', whiteSpace: 'nowrap' }}>{track.artist}</span>
        {anlzData && (
          <>
            <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'rgba(124,58,237,0.15)', color: '#a78bfa', fontFeatureSettings: '"tnum"' }}>
              {Math.round(anlzData.bpm > 0 ? anlzData.bpm : track.bpm)} BPM
            </span>
            <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', color: '#6b7280' }}>
              {track.camelot}
            </span>
          </>
        )}
        <span style={{ fontSize: '9px', color: '#374151', fontFeatureSettings: '"tnum"' }}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        {/* Waveform style selector */}
        <div style={{ display: 'flex', gap: '2px', background: 'rgba(255,255,255,0.04)', borderRadius: '5px', padding: '2px', marginLeft: '4px' }}>
          {(['3band', 'rgb', 'blue'] as WfStyle[]).map(s => (
            <button key={s} onClick={() => setWfStyle(s)} style={btnStyle(wfStyle === s, '#0055E1')}>
              {s === '3band' ? '3Band' : s === 'rgb' ? 'RGB' : 'BLUE'}
            </button>
          ))}
        </div>

        {/* Source toggle */}
        {dualData && (
          <div style={{ display: 'flex', gap: '2px', background: 'rgba(255,255,255,0.04)', borderRadius: '5px', padding: '2px' }}>
            {([
              { key: 'rb' as AnlzSource, label: 'RB', color: '#00E676', available: !!dualData.rekordbox },
              { key: 'mm' as AnlzSource, label: 'MM', color: '#AA00FF', available: !!dualData.mixmind },
              { key: 'auto' as AnlzSource, label: 'Auto', color: '#7C4DFF', available: true },
            ]).map(b => (
              <button key={b.key} onClick={() => setAnlzSource(b.key)} disabled={!b.available} style={btnStyle(anlzSource === b.key, b.color, b.available)}>
                {b.label}
              </button>
            ))}
          </div>
        )}

        {/* Zoom control */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '4px' }}>
          <span style={{ fontSize: '9px', color: '#6b7280' }}>Zoom:</span>
          <input type="range" min="8" max="128" step="8" value={zoomBeats}
            onChange={e => setZoomBeats(parseInt(e.target.value))}
            style={{ width: '80px', accentColor: '#7c3aed' }} />
          <span style={{ fontSize: '9px', color: '#6b7280', fontFeatureSettings: '"tnum"', minWidth: '40px' }}>
            {Math.round(zoomBeats / 4)} bars
          </span>
        </div>

        {/* Analysis source status */}
        {dualData && (
          <span style={{ fontSize: '9px', fontWeight: 600, marginLeft: '6px', padding: '2px 8px', borderRadius: '4px',
            background: dualData.mixmind
              ? 'rgba(170,0,255,0.15)' : dualData.rekordbox
              ? 'rgba(0,230,118,0.15)' : 'rgba(255,68,68,0.15)',
            color: dualData.mixmind
              ? '#c084fc' : dualData.rekordbox
              ? '#00E676' : '#ff4444',
          }}>
            {dualData.mixmind && dualData.rekordbox
              ? 'Analyzed: RB + MM'
              : dualData.mixmind
              ? 'Analyzed: MixMind'
              : dualData.rekordbox
              ? 'Analyzed: Rekordbox'
              : 'Not analyzed'}
          </span>
        )}
        {!dualData && !loading && (
          <span style={{ fontSize: '9px', color: '#ff4444', marginLeft: '6px' }}>Not analyzed</span>
        )}
      </div>

      {/* ── Waveform panes ── */}
      <div style={{ display: 'flex', height: '100px', position: 'relative' }}>
        {loading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', zIndex: 10 }}>
            <div style={{ width: '20px', height: '20px', border: '2px solid #7c3aed', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        )}
        {noAnlz && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '11px', color: '#4b5563' }}>No waveform data</span>
          </div>
        )}

        {/* Overview (left) */}
        <div ref={overviewWrapRef} style={{ flex: '0 0 50%', borderRight: '1px solid rgba(255,255,255,0.06)', position: 'relative' }}>
          <canvas ref={overviewCanvasRef} onClick={handleOverviewClick}
            style={{ width: '100%', height: '100%', display: 'block', cursor: 'pointer' }} />
          {/* Stem legend */}
          {anlzData?.waveform_4stem && (
            <div style={{ position: 'absolute', top: 3, right: 3, display: 'flex', gap: '5px', fontSize: '7px', opacity: 0.6, pointerEvents: 'none' }}>
              {[{ l: 'Drums', c: STEM_DRUMS }, { l: 'Bass', c: STEM_BASS }, { l: 'Vocals', c: STEM_VOCALS }, { l: 'Other', c: STEM_OTHER }].map(s => (
                <span key={s.l} style={{ display: 'flex', alignItems: 'center', gap: '2px', color: 'rgba(255,255,255,0.6)' }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.c, display: 'inline-block' }} />
                  {s.l}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Zoomed (right) */}
        <div ref={zoomedWrapRef} style={{ flex: '0 0 50%', position: 'relative' }}>
          <canvas ref={zoomedCanvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
        </div>
      </div>
    </div>
  );
}
