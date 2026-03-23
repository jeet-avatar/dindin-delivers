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
