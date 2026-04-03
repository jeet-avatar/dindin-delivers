import { useCallback, useRef, useState } from 'react';
import type { RemotePeer } from './useWebRTC';

export function useRecording(
  localStream: MediaStream | null,
  remotePeers: RemotePeer[],
) {
  const [isRecording, setIsRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const ctxRef = useRef<AudioContext | null>(null);

  const canRecord = typeof MediaRecorder !== 'undefined';

  const startRecording = useCallback(async () => {
    if (!localStream || !canRecord) return;

    const ctx = new AudioContext();
    ctxRef.current = ctx;
    const dest = ctx.createMediaStreamDestination();

    // Mix local audio
    const localAudio = localStream.getAudioTracks()[0];
    if (localAudio) {
      ctx.createMediaStreamSource(new MediaStream([localAudio])).connect(dest);
    }

    // Mix all remote audio
    for (const peer of remotePeers) {
      if (peer.stream) {
        for (const track of peer.stream.getAudioTracks()) {
          ctx.createMediaStreamSource(new MediaStream([track])).connect(dest);
        }
      }
    }

    // Pick a video track — prefer first remote, fallback to local
    const videoTrack =
      remotePeers.find(p => p.stream?.getVideoTracks().length)?.stream?.getVideoTracks()[0] ||
      localStream.getVideoTracks()[0];

    const tracks: MediaStreamTrack[] = [...dest.stream.getAudioTracks()];
    if (videoTrack) tracks.push(videoTrack);

    const mixed = new MediaStream(tracks);

    // Find supported mime type — Safari only supports mp4
    const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm', 'video/mp4', '']
      .find(t => t === '' || MediaRecorder.isTypeSupported(t)) || '';

    const options: MediaRecorderOptions = {};
    if (mimeType) options.mimeType = mimeType;

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(mixed, options);
    } catch {
      // Fallback: record without options
      try {
        recorder = new MediaRecorder(mixed);
      } catch {
        return; // Recording not supported
      }
    }

    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const usedMime = recorder.mimeType || 'video/webm';
      const ext = usedMime.includes('mp4') ? 'mp4' : 'webm';
      const blob = new Blob(chunksRef.current, { type: usedMime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zietra-meet-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      ctxRef.current?.close();
      ctxRef.current = null;
    };

    recorder.start(1000);
    recorderRef.current = recorder;
    setIsRecording(true);
  }, [localStream, remotePeers, canRecord]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop();
    }
    recorderRef.current = null;
    setIsRecording(false);
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) stopRecording();
    else startRecording();
  }, [isRecording, startRecording, stopRecording]);

  return { isRecording, canRecord, toggleRecording };
}
