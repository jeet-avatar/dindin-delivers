"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon } from "@/components/Icons";
import { isLoggedIn, apiFetch } from "@/lib/auth";

const MAC_DOWNLOAD = "/MixMind-mac.dmg";
const WIN_DOWNLOAD = "/MixMind-Setup-win.exe";

const FEATURES = [
  {
    emoji: "📚",
    title: "Full Library Browser",
    desc: "See every track in your Rekordbox collection — BPM, key, genre, duration — in one fast, searchable table. No more digging through Rekordbox just to find a track.",
  },
  {
    emoji: "🔍",
    title: "Duplicate Finder",
    desc: "MixMind scans your entire library and surfaces exact and near-duplicate tracks. Keep the version you want, clean the rest. One click per pair.",
  },
  {
    emoji: "✨",
    title: "AI Playlist Builder",
    desc: "\"20 deep house tracks under 124 BPM in Am\" — just type it. MixMind reads your library and builds the playlist from tracks you actually own.",
  },
  {
    emoji: "💿",
    title: "Pioneer USB Support",
    desc: "Plug in your DJ USB. MixMind detects it instantly and lets you browse the PIONEER folder directly. Mac and Windows.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Download",
    desc: "Sign in or start your free trial, then download MixMind for Mac or Windows.",
  },
  {
    n: "02",
    title: "Connect",
    desc: "MixMind reads your Rekordbox XML automatically. Your full library loads in seconds.",
  },
  {
    n: "03",
    title: "Organize",
    desc: "Search, clean duplicates, build AI playlists. Your library, finally under control.",
  },
];

const PRICING_FEATURES = [
  "Full library browser — unlimited tracks",
  "Duplicate detection & cleanup",
  "AI playlist builder",
  "Pioneer USB drive support",
  "Mac + Windows",
  "Priority support",
];

const FAQS = [
  {
    q: "Do I need Rekordbox?",
    a: "Yes — MixMind reads your Rekordbox library (XML or database). It works with Rekordbox 6 and 7. You don't need Rekordbox open while using MixMind.",
  },
  {
    q: "Does it modify my Rekordbox library?",
    a: "No. MixMind is read-only by default. Duplicate cleanup marks tracks as hidden inside MixMind — it does not delete or modify your Rekordbox files.",
  },
  {
    q: "Mac or Windows?",
    a: "Both. The Mac DMG runs natively on Apple Silicon (M1/M2/M3/M4). Intel Macs need Rosetta 2 — if you don't have it, macOS will prompt you to install it free. The EXE installer works on Windows 10/11.",
  },
  {
    q: "Is this the same as BeatMind?",
    a: "No — they're separate tools. BeatMind makes music inside Ableton Live. MixMind organizes your existing DJ library. Both are $19/month.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from your account with one click. No questions, no lock-in.",
  },
];

