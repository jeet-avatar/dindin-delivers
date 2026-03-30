import { useEffect, useRef } from 'react';
import { useWebRTC } from '../hooks/useWebRTC';
import { ControlBar } from './ControlBar';

interface CallScreenProps {
  name: string;
  room: string;
  onLeave: () => void;
}

export function CallScreen({ name, room, onLeave }: CallScreenProps) {
  const {
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
  } = useWebRTC({ room, name });

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const handleEndCall = () => {
    endCall();
    onLeave();
  };

  return (
    <div className="call-screen">
      <div className="room-info">Room: {room}</div>

      {error && <div className="error">{error}</div>}

      <div className="video-container">
        <video
          ref={remoteVideoRef}
          className="remote-video"
          autoPlay
          playsInline
        />
        {!peerName && !error && (
          <div className="waiting">Waiting for someone to join...</div>
        )}
        {peerName && (
          <div className="peer-name">{peerName}</div>
        )}
        <video
          ref={localVideoRef}
          className="local-video"
          autoPlay
          playsInline
          muted
        />
      </div>

      <ControlBar
        isMuted={isMuted}
        isCamOff={isCamOff}
        isScreenSharing={isScreenSharing}
        onToggleMute={toggleMute}
        onToggleCam={toggleCam}
        onToggleScreenShare={toggleScreenShare}
        onEndCall={handleEndCall}
      />
    </div>
  );
}
