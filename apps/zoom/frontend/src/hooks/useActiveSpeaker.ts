import { useEffect, useRef, useState } from 'react';
import type { RemotePeer } from './useWebRTC';

const THRESHOLD = 15; // minimum average volume to count as "speaking"
const INTERVAL = 300; // ms between checks

export function useActiveSpeaker(
  localStream: MediaStream | null,
  myPeerId: string | null,
  remotePeers: RemotePeer[],
): string | null {
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analysersRef = useRef<Map<string, { analyser: AnalyserNode; source: MediaStreamAudioSourceNode }>>(new Map());

  useEffect(() => {
    const ctx = new AudioContext();
    ctxRef.current = ctx;

    const data = new Uint8Array(256);
    const interval = setInterval(() => {
      let loudest: string | null = null;
      let loudestLevel = THRESHOLD;

      for (const [peerId, { analyser }] of analysersRef.current) {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        if (avg > loudestLevel) {
          loudestLevel = avg;
          loudest = peerId;
        }
      }

      setActiveSpeakerId(loudest);
    }, INTERVAL);

    return () => {
      clearInterval(interval);
      analysersRef.current.forEach(({ source }) => source.disconnect());
      analysersRef.current.clear();
      ctx.close();
    };
  }, []);

  // Connect/disconnect streams as peers change
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    const currentIds = new Set<string>();

    // Local audio
    if (localStream && myPeerId) {
      currentIds.add(myPeerId);
      if (!analysersRef.current.has(myPeerId)) {
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
          const source = ctx.createMediaStreamSource(new MediaStream([audioTrack]));
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 512;
          source.connect(analyser);
          analysersRef.current.set(myPeerId, { analyser, source });
        }
      }
    }

    // Remote audio
    for (const peer of remotePeers) {
      currentIds.add(peer.id);
      if (!analysersRef.current.has(peer.id) && peer.stream) {
        const audioTrack = peer.stream.getAudioTracks()[0];
        if (audioTrack) {
          const source = ctx.createMediaStreamSource(new MediaStream([audioTrack]));
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 512;
          source.connect(analyser);
          analysersRef.current.set(peer.id, { analyser, source });
        }
      }
    }

    // Remove stale entries
    for (const [id, { source }] of analysersRef.current) {
      if (!currentIds.has(id)) {
        source.disconnect();
        analysersRef.current.delete(id);
      }
    }
  }, [localStream, myPeerId, remotePeers]);

  return activeSpeakerId;
}
