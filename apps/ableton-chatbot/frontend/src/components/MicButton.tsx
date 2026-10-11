"use client";

import { useEffect, useRef, useState } from "react";

// Speak a message instead of typing it. The browser turns speech into text in the message box;
// nothing is sent until the user presses Send.
interface Recognition {
  lang: string; interimResults: boolean; continuous: boolean;
  onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
}

function recognizer(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

const ERRORS: Record<string, string> = {
  "not-allowed": "Microphone access is blocked. Allow it for beatmind.io in your browser's site settings, then try again.",
  "service-not-allowed": "Microphone access is blocked. Allow it for beatmind.io in your browser's site settings, then try again.",
  "audio-capture": "No microphone was found. Check that one is connected.",
  "network": "Speech recognition needs an internet connection. Try again.",
};

export default function MicButton({ value, onChange, disabled, onError }: {
  value: string; onChange: (text: string) => void; disabled?: boolean; onError: (message: string) => void;
}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<Recognition | null>(null);

  useEffect(() => {
    setSupported(Boolean(recognizer()));
    return () => recognitionRef.current?.abort();
  }, []);

  if (!supported) return null;

  function toggle() {
    if (listening) { recognitionRef.current?.stop(); return; }
    const Speech = recognizer();
    if (!Speech) return;
    const recognition = new Speech();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;
    const before = value.trim();
    recognition.onresult = event => {
      let heard = "";
      for (let i = 0; i < event.results.length; i++) heard += event.results[i][0].transcript;
      onChange([before, heard.trim()].filter(Boolean).join(" "));
    };
    recognition.onerror = event => {
      if (event.error !== "no-speech" && event.error !== "aborted") onError(ERRORS[event.error] || "Voice input stopped. Try again.");
    };
    recognition.onend = () => { setListening(false); recognitionRef.current = null; };
    recognitionRef.current = recognition;
    onError("");
    recognition.start();
    setListening(true);
  }

  return (
    <button type="button" onClick={toggle} disabled={disabled && !listening} aria-pressed={listening}
      aria-label={listening ? "Stop voice input" : "Speak your message"} title={listening ? "Stop listening" : "Speak your message"}
      className="w-12 h-12 flex-shrink-0 rounded-xl border flex items-center justify-center disabled:opacity-40"
      style={{ borderColor: "var(--accent)", color: listening ? "var(--on-accent)" : "var(--accent)", background: listening ? "var(--accent)" : "transparent" }}>
      {listening ? (
        <span className="block w-3.5 h-3.5 rounded-sm bg-current animate-pulse" aria-hidden="true" />
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0014 0" /><path d="M12 17v5" />
        </svg>
      )}
    </button>
  );
}
