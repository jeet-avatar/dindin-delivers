"use client";

import { useEffect, useId, useRef, useState } from "react";

// Reads a chat reply aloud with the browser's built-in voice. Only one reply speaks at a time.
const SPEECH_EVENT = "beatmind-speech";

function speakable(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_#`>|~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Long utterances stop early in some browsers, so speak sentence-sized pieces in a queue.
function pieces(text: string): string[] {
  const sentences = text.match(/[^.!?]+[.!?]*/g) || [text];
  const chunks: string[] = [];
  for (const sentence of sentences) {
    const last = chunks.length - 1;
    if (last >= 0 && chunks[last].length + sentence.length < 200) chunks[last] += sentence;
    else chunks.push(sentence);
  }
  return chunks.map(chunk => chunk.trim()).filter(Boolean);
}

export default function SpeakButton({ text }: { text: string }) {
  const id = useId();
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const speakingRef = useRef(false);
  speakingRef.current = speaking;
  const runRef = useRef(0);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    const onOther = (event: Event) => { if ((event as CustomEvent<string>).detail !== id) setSpeaking(false); };
    window.addEventListener(SPEECH_EVENT, onOther);
    return () => window.removeEventListener(SPEECH_EVENT, onOther);
  }, [id]);

  // Stop this reply's speech if the message leaves the screen (another chat opened).
  useEffect(() => () => { if (speakingRef.current) window.speechSynthesis.cancel(); }, []);

  const words = speakable(text);
  if (!supported || !words) return null;

  function toggle() {
    const synth = window.speechSynthesis;
    synth.cancel();
    if (speaking) { runRef.current++; setSpeaking(false); return; }
    window.dispatchEvent(new CustomEvent(SPEECH_EVENT, { detail: id }));
    const parts = pieces(words);
    const run = ++runRef.current;
    const finished = () => { if (runRef.current === run) setSpeaking(false); };
    parts.forEach((part, index) => {
      const utterance = new SpeechSynthesisUtterance(part);
      utterance.lang = "en-US";
      if (index === parts.length - 1) {
        utterance.onend = finished;
        utterance.onerror = finished;
      }
      synth.speak(utterance);
    });
    setSpeaking(true);
  }

  return (
    <button type="button" onClick={toggle} aria-pressed={speaking}
      aria-label={speaking ? "Stop reading aloud" : "Read this reply aloud"} title={speaking ? "Stop" : "Read aloud"}
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors"
      style={{ borderColor: "var(--accent)", color: speaking ? "var(--on-accent)" : "var(--accent)", background: speaking ? "var(--accent)" : "transparent" }}>
      {speaking ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="14" height="14" rx="1" /></svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M11 5L6 9H2v6h4l5 4V5z" /><path d="M15.54 8.46a5 5 0 010 7.07" /><path d="M19.07 4.93a10 10 0 010 14.14" />
        </svg>
      )}
      {speaking ? "Stop" : "Listen"}
    </button>
  );
}
