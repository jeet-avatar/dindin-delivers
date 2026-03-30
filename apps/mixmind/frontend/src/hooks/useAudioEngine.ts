// src/hooks/useAudioEngine.ts
// Self-contained audio engine for a single CDJ deck.
// Handles: playback, seeking, pitch/tempo, cue point, loop.

import { useRef, useEffect, useState, useCallback } from 'react';
import { sidecarUrl } from './useSidecar';

export interface AudioEngineState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  pitchPercent: number;
  pitchRange: 6 | 10 | 16 | 100;
  masterTempo: boolean;
  cuePoint: number;          // seconds
  effectiveBpm: number;      // adjusted BPM after pitch
}

export interface AudioEngineActions {
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (sec: number) => void;
  setCuePoint: (sec?: number) => void;
  returnToCue: () => void;
  cuePreviw: () => void;      // hold = play from cue, release = return
  cueRelease: () => void;
  setPitchPercent: (pct: number) => void;
  setPitchRange: (range: 6 | 10 | 16 | 100) => void;
  toggleMasterTempo: () => void;
  nudgeFaster: () => void;    // jog outer ring forward
  nudgeSlower: () => void;    // jog outer ring backward
  nudgeStop: () => void;
}

export function useAudioEngine(
  filePath: string | null,
  originalBpm: number,
): [AudioEngineState, AudioEngineActions] {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [pitchPercent, setPitchPercent] = useState(0);
  const [pitchRange, setPitchRange] = useState<6 | 10 | 16 | 100>(6);
  const [masterTempo, setMasterTempo] = useState(true);
  const [cuePoint, setCuePointState] = useState(0);

  const nudgeRef = useRef(false);
  const animRef = useRef(0);

  // Effective BPM
  const rate = 1 + pitchPercent / 100;
  const effectiveBpm = originalBpm * rate;

  // ── Create audio element when file changes ──
  useEffect(() => {
    // Cleanup previous
    cancelAnimationFrame(animRef.current);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (sourceRef.current) { sourceRef.current.disconnect(); sourceRef.current = null; }
    if (ctxRef.current) { ctxRef.current.close().catch(() => {}); ctxRef.current = null; }
    analyserRef.current = null;

    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setPitchPercent(0);
    setCuePointState(0);

    if (!filePath) return;

    const src = sidecarUrl(`/api/audio/stream?path=${encodeURIComponent(filePath)}`);
    const audio = new Audio(src);
    audio.crossOrigin = 'anonymous';
    audio.preservesPitch = true;
    audioRef.current = audio;

    // Web Audio context
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.82;

    const source = ctx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(ctx.destination);

    ctxRef.current = ctx;
    sourceRef.current = source;
    analyserRef.current = analyser;

    // Events
    audio.addEventListener('loadedmetadata', () => setDuration(audio.duration));
    audio.addEventListener('ended', () => { setIsPlaying(false); setCurrentTime(0); });
    audio.addEventListener('error', () => setIsPlaying(false));

    // Time update loop (requestAnimationFrame for smooth waveform sync)
    const tick = () => {
      animRef.current = requestAnimationFrame(tick);
      if (audio && !audio.paused) {
        setCurrentTime(audio.currentTime);
      }
    };
    animRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animRef.current);
      audio.pause();
      source.disconnect();
      analyser.disconnect();
      ctx.close().catch(() => {});
    };
  }, [filePath]);

  // ── Apply pitch to audio element ──
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = Math.max(0.1, 1 + pitchPercent / 100);
    audio.preservesPitch = masterTempo;
  }, [pitchPercent, masterTempo]);

  // ── Actions ──
  const play = useCallback(() => {
    const audio = audioRef.current;
    const ctx = ctxRef.current;
    if (!audio) return;
    ctx?.resume();
    audio.play().then(() => setIsPlaying(true)).catch(() => {});
  }, []);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) pause(); else play();
  }, [isPlaying, play, pause]);

  const seek = useCallback((sec: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(sec, audio.duration || 0));
    setCurrentTime(audio.currentTime);
  }, []);

  const setCuePoint = useCallback((sec?: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const t = sec ?? audio.currentTime;
    setCuePointState(t);
  }, []);

  const returnToCue = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = cuePoint;
    audio.pause();
    setIsPlaying(false);
    setCurrentTime(cuePoint);
  }, [cuePoint]);

  // CUE preview: hold to play from cue, release returns
  const cuePreviw = useCallback(() => {
    const audio = audioRef.current;
    const ctx = ctxRef.current;
    if (!audio) return;
    audio.currentTime = cuePoint;
    ctx?.resume();
    audio.play().catch(() => {});
    // Don't set isPlaying — this is a preview
  }, [cuePoint]);

  const cueRelease = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = cuePoint;
    audio.pause();
    setCurrentTime(cuePoint);
  }, [cuePoint]);

  const setPitch = useCallback((pct: number) => {
    const clamped = Math.max(-pitchRange, Math.min(pitchRange, pct));
    setPitchPercent(clamped);
  }, [pitchRange]);

  const setRange = useCallback((range: 6 | 10 | 16 | 100) => {
    setPitchRange(range);
    // Clamp current pitch to new range
    setPitchPercent(prev => Math.max(-range, Math.min(range, prev)));
  }, []);

  const toggleMasterTempo = useCallback(() => {
    setMasterTempo(prev => !prev);
  }, []);

  // Nudge: temporary pitch bend (jog outer ring)
  const nudgeFaster = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    nudgeRef.current = true;
    audio.playbackRate = Math.max(0.1, (1 + pitchPercent / 100) * 1.04);
  }, [pitchPercent]);

  const nudgeSlower = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    nudgeRef.current = true;
    audio.playbackRate = Math.max(0.1, (1 + pitchPercent / 100) * 0.96);
  }, [pitchPercent]);

  const nudgeStop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    nudgeRef.current = false;
    audio.playbackRate = Math.max(0.1, 1 + pitchPercent / 100);
  }, [pitchPercent]);

  const state: AudioEngineState = {
    isPlaying, currentTime, duration,
    pitchPercent, pitchRange, masterTempo,
    cuePoint, effectiveBpm,
  };

  const actions: AudioEngineActions = {
    play, pause, togglePlay, seek,
    setCuePoint, returnToCue, cuePreviw: cuePreviw, cueRelease,
    setPitchPercent: setPitch, setPitchRange: setRange, toggleMasterTempo,
    nudgeFaster, nudgeSlower, nudgeStop,
  };

  return [state, actions];
}
