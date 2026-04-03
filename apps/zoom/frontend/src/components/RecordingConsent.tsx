import type { RecordingState } from '../hooks/useWebRTC';

interface RecordingConsentProps {
  recordingState: RecordingState;
  myPeerId: string | null;
  onConsent: (consented: boolean) => void;
  onLeave: () => void;
}

export function RecordingConsent({ recordingState, myPeerId, onConsent, onLeave }: RecordingConsentProps) {
  if (!recordingState.isRecording) return null;

  // Don't show if I'm the recorder
  if (recordingState.recorderId === myPeerId) return null;

  // Don't show if I already consented
  const myConsent = recordingState.consents.get(myPeerId || '');
  if (myConsent !== undefined) return null;

  return (
    <div className="modal-backdrop" style={{ zIndex: 60 }}>
      <div className="consent-modal">
        <div className="consent-icon">🔴</div>
        <h3>Recording in Progress</h3>
        <p className="consent-text">
          <strong>{recordingState.recorderName}</strong> has started recording this meeting.
          By continuing, you consent to being recorded.
        </p>
        <p className="consent-legal">
          This recording may capture your audio, video, and shared content.
          The recording will be saved locally by the person who initiated it.
          You may leave the meeting at any time if you do not wish to be recorded.
        </p>
        <div className="consent-actions">
          <button className="consent-btn consent-accept" onClick={() => onConsent(true)}>
            I Consent to Recording
          </button>
          <button className="consent-btn consent-decline" onClick={onLeave}>
            Leave Meeting
          </button>
        </div>
      </div>
    </div>
  );
}
