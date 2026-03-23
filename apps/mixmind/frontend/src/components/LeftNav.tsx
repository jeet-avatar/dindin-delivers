// src/components/LeftNav.tsx
type Panel = 'library' | 'playlists' | 'duplicates' | 'usb';

interface Props {
  active: Panel;
  onChange: (panel: Panel) => void;
  usbConnected: boolean;
  usbName?: string;
  duplicateCount: number;
}

export function LeftNav({ active, onChange, usbConnected, usbName, duplicateCount }: Props) {
  const items: { id: Panel; label: string; icon: string }[] = [
    { id: 'library', label: 'Library', icon: '📚' },
    { id: 'playlists', label: 'Playlists', icon: '🎵' },
    { id: 'duplicates', label: `Duplicates${duplicateCount > 0 ? ` (${duplicateCount})` : ''}`, icon: '🔍' },
    { id: 'usb', label: 'USB Ready', icon: '💾' },
  ];

  return (
    <nav className="w-32 bg-black/30 border-r border-white/10 flex flex-col flex-shrink-0">
      <div className="px-3 py-4">
        <div className="text-purple-400 font-bold text-sm mb-4">MIXMIND</div>
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={`w-full text-left px-2 py-2 rounded-md text-xs mb-1 transition-colors ${
              active === item.id
                ? 'bg-purple-500/20 text-purple-300'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            {item.icon} {item.label}
          </button>
        ))}
      </div>
      <div className="mt-auto px-3 py-3 border-t border-white/10">
        <div className={`text-xs ${usbConnected ? 'text-green-400' : 'text-gray-600'}`}>
          {usbConnected ? `● ${usbName || 'USB'}` : '○ No USB'}
        </div>
      </div>
    </nav>
  );
}
