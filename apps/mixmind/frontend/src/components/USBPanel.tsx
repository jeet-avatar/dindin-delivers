// src/components/USBPanel.tsx
import { useState, useEffect } from 'react';
import { sidecarGet } from '../hooks/useSidecar';

interface USBInfo {
  connected: boolean;
  name?: string;
  path?: string;
}

export function USBPanel() {
  const [usb, setUsb] = useState<USBInfo>({ connected: false });

  useEffect(() => {
    const poll = async () => {
      try {
        const data = await sidecarGet<USBInfo>('/api/usb/status');
        setUsb(data);
      } catch { /* sidecar might not be ready */ }
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, []);

  function openRekordbox() {
    if ((window as any).mixmind?.openExternal) {
      (window as any).mixmind.openExternal('file:///Applications/rekordbox.app');
    }
  }

  return (
    <div className="flex-1 p-4">
      <h2 className="font-medium mb-4">USB Ready</h2>

      <div className={`p-3 rounded-md mb-4 text-sm ${usb.connected ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-gray-500'}`}>
        {usb.connected ? `● ${usb.name} connected` : '○ No USB drive detected'}
      </div>

      <div className="bg-white/5 rounded-md p-4 text-sm text-gray-400 space-y-3">
        <div className="font-medium text-gray-200">How to export your set to USB:</div>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Build your playlist using AI or drag from the library</li>
          <li>Click "Save to Playlists" to save it in MixMind</li>
          <li>Open Rekordbox and sync your playlist to USB</li>
        </ol>
        <button
          onClick={openRekordbox}
          className="w-full bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 py-2 rounded-md text-sm mt-2"
        >
          Open Rekordbox →
        </button>
      </div>
    </div>
  );
}
