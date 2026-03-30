interface ControlBarProps {
  isMuted: boolean;
  isCamOff: boolean;
  isScreenSharing: boolean;
  onToggleMute: () => void;
  onToggleCam: () => void;
  onToggleScreenShare: () => void;
  onEndCall: () => void;
}

export function ControlBar({
  isMuted,
  isCamOff,
  isScreenSharing,
  onToggleMute,
  onToggleCam,
  onToggleScreenShare,
  onEndCall,
}: ControlBarProps) {
  return (
    <div className="control-bar">
      <button
        className={isMuted ? 'control-btn active' : 'control-btn'}
        onClick={onToggleMute}
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? '🔇' : '🎤'}
      </button>
      <button
        className={isCamOff ? 'control-btn active' : 'control-btn'}
        onClick={onToggleCam}
        title={isCamOff ? 'Turn Camera On' : 'Turn Camera Off'}
      >
        {isCamOff ? '📷' : '📹'}
      </button>
      <button
        className={isScreenSharing ? 'control-btn active' : 'control-btn'}
        onClick={onToggleScreenShare}
        title={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
      >
        🖥️
      </button>
      <button className="control-btn end-call" onClick={onEndCall} title="End Call">
        📞
      </button>
    </div>
  );
}
