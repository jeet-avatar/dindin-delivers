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
}

export function DevicePickerModal({
  audioInputs, videoInputs, selectedAudioId, selectedVideoId,
  onSelectAudio, onSelectVideo, onClose,
}: DevicePickerModalProps) {
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
      </div>
    </div>
  );
}