export default function MixMindPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const router = useRouter();

  async function handleDownload(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    e.preventDefault();
    if (!isLoggedIn()) {
      router.push("/login?redirect=/mixmind");
      return;
    }
    try {
      const res = await apiFetch("/api/auth/me");
      if (!res.ok) {
        router.push("/login?redirect=/mixmind");
        return;
      }
      const user = await res.json();
      if (!user.subscribed) {
        router.push("/dashboard");
        return;
      }
    } catch {
      // network error — fall through and let the download attempt proceed
    }
    window.location.href = href;
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      {/* Skip link */}
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-medium"
        style={{ background: "var(--accent)", color: "#fff" }}>
        Skip to main content
      </a>

      {/* Nav */}
      <nav aria-label="Main navigation" className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto border-b" style={{ borderColor: "var(--border)" }}>
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black" style={{ background: "var(--accent)", color: "#fff" }} aria-hidden="true">M</span>
          MixMind
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm" style={{ color: "var(--text-secondary)" }}>
          <a href="#features" className="hover:text-white transition-colors duration-150">Features</a>
          <a href="#how" className="hover:text-white transition-colors duration-150">How it works</a>
          <a href="#pricing" className="hover:text-white transition-colors duration-150">Pricing</a>
          <Link href="/" className="hover:text-white transition-colors duration-150">BeatMind ↗</Link>
        </div>
        <a
          href={MAC_DOWNLOAD}
          onClick={(e) => handleDownload(e, MAC_DOWNLOAD)}
          className="text-sm px-4 py-2 rounded-lg font-medium transition-opacity duration-150 hover:opacity-90"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          Download for Mac →
        </a>
      </nav>

      {/* Main */}
      <main id="main">
        {/* Hero */}
        <section className="max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-8 border" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--accent)" }}>
            ✦ Desktop app · Mac + Windows · Reads Rekordbox
          </div>
          <h1 className="text-5xl md:text-7xl font-black leading-tight mb-6 tracking-tight">
            Your DJ library,<br />
            <span style={{ color: "var(--accent)" }}>finally organized.</span>
          </h1>
          <p className="text-lg md:text-xl mb-10 max-w-2xl mx-auto" style={{ color: "var(--text-secondary)", lineHeight: "1.6" }}>
            MixMind reads your Rekordbox collection and gives you a fast library browser, an AI playlist builder, and a one-click duplicate cleaner — all in a single desktop app.
          </p>

          {/* Download buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={MAC_DOWNLOAD}
              onClick={(e) => handleDownload(e, MAC_DOWNLOAD)}
              className="flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-semibold text-lg transition-opacity duration-150 hover:opacity-90"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              Download for Mac
            </a>
            <a
              href={WIN_DOWNLOAD}
              onClick={(e) => handleDownload(e, WIN_DOWNLOAD)}
              className="flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-semibold text-lg transition-colors duration-150 border hover:border-white"
              style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M3 5.25A2.25 2.25 0 0 1 5.25 3h13.5A2.25 2.25 0 0 1 21 5.25v13.5A2.25 2.25 0 0 1 18.75 21H5.25A2.25 2.25 0 0 1 3 18.75V5.25zm9 1a1 1 0 0 0-1 1v4.586l-1.293-1.293a1 1 0 0 0-1.414 1.414l3 3a1 1 0 0 0 1.414 0l3-3a1 1 0 0 0-1.414-1.414L13 11.836V7.25a1 1 0 0 0-1-1z"/>
              </svg>
              Download for Windows
            </a>
          </div>
          <p className="text-xs mt-4" style={{ color: "var(--text-secondary)" }}>7-day free trial · No credit card required · Cancel anytime</p>

          {/* App preview */}
          <div className="mt-16 rounded-2xl border text-left overflow-hidden" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }} role="img" aria-label="MixMind app preview showing library browser with tracks, BPM, and key columns">
            <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "var(--border)" }} aria-hidden="true">
              <div className="w-3 h-3 rounded-full" style={{ background: "#ff5f57" }} />
              <div className="w-3 h-3 rounded-full" style={{ background: "#febc2e" }} />
              <div className="w-3 h-3 rounded-full" style={{ background: "#28c840" }} />
              <span className="ml-2 text-xs" style={{ color: "var(--text-secondary)" }}>MixMind — DJ Library Manager</span>
            </div>
            <div className="flex" style={{ minHeight: "260px" }}>
              {/* Sidebar */}
              <div className="w-44 border-r flex-shrink-0 p-3 space-y-1" style={{ borderColor: "var(--border)", background: "var(--bg-tertiary)" }}>
                {[
                  { label: "Library", active: true, badge: null },
                  { label: "Playlists", active: false, badge: null },
                  { label: "Duplicates", active: false, badge: "12" },
                  { label: "USB Drive", active: false, badge: "●" },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between px-3 py-2 rounded-lg text-xs" style={{ background: item.active ? "var(--accent)" : "transparent", color: item.active ? "#fff" : "var(--text-secondary)" }}>
                    <span>{item.label}</span>
                    {item.badge && <span className="text-xs font-bold" style={{ color: item.active ? "#fff" : "var(--accent)" }}>{item.badge}</span>}
                  </div>
                ))}
              </div>
              {/* Table */}
              <div className="flex-1 overflow-hidden">
                <div className="grid text-xs px-4 py-2 border-b font-medium" style={{ gridTemplateColumns: "2fr 1.5fr 60px 50px 80px", borderColor: "var(--border)", color: "var(--text-secondary)" }}>
                  <span>Title</span><span>Artist</span><span>BPM</span><span>Key</span><span>Genre</span>
                </div>
                {[
                  { title: "Afro Ritual", artist: "Black Coffee", bpm: "122", key: "Am", genre: "Afro House" },
                  { title: "Believe", artist: "Themba", bpm: "124", key: "Fm", genre: "Melodic House" },
                  { title: "Mirror", artist: "Enoo Napa", bpm: "126", key: "Dm", genre: "Afro Tech" },
                  { title: "Nkosi", artist: "Citizen Boy", bpm: "120", key: "Gm", genre: "Afro House" },
                  { title: "Celestial", artist: "Da Capo", bpm: "118", key: "Cm", genre: "Deep House" },
                ].map((row, i) => (
                  <div key={i} className="grid text-xs px-4 py-2.5 border-b" style={{ gridTemplateColumns: "2fr 1.5fr 60px 50px 80px", borderColor: "var(--border)", background: i % 2 === 0 ? "transparent" : "var(--bg-tertiary)" }}>
                    <span className="font-medium truncate">{row.title}</span>
                    <span style={{ color: "var(--text-secondary)" }} className="truncate">{row.artist}</span>
                    <span style={{ color: "var(--accent)" }}>{row.bpm}</span>
                    <span style={{ color: "var(--text-secondary)" }}>{row.key}</span>
                    <span style={{ color: "var(--text-secondary)" }} className="truncate">{row.genre}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="max-w-6xl mx-auto px-6 py-20" aria-labelledby="features-heading">
          <h2 id="features-heading" className="text-3xl md:text-4xl font-bold text-center mb-4">
            Everything a DJ library needs
          </h2>
          <p className="text-center mb-14" style={{ color: "var(--text-secondary)" }}>
            Not just a file browser. Smart tools built for working DJs.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="p-6 rounded-2xl border" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 text-xl" style={{ background: "var(--bg-tertiary)" }}>
                  {f.emoji}
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="py-20 border-y" style={{ borderColor: "var(--border)" }} aria-labelledby="how-heading">
          <div className="max-w-4xl mx-auto px-6">
            <h2 id="how-heading" className="text-3xl md:text-4xl font-bold text-center mb-4">How it works</h2>
            <p className="text-center mb-14" style={{ color: "var(--text-secondary)" }}>
              Download, open, and your library is there. That's it.
            </p>
            <ol className="grid md:grid-cols-3 gap-8" aria-label="Steps to get started">
              {STEPS.map((s) => (
                <li key={s.n} className="text-center">
                  <div className="text-5xl font-black mb-4" style={{ color: "var(--accent)", opacity: 0.3 }} aria-hidden="true">{s.n}</div>
                  <h3 className="text-xl font-semibold mb-2">{s.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{s.desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="max-w-2xl mx-auto px-6 py-20 text-center" aria-labelledby="pricing-heading">
          <h2 id="pricing-heading" className="text-3xl md:text-4xl font-bold mb-4">Simple pricing</h2>
          <p className="mb-12" style={{ color: "var(--text-secondary)" }}>
            One plan. Everything included. Cancel anytime.
          </p>
          <div className="rounded-2xl border p-8 relative overflow-hidden" style={{ background: "var(--bg-secondary)", borderColor: "var(--accent)" }}>
            <div className="absolute top-0 right-0 text-xs font-semibold px-3 py-1 rounded-bl-xl" style={{ background: "var(--accent)", color: "#fff" }}>
              7-DAY FREE TRIAL
            </div>
            <div className="text-6xl font-black mb-2" aria-label="19 dollars per month">$19</div>
            <div className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>per month · billed monthly · cancel anytime</div>
            <ul className="text-sm space-y-3 text-left mb-8 max-w-xs mx-auto">
              {PRICING_FEATURES.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckIcon size={16} color="var(--accent)" />
                  {item}
                </li>
              ))}
            </ul>
            <a
              href={MAC_DOWNLOAD}
              onClick={(e) => handleDownload(e, MAC_DOWNLOAD)}
              className="block w-full py-4 rounded-xl font-semibold text-lg text-center transition-opacity duration-150 hover:opacity-90"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              Download for Mac →
            </a>
            <p className="text-xs mt-3" style={{ color: "var(--text-secondary)" }}>No credit card required for trial</p>
          </div>

          {/* Also have BeatMind? */}
          <div className="mt-8 p-5 rounded-xl border text-sm" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)", color: "var(--text-secondary)" }}>
            Also a music producer?{" "}
            <Link href="/" className="font-medium transition-colors duration-150 hover:text-white" style={{ color: "var(--accent)" }}>
              Check out BeatMind →
            </Link>
            {" "}— our AI that builds full tracks inside Ableton Live.
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-2xl mx-auto px-6 pb-20" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="text-3xl font-bold text-center mb-10">Frequently asked</h2>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                  aria-controls={`faq-answer-${i}`}
                  id={`faq-btn-${i}`}
                  className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-medium transition-colors duration-150"
                  style={{ background: "var(--bg-secondary)" }}
                >
                  {faq.q}
                  <span style={{ color: "var(--accent)" }} aria-hidden="true">{openFaq === i ? "−" : "+"}</span>
                </button>
                {openFaq === i && (
                  <div id={`faq-answer-${i}`} role="region" aria-labelledby={`faq-btn-${i}`}
                    className="px-5 py-4 text-sm" style={{ color: "var(--text-secondary)", background: "var(--bg-tertiary)" }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t py-20 text-center" style={{ borderColor: "var(--border)" }}>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to clean up your library?</h2>
          <p className="mb-8" style={{ color: "var(--text-secondary)" }}>
            Download MixMind. Your Rekordbox library loads in seconds.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={MAC_DOWNLOAD}
              onClick={(e) => handleDownload(e, MAC_DOWNLOAD)}
              className="inline-block px-10 py-4 rounded-xl font-semibold text-lg transition-opacity duration-150 hover:opacity-90"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              Download for Mac →
            </a>
            <a
              href={WIN_DOWNLOAD}
              onClick={(e) => handleDownload(e, WIN_DOWNLOAD)}
              className="inline-block px-10 py-4 rounded-xl font-semibold text-lg border transition-colors duration-150 hover:border-white"
              style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
            >
              Download for Windows →
            </a>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t px-6 py-10" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm font-bold">
              <span className="w-6 h-6 rounded flex items-center justify-center text-xs font-black" style={{ background: "var(--accent)", color: "#fff" }} aria-hidden="true">M</span>
              MixMind
            </div>
            <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
              © 2026 Zietra Technologies Inc. · Requires Rekordbox 6 or 7
            </div>
            <nav aria-label="Footer links">
              <div className="flex items-center gap-6 text-xs" style={{ color: "var(--text-secondary)" }}>
                <Link href="/privacy" className="hover:text-white transition-colors duration-150">Privacy</Link>
                <Link href="/terms" className="hover:text-white transition-colors duration-150">Terms</Link>
                <a href="mailto:support@beatmind.io" className="hover:text-white transition-colors duration-150">Support</a>
              </div>
            </nav>
          </div>
          <div className="mt-6 text-xs text-center" style={{ color: "var(--text-secondary)" }}>
            Made with <span className="heart-pulse" style={{ color: "var(--accent)" }} aria-label="love">♥</span> for DJs everywhere
          </div>
        </div>
      </footer>
    </div>
  );
}
