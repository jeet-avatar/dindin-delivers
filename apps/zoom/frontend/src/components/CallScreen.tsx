import { useState, useEffect, useRef, useMemo } from 'react';
import { useWebRTC } from '../hooks/useWebRTC';
import { useRecording } from '../hooks/useRecording';
import { useActiveSpeaker } from '../hooks/useActiveSpeaker';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useFullscreen } from '../hooks/useFullscreen';
import { useDevicePicker } from '../hooks/useDevicePicker';
import { VideoGrid } from './VideoGrid';
import { ControlBar } from './ControlBar';
import { ChatPanel } from './ChatPanel';
import { AnnotationCanvas } from './AnnotationCanvas';
import { MeetingTimer } from './MeetingTimer';
import { EmojiReactions } from './EmojiReactions';
import { ParticipantPanel } from './ParticipantPanel';
import { DevicePickerModal } from './DevicePickerModal';
import { RecordingConsent } from './RecordingConsent';
import { RecordingBanner } from './RecordingBanner';

interface CallScreenProps {
  name: string;
  room: string;
  password?: string;
  onLeave: () => void;
}

function getInviteLink(room: string): string {
  const url = new URL(window.location.origin);
  url.searchParams.set('room', room);
  return url.toString();
}

export function CallScreen({ name, room, password, onLeave }: CallScreenProps) {
  const rtc = useWebRTC({ room, name, password });
  const { isRecording: isLocalRecording, toggleRecording: toggleLocalRecording } = useRecording(rtc.localStream, rtc.remotePeers);
  const activeSpeakerId = useActiveSpeaker(rtc.localStream, rtc.myPeerId, rtc.remotePeers);
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const devices = useDevicePicker();

  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(false);
  const [unreadChat, setUnreadChat] = useState(0);
  const [viewMode, setViewMode] = useState<'gallery' | 'speaker'>('gallery');
  const [pinnedPeerId, setPinnedPeerId] = useState<string | null>(null);

  const prevMsgCountRef = useRef(0);
  const showChatRef = useRef(false);
  showChatRef.current = showChat;

  // Unread chat tracking
  useEffect(() => {
    const newCount = rtc.chatMessages.length;
    if (newCount > prevMsgCountRef.current && !showChatRef.current) {
      setUnreadChat(prev => prev + (newCount - prevMsgCountRef.current));
    }
    prevMsgCountRef.current = newCount;
  }, [rtc.chatMessages.length]);

  // Keyboard shortcuts
  const shortcuts = useMemo(() => ({
    m: rtc.toggleMute,
    v: rtc.toggleCam,
    s: rtc.toggleScreenShare,
    h: rtc.toggleHandRaise,
    c: () => handleToggleChat(),
    f: toggleFullscreen,
  }), [rtc.toggleMute, rtc.toggleCam, rtc.toggleScreenShare, rtc.toggleHandRaise, toggleFullscreen]);
  useKeyboardShortcuts(shortcuts);

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(getInviteLink(room));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEndCall = () => {
    rtc.endCall();
    onLeave();
  };

  // Recording with consent: broadcast first, then record locally
  const handleToggleRecording = () => {
    if (isLocalRecording) {
      toggleLocalRecording(); // stop
      rtc.broadcastRecordingStop();
    } else {
      rtc.broadcastRecordingStart(); // notify all peers first
      toggleLocalRecording(); // start local recording
    }
  };

  const handleToggleChat = () => {
    setShowChat(v => {
      if (!v) { setUnreadChat(0); setShowParticipants(false); }
      return !v;
    });
  };

  const handleToggleParticipants = () => {
    setShowParticipants(v => {
      if (!v) setShowChat(false);
      return !v;
    });
  };

  const handleDeviceSwitch = async (kind: 'audio' | 'video', deviceId: string) => {
    try {
      const constraints = kind === 'audio'
        ? { audio: { deviceId: { exact: deviceId } } }
        : { video: { deviceId: { exact: deviceId } } };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const track = kind === 'audio' ? stream.getAudioTracks()[0] : stream.getVideoTracks()[0];
      if (track) {
        await rtc.replaceLocalTrack(kind, track);
        if (kind === 'audio') devices.setSelectedAudioId(deviceId);
        else devices.setSelectedVideoId(deviceId);
      }
    } catch { /* device unavailable */ }
  };

  const participantCount = 1 + rtc.remotePeers.length;
  const isHandRaised = rtc.handRaisedMap.get(rtc.myPeerId || '');
  const sidePanel = showChat || showParticipants;

  return (
    <div className={`call-screen ${sidePanel ? 'panel-open' : ''}`}>
      <div className="room-header">
        <div className="header-left">
          <span className="room-code">Room: {room}</span>
          <MeetingTimer />
          <span className="participant-count">{participantCount} participant{participantCount !== 1 ? 's' : ''}</span>
          {rtc.isHost && <span className="host-badge">Host</span>}
        </div>
        <div className="header-right">
          <button className="copy-link-btn" onClick={handleCopyLink}>
            {copied ? 'Copied!' : 'Invite'}
          </button>
        </div>
      </div>

      <RecordingBanner recordingState={rtc.recordingState} />
      {rtc.error && <div className="error">{rtc.error}</div>}

      <div className="call-body">
        <div className="video-area">
          {rtc.remotePeers.length === 0 && !rtc.error && (
            <div className="waiting-overlay">
              <div className="waiting-text">Waiting for others to join...</div>
              <div className="waiting-hint">Share this link:</div>
              <div className="waiting-link" onClick={handleCopyLink}>
                {getInviteLink(room)}
              </div>
              <div className="waiting-copied">{copied ? 'Link copied!' : 'Click to copy'}</div>
            </div>
          )}
          <VideoGrid
            localStream={rtc.localStream}
            localName={name}
            remotePeers={rtc.remotePeers}
            isCamOff={rtc.isCamOff}
            screenStream={rtc.screenStream}
            viewMode={viewMode}
            activeSpeakerId={activeSpeakerId}
            pinnedPeerId={pinnedPeerId}
            myPeerId={rtc.myPeerId}
            handRaisedMap={rtc.handRaisedMap}
            onPinPeer={setPinnedPeerId}
          />
          <EmojiReactions reactions={rtc.reactions} />
          <AnnotationCanvas
            active={showAnnotations}
            onStroke={rtc.sendAnnotation}
            onClose={() => setShowAnnotations(false)}
            setListener={rtc.setAnnotationListener}
          />
        </div>

        {showChat && (
          <ChatPanel
            messages={rtc.chatMessages}
            onSend={rtc.sendChat}
            onClose={() => setShowChat(false)}
          />
        )}

        {showParticipants && (
          <ParticipantPanel
            localName={name}
            myPeerId={rtc.myPeerId}
            remotePeers={rtc.remotePeers}
            isHost={rtc.isHost}
            isMuted={rtc.isMuted}
            handRaisedMap={rtc.handRaisedMap}
            onKick={rtc.isHost ? rtc.kickPeer : undefined}
            onClose={() => setShowParticipants(false)}
          />
        )}
      </div>

      <RecordingConsent
        recordingState={rtc.recordingState}
        myPeerId={rtc.myPeerId}
        onConsent={rtc.sendRecordingConsent}
        onLeave={handleEndCall}
      />

      {showSettings && (
        <DevicePickerModal
          audioInputs={devices.audioInputs}
          videoInputs={devices.videoInputs}
          selectedAudioId={devices.selectedAudioId}
          selectedVideoId={devices.selectedVideoId}
          onSelectAudio={(id) => handleDeviceSwitch('audio', id)}
          onSelectVideo={(id) => handleDeviceSwitch('video', id)}
          onClose={() => setShowSettings(false)}
        />
      )}

      <ControlBar
        isMuted={rtc.isMuted}
        isCamOff={rtc.isCamOff}
        isScreenSharing={rtc.isScreenSharing}
        canScreenShare={rtc.canScreenShare}
        isRecording={isLocalRecording || rtc.recordingState.isRecording}
        isAnnotating={showAnnotations}
        chatUnread={unreadChat}
        onToggleMute={rtc.toggleMute}
        onToggleCam={rtc.toggleCam}
        onToggleScreenShare={rtc.toggleScreenShare}
        onToggleRecording={handleToggleRecording}
        onToggleAnnotation={() => setShowAnnotations(v => !v)}
        onToggleChat={handleToggleChat}
        onEndCall={handleEndCall}
        isHandRaised={!!isHandRaised}
        onToggleHandRaise={rtc.toggleHandRaise}
        onReact={rtc.sendReaction}
        participantCount={participantCount}
        onToggleParticipants={handleToggleParticipants}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        viewMode={viewMode}
        onToggleViewMode={() => setViewMode(v => v === 'gallery' ? 'speaker' : 'gallery')}
        onOpenSettings={() => setShowSettings(true)}
        isHost={rtc.isHost}
        onEndMeetingForAll={rtc.endMeetingForAll}
      />
    </div>
  );
}
