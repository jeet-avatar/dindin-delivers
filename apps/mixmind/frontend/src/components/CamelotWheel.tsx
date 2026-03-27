// src/components/CamelotWheel.tsx
// SVG Camelot wheel popup — shows 12x2 slices (A=minor inner, B=major outer)
// Current key highlighted bright, compatible keys semi-transparent, others dim

interface Props {
  currentCamelot: string;
  compatibleKeys: string[];
  onClose: () => void;
  onSelectKey?: (camelot: string) => void;
}

// Color palette per Camelot number (matches TrackTable CAMELOT_COLORS)
const WHEEL_COLORS: Record<string, string> = {
  '1':  '#60a5fa',
  '2':  '#a78bfa',
  '3':  '#f472b6',
  '4':  '#fb923c',
  '5':  '#facc15',
  '6':  '#4ade80',
  '7':  '#2dd4bf',
  '8':  '#22d3ee',
  '9':  '#38bdf8',
  '10': '#818cf8',
  '11': '#f87171',
  '12': '#fb7185',
};

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, rInner: number, rOuter: number, startDeg: number, endDeg: number): string {
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  const s1 = polarToCartesian(cx, cy, rOuter, startDeg);
  const e1 = polarToCartesian(cx, cy, rOuter, endDeg);
  const s2 = polarToCartesian(cx, cy, rInner, endDeg);
  const e2 = polarToCartesian(cx, cy, rInner, startDeg);
  return [
    `M ${s1.x} ${s1.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${e1.x} ${e1.y}`,
    `L ${s2.x} ${s2.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${e2.x} ${e2.y}`,
    'Z',
  ].join(' ');
}

export function CamelotWheel({ currentCamelot, compatibleKeys, onClose, onSelectKey }: Props) {
  const cx = 120, cy = 120;
  const rInner = 60;     // inner ring starts here
  const rMid = 96;       // boundary between A (inner) and B (outer)
  const rOuter = 132;    // outer ring ends here

  const GAP = 0.5; // degrees gap between slices (half on each side)
  const sliceAngle = 30; // 360 / 12

  const slices: { num: string; letter: 'A' | 'B'; rIn: number; rOut: number; startDeg: number; endDeg: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const num = String(i + 1);
    const startDeg = -90 + i * sliceAngle + GAP;
    const endDeg = -90 + (i + 1) * sliceAngle - GAP;
    // A = minor = inner ring
    slices.push({ num, letter: 'A', rIn: rInner, rOut: rMid - 2, startDeg, endDeg });
    // B = major = outer ring
    slices.push({ num, letter: 'B', rIn: rMid + 2, rOut: rOuter, startDeg, endDeg });
  }

  function sliceFill(camelot: string): string {
    const num = camelot.replace(/[AB]/i, '').trim();
    const baseColor = WHEEL_COLORS[num] || '#666';

    if (camelot === currentCamelot) return baseColor;
    if (compatibleKeys.includes(camelot)) return baseColor + '88'; // semi-transparent
    return 'rgba(255,255,255,0.04)';
  }

  function sliceStroke(camelot: string): string {
    if (camelot === currentCamelot) return 'rgba(255,255,255,0.6)';
    if (compatibleKeys.includes(camelot)) return 'rgba(255,255,255,0.15)';
    return 'rgba(255,255,255,0.06)';
  }

  const labelForSlice = (num: string, letter: 'A' | 'B', startDeg: number, endDeg: number, rIn: number, rOut: number) => {
    const midAngle = (startDeg + endDeg) / 2;
    const midR = (rIn + rOut) / 2;
    const pos = polarToCartesian(cx, cy, midR, midAngle);
    const camelot = `${num}${letter}`;
    const isCurrent = camelot === currentCamelot;
    const isCompat = compatibleKeys.includes(camelot);
    return (
      <text
        key={camelot + '-label'}
        x={pos.x}
        y={pos.y}
        textAnchor="middle"
        dominantBaseline="central"
        style={{
          fontSize: letter === 'A' ? '7px' : '8px',
          fontWeight: isCurrent ? 800 : isCompat ? 600 : 400,
          fill: isCurrent ? '#fff' : isCompat ? '#e5e7eb' : '#4b5563',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        {camelot}
      </text>
    );
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#111', borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.08)',
          padding: '24px', boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        }}
      >
        <svg viewBox="0 0 240 240" width="280" height="280">
          {slices.map(({ num, letter, rIn, rOut, startDeg, endDeg }) => {
            const camelot = `${num}${letter}`;
            return (
              <path
                key={camelot}
                d={arcPath(cx, cy, rIn, rOut, startDeg, endDeg)}
                fill={sliceFill(camelot)}
                stroke={sliceStroke(camelot)}
                strokeWidth={0.5}
                style={{ cursor: onSelectKey ? 'pointer' : 'default', transition: 'fill 0.2s' }}
                onClick={() => onSelectKey?.(camelot)}
              />
            );
          })}

          {/* Labels */}
          {slices.map(({ num, letter, rIn, rOut, startDeg, endDeg }) =>
            labelForSlice(num, letter, startDeg, endDeg, rIn, rOut)
          )}

          {/* Center circle with current key */}
          <circle cx={cx} cy={cy} r={rInner - 6} fill="#0a0a0a" stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} />
          <text x={cx} y={cy - 6} textAnchor="middle" dominantBaseline="central"
            style={{ fontSize: '16px', fontWeight: 700, fill: '#e5e7eb' }}>
            {currentCamelot}
          </text>
          <text x={cx} y={cy + 10} textAnchor="middle" dominantBaseline="central"
            style={{ fontSize: '7px', fontWeight: 500, fill: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            now playing
          </text>
        </svg>
      </div>
    </div>
  );
}
