"use client";

import Link from "next/link";
import { useState } from "react";
import { BoltIcon, SlidersIcon, SparklesIcon, RefreshIcon, CheckIcon } from "@/components/Icons";

const FEATURES = [
  {
    Icon: BoltIcon,
    title: "Instant Track Generation",
    desc: "Say \u201cAfro House at 122 BPM\u201d and get a full 8-track arrangement \u2014 kick, bass, pads, leads \u2014 in seconds.",
  },
  {
    Icon: SlidersIcon,
    title: "Full Ableton Control",
    desc: "EQ, compression, reverb, arrangement. BeatMind controls every device parameter inside your existing Ableton setup.",
  },
  {
    Icon: SparklesIcon,
    title: "Production Knowledge",
    desc: "Built-in knowledge of 24+ genres, professional mix formulas, and every Ableton device parameter map.",
  },
  {
    Icon: RefreshIcon,
    title: "Iterate Naturally",
    desc: "\u201cMake the bass warmer\u201d, \u201cAdd a breakdown at bar 64\u201d, \u201cBring the kick down 2dB\u201d. Just talk.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Connect",
    desc: "Install the free bridge agent (one command). Open Ableton Live. Bridge connects automatically.",
  },
  {
    n: "02",
    title: "Describe",
    desc: "Tell BeatMind what you want to create. Genre, mood, tempo, instruments \u2014 in plain English.",
  },
  {
    n: "03",
    title: "Create",
    desc: "Watch your track come to life inside Ableton, clip by clip, ready for you to take over.",
  },
];

const PRICING_FEATURES = [
  "Unlimited track generation",
  "24+ genre templates",
  "Full Ableton device control",
  "Mix and arrangement assistance",
  "Priority support",
  "Mac + Windows bridge agent",
];

