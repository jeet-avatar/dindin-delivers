import { useEffect, useRef, useState, useCallback } from 'react';

// Always connect to /ws on same host — Vite proxies in dev, unified server in prod
const SIGNALING_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

interface UseWebRTCOptions {
  room: string;
  name: string;
}

interface UseWebRTCReturn {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  peerName: string | null;
  isMuted: boolean;
  isCamOff: boolean;
  isScreenSharing: boolean;
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
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);

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

    const remote = new MediaStream();
    setRemoteStream(remote);
    pc.ontrack = (e) => {
      e.streams[0].getTracks().forEach((track) => remote.addTrack(track));
      setRemoteStream(new MediaStream(remote.getTracks()));
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    return pc;
  }, [send]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }

        localStreamRef.current = stream;
        cameraTrackRef.current = stream.getVideoTracks()[0] || null;
        setLocalStream(stream);

        const ws = new WebSocket(SIGNALING_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          send({ type: 'join', room, name });
        };

        ws.onerror = () => {
          setError('Cannot connect to signaling server');
        };

        ws.onmessage = async (event) => {
          const msg = JSON.parse(event.data);

          if (msg.type === 'peer-joined') {
            setPeerName(msg.name);
            const pc = pcRef.current || createPeerConnection();
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            send({ type: 'offer', sdp: pc.localDescription });
          }

          if (msg.type === 'offer') {
            const pc = pcRef.current || createPeerConnection();
            await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            send({ type: 'answer', sdp: pc.localDescription });
          }

          if (msg.type === 'answer') {
            await pcRef.current?.setRemoteDescription(
              new RTCSessionDescription(msg.sdp)
            );
          }

          if (msg.type === 'ice-candidate') {
            await pcRef.current?.addIceCandidate(
              new RTCIceCandidate(msg.candidate)
            );
          }

          if (msg.type === 'peer-left') {
            setPeerName(null);
            setRemoteStream(null);
            pcRef.current?.close();
            pcRef.current = null;
          }

          if (msg.type === 'error') {
            setError(msg.message as string);
          }
        };
      } catch (err) {
        setError('Could not access camera/microphone. Please allow access and reload.');
        console.error(err);
      }
    }

    init();

    return () => {
      cancelled = true;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      pcRef.current?.close();
      wsRef.current?.close();
    };
  }, [room, name, send, createPeerConnection]);

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
    const pc = pcRef.current;
    if (!pc) return;
    const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
    if (!sender) return;

    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        const screenTrack = screenStream.getVideoTracks()[0];
        await sender.replaceTrack(screenTrack);
        setIsScreenSharing(true);

        screenTrack.onended = async () => {
          if (cameraTrackRef.current) {
            await sender.replaceTrack(cameraTrackRef.current);
          }
          setIsScreenSharing(false);
        };
      } catch {
        // User cancelled screen share picker
      }
    } else {
      if (cameraTrackRef.current) {
        await sender.replaceTrack(cameraTrackRef.current);
      }
      setIsScreenSharing(false);
    }
  }, [isScreenSharing]);

  const endCall = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    pcRef.current?.close();
    wsRef.current?.close();
    setLocalStream(null);
    setRemoteStream(null);
    setPeerName(null);
  }, []);

  return {
    localStream,
    remoteStream,
    peerName,
    isMuted,
    isCamOff,
    isScreenSharing,
    toggleMute,
    toggleCam,
    toggleScreenShare,
    endCall,
    error,
  };
}
