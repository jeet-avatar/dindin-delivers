"use client";

import { ArrowDown } from "lucide-react";
import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from "react";

export default function ChatTimeline({ children, followKey }: { children: ReactNode; followKey: string }) {
  const viewport = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const following = useRef(true);
  const lastTop = useRef(0);
  const touchY = useRef<number | null>(null);
  const [showLatest, setShowLatest] = useState(false);

  const scrollToLatest = useCallback(() => {
    const element = viewport.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
    lastTop.current = element.scrollTop;
  }, []);
  const followLatest = useCallback(() => {
    following.current = true;
    setShowLatest(false);
    scrollToLatest();
  }, [scrollToLatest]);
  const pauseFollowing = () => { following.current = false; setShowLatest(true); };

  // A submitted command or a different song starts a new viewing intent.
  useLayoutEffect(followLatest, [followKey, followLatest]);
  useLayoutEffect(() => {
    if (following.current) scrollToLatest();
  });
  useLayoutEffect(() => {
    const observer = new ResizeObserver(() => {
      if (following.current) scrollToLatest();
    });
    if (content.current) observer.observe(content.current);
    if (viewport.current) observer.observe(viewport.current);
    return () => observer.disconnect();
  }, [scrollToLatest]);

  return <div className="relative flex-1 min-h-0">
    <div ref={viewport} role="region" aria-label="Song conversation" tabIndex={0}
      className="h-full overflow-y-auto px-3 sm:px-6 py-4" style={{ overflowAnchor: "none" }}
      onScroll={() => {
        const element = viewport.current!;
        const atBottom = element.scrollHeight - element.scrollTop - element.clientHeight <= 4;
        if (atBottom) { following.current = true; setShowLatest(false); }
        else if (element.scrollTop < lastTop.current - 1) pauseFollowing();
        lastTop.current = element.scrollTop;
      }}
      onWheel={event => { if (event.deltaY < 0) pauseFollowing(); }}
      onTouchStart={event => { touchY.current = event.touches[0]?.clientY ?? null; }}
      onTouchMove={event => {
        const next = event.touches[0]?.clientY;
        if (next !== undefined && touchY.current !== null && next > touchY.current) pauseFollowing();
        touchY.current = next ?? null;
      }}
      onKeyDown={event => {
        if (event.target === event.currentTarget && ["ArrowUp", "PageUp", "Home"].includes(event.key)) pauseFollowing();
      }}>
      <div ref={content} className="space-y-4" aria-live="polite">{children}</div>
    </div>
    {showLatest && <button type="button" onClick={followLatest} title="Jump to the latest response"
      className="absolute bottom-3 right-4 inline-flex items-center gap-2 rounded border px-3 py-2 text-sm shadow-lg"
      style={{ background: "var(--bg-secondary)", color: "var(--text-primary)", borderColor: "var(--border)" }}>
      <ArrowDown size={16} aria-hidden="true" />Jump to latest
    </button>}
  </div>;
}
