import { useEffect, useRef, useState } from 'react';
import type { RemotePeer } from '../hooks/useWebRTC';

// ── Avatar helpers ────────────────────────────────────────────────────────
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #667eea, #764ba2)',
  'linear-gradient(135deg, #f093fb, #f5576c)',
  'linear-gradient(135deg, #4facfe, #00f2fe)',
  'linear-gradient(135deg, #43e97b, #38f9d7)',
  'linear-gradient(135deg, #fa709a, #fee140)',
  'linear-gradient(135deg, #a18cd1, #fbc2eb)',
  'linear-gradient(135deg, #ffecd2, #fcb69f)',
  'linear-gradient(135deg, #30cfd0, #667eea)',
];

function getAvatarStyle(name: string): React.CSSProperties {
  const hash = Array.from(name).reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0);
  const gradient = AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
  return { background: gradient };
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w.charAt(0).toUpperCase())
    .join('');
}

function ScreenShareTile({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.srcObject = stream;
    ref.current.play().catch(() => {});
  }, [stream]);
  return (
    <div className="screenshare-main-tile">
      <video ref={ref} autoPlay playsInline muted className="screenshare-video" />
      <div className="screenshare-label">You are presenting</div>
    </div>
  );
}

interface VideoTileProps {
  stream: MediaStream | null;
  name: string;
  muted?: boolean;
  mirrored?: boolean;
  connectionState?: string;
  isActiveSpeaker?: boolean;
  isPinned?: boolean;
  isHandRaised?: boolean;
  onPin?: () => void;
}

function VideoTile({ stream, name, muted, mirrored, connectionState, isActiveSpeaker, isPinned, isHandRaised, onPin }: VideoTileProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const [showPin, setShowPin] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    if (stream) {
      ref.current.srcObject = stream;
      ref.current.play().catch(() => {});
    } else {
      ref.current.srcObject = null;
    }
  }, [stream]);

  const tileClass = [
    'video-tile',
    isActiveSpeaker ? 'active-speaker' : '',
    isPinned ? 'pinned' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={tileClass}
      onMouseEnter={() => setShowPin(true)}
      onMouseLeave={() => setShowPin(false)}
    >
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={muted}
        className={mirrored ? 'mirrored' : ''}
      />
      <div className="tile-label">
        <span className="tile-name">{name}</span>
        {isHandRaised && <span className="tile-hand">✋</span>}
        {connectionState && connectionState !== 'connected' && (
          <span className={`tile-state ${connectionState}`}>{connectionState}</span>
        )}
      </div>
      {!stream && (
        <div className="tile-placeholder avatar-tile" style={getAvatarStyle(name)}>
          <span className="avatar-initials">{getInitials(name)}</span>
        </div>
      )}
      {showPin && onPin && (
        <button className="pin-btn" onClick={onPin} title={isPinned ? 'Unpin' : 'Pin'}>
          {isPinned ? '📌' : '📍'}
        </button>
      )}
    </div>
  );
}

interface VideoGridProps {
  localStream: MediaStream | null;
  localName: string;
  remotePeers: RemotePeer[];
  isCamOff: boolean;
  screenStream?: MediaStream | null;
  viewMode?: 'gallery' | 'speaker';
  activeSpeakerId?: string | null;
  pinnedPeerId?: string | null;
  myPeerId?: string | null;
  handRaisedMap?: Map<string, boolean>;
  onPinPeer?: (id: string | null) => void;
}

