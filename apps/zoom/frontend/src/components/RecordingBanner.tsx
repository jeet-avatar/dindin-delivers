import type { RecordingState } from '../hooks/useWebRTC';

interface RecordingBannerProps {
  recordingState: RecordingState;
}

export function RecordingBanner({ recordingState }: RecordingBannerProps) {
  if (!recordingState.isRecording) return null;

  const elapsed = recordingState.startedAt
    ? Math.floor((Date.now() - recordingState.startedAt) / 1000)
    : 0;
  const consented = Array.from(recordingState.consents.values()).filter(Boolean).length;

  return (
    <div className="recording-banner">
      <span className="rec-dot" />
      <span className="rec-text">
        Recording by {recordingState.recorderName}
        {consented > 0 && ` · ${consented} consented`}
      </span>
    </div>
  );
}
