"use client";

import { useState } from "react";

// Shows YouTube's thumbnail and loads the privacy-enhanced (youtube-nocookie) player only on
// click, so no YouTube scripts or cookies load until the visitor asks to watch.
export function LiteYouTube({ videoId, title }: { videoId: string; title: string }) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <iframe
        className="absolute inset-0 w-full h-full"
        src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={`Play video: ${title}`}
      className="group absolute inset-0 w-full h-full"
    >
      <img
        src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
        alt=""
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover opacity-80 transition-opacity duration-150 group-hover:opacity-100"
      />
      <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
        <span className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg" style={{ background: "var(--accent)" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z" /></svg>
        </span>
      </span>
    </button>
  );
}
