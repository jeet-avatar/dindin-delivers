import { useEffect, useRef, useState } from 'react';
import { useWebRTC, ConnectionState } from '../hooks/useWebRTC';
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

function connectionLabel(state: ConnectionState): string {
  switch (state) {
    case 'waiting': return 'Waiting for the other person...';
    case 'connecting': return 'Connecting...';
    case 'connected': return 'Connected';
    case 'reconnecting': return 'Reconnecting...';
    case 'failed': return 'Connection failed. Retrying...';
  }
}

export function CallScreen({ name, room, onLeave }: CallScreenProps) {
  const {
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
  } = useWebRTC({ room, name });

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => {});
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
        <span className={`connection-state ${connectionState}`}>
          {connectionLabel(connectionState)}
        </span>
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
        {connectionState === 'waiting' && !error && (
          <div className="waiting">
            <div className="waiting-text">Waiting for the other person...</div>
            <div className="waiting-hint">Send them this link:</div>
            <div className="waiting-link" onClick={handleCopyLink}>
              {getInviteLink(room)}
            </div>
            <div className="waiting-copied">{copied ? 'Link copied!' : 'Click to copy'}</div>
          </div>
        )}
        {connectionState === 'connecting' && (
          <div className="waiting">
            <div className="waiting-text">Connecting...</div>
          </div>
        )}
        {connectionState === 'reconnecting' && (
          <div className="waiting">
            <div className="waiting-text">Reconnecting...</div>
          </div>
        )}
        {connectionState === 'failed' && (
          <div className="waiting">
            <div className="waiting-text">Connection failed. Retrying...</div>
          </div>
        )}
        {peerName && connectionState === 'connected' && (
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
        canScreenShare={canScreenShare}
        onToggleMute={toggleMute}
        onToggleCam={toggleCam}
        onToggleScreenShare={toggleScreenShare}
        onEndCall={handleEndCall}
      />
    </div>
  );
}
