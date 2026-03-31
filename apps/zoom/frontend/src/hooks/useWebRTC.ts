import { useEffect, useRef, useState, useCallback } from 'react';

// Always connect to /ws on same host — Vite proxies in dev, unified server in prod
const SIGNALING_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  // Free TURN servers from Metered.ca (relay fallback for NAT traversal)
  {
    urls: 'turn:a.relay.metered.ca:80',
    username: 'e8dd65e92f3b1eff0f29b848',
    credential: 'mCY0FxMflgJNm3Xq',
  },
  {
    urls: 'turn:a.relay.metered.ca:443',
    username: 'e8dd65e92f3b1eff0f29b848',
    credential: 'mCY0FxMflgJNm3Xq',
  },
  {
    urls: 'turns:a.relay.metered.ca:443?transport=tcp',
    username: 'e8dd65e92f3b1eff0f29b848',
    credential: 'mCY0FxMflgJNm3Xq',
  },
];

export type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'failed' | 'waiting';

interface UseWebRTCOptions {
  room: string;
  name: string;
}

interface UseWebRTCReturn {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  peerName: string | null;
  connectionState: ConnectionState;
  isMuted: boolean;
  isCamOff: boolean;
  isScreenSharing: boolean;
  canScreenShare: boolean;
  toggleMute: () => void;
  toggleCam: () => void;
  toggleScreenShare: () => void;
  endCall: () => void;
  error: string | null;
}

export function useWebRTC({ room, name }: UseWebRTCOptions): UseWebRTCReturn {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [peerName, setPeerName] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('waiting');
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);
  const wsRetryCount = useRef(0);
  const cleanedUp = useRef(false);

  // Check if screen share is available (not on iOS)
  const canScreenShare = typeof navigator.mediaDevices?.getDisplayMedia === 'function';

  const send = useCallback((msg: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        send({ type: 'ice-candidate', candidate: e.candidate });
      }
    };

    // Monitor ICE connection state
    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      if (state === 'connected' || state === 'completed') {
        setConnectionState('connected');
      } else if (state === 'disconnected') {
        setConnectionState('reconnecting');
      } else if (state === 'failed') {
        setConnectionState('failed');
        // Attempt ICE restart
        pc.restartIce();
      } else if (state === 'checking') {
        setConnectionState('connecting');
      }
    };

    // Receive remote tracks — use e.track (not e.streams[0] which can be undefined in Safari)
    const remote = new MediaStream();
    setRemoteStream(remote);
    pc.ontrack = (e) => {
      const track = e.track;
      if (!remote.getTrackById(track.id)) {
        remote.addTrack(track);
      }
      setRemoteStream(new MediaStream(remote.getTracks()));
    };

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    return pc;
  }, [send]);

  // Drain queued ICE candidates after remote description is set
  const drainCandidates = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription) return;
    for (const candidate of pendingCandidates.current) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn('Failed to add queued ICE candidate:', err);
      }
    }
    pendingCandidates.current = [];
  }, []);

  // Connect to signaling server with reconnection
  const connectSignaling = useCallback((stream: MediaStream) => {
    if (cleanedUp.current) return;

    const ws = new WebSocket(SIGNALING_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      wsRetryCount.current = 0;
      send({ type: 'join', room, name });
    };

    ws.onerror = () => {
      if (!cleanedUp.current) {
        setError('Cannot connect to server. Retrying...');
      }
    };

    ws.onclose = () => {
      if (cleanedUp.current) return;
      // Reconnect with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, wsRetryCount.current), 30000);
      wsRetryCount.current++;
      setTimeout(() => connectSignaling(stream), delay);
    };

    ws.onmessage = async (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === 'peer-joined') {
        setPeerName(msg.name);
        setConnectionState('connecting');
        const pc = pcRef.current || createPeerConnection();
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        send({ type: 'offer', sdp: pc.localDescription });
      }

      if (msg.type === 'offer') {
        setConnectionState('connecting');
        const pc = pcRef.current || createPeerConnection();
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        await drainCandidates();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        send({ type: 'answer', sdp: pc.localDescription });
      }

      if (msg.type === 'answer') {
        if (pcRef.current) {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          await drainCandidates();
        }
      }

      if (msg.type === 'ice-candidate') {
        if (pcRef.current?.remoteDescription) {
          try {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(msg.candidate));
          } catch (err) {
            console.warn('Failed to add ICE candidate:', err);
          }
        } else {
          // Queue candidates until remote description is set
          pendingCandidates.current.push(msg.candidate);
        }
      }

      if (msg.type === 'peer-left') {
        setPeerName(null);
        setRemoteStream(null);
        setConnectionState('waiting');
        pcRef.current?.close();
        pcRef.current = null;
        pendingCandidates.current = [];
      }

      if (msg.type === 'error') {
        setError(msg.message as string);
      }
    };
  }, [room, name, send, createPeerConnection, drainCandidates]);

  // Initialize
  useEffect(() => {
    let cancelled = false;
    cleanedUp.current = false;

    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: true,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }

        localStreamRef.current = stream;
        cameraTrackRef.current = stream.getVideoTracks()[0] || null;
        setLocalStream(stream);

        connectSignaling(stream);
      } catch (err) {
        setError('Could not access camera/microphone. Please allow access and reload.');
        console.error(err);
      }
    }

    init();

    // iOS Safari doesn't fire beforeunload — use pagehide
    const cleanup = () => {
      cleanedUp.current = true;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      pcRef.current?.close();
      wsRef.current?.close();
    };

    const cleanupEvent = /iPad|iPhone|iPod/.test(navigator.userAgent) ? 'pagehide' : 'beforeunload';
    window.addEventListener(cleanupEvent, cleanup);

    return () => {
      cancelled = true;
      cleanup();
      window.removeEventListener(cleanupEvent, cleanup);
    };
  }, [connectSignaling]);

  const toggleMute = useCallback(() => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  }, []);

  const toggleCam = useCallback(() => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsCamOff(!videoTrack.enabled);
    }
  }, []);

  const toggleScreenShare = useCallback(async () => {
    if (!canScreenShare) return;
    const pc = pcRef.current;
    if (!pc) return;
    const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
    if (!sender) return;

    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];
        await sender.replaceTrack(screenTrack);
        setIsScreenSharing(true);

        screenTrack.onended = async () => {
          if (cameraTrackRef.current) {
            await sender.replaceTrack(cameraTrackRef.current);
          }
          screenStreamRef.current?.getTracks().forEach((t) => t.stop());
          screenStreamRef.current = null;
          setIsScreenSharing(false);
        };
      } catch {
        // User cancelled
      }
    } else {
      if (cameraTrackRef.current) {
        await sender.replaceTrack(cameraTrackRef.current);
      }
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      setIsScreenSharing(false);
    }
  }, [isScreenSharing, canScreenShare]);

  const endCall = useCallback(() => {
    cleanedUp.current = true;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    pcRef.current?.close();
    wsRef.current?.close();
    setLocalStream(null);
    setRemoteStream(null);
    setPeerName(null);
    setConnectionState('waiting');
  }, []);

  return {
    localStream,
    remoteStream,
    peerName,
    connectionState,
    isMuted,
    isCamOff,
    isScreenSharing,
    canScreenShare,
    toggleMute,
    toggleCam,
    toggleScreenShare,
    endCall,
    error,
  };
}
