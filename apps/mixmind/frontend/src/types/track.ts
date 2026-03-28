// src/types/track.ts
export interface Track {
  content_id: string;
  source: 'db' | 'xml';
  title: string;
  artist: string;
  bpm: number;
  key_musical: string;
  camelot: string;
  rating: number;        // 0-5
  duration_sec: number;
  cue_count: number;
  cue_colors: string[];  // e.g. ['red', 'blue']
  file_path: string;     // absolute path to audio file on disk
  analysis_data_path?: string; // ANLZ relative path from Rekordbox DB

  // Metadata fields from Rekordbox (Q-242)
  genre?: string;
  comment?: string;
  color_hex?: string;      // '#rrggbb' or empty
  date_added?: string;     // 'YYYY-MM-DD' or empty
  label?: string;          // Record label name
  play_count?: number;     // DJ play count
  mm_analyzed?: boolean;   // true if MixMind Pro Analysis has been run
}

// ---------------------------------------------------------------------------
// ANLZ / CDJ-3000 waveform data types
// ---------------------------------------------------------------------------

export interface BeatGridEntry {
  time_ms: number;
  beat: number;   // 1-4 (1 = downbeat)
  bpm: number;
}

export interface SectionEntry {
  start_ms: number;
  end_ms: number;
  kind: number;
  name: string;   // 'intro' | 'verse' | 'chorus' | 'outro' | 'bridge' | 'up' | 'down' | 'fill_in'
  color_hex: string; // CDJ-3000 overlay color
}

export interface HotCueEntry {
  slot: string;        // 'A'-'H'
  time_ms: number;
  color_hex: string;
  label: string;
  is_loop: boolean;
  loop_out_ms: number | null;
}

export interface MemoryCueEntry {
  time_ms: number;
  label: string;
  color_hex: string;   // always #33FF9E
}

export interface TrackAnlzData {
  beat_grid: BeatGridEntry[];
  first_beat_ms: number;
  waveform_preview: number[];                                    // amplitude bytes 0-255, ~400 cols
  waveform_3band: { low: number; mid: number; high: number }[] | null; // CDJ 3-band per column
  sections: SectionEntry[];
  hot_cues: HotCueEntry[];
  memory_cues: MemoryCueEntry[];
  bpm: number;
  partial?: boolean;  // true when ANLZ .DAT not on this Mac — cues only, no waveform
  waveform_4stem?: Waveform4Stem[];   // Demucs 4-stem per-column amplitudes
  essentia?: EssentiaResult;           // Essentia feature extraction results
  analyzer_version?: string;           // e.g. "1.0"
}

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
}

export interface DuplicatePair {
  track_a: Omit<Track, 'cue_count' | 'cue_colors'>;
  track_b: Omit<Track, 'cue_count' | 'cue_colors'>;
  similarity_score: number;
}

export interface AIPlaylistItem {
  title: string;
  artist: string;
  reason: string;
}

// ---------------------------------------------------------------------------
// Stem analysis types (Q-248: Demucs + Essentia)
// ---------------------------------------------------------------------------

export interface Waveform4Stem {
  drums: number;   // 0-255
  bass: number;    // 0-255
  vocals: number;  // 0-255
  other: number;   // 0-255
}

export interface EssentiaResult {
  bpm: number;
  key_musical: string;
  camelot: string;
  genre: string;
  energy: number;       // 0.0-1.0
  danceability: number; // 0.0-1.0
}

// ---------------------------------------------------------------------------
// MixMind Pro Analysis Engine types (dual-source RB/MM)
// ---------------------------------------------------------------------------

/** Auto-cue entry placed by MixMind's cue_detector */
export interface AutoCueEntry {
  slot: string;      // 'A'-'H'
  time_ms: number;
  label: string;
  color_hex: string;
  reason: string;    // e.g. 'drop', 'breakdown', 'vocal_start'
}

/** MixMind's own analysis result (parallel to TrackAnlzData for Rekordbox) */
export interface MixMindAnalysis {
  beat_grid: BeatGridEntry[];
  bpm: number;
  bpm_stable: boolean;
  beat_confidence: number;       // 0.0-1.0
  sections: SectionEntry[];
  auto_cues: AutoCueEntry[];
  waveform_4stem: Waveform4Stem[] | null;
  essentia: EssentiaResult | null;
}

/** Dual-source ANLZ response — backend returns both RB and MM when available */
export interface DualAnlzData {
  rekordbox: TrackAnlzData | null;
  mixmind: MixMindAnalysis | null;
  active_source: 'rekordbox' | 'mixmind' | 'auto';
}
