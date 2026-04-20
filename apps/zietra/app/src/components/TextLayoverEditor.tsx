import { useState } from 'react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import type { TextOverlay } from '../services/videoService';

interface TextLayoverEditorProps {
  overlays: TextOverlay[];
  onChange: (overlays: TextOverlay[]) => void;
  maxDuration?: number;
}

export function TextLayoverEditor({ overlays, onChange, maxDuration = 30 }: TextLayoverEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const addOverlay = () => {
    const newOverlay: TextOverlay = {
      text: 'New Text',
      startTime: 5,
      duration: 3,
      fontSize: 100,
      color: '#FFFFFF',
      strokeColor: '#000000',
      strokeWidth: 3,
    };
    onChange([...overlays, newOverlay]);
    setEditingIndex(overlays.length);
  };

  const updateOverlay = (index: number, updates: Partial<TextOverlay>) => {
    const updated = overlays.map((overlay, i) =>
      i === index ? { ...overlay, ...updates } : overlay
    );
    onChange(updated);
  };

  const removeOverlay = (index: number) => {
    onChange(overlays.filter((_, i) => i !== index));
    setEditingIndex(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[#F1F5F9]">Text Overlays</h3>
        <button onClick={addOverlay} className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-indigo-700 hover:to-purple-700">
          <PlusIcon className="w-4 h-4" /> Add Overlay
        </button>
      </div>

      {overlays.length === 0 ? (
        <p className="text-center text-[#94A3B8] py-8">No overlays added yet. Click "Add Overlay" to start.</p>
      ) : (
        <div className="space-y-3">
          {overlays.map((overlay, index) => (
            <div key={index} className={`border-2 rounded-lg p-4 ${editingIndex === index ? 'border-indigo-500 bg-orange-500/10' : 'border-[#2a2a44]'}`}>
              <div className="flex items-start justify-between mb-3">
                <input type="text" value={overlay.text} onChange={(e) => updateOverlay(index, { text: e.target.value })} className="flex-1 px-3 py-2 border border-[#33335a] rounded-lg font-medium" />
                <button onClick={() => removeOverlay(index)} className="ml-2 p-2 text-red-600 hover:bg-red-500/10 rounded-lg">
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#CBD5E1] mb-1">Start Time (s)</label>
                  <input type="number" min="0" max={maxDuration} value={overlay.startTime} onChange={(e) => updateOverlay(index, { startTime: parseFloat(e.target.value) })} className="w-full px-3 py-1.5 border border-[#33335a] rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#CBD5E1] mb-1">Duration (s)</label>
                  <input type="number" min="1" max="10" value={overlay.duration} onChange={(e) => updateOverlay(index, { duration: parseFloat(e.target.value) })} className="w-full px-3 py-1.5 border border-[#33335a] rounded-lg text-sm" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
