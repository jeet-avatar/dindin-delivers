import { useState, useRef, useCallback, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';

// ─── CURSIVE FONTS ────────────────────────────────────────────────────────────
const CURSIVE_FONTS = [
  { name: 'Dancing Script', family: "'Dancing Script', cursive" },
  { name: 'Great Vibes', family: "'Great Vibes', cursive" },
  { name: 'Pacifico', family: "'Pacifico', cursive" },
];

const GOOGLE_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&family=Great+Vibes&family=Pacifico&display=swap';

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface SignaturePadProps {
  onSignatureChange: (data: string | null, type: 'typed' | 'drawn') => void;
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export default function SignaturePad({ onSignatureChange }: SignaturePadProps) {
  const [activeTab, setActiveTab] = useState<'type' | 'draw'>('type');
  const [typedName, setTypedName] = useState('');
  const [fontIndex, setFontIndex] = useState(0);

  const sigCanvasRef = useRef<SignatureCanvas>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);

  // Load Google Fonts once
  useEffect(() => {
    if (!document.querySelector(`link[href="${GOOGLE_FONTS_URL}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = GOOGLE_FONTS_URL;
      document.head.appendChild(link);
    }
  }, []);

  // ── Type tab: render name on hidden canvas → PNG data URL ──────────────────
  const renderTypedSignature = useCallback(
    (name: string, fontFamily: string): string | null => {
      if (!name.trim()) return null;
      const canvas = hiddenCanvasRef.current;
      if (!canvas) return null;

      const scale = 2; // retina
      const W = 500;
      const H = 120;
      canvas.width = W * scale;
      canvas.height = H * scale;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.scale(scale, scale);
      ctx.clearRect(0, 0, W, H);

      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, H);

      // Signature text
      ctx.fillStyle = '#6366f1';
      ctx.font = `48px ${fontFamily}`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.fillText(name, W / 2, H / 2, W - 20);

      return canvas.toDataURL('image/png');
    },
    []
  );

  // Fire onSignatureChange whenever typed name or font changes
  useEffect(() => {
    if (activeTab !== 'type') return;
    if (!typedName.trim()) {
      onSignatureChange(null, 'typed');
      return;
    }
    const font = CURSIVE_FONTS[fontIndex].family;
    // Small delay so the font is likely loaded
    const timer = setTimeout(() => {
      const dataUrl = renderTypedSignature(typedName, font);
      onSignatureChange(dataUrl, 'typed');
    }, 50);
    return () => clearTimeout(timer);
  }, [typedName, fontIndex, activeTab, renderTypedSignature, onSignatureChange]);

  const handleCycleFont = () => {
    setFontIndex((prev) => (prev + 1) % CURSIVE_FONTS.length);
  };

  // ── Draw tab: on stroke end, export canvas ──────────────────────────────────
  const handleDrawEnd = () => {
    const ref = sigCanvasRef.current;
    if (!ref || ref.isEmpty()) {
      onSignatureChange(null, 'drawn');
      return;
    }
    const dataUrl = ref.getTrimmedCanvas().toDataURL('image/png');
    onSignatureChange(dataUrl, 'drawn');
  };

  const handleClear = () => {
    sigCanvasRef.current?.clear();
    onSignatureChange(null, 'drawn');
  };

  // ── Tab switch: reset callbacks ─────────────────────────────────────────────
  const switchTab = (tab: 'type' | 'draw') => {
    setActiveTab(tab);
    if (tab === 'type') {
      // Re-emit typed signature if name already entered
      if (typedName.trim()) {
        const font = CURSIVE_FONTS[fontIndex].family;
        setTimeout(() => {
          const dataUrl = renderTypedSignature(typedName, font);
          onSignatureChange(dataUrl, 'typed');
        }, 60);
      } else {
        onSignatureChange(null, 'typed');
      }
    } else {
      // Switch to draw — clear emission until user draws
      onSignatureChange(null, 'drawn');
    }
  };

  const currentFont = CURSIVE_FONTS[fontIndex];

  return (
    <div className="w-full">
      {/* Hidden canvas for typed signature rendering */}
      <canvas ref={hiddenCanvasRef} className="hidden" aria-hidden="true" />

      {/* ── Tab Toggle ── */}
      <div className="flex rounded-lg overflow-hidden border border-gray-700 mb-4">
        <button
          type="button"
          onClick={() => switchTab('type')}
          className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
            activeTab === 'type'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700'
          }`}
        >
          Type Signature
        </button>
        <button
          type="button"
          onClick={() => switchTab('draw')}
          className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
            activeTab === 'draw'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700'
          }`}
        >
          Draw Signature
        </button>
      </div>

      {/* ── Type Tab ── */}
      {activeTab === 'type' && (
        <div className="space-y-4">
          {/* Name input */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Full Legal Name</label>
            <input
              type="text"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Signature preview */}
          <div className="bg-[#1a1a2e] border border-gray-700 rounded-lg p-4 min-h-[90px] flex items-center justify-center">
            {typedName.trim() ? (
              <span
                style={{
                  fontFamily: currentFont.family,
                  fontSize: '2.5rem',
                  color: '#6366f1',
                  lineHeight: 1.2,
                }}
              >
                {typedName}
              </span>
            ) : (
              <span className="text-gray-600 text-sm italic">
                Your signature will appear here
              </span>
            )}
          </div>

          {/* Font controls */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Style: {currentFont.name}</span>
            <button
              type="button"
              onClick={handleCycleFont}
              className="text-xs px-3 py-1.5 rounded-md border border-gray-600 text-gray-300 hover:border-indigo-500 hover:text-indigo-400 transition-colors"
            >
              Change Style
            </button>
          </div>
        </div>
      )}

      {/* ── Draw Tab ── */}
      {activeTab === 'draw' && (
        <div className="space-y-3">
          <div className="bg-[#1a1a2e] border border-gray-700 rounded-lg overflow-hidden">
            <SignatureCanvas
              ref={sigCanvasRef}
              penColor="#1e1b4b"
              canvasProps={{
                className: 'w-full',
                style: { width: '100%', height: '150px', background: '#ffffff' },
              }}
              onEnd={handleDrawEnd}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Draw your signature above</span>
            <button
              type="button"
              onClick={handleClear}
              className="text-xs px-3 py-1.5 rounded-md border border-gray-600 text-gray-300 hover:border-red-500 hover:text-red-400 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
