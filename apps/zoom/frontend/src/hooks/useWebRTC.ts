import { useEffect, useRef, useState, useCallback } from 'react';

const SIGNALING_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  {
    urls: 'turn:a.relay.metered.ca:80',
    username: 'TURN_USERNAME_REDACTED',
    credential: 'TURN_CREDENTIAL_REDACTED',
  },
  {
    urls: 'turn:a.relay.metered.ca:443',
    username: 'TURN_USERNAME_REDACTED',
    credential: 'TURN_CREDENTIAL_REDACTED',
  },
  {
    urls: 'turns:a.relay.metered.ca:443?transport=tcp',
    username: 'TURN_USERNAME_REDACTED',
    credential: 'TURN_CREDENTIAL_REDACTED',
  },
];

export interface RemotePeer {
  id: string;
  name: string;
  stream: MediaStream | null;
  connectionState: 'connecting' | 'connected' | 'failed';
}

export interface ChatMessage {
  fromId: string;
  fromName: string;
  text: string;
  timestamp: number;
  isMe?: boolean;
}

export interface AnnotationStroke {
  tool: 'pen' | 'eraser';
  color: string;
  size: number;
  points: { x: number; y: number }[];
}

interface UseWebRTCOptions {
  room: string;
  name: string;
  password?: string;
}

export interface RecordingState {
  isRecording: boolean;
  recorderId: string | null;
  recorderName: string | null;
  startedAt: number | null;
  consents: Map<string, boolean>; // peerId → consented
}

export interface ReactionEvent {
  id: string;
  emoji: string;
  fromName: string;
  timestamp: number;
}

export interface UseWebRTCReturn {
  localStream: MediaStream | null;
  remotePeers: RemotePeer[];
  myPeerId: string | null;
  isHost: boolean;
  isMuted: boolean;
  isCamOff: boolean;
  isScreenSharing: boolean;
  canScreenShare: boolean;
  chatMessages: ChatMessage[];
  handRaisedMap: Map<string, boolean>;
  reactions: ReactionEvent[];
  recordingState: RecordingState;
  broadcastRecordingStart: () => void;
  broadcastRecordingStop: () => void;
  sendRecordingConsent: (consented: boolean) => void;
  toggleMute: () => void;
  toggleCam: () => void;
  toggleScreenShare: () => void;
  sendChat: (text: string) => void;
  sendAnnotation: (data: AnnotationStroke) => void;
  setAnnotationListener: (cb: ((data: AnnotationStroke) => void) | null) => void;
  toggleHandRaise: () => void;
  sendReaction: (emoji: string) => void;
  endMeetingForAll: () => void;
  kickPeer: (peerId: string) => void;
  replaceLocalTrack: (kind: 'audio' | 'video', newTrack: MediaStreamTrack) => Promise<void>;
  endCall: () => void;
  error: string | null;
}

