import { useState } from 'react';
import { ReactionPicker } from './ReactionPicker';

interface ControlBarProps {
  isMuted: boolean;
  isCamOff: boolean;
  isScreenSharing: boolean;
  canScreenShare: boolean;
  isRecording: boolean;
  isAnnotating: boolean;
  chatUnread: number;
  onToggleMute: () => void;
  onToggleCam: () => void;
  onToggleScreenShare: () => void;
  onToggleRecording: () => void;
  onToggleAnnotation: () => void;
  onToggleChat: () => void;
  onEndCall: () => void;
  // New optional props — all default to undefined so existing usage is unchanged
  isHandRaised?: boolean;
  onToggleHandRaise?: () => void;
  onReact?: (emoji: string) => void;
  participantCount?: number;
  onToggleParticipants?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  viewMode?: 'gallery' | 'speaker';
  onToggleViewMode?: () => void;
  onOpenSettings?: () => void;
  isHost?: boolean;
  onEndMeetingForAll?: () => void;
}

export function ControlBar({
  isMuted, isCamOff, isScreenSharing, canScreenShare,
  isRecording, isAnnotating, chatUnread,
  onToggleMute, onToggleCam, onToggleScreenShare,
  onToggleRecording, onToggleAnnotation, onToggleChat, onEndCall,
  isHandRaised, onToggleHandRaise, onReact,
  participantCount, onToggleParticipants,
  isFullscreen, onToggleFullscreen,
  viewMode, onToggleViewMode,
  onOpenSettings,
  isHost, onEndMeetingForAll,
}: ControlBarProps) {
  const [showReactions, setShowReactions] = useState(false);

  return (
    <div className="control-bar">
      {/* Mute */}
      <button className={`ctrl-btn ${isMuted ? 'off' : ''}`} onClick={onToggleMute} title={isMuted ? 'Unmute (M)' : 'Mute (M)'}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {isMuted ? (
            <><line x1="1" y1="1" x2="23" y2="23" /><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" /><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.13 1.49-.35 2.17" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></>
          ) : (
            <><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></>
          )}
        </svg>
        <span className="ctrl-label">{isMuted ? 'Unmute' : 'Mute'}</span>
      </button>

      {/* Camera */}
      <button className={`ctrl-btn ${isCamOff ? 'off' : ''}`} onClick={onToggleCam} title={isCamOff ? 'Start Cam (V)' : 'Stop Cam (V)'}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {isCamOff ? (
            <><line x1="1" y1="1" x2="23" y2="23" /><path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34" /></>
          ) : (
            <><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></>
          )}
        </svg>
        <span className="ctrl-label">{isCamOff ? 'Start Cam' : 'Stop Cam'}</span>
      </button>

      {/* Screen Share */}
      {canScreenShare && (
        <button className={`ctrl-btn ${isScreenSharing ? 'active' : ''}`} onClick={onToggleScreenShare} title="Screen (S)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
          </svg>
          <span className="ctrl-label">{isScreenSharing ? 'Stop Share' : 'Screen'}</span>
        </button>
      )}

      {/* Raise Hand */}
      {onToggleHandRaise && (
        <button className={`ctrl-btn ${isHandRaised ? 'active' : ''}`} onClick={onToggleHandRaise} title="Raise Hand (H)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 10V6a2 2 0 0 0-4 0v1M14 7V4a2 2 0 0 0-4 0v6M10 5V3a2 2 0 0 0-4 0v9" />
            <path d="M18 10a2 2 0 0 1 4 0v5a8 8 0 0 1-8 8h-2a8 8 0 0 1-8-8V8a2 2 0 0 1 4 0" />
          </svg>
          <span className="ctrl-label">{isHandRaised ? 'Lower' : 'Raise'}</span>
        </button>
      )}

      {/* Reactions */}
      {onReact && (
        <div className="ctrl-btn-wrapper">
          <button className="ctrl-btn" onClick={() => setShowReactions(v => !v)} title="React">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
            <span className="ctrl-label">React</span>
          </button>
          {showReactions && <ReactionPicker onPick={onReact} onClose={() => setShowReactions(false)} />}
        </div>
      )}

      {/* Annotate */}
      <button className={`ctrl-btn ${isAnnotating ? 'active' : ''}`} onClick={onToggleAnnotation} title="Annotate">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /><circle cx="11" cy="11" r="2" />
        </svg>
        <span className="ctrl-label">Annotate</span>
      </button>

      {/* Record */}
      <button className={`ctrl-btn ${isRecording ? 'recording' : ''}`} onClick={onToggleRecording} title="Record">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {isRecording ? <rect x="6" y="6" width="12" height="12" rx="1" fill="currentColor" /> : <circle cx="12" cy="12" r="8" />}
        </svg>
        <span className="ctrl-label">{isRecording ? 'Stop Rec' : 'Record'}</span>
      </button>

      {/* View Toggle */}
      {onToggleViewMode && (
        <button className="ctrl-btn" onClick={onToggleViewMode} title="Toggle View">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {viewMode === 'speaker' ? (
              <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>
            ) : (
              <><rect x="2" y="3" width="20" height="11" rx="2" /><rect x="2" y="17" width="6" height="4" rx="1" /><rect x="9" y="17" width="6" height="4" rx="1" /><rect x="16" y="17" width="6" height="4" rx="1" /></>
            )}
          </svg>
          <span className="ctrl-label">{viewMode === 'speaker' ? 'Gallery' : 'Speaker'}</span>
        </button>
      )}

      {/* Participants */}
      {onToggleParticipants && (
        <button className="ctrl-btn" onClick={onToggleParticipants} title="Participants">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span className="ctrl-label">{participantCount ?? ''}</span>
        </button>
      )}

      {/* Chat */}
      <button className="ctrl-btn" onClick={onToggleChat} title="Chat (C)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <span className="ctrl-label">Chat</span>
        {chatUnread > 0 && <span className="chat-badge">{chatUnread}</span>}
      </button>

      {/* Settings */}
      {onOpenSettings && (
        <button className="ctrl-btn" onClick={onOpenSettings} title="Settings">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          <span className="ctrl-label">Settings</span>
        </button>
      )}

      {/* Fullscreen */}
      {onToggleFullscreen && (
        <button className="ctrl-btn" onClick={onToggleFullscreen} title="Fullscreen (F)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {isFullscreen ? (
              <><path d="M8 3v3a2 2 0 0 1-2 2H3" /><path d="M21 8h-3a2 2 0 0 1-2-2V3" /><path d="M3 16h3a2 2 0 0 1 2 2v3" /><path d="M16 21v-3a2 2 0 0 1 2-2h3" /></>
            ) : (
              <><path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" /><path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" /></>
            )}
          </svg>
          <span className="ctrl-label">{isFullscreen ? 'Exit' : 'Full'}</span>
        </button>
      )}

      {/* Leave / End */}
      <div className="ctrl-btn-wrapper">
        <button className="ctrl-btn end-call" onClick={onEndCall} title="Leave">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
            <line x1="23" y1="1" x2="1" y2="23" />
          </svg>
          <span className="ctrl-label">Leave</span>
        </button>
        {isHost && onEndMeetingForAll && (
          <button className="ctrl-btn end-all" onClick={onEndMeetingForAll} title="End for All">
            <span className="ctrl-label end-all-label">End All</span>
          </button>
        )}
      </div>
    </div>
  );
}
