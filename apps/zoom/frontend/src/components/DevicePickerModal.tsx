import { useEffect, useRef } from 'react';

interface DeviceOption {
  deviceId: string;
  label: string;
}

interface DevicePickerModalProps {
  audioInputs: DeviceOption[];
  videoInputs: DeviceOption[];
  selectedAudioId: string;
  selectedVideoId: string;
  onSelectAudio: (deviceId: string) => void;
  onSelectVideo: (deviceId: string) => void;
  onClose: () => void;
  // Camera quality settings
  resolution: '360p' | '720p' | '1080p';
  fps: 15 | 30 | 60;
  brightness: number;
  contrast: number;
  blurEnabled: boolean;
  onResolutionChange: (r: '360p' | '720p' | '1080p') => void;
  onFpsChange: (f: 15 | 30 | 60) => void;
  onBrightnessChange: (v: number) => void;
  onContrastChange: (v: number) => void;
  onBlurChange: (v: boolean) => void;
  onSave: () => void;
  getVideoConstraints: (deviceId: string, res: string, fps: number) => MediaTrackConstraints;
}

export function DevicePickerModal({
  audioInputs, videoInputs, selectedAudioId, selectedVideoId,
  onSelectAudio, onSelectVideo, onClose,
  resolution, fps, brightness, contrast, blurEnabled,
  onResolutionChange, onFpsChange, onBrightnessChange, onContrastChange, onBlurChange,
  onSave, getVideoConstraints,
}: DevicePickerModalProps) {
  const previewRef = useRef<HTMLVideoElement>(null);

  // Live camera preview — re-runs when device, resolution, or fps changes
  useEffect(() => {
    if (!selectedVideoId) return;
    let stream: MediaStream | null = null;

    navigator.mediaDevices
      .getUserMedia({ video: getVideoConstraints(selectedVideoId, resolution, fps), audio: false })
      .then(s => {
        stream = s;
        if (previewRef.current) {
          previewRef.current.srcObject = s;
          previewRef.current.play().catch(() => {});
        }
      })
      .catch(() => {});

    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (previewRef.current) previewRef.current.srcObject = null;
    };
  }, [selectedVideoId, resolution, fps]); // eslint-disable-line react-hooks/exhaustive-deps

  const cssFilter = [
    `brightness(${brightness}%)`,
    `contrast(${contrast}%)`,
    blurEnabled ? 'blur(4px)' : '',
  ].filter(Boolean).join(' ');

  const handleSave = () => {
    onSave();
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="device-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span>Settings</span>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="device-section">
          <label>Microphone</label>
          <select
            value={selectedAudioId}
            onChange={e => onSelectAudio(e.target.value)}
          >
            {audioInputs.map(d => (
              <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
            ))}
          </select>
        </div>

        <div className="device-section">
          <label>Camera</label>
          <select
            value={selectedVideoId}
            onChange={e => onSelectVideo(e.target.value)}
          >
            {videoInputs.map(d => (
              <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
            ))}
          </select>
        </div>

        {/* Live camera preview */}
        {selectedVideoId && (
          <video
            ref={previewRef}
            autoPlay
            playsInline
            muted
            className="camera-preview"
            style={{ filter: cssFilter }}
          />
        )}

        {/* Resolution */}
        <div className="settings-row">
          <label>Resolution</label>
          <select
            value={resolution}
            onChange={e => onResolutionChange(e.target.value as '360p' | '720p' | '1080p')}
          >
            <option value="360p">360p</option>
            <option value="720p">720p</option>
            <option value="1080p">1080p</option>
          </select>
        </div>

        {/* Frame Rate */}
        <div className="settings-row">
          <label>Frame Rate</label>
          <select
            value={fps}
            onChange={e => onFpsChange(Number(e.target.value) as 15 | 30 | 60)}
          >
            <option value={15}>15 fps</option>
            <option value={30}>30 fps</option>
            <option value={60}>60 fps</option>
          </select>
        </div>

        {/* Brightness */}
        <div className="settings-row">
          <label>Brightness</label>
          <input
            type="range"
            min="50"
            max="150"
            value={brightness}
            onChange={e => onBrightnessChange(Number(e.target.value))}
          />
          <span className="range-val">{brightness}%</span>
        </div>

        {/* Contrast */}
        <div className="settings-row">
          <label>Contrast</label>
          <input
            type="range"
            min="50"
            max="150"
            value={contrast}
            onChange={e => onContrastChange(Number(e.target.value))}
          />
          <span className="range-val">{contrast}%</span>
        </div>

        {/* Background Blur */}
        <div className="settings-row">
          <label>Background Blur</label>
          <input
            type="checkbox"
            checked={blurEnabled}
            onChange={e => onBlurChange(e.target.checked)}
          />
        </div>

        {/* Save button */}
        <button className="settings-save-btn" onClick={handleSave}>
          Save
        </button>
      </div>
    </div>
  );
}