const FAQS = [
  {
    q: "Do I need Ableton Live?",
    a: "Yes \u2014 BeatMind directly controls Ableton Live 11 or 12 (Standard or Suite). It\u2019s the bridge between AI and your DAW.",
  },
  {
    q: "What genres does it support?",
    a: "24+ including Afro House, Dark Melodic Techno, Deep House, Minimal, Drum & Bass, Ambient, and more. New genres added monthly.",
  },
  {
    q: "Who owns the music I create?",
    a: "You do. 100%. Everything BeatMind generates in your Ableton project is yours to release, sell, or license.",
  },
  {
    q: "Does it work on Mac and Windows?",
    a: "Yes. The bridge agent runs on macOS and Windows. Anywhere Ableton runs, BeatMind runs.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from your dashboard with one click. No questions, no lock-in.",
  },
];

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      {/* Skip to main content */}
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-medium"
        style={{ background: "var(--accent)", color: "#fff" }}>
        Skip to main content
      </a>

      {/* Nav */}
      <nav aria-label="Main navigation" className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2 font-bold text-xl">
          <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black" style={{ background: "var(--accent)", color: "#fff" }} aria-hidden="true">B</span>
          beatmind
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm" style={{ color: "var(--text-secondary)" }}>
          <a href="#features" className="hover:text-white transition-colors duration-150">Features</a>
          <a href="#how" className="hover:text-white transition-colors duration-150">How it works</a>
          <a href="#pricing" className="hover:text-white transition-colors duration-150">Pricing</a>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm px-4 py-2 rounded-lg transition-colors duration-150 hover:text-white" style={{ color: "var(--text-secondary)" }}>
            Sign in
          </Link>
          <Link href="/signup" className="text-sm px-4 py-2 rounded-lg font-medium transition-opacity duration-150 hover:opacity-90" style={{ background: "var(--accent)", color: "#fff" }}>
            Try free &rarr;
          </Link>
        </div>
      </nav>

      {/* Main */}
      <main id="main">
        {/* Hero */}
        <section className="max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-8 border" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--accent)" }}>
            ✦ Powered by Claude AI + AbletonOSC
          </div>
          <h1 className="text-5xl md:text-7xl font-black leading-tight mb-6 tracking-tight">
            The AI that builds music<br />
            <span style={{ color: "var(--accent)" }}>inside Ableton.</span>
          </h1>
          <p className="text-lg md:text-xl mb-10 max-w-2xl mx-auto" style={{ color: "var(--text-secondary)", lineHeight: "1.6" }}>
            Describe what you want. BeatMind generates full tracks \u2014 drums, bass, pads, effects, mix \u2014 directly inside your Ableton Live project. No audio files. No exports. Just your DAW, ready to play.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup" className="px-8 py-4 rounded-xl font-semibold text-lg transition-opacity duration-150 hover:opacity-90" style={{ background: "var(--accent)", color: "#fff" }}>
              Start free trial \u2014 7 days free
            </Link>
            <a href="#how" className="px-8 py-4 rounded-xl font-semibold text-lg transition-colors duration-150 border hover:border-white" style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}>
              See how it works
            </a>
          </div>
          <p className="text-xs mt-4" style={{ color: "var(--text-secondary)" }}>No credit card required for trial · Cancel anytime</p>

          {/* Product preview terminal */}
          <div className="mt-16 rounded-2xl border text-left overflow-hidden" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }} role="img" aria-label="BeatMind chat preview: user requests a dark melodic techno loop, BeatMind builds 8 tracks in Ableton">
            <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "var(--border)" }} aria-hidden="true">
              <div className="w-3 h-3 rounded-full" style={{ background: "#ff5f57" }} />
              <div className="w-3 h-3 rounded-full" style={{ background: "#febc2e" }} />
              <div className="w-3 h-3 rounded-full" style={{ background: "#28c840" }} />
              <span className="ml-2 text-xs" style={{ color: "var(--text-secondary)" }}>beatmind \u2014 AI Music Producer</span>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-end">
                <div className="px-4 py-3 rounded-2xl rounded-tr-sm text-sm max-w-xs" style={{ background: "var(--accent)", color: "#fff" }}>
                  Make me a dark melodic techno loop at 126 BPM in Am
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold mt-1" style={{ background: "var(--bg-tertiary)", color: "var(--accent)" }} aria-hidden="true">B</div>
                <div className="px-4 py-3 rounded-2xl rounded-tl-sm text-sm" style={{ background: "var(--bg-tertiary)", color: "var(--text-primary)", maxWidth: "75%" }}>
                  Building your Dark Melodic Techno loop at 126 BPM in Am...<br /><br />
                  Setting tempo &rarr; Creating 8 tracks &rarr; Loading DS Kick, DS Clap, Wavetable bass, Drift pad, Drift lead &rarr; Programming patterns &rarr; Applying EQ, compression, reverb &rarr; Mixing levels...<br /><br />
                  ✓ Done. 8-track loop ready in Scene 0. Fire scene to hear it.
                  <div className="mt-3 pt-3 border-t text-xs" style={{ borderColor: "var(--border)", color: "var(--accent)" }}>
                    12 Ableton actions executed
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="max-w-6xl mx-auto px-6 py-20" aria-labelledby="features-heading">
          <h2 id="features-heading" className="text-3xl md:text-4xl font-bold text-center mb-4">
            Everything a producer needs
          </h2>
          <p className="text-center mb-14" style={{ color: "var(--text-secondary)" }}>
            Not just chord suggestions. Full production \u2014 inside your DAW.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="p-6 rounded-2xl border" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: "var(--bg-tertiary)", color: "var(--accent)" }}>
                  <f.Icon size={20} />
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
              From zero to a full track in under two minutes.
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
            <Link href="/signup" className="block w-full py-4 rounded-xl font-semibold text-lg text-center transition-opacity duration-150 hover:opacity-90" style={{ background: "var(--accent)", color: "#fff" }}>
              Start free trial &rarr;
            </Link>
            <p className="text-xs mt-3" style={{ color: "var(--text-secondary)" }}>No credit card required for trial</p>
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
                  <span style={{ color: "var(--accent)" }} aria-hidden="true">{openFaq === i ? "\u2212" : "+"}</span>
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
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to make music with AI?</h2>
          <p className="mb-8" style={{ color: "var(--text-secondary)" }}>
            Start your free trial. No credit card. Cancel anytime.
          </p>
          <Link href="/signup" className="inline-block px-10 py-4 rounded-xl font-semibold text-lg transition-opacity duration-150 hover:opacity-90" style={{ background: "var(--accent)", color: "#fff" }}>
            Get started free &rarr;
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t px-6 py-10" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm font-bold">
              <span className="w-6 h-6 rounded flex items-center justify-center text-xs font-black" style={{ background: "var(--accent)", color: "#fff" }} aria-hidden="true">B</span>
              beatmind
            </div>
            <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
              &copy; 2026 Zietra Technologies Inc. · Requires Ableton Live 11 or 12
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
            Made with <span className="heart-pulse" style={{ color: "var(--accent)" }} aria-label="love">♥</span> for producers everywhere
          </div>
        </div>
      </footer>
    </div>
  );
}