export function useWebRTC({ room, name, password }: UseWebRTCOptions): UseWebRTCReturn {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remotePeers, setRemotePeers] = useState<RemotePeer[]>([]);
  const [myPeerId, setMyPeerId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [handRaisedMap, setHandRaisedMap] = useState<Map<string, boolean>>(new Map());
  const [reactions, setReactions] = useState<ReactionEvent[]>([]);
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false, recorderId: null, recorderName: null, startedAt: null, consents: new Map(),
  });
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const remotePeersRef = useRef<RemotePeer[]>([]);
  const peerNamesRef = useRef<Map<string, string>>(new Map());
  const myPeerIdRef = useRef<string | null>(null);
  const annotationCbRef = useRef<((data: AnnotationStroke) => void) | null>(null);
  const wsRetryCount = useRef(0);
  const cleanedUp = useRef(false);

  const canScreenShare = typeof navigator.mediaDevices?.getDisplayMedia === 'function';

  const send = useCallback((msg: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const updatePeers = useCallback(() => {
    setRemotePeers([...remotePeersRef.current]);
  }, []);

  const updateRemotePeer = useCallback((peerId: string, update: Partial<RemotePeer>) => {
    const idx = remotePeersRef.current.findIndex(p => p.id === peerId);
    if (idx >= 0) {
      remotePeersRef.current[idx] = { ...remotePeersRef.current[idx], ...update };
      updatePeers();
    }
  }, [updatePeers]);

  const addRemotePeer = useCallback((peerId: string, peerName: string) => {
    if (remotePeersRef.current.find(p => p.id === peerId)) return;
    peerNamesRef.current.set(peerId, peerName);
    remotePeersRef.current.push({
      id: peerId,
      name: peerName,
      stream: null,
      connectionState: 'connecting',
    });
    updatePeers();
  }, [updatePeers]);

  const removeRemotePeer = useCallback((peerId: string) => {
    const pc = pcsRef.current.get(peerId);
    if (pc) { pc.close(); pcsRef.current.delete(peerId); }
    pendingCandidatesRef.current.delete(peerId);
    peerNamesRef.current.delete(peerId);
    remotePeersRef.current = remotePeersRef.current.filter(p => p.id !== peerId);
    updatePeers();
  }, [updatePeers]);

  const createPC = useCallback((remotePeerId: string): RTCPeerConnection => {
    const existing = pcsRef.current.get(remotePeerId);
    if (existing) { existing.close(); }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcsRef.current.set(remotePeerId, pc);

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        send({ type: 'ice-candidate', targetId: remotePeerId, candidate: e.candidate });
      }
    };

    pc.oniceconnectionstatechange = () => {
      const s = pc.iceConnectionState;
      if (s === 'connected' || s === 'completed') {
        updateRemotePeer(remotePeerId, { connectionState: 'connected' });
      } else if (s === 'failed') {
        updateRemotePeer(remotePeerId, { connectionState: 'failed' });
        pc.restartIce();
      }
    };

    const remoteStream = new MediaStream();
    pc.ontrack = (e) => {
      if (!remoteStream.getTrackById(e.track.id)) {
        remoteStream.addTrack(e.track);
      }
      updateRemotePeer(remotePeerId, { stream: new MediaStream(remoteStream.getTracks()) });
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    return pc;
  }, [send, updateRemotePeer]);

  const drainCandidates = useCallback(async (peerId: string) => {
    const pc = pcsRef.current.get(peerId);
    if (!pc?.remoteDescription) return;
    const q = pendingCandidatesRef.current.get(peerId) || [];
    for (const c of q) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch { /* skip */ }
    }
    pendingCandidatesRef.current.delete(peerId);
  }, []);

  const connectSignaling = useCallback((stream: MediaStream) => {
    if (cleanedUp.current) return;
    const ws = new WebSocket(SIGNALING_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      wsRetryCount.current = 0;
      send({ type: 'join', room, name, password: password || undefined });
    };

    ws.onerror = () => {
      if (!cleanedUp.current) setError('Cannot connect to server. Retrying...');
    };

    ws.onclose = () => {
      if (cleanedUp.current) return;
      // Clean stale state from previous connection before reconnect
      pcsRef.current.forEach(pc => pc.close());
      pcsRef.current.clear();
      pendingCandidatesRef.current.clear();
      peerNamesRef.current.clear();
      remotePeersRef.current = [];
      setRemotePeers([]);
      const delay = Math.min(1000 * 2 ** wsRetryCount.current, 30000);
      wsRetryCount.current++;
      setTimeout(() => connectSignaling(stream), delay);
    };

    ws.onmessage = async (event) => {
      const msg = JSON.parse(event.data);

      switch (msg.type) {
        case 'joined': {
          myPeerIdRef.current = msg.peerId;
          setMyPeerId(msg.peerId);
          setIsHost(msg.isHost);
          setError(null);
          // Register existing peers — they will send offers
          for (const p of msg.peers as { id: string; name: string }[]) {
            addRemotePeer(p.id, p.name);
          }
          break;
        }

        case 'peer-joined': {
          // We are existing — create PC and send offer to newcomer
          addRemotePeer(msg.peerId, msg.name);
          const pc = createPC(msg.peerId);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          send({ type: 'offer', targetId: msg.peerId, sdp: pc.localDescription });
          break;
        }

        case 'offer': {
          const fromId = msg.fromId as string;
          const peerName = peerNamesRef.current.get(fromId) || 'Peer';
          addRemotePeer(fromId, peerName);
          const pc = createPC(fromId);
          await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          await drainCandidates(fromId);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          send({ type: 'answer', targetId: fromId, sdp: pc.localDescription });
          break;
        }

        case 'answer': {
          const pc = pcsRef.current.get(msg.fromId);
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
            await drainCandidates(msg.fromId);
          }
          break;
        }

        case 'ice-candidate': {
          const pc = pcsRef.current.get(msg.fromId);
          if (pc?.remoteDescription) {
            try { await pc.addIceCandidate(new RTCIceCandidate(msg.candidate)); } catch { /* skip */ }
          } else {
            const q = pendingCandidatesRef.current.get(msg.fromId) || [];
            q.push(msg.candidate);
            pendingCandidatesRef.current.set(msg.fromId, q);
          }
          break;
        }

        case 'peer-left':
          removeRemotePeer(msg.peerId);
          break;

        case 'host-transfer':
          setIsHost(true);
          break;

        case 'chat':
          setChatMessages(prev => [...prev, {
            fromId: msg.fromId,
            fromName: msg.fromName,
            text: msg.text,
            timestamp: msg.timestamp,
            isMe: msg.fromId === myPeerIdRef.current,
          }]);
          break;

        case 'annotation':
          annotationCbRef.current?.(msg.data as AnnotationStroke);
          break;

        case 'kicked':
          setError('You have been removed from the room by the host.');
          cleanedUp.current = true;
          ws.close();
          break;

        case 'hand-raise':
          setHandRaisedMap(prev => {
            const next = new Map(prev);
            if (msg.raised) next.set(msg.peerId as string, true);
            else next.delete(msg.peerId as string);
            return next;
          });
          break;

        case 'reaction':
          setReactions(prev => [...prev, {
            id: `${msg.fromId}-${Date.now()}`,
            emoji: msg.emoji as string,
            fromName: msg.fromName as string,
            timestamp: Date.now(),
          }]);
          break;

        case 'recording-start':
          setRecordingState({
            isRecording: true,
            recorderId: msg.recorderId as string,
            recorderName: msg.recorderName as string,
            startedAt: msg.timestamp as number,
            consents: new Map(),
          });
          break;

        case 'recording-consent':
          setRecordingState(prev => {
            const consents = new Map(prev.consents);
            consents.set(msg.peerId as string, msg.consented as boolean);
            return { ...prev, consents };
          });
          break;

        case 'recording-stop':
          setRecordingState({
            isRecording: false, recorderId: null, recorderName: null, startedAt: null, consents: new Map(),
          });
          break;

        case 'meeting-ended':
          setError('The host has ended the meeting.');
          cleanedUp.current = true;
          ws.close();
          break;

        case 'error':
          setError(msg.message as string);
          break;
      }
    };
  }, [room, name, password, send, createPC, addRemotePeer, removeRemotePeer, drainCandidates]);

  useEffect(() => {
    let cancelled = false;
    cleanedUp.current = false;

    (async () => {
      let stream: MediaStream | null = null;

      // Try video+audio, then audio-only, then video-only, then no media
      const attempts: MediaStreamConstraints[] = [
        { video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: true },
        { audio: true },
        { video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } },
      ];

      for (const constraints of attempts) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          break;
        } catch { /* try next */ }
      }

      if (cancelled) { stream?.getTracks().forEach(t => t.stop()); return; }

      if (stream) {
        localStreamRef.current = stream;
        cameraTrackRef.current = stream.getVideoTracks()[0] || null;
        setLocalStream(stream);
        if (!stream.getAudioTracks().length) setError('Microphone unavailable — others won\'t hear you.');
        if (!stream.getVideoTracks().length) setError('Camera unavailable — others won\'t see you.');
      } else {
        setError('Camera and microphone unavailable. You can still chat.');
      }

      // Always connect signaling — even without media, user can chat and see others
      connectSignaling(stream || new MediaStream());
    })();

    const cleanup = () => {
      cleanedUp.current = true;
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      pcsRef.current.forEach(pc => pc.close());
      pcsRef.current.clear();
      wsRef.current?.close();
    };

    const evt = /iPad|iPhone|iPod/.test(navigator.userAgent) ? 'pagehide' : 'beforeunload';
    window.addEventListener(evt, cleanup);
    return () => { cancelled = true; cleanup(); window.removeEventListener(evt, cleanup); };
  }, [connectSignaling]);

  const toggleMute = useCallback(() => {
    const t = localStreamRef.current?.getAudioTracks()[0];
    if (t) { t.enabled = !t.enabled; setIsMuted(!t.enabled); }
  }, []);

  const toggleCam = useCallback(() => {
    const t = localStreamRef.current?.getVideoTracks()[0];
    if (t) { t.enabled = !t.enabled; setIsCamOff(!t.enabled); }
  }, []);

  const toggleScreenShare = useCallback(async () => {
    if (!canScreenShare) return;

    if (!isScreenSharing) {
      try {
        const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screen;
        const screenTrack = screen.getVideoTracks()[0];

        for (const pc of pcsRef.current.values()) {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) await sender.replaceTrack(screenTrack);
        }
        setIsScreenSharing(true);

        screenTrack.onended = async () => {
          for (const pc of pcsRef.current.values()) {
            const sender = pc.getSenders().find(s => s.track?.kind === 'video');
            if (sender && cameraTrackRef.current) await sender.replaceTrack(cameraTrackRef.current);
          }
          screenStreamRef.current?.getTracks().forEach(t => t.stop());
          screenStreamRef.current = null;
          setIsScreenSharing(false);
        };
      } catch { /* cancelled */ }
    } else {
      for (const pc of pcsRef.current.values()) {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender && cameraTrackRef.current) await sender.replaceTrack(cameraTrackRef.current);
      }
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
      setIsScreenSharing(false);
    }
  }, [isScreenSharing, canScreenShare]);

  const sendChat = useCallback((text: string) => {
    if (text.trim()) send({ type: 'chat', text: text.trim() });
  }, [send]);

  const sendAnnotation = useCallback((data: AnnotationStroke) => {
    send({ type: 'annotation', data });
  }, [send]);

  const setAnnotationListener = useCallback((cb: ((data: AnnotationStroke) => void) | null) => {
    annotationCbRef.current = cb;
  }, []);

  const broadcastRecordingStart = useCallback(() => {
    send({ type: 'recording-start' });
  }, [send]);

  const broadcastRecordingStop = useCallback(() => {
    send({ type: 'recording-stop' });
  }, [send]);

  const sendRecordingConsent = useCallback((consented: boolean) => {
    send({ type: 'recording-consent', consented });
  }, [send]);

  const toggleHandRaise = useCallback(() => {
    const current = handRaisedMap.get(myPeerIdRef.current || '');
    send({ type: 'hand-raise', raised: !current });
  }, [send, handRaisedMap]);

  const sendReaction = useCallback((emoji: string) => {
    send({ type: 'reaction', emoji });
  }, [send]);

  const endMeetingForAll = useCallback(() => {
    send({ type: 'end-meeting' });
  }, [send]);

  const kickPeer = useCallback((peerId: string) => {
    send({ type: 'kick', targetId: peerId });
  }, [send]);

  const replaceLocalTrack = useCallback(async (kind: 'audio' | 'video', newTrack: MediaStreamTrack) => {
    const stream = localStreamRef.current;
    if (!stream) return;

    // Remove old track of this kind from the local stream
    const oldTracks = kind === 'audio' ? stream.getAudioTracks() : stream.getVideoTracks();
    oldTracks.forEach(t => { stream.removeTrack(t); t.stop(); });

    // Add new track
    stream.addTrack(newTrack);
    if (kind === 'video') cameraTrackRef.current = newTrack;

    // Replace in all peer connections
    for (const pc of pcsRef.current.values()) {
      const sender = pc.getSenders().find(s => s.track?.kind === kind);
      if (sender) await sender.replaceTrack(newTrack);
    }

    setLocalStream(new MediaStream(stream.getTracks()));
  }, []);

  const endCall = useCallback(() => {
    cleanedUp.current = true;
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    pcsRef.current.forEach(pc => pc.close());
    pcsRef.current.clear();
    wsRef.current?.close();
    setLocalStream(null);
    setRemotePeers([]);
    remotePeersRef.current = [];
    setChatMessages([]);
  }, []);

  return {
    localStream, remotePeers, myPeerId, isHost,
    isMuted, isCamOff, isScreenSharing, canScreenShare,
    chatMessages, handRaisedMap, reactions, recordingState,
    broadcastRecordingStart, broadcastRecordingStop, sendRecordingConsent,
    toggleMute, toggleCam, toggleScreenShare,
    sendChat, sendAnnotation, setAnnotationListener,
    toggleHandRaise, sendReaction, endMeetingForAll, kickPeer, replaceLocalTrack,
    endCall, error,
  };
}
