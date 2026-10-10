import type { Metadata } from "next";
import Link from "next/link";
import { BASE_URL, OG_IMAGE, OG_IMAGE_SIZE, SITE_NAME } from "@/lib/site";
import { BlogFooter, BlogNav } from "../blog/blog-chrome";

const PATH = "/download";
const TITLE = "Download BeatMind Bridge";
const DESCRIPTION =
  "Download BeatMind Bridge for macOS. Connect Ableton Live to AI-powered music production.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${BASE_URL}${PATH}` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${BASE_URL}${PATH}`,
    siteName: SITE_NAME,
    type: "website",
    locale: "en_US",
    images: [{ url: OG_IMAGE, ...OG_IMAGE_SIZE, alt: TITLE }],
  },
};

export default function DownloadPage() {
  return (
    <>
      <BlogNav />
      <main className="mx-auto max-w-2xl px-4 py-16 sm:py-24">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Download BeatMind Bridge
        </h1>
        <p className="mt-4 text-lg" style={{ color: "var(--text-secondary)" }}>
          BeatMind Bridge connects your Ableton Live session to AI. It runs
          locally on your Mac, communicates with Ableton via OSC, and handles
          stem separation, arrangement recording, and more.
        </p>

        {/* Update banner */}
        <div
          className="mt-8 rounded-xl border-2 p-5"
          style={{ borderColor: "var(--success)", background: "color-mix(in oklch, var(--success) 8%, transparent)" }}
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-2xl">&#9889;</span>
            <div>
              <p className="font-semibold" style={{ color: "var(--success)" }}>
                Update Available &mdash; Version 1.3.15
              </p>
              <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                If you already have BeatMind Bridge installed, download this
                update to get the latest fixes including Send to Ableton for
                cloud-separated stems.
              </p>
            </div>
          </div>
        </div>

        {/* Download card */}
        <div
          className="mt-8 rounded-2xl border p-8"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <div className="flex items-center gap-3 mb-6">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
              <path d="M12 16v-8" />
              <path d="M8 12l4 4 4-4" />
            </svg>
            <div>
              <h2 className="text-xl font-semibold">macOS (Apple Silicon)</h2>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Version 1.3.15 &middot; Requires macOS 13+
              </p>
            </div>
          </div>

          <a
            href="/BeatMind-Bridge.dmg"
            download
            className="inline-flex items-center gap-2 rounded-lg px-6 py-3 font-semibold text-lg"
            style={{ background: "var(--accent)", color: "var(--on-accent)" }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download Update (.dmg)
          </a>

          <p className="mt-4 text-sm" style={{ color: "var(--text-secondary)" }}>
            Signed and notarized by Apple. ~296 MB.
          </p>
        </div>

        {/* What's new */}
        <div className="mt-10 space-y-4">
          <h2 className="text-xl font-semibold">What&apos;s New in 1.3.15</h2>
          <ul className="list-disc list-inside space-y-2" style={{ color: "var(--text-secondary)" }}>
            <li>Fixed <strong>Send to Ableton</strong> for cloud-separated reference stems</li>
            <li>Fixed SSL certificate handling for stem downloads</li>
            <li>Bridge stays connected while long stem downloads run</li>
          </ul>
        </div>

        {/* How to update */}
        <div className="mt-10 space-y-4">
          <h2 className="text-xl font-semibold">How to Update</h2>
          <ol className="list-decimal list-inside space-y-3" style={{ color: "var(--text-secondary)" }}>
            <li><strong>Quit</strong> BeatMind Bridge if it&apos;s running</li>
            <li>Click <strong>Download Update</strong> above</li>
            <li>Open the downloaded <strong>.dmg</strong> file</li>
            <li>Drag <strong>BeatMind Bridge</strong> to Applications and <strong>Replace</strong> the existing version</li>
            <li>Open the updated Bridge and sign in</li>
          </ol>
        </div>

        {/* First time install */}
        <div className="mt-10 space-y-4">
          <h2 className="text-xl font-semibold">First Time Setup</h2>
          <ol className="list-decimal list-inside space-y-3" style={{ color: "var(--text-secondary)" }}>
            <li>Open the downloaded <strong>.dmg</strong> file</li>
            <li>Drag <strong>BeatMind Bridge</strong> into your Applications folder</li>
            <li>Open BeatMind Bridge and sign in with your account</li>
            <li>
              Install{" "}
              <a
                href="https://github.com/ideoforms/AbletonOSC"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4"
              >
                AbletonOSC
              </a>{" "}
              in Ableton Live (MIDI Remote Script)
            </li>
            <li>Start producing with AI</li>
          </ol>
        </div>

        <div className="mt-10 space-y-4">
          <h2 className="text-xl font-semibold">Troubleshooting</h2>
          <details className="group">
            <summary className="cursor-pointer font-medium">
              macOS says the app is damaged or can&apos;t be opened
            </summary>
            <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              Right-click the app and choose <strong>Open</strong> instead of
              double-clicking. If that doesn&apos;t work, go to System
              Settings &rarr; Privacy &amp; Security and click &ldquo;Open
              Anyway&rdquo;.
            </p>
          </details>
          <details className="group">
            <summary className="cursor-pointer font-medium">
              Bridge won&apos;t connect to Ableton
            </summary>
            <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              Make sure AbletonOSC is installed as a MIDI Remote Script and
              enabled in Ableton&apos;s Preferences &rarr; Link, Tempo &amp; MIDI.
              Bridge communicates over UDP ports 11000/11001.
            </p>
          </details>
        </div>

        <p className="mt-10 text-sm" style={{ color: "var(--text-secondary)" }}>
          Need help?{" "}
          <Link href="/guide" className="underline underline-offset-4">
            Read the full setup guide
          </Link>{" "}
          or reach out at{" "}
          <a href="mailto:support@beatmind.io" className="underline underline-offset-4">
            support@beatmind.io
          </a>
        </p>
      </main>
      <BlogFooter />
    </>
  );
}
