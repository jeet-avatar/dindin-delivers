import type { RemotePeer } from '../hooks/useWebRTC';

interface ParticipantPanelProps {
  localName: string;
  myPeerId: string | null;
  remotePeers: RemotePeer[];
  isHost: boolean;
  isMuted: boolean;
  handRaisedMap: Map<string, boolean>;
  onKick?: (peerId: string) => void;
  onClose: () => void;
}

export function ParticipantPanel({
  localName, myPeerId, remotePeers, isHost, isMuted, handRaisedMap, onKick, onClose,
}: ParticipantPanelProps) {
  const total = 1 + remotePeers.length;

  return (
    <div className="participant-panel">
      <div className="panel-header">
        <span>Participants ({total})</span>
        <button className="panel-close" onClick={onClose}>&times;</button>
      </div>
      <div className="participant-list">
        {/* Local user */}
        <div className="participant-item me">
          <div className="participant-avatar">{localName.charAt(0).toUpperCase()}</div>
          <div className="participant-info">
            <span className="participant-name">{localName} (You)</span>
            <span className="participant-role">{isHost ? 'Host' : ''}</span>
          </div>
          <div className="participant-indicators">
            {handRaisedMap.get(myPeerId || '') && <span className="hand-icon">✋</span>}
            {isMuted && <span className="muted-icon">🔇</span>}
          </div>
        </div>

        {/* Remote peers */}
        {remotePeers.map(peer => (
          <div key={peer.id} className="participant-item">
            <div className="participant-avatar">{peer.name.charAt(0).toUpperCase()}</div>
            <div className="participant-info">
              <span className="participant-name">{peer.name}</span>
              <span className={`participant-status ${peer.connectionState}`}>
                {peer.connectionState !== 'connected' ? peer.connectionState : ''}
              </span>
            </div>
            <div className="participant-indicators">
              {handRaisedMap.get(peer.id) && <span className="hand-icon">✋</span>}
              {isHost && onKick && (
                <button className="kick-btn" onClick={() => onKick(peer.id)} title="Remove">✕</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
