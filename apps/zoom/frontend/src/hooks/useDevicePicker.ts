import { useState, useEffect, useCallback } from 'react';

interface DeviceInfo {
  deviceId: string;
  label: string;
}

const RESOLUTION_MAP = {
  '360p':  { width: 640,  height: 360  },
  '720p':  { width: 1280, height: 720  },
  '1080p': { width: 1920, height: 1080 },
};

function getVideoConstraints(deviceId: string, res: string, fpsVal: number): MediaTrackConstraints {
  const { width, height } = RESOLUTION_MAP[res as keyof typeof RESOLUTION_MAP];
  return {
    deviceId: { exact: deviceId },
    width: { ideal: width },
    height: { ideal: height },
    frameRate: { ideal: fpsVal },
  };
}

export function useDevicePicker() {
  const [audioInputs, setAudioInputs] = useState<DeviceInfo[]>([]);
  const [videoInputs, setVideoInputs] = useState<DeviceInfo[]>([]);
  const [selectedAudioId, setSelectedAudioId] = useState<string>('');
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');

  // Camera quality settings
  const [resolution, setResolution] = useState<'360p' | '720p' | '1080p'>('720p');
  const [fps, setFps] = useState<15 | 30 | 60>(30);
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [blurEnabled, setBlurEnabled] = useState<boolean>(false);

  const refreshDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioDev = devices.filter(d => d.kind === 'audioinput').map(d => ({ deviceId: d.deviceId, label: d.label || `Mic ${d.deviceId.slice(0, 6)}` }));
      const videoDev = devices.filter(d => d.kind === 'videoinput').map(d => ({ deviceId: d.deviceId, label: d.label || `Camera ${d.deviceId.slice(0, 6)}` }));
      setAudioInputs(audioDev);
      setVideoInputs(videoDev);
      // Auto-select first device if none chosen yet
      if (audioDev.length) setSelectedAudioId(prev => prev || audioDev[0].deviceId);
      if (videoDev.length) setSelectedVideoId(prev => prev || videoDev[0].deviceId);
    } catch { /* permission denied */ }
  }, []);

  useEffect(() => {
    refreshDevices();
    navigator.mediaDevices?.addEventListener('devicechange', refreshDevices);
    return () => navigator.mediaDevices?.removeEventListener('devicechange', refreshDevices);
  }, [refreshDevices]);

  const cssFilter = [
    `brightness(${brightness}%)`,
    `contrast(${contrast}%)`,
    blurEnabled ? 'blur(4px)' : '',
  ].filter(Boolean).join(' ');

  return {
    audioInputs, videoInputs,
    selectedAudioId, selectedVideoId,
    setSelectedAudioId, setSelectedVideoId,
    refreshDevices,
    // Camera quality settings
    resolution, setResolution,
    fps, setFps,
    brightness, setBrightness,
    contrast, setContrast,
    blurEnabled, setBlurEnabled,
    cssFilter,
    getVideoConstraints,
  };
}
