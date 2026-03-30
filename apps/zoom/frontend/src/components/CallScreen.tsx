import { useEffect, useRef, useState } from 'react';
import { useWebRTC } from '../hooks/useWebRTC';
import { ControlBar } from './ControlBar';

interface CallScreenProps {
  name: string;
  room: string;
  onLeave: () => void;
}

function getInviteLink(room: string): string {
  const url = new URL(window.location.origin);
  url.searchParams.set('room', room);
  return url.toString();
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
  const [copied, setCopied] = useState(false);

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

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(getInviteLink(room));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="call-screen">
      <div className="room-header">
        <span className="room-code">Room: {room}</span>
        <button className="copy-link-btn" onClick={handleCopyLink}>
          {copied ? 'Copied!' : 'Copy Invite Link'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="video-container">
        <video
          ref={remoteVideoRef}
          className="remote-video"
          autoPlay
          playsInline
        />
        {!peerName && !error && (
          <div className="waiting">
            <div className="waiting-text">Waiting for the other person...</div>
            <div className="waiting-hint">Send them this link:</div>
            <div className="waiting-link" onClick={handleCopyLink}>
              {getInviteLink(room)}
            </div>
            <div className="waiting-copied">{copied ? 'Link copied!' : 'Click to copy'}</div>
          </div>
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