export function VideoGrid({
  localStream, localName, remotePeers, isCamOff,
  screenStream = null,
  viewMode = 'gallery',
  activeSpeakerId = null,
  pinnedPeerId = null,
  myPeerId = null,
  handRaisedMap,
  onPinPeer,
}: VideoGridProps) {
  const totalParticipants = 1 + remotePeers.length;

  // ── Screenshare layout (Zoom-style) ────────────────────────────────────
  // Screen content fills the stage; local camera becomes a floating PiP;
  // remote participants collapse to a thumbnail strip along the top.
  if (screenStream) {
    return (
      <div className="video-grid screenshare-layout">
        {/* Thumbnail strip — remote participants */}
        {remotePeers.length > 0 && (
          <div className="screenshare-strip">
            {remotePeers.map(peer => (
              <VideoTile
                key={peer.id}
                stream={peer.stream}
                name={peer.name}
                connectionState={peer.connectionState}
                isActiveSpeaker={activeSpeakerId === peer.id}
                isHandRaised={handRaisedMap?.get(peer.id)}
                onPin={onPinPeer ? () => onPinPeer(pinnedPeerId === peer.id ? null : peer.id) : undefined}
              />
            ))}
          </div>
        )}

        {/* Main stage — screen share content */}
        <ScreenShareTile stream={screenStream} />

        {/* Floating PiP — local camera */}
        <div className="screenshare-pip">
          <VideoTile
            stream={isCamOff ? null : localStream}
            name={`${localName} (You)`}
            muted
            mirrored
            isHandRaised={handRaisedMap?.get(myPeerId || '')}
          />
        </div>
      </div>
    );
  }

  // Determine who to feature in speaker view
  const featuredId = pinnedPeerId || activeSpeakerId;

  if (viewMode === 'speaker' && totalParticipants > 1 && featuredId) {
    const featuredPeer = remotePeers.find(p => p.id === featuredId);
    const isLocalFeatured = featuredId === myPeerId;
    const otherPeers = remotePeers.filter(p => p.id !== featuredId);

    return (
      <div className="video-grid speaker-layout">
        <div className="speaker-main">
          {isLocalFeatured ? (
            <VideoTile
              stream={isCamOff ? null : localStream}
              name={`${localName} (You)`}
              muted
              mirrored
              isActiveSpeaker
              isHandRaised={handRaisedMap?.get(myPeerId || '')}
            />
          ) : featuredPeer ? (
            <VideoTile
              stream={featuredPeer.stream}
              name={featuredPeer.name}
              connectionState={featuredPeer.connectionState}
              isActiveSpeaker
              isPinned={pinnedPeerId === featuredPeer.id}
              isHandRaised={handRaisedMap?.get(featuredPeer.id)}
              onPin={onPinPeer ? () => onPinPeer(pinnedPeerId === featuredPeer.id ? null : featuredPeer.id) : undefined}
            />
          ) : null}
        </div>
        <div className="speaker-strip">
          {!isLocalFeatured && (
            <VideoTile
              stream={isCamOff ? null : localStream}
              name={`${localName} (You)`}
              muted
              mirrored
              isHandRaised={handRaisedMap?.get(myPeerId || '')}
            />
          )}
          {otherPeers.map(peer => (
            <VideoTile
              key={peer.id}
              stream={peer.stream}
              name={peer.name}
              connectionState={peer.connectionState}
              isActiveSpeaker={activeSpeakerId === peer.id}
              isHandRaised={handRaisedMap?.get(peer.id)}
              onPin={onPinPeer ? () => onPinPeer(pinnedPeerId === peer.id ? null : peer.id) : undefined}
            />
          ))}
        </div>
      </div>
    );
  }

  // Gallery view (existing behavior, unchanged)
  const gridClass =
    totalParticipants <= 1 ? 'grid-1' :
    totalParticipants === 2 ? 'grid-2' :
    totalParticipants <= 4 ? 'grid-4' :
    totalParticipants <= 6 ? 'grid-6' : 'grid-8';

  return (
    <div className={`video-grid ${gridClass}`}>
      {remotePeers.map((peer) => (
        <VideoTile
          key={peer.id}
          stream={peer.stream}
          name={peer.name}
          connectionState={peer.connectionState}
          isActiveSpeaker={activeSpeakerId === peer.id}
          isPinned={pinnedPeerId === peer.id}
          isHandRaised={handRaisedMap?.get(peer.id)}
          onPin={onPinPeer ? () => onPinPeer(pinnedPeerId === peer.id ? null : peer.id) : undefined}
        />
      ))}
      <VideoTile
        stream={isCamOff ? null : localStream}
        name={`${localName} (You)`}
        muted
        mirrored
        isActiveSpeaker={activeSpeakerId === myPeerId}
        isHandRaised={handRaisedMap?.get(myPeerId || '')}
      />
    </div>
  );
}
