"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Recordings, { useRecordings } from "@/components/Recordings";

function RecordingReview() {
  const id = useSearchParams().get("id") || "";
  const valid = /^[a-f0-9]{32}$/.test(id);
  const recordings = useRecordings(valid ? [id] : []);
  const item = recordings.items.find(item => item.id === id);
  const error = !valid ? "Recording not found." : recordings.error || (recordings.loaded && !item ? "Recording not found for this account." : "");
  return <main className="min-h-screen px-4 py-6 sm:px-6" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
    <div className="max-w-2xl mx-auto min-w-0">
      <header className="flex flex-wrap justify-between gap-3 border-b pb-4" style={{ borderColor: "var(--border)" }}>
        <h1 className="text-xl font-semibold">BeatMind / Recording</h1>
        <Link href="/dashboard" className="text-sm underline">Back to chat</Link>
      </header>
      {error && <p role="alert" className="mt-4 text-sm text-amber-200">{error}</p>}
      {recordings.unauthorized && <Link href="/login" className="inline-block mt-3 underline">Sign in</Link>}
      {!item && !error && <p role="status" className="mt-4 text-sm">Loading recording...</p>}
      {item && <Recordings items={[item]} initialIds={new Set([item.id])} title="Sound review"
        supersededIds={new Set(recordings.items.flatMap(item => item.supersedes ? [item.supersedes] : []))}
        onDecision={() => {}} />}
    </div>
  </main>;
}

export default function RecordingPage() {
  return <Suspense fallback={<p className="p-6">Loading recording...</p>}><RecordingReview /></Suspense>;
}
