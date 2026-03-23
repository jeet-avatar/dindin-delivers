// src/components/DuplicatePanel.tsx
import { useState } from 'react';
import { sidecarGet, sidecarPost } from '../hooks/useSidecar';
import { DuplicatePair } from '../types/track';

interface ScanResponse {
  pairs: DuplicatePair[];
  count: number;
}

interface Props {
  onCountChange: (n: number) => void;
}

export function DuplicatePanel({ onCountChange }: Props) {
  const [pairs, setPairs] = useState<DuplicatePair[]>([]);
  const [loading, setLoading] = useState(false);

  async function scan() {
    setLoading(true);
    try {
      const data = await sidecarGet<ScanResponse>('/api/duplicates/scan');
      setPairs(data.pairs);
      onCountChange(data.count);
    } finally {
      setLoading(false);
    }
  }

  async function hideTrack(content_id: string, source: string) {
    await sidecarPost('/api/duplicates/hide', { content_id, source });
    setPairs(prev => prev.filter(
      p => p.track_a.content_id !== content_id && p.track_b.content_id !== content_id
    ));
    onCountChange(pairs.length - 1);
  }

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-medium">Duplicate Tracks</h2>
        <button
          onClick={scan}
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 px-3 py-1.5 rounded-md text-sm"
        >
          {loading ? 'Scanning...' : 'Scan Library'}
        </button>
      </div>

      {pairs.length === 0 && !loading && (
        <p className="text-gray-500 text-sm">No duplicates found. Click "Scan Library" to check.</p>
      )}

      {pairs.map((pair, i) => (
        <div key={i} className="bg-white/5 rounded-md p-3 mb-3">
          <div className="grid grid-cols-2 gap-3 mb-2 text-sm">
            <div>
              <div className="font-medium truncate">{pair.track_a.title}</div>
              <div className="text-xs text-gray-500">{pair.track_a.artist}</div>
              <div className="text-xs text-gray-500 mt-1">
                {pair.track_a.bpm} BPM · {pair.track_a.camelot} · {Math.floor(pair.track_a.duration_sec / 60)}:{String(pair.track_a.duration_sec % 60).padStart(2,'0')}
              </div>
            </div>
            <div>
              <div className="font-medium truncate">{pair.track_b.title}</div>
              <div className="text-xs text-gray-500">{pair.track_b.artist}</div>
              <div className="text-xs text-gray-500 mt-1">
                {pair.track_b.bpm} BPM · {pair.track_b.camelot} · {Math.floor(pair.track_b.duration_sec / 60)}:{String(pair.track_b.duration_sec % 60).padStart(2,'0')}
              </div>
            </div>
          </div>
          <div className="text-xs text-gray-600 mb-2">
            Match: {pair.similarity_score.toFixed(0)}% similar
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => hideTrack(pair.track_b.content_id, pair.track_b.source)}
              className="flex-1 bg-green-600/20 hover:bg-green-600/30 text-green-400 text-xs py-1 rounded"
            >
              Keep Left
            </button>
            <button
              onClick={() => hideTrack(pair.track_a.content_id, pair.track_a.source)}
              className="flex-1 bg-green-600/20 hover:bg-green-600/30 text-green-400 text-xs py-1 rounded"
            >
              Keep Right
            </button>
            <button
              onClick={() => {
                setPairs(prev => prev.filter((_, idx) => idx !== i));
                onCountChange(Math.max(0, pairs.length - 1));
              }}
              className="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 text-xs py-1 rounded"
            >
              Keep Both
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
