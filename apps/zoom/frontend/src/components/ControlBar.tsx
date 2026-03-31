interface ControlBarProps {
  isMuted: boolean;
  isCamOff: boolean;
  isScreenSharing: boolean;
  canScreenShare: boolean;
  onToggleMute: () => void;
  onToggleCam: () => void;
  onToggleScreenShare: () => void;
  onEndCall: () => void;
}

export function ControlBar({
  isMuted,
  isCamOff,
  isScreenSharing,
  canScreenShare,
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
      {canScreenShare && (
        <button
          className={isScreenSharing ? 'control-btn active' : 'control-btn'}
          onClick={onToggleScreenShare}
          title={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
        >
          🖥️
        </button>
      )}
      <button className="control-btn end-call" onClick={onEndCall} title="End Call">
        📞
      </button>
    </div>
  );
}
