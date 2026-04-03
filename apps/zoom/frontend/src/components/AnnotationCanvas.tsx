import { useEffect, useRef, useState, useCallback } from 'react';
import type { AnnotationStroke } from '../hooks/useWebRTC';

interface AnnotationCanvasProps {
  active: boolean;
  onStroke: (stroke: AnnotationStroke) => void;
  onClose: () => void;
  setListener: (cb: ((stroke: AnnotationStroke) => void) | null) => void;
}

const COLORS = ['#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#007aff', '#af52de', '#ffffff'];
const SIZES = [2, 4, 8];

export function AnnotationCanvas({ active, onStroke, onClose, setListener }: AnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const currentStroke = useRef<{ x: number; y: number }[]>([]);
  const [color, setColor] = useState('#ff3b30');
  const [size, setSize] = useState(4);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');

  const getPos = (e: React.PointerEvent): { x: number; y: number } => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  };

  const drawStroke = useCallback((stroke: AnnotationStroke) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const w = canvas.width;
    const h = canvas.height;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (stroke.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = stroke.size * 4;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
    }

    ctx.beginPath();
    for (let i = 0; i < stroke.points.length; i++) {
      const p = stroke.points[i];
      if (i === 0) ctx.moveTo(p.x * w, p.y * h);
      else ctx.lineTo(p.x * w, p.y * h);
    }
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }, []);

  // Listen for remote annotations
  useEffect(() => {
    if (active) {
      setListener((stroke) => drawStroke(stroke));
      return () => setListener(null);
    }
  }, [active, setListener, drawStroke]);

  // Resize canvas to match parent
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const parent = canvas.parentElement!;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    };
    resize();
    const obs = new ResizeObserver(resize);
    obs.observe(canvas.parentElement!);
    return () => obs.disconnect();
  }, [active]);

  const onPointerDown = (e: React.PointerEvent) => {
    drawing.current = true;
    currentStroke.current = [getPos(e)];
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const pos = getPos(e);
    currentStroke.current.push(pos);
    // Draw locally in real-time
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const pts = currentStroke.current;
    if (pts.length < 2) return;
    const prev = pts[pts.length - 2];
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = size * 4;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.lineWidth = size;
    }
    ctx.beginPath();
    ctx.moveTo(prev.x * canvas.width, prev.y * canvas.height);
    ctx.lineTo(pos.x * canvas.width, pos.y * canvas.height);
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  };

  const onPointerUp = () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (currentStroke.current.length > 1) {
      const stroke: AnnotationStroke = { tool, color, size, points: currentStroke.current };
      onStroke(stroke);
    }
    currentStroke.current = [];
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
  };

  if (!active) return null;

  return (
    <>
      <canvas
        ref={canvasRef}
        className="annotation-canvas"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      />
      <div className="annotation-toolbar">
        {COLORS.map(c => (
          <button
            key={c}
            className={`anno-color ${c === color && tool === 'pen' ? 'selected' : ''}`}
            style={{ background: c }}
            onClick={() => { setTool('pen'); setColor(c); }}
          />
        ))}
        <button
          className={`anno-tool ${tool === 'eraser' ? 'selected' : ''}`}
          onClick={() => setTool('eraser')}
          title="Eraser"
        >
          E
        </button>
        {SIZES.map(s => (
          <button
            key={s}
            className={`anno-size ${s === size ? 'selected' : ''}`}
            onClick={() => setSize(s)}
          >
            <span style={{ width: s * 2, height: s * 2 }} className="size-dot" />
          </button>
        ))}
        <button className="anno-tool" onClick={clearCanvas} title="Clear">C</button>
        <button className="anno-tool anno-close" onClick={onClose} title="Close">&times;</button>
      </div>
    </>
  );
}
