// src/hooks/useLibrary.ts
import { useState, useEffect, useCallback } from 'react';
import { Track } from '../types/track';
import { sidecarGet } from './useSidecar';

interface LibraryResponse {
  tracks: Track[];
  source: string;
  total: number;
  error?: string;
}

export function useLibrary() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [source, setSource] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await sidecarGet<LibraryResponse>('/api/library');
      setTracks(data.tracks);
      setSource(data.source);
      if (data.error === 'no_library_found') {
        setError('no_library');
      }
    } catch (e) {
      setError('connection_failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { tracks, source, loading, error, reload: load };
}
