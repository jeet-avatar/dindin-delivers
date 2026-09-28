"use client";

import Link from "next/link";
import { Showcase } from "@/components/Showcase";
import { SocialLinks } from "@/components/SocialLinks";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon } from "@/components/Icons";
import { isLoggedIn, apiFetch } from "@/lib/auth";
import { hasMixMindAccess } from "@/lib/billing";
import { MIXMIND_FAQS } from "@/lib/faqs";
import {
  ANNUAL_DISCOUNT_LABEL,
  MIXMIND_COMBOS,
  MIXMIND_PRICE,
  MIXMIND_TRIAL_NOTE,
  type BillingInterval,
  type CheckoutPlanId,
  formatUsd,
  planById,
  signupHref,
} from "@/lib/pricing";

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
    emoji: "🎚️",
    title: "Intelligent Set Builder",
    desc: "Pick a warm-up, peak-time or closing set, set a BPM range and let MixMind sequence tracks with smooth key flow. Skip tracks you played recently, then add the finished set to Rekordbox as a playlist.",
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
    desc: "Choose a MixMind, BeatMind + MixMind or Studio plan, then sign in with your BeatMind account to download MixMind for Mac or Windows.",
  },
  {
    n: "02",
    title: "Connect",
    desc: "MixMind reads your Rekordbox XML automatically. Your full library loads in seconds.",
  },
  {
    n: "03",
    title: "Organize",
    desc: "Search, clean duplicates, build AI playlists and full sets. Your library, finally under control.",
  },
];

const STUDIO = planById("studio");

const MIXMIND_FEATURES = [
  "Full library browser — unlimited tracks",
  "Duplicate detection & cleanup",
  "AI playlist builder",
  "Intelligent Set Builder",
  "Pioneer USB drive support",
  "Mac + Windows",
];

interface MixMindPriceCard {
  id: CheckoutPlanId;
  name: string;
  monthly: number;
  yearly: number;
  available: boolean;
  highlight: boolean;
  savings: { monthly: number; yearly: number } | null;
  features: string[];
}

const PRICE_CARDS: MixMindPriceCard[] = [
  {
    id: MIXMIND_PRICE.id,
    name: "MixMind",
    monthly: MIXMIND_PRICE.monthly,
    yearly: MIXMIND_PRICE.yearly,
    available: MIXMIND_PRICE.available,
    highlight: true,
    savings: null,
    features: MIXMIND_FEATURES,
  },
  ...MIXMIND_COMBOS.map((combo) => {
    const beatmind = planById(combo.beatmindPlan);
    return {
      id: combo.id,
      name: combo.name,
      monthly: combo.monthly,
      yearly: combo.yearly,
      available: combo.available,
      highlight: false,
      savings: {
        monthly: combo.savingsMonthly,
        yearly: beatmind.yearly + MIXMIND_PRICE.yearly - combo.yearly,
      },
      features: [
        "Everything in MixMind",
        `BeatMind ${beatmind.name}: ${beatmind.includedTracks} tracks / month`,
        ...(beatmind.includedCloud > 0 ? [`${beatmind.includedCloud} cloud HQ separations / month`] : []),
        "AI producer inside Ableton Live (fair use)",
      ],
    };
  }),
];

export default function MixMindPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("month");
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
      if (!hasMixMindAccess(user)) {
        router.push("/dashboard?upgrade=mixmind");
        return;
      }
    } catch {
      router.push("/dashboard");
      return;
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
          <Link href="/guide" className="hover:text-white transition-colors duration-150">Guide</Link>
          <Link href="/blog" className="hover:text-white transition-colors duration-150">Blog</Link>
          <Link href="/" className="hover:text-white transition-colors duration-150">BeatMind ↗</Link>
        </div>
        <a
          href="#pricing"
          className="text-sm px-4 py-2 rounded-lg font-medium transition-opacity duration-150 hover:opacity-90"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          Get MixMind →
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
            MixMind reads your Rekordbox collection and gives you a fast library browser, an AI playlist builder, a set builder and a one-click duplicate cleaner — all in a single desktop app.
          </p>

          {/* Primary CTA + download buttons */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center">
            <a
              href="#pricing"
              className="flex items-center justify-center px-8 py-4 rounded-xl font-semibold text-lg transition-opacity duration-150 hover:opacity-90"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              Get MixMind · {formatUsd(MIXMIND_PRICE.monthly)}/mo
            </a>
            <a
              href={MAC_DOWNLOAD}
              onClick={(e) => handleDownload(e, MAC_DOWNLOAD)}
              className="flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-semibold text-lg transition-colors duration-150 border hover:border-white"
              style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
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
          <p className="text-xs mt-4" style={{ color: "var(--text-secondary)" }}>From {formatUsd(MIXMIND_PRICE.monthly)}/month · Sign in with your BeatMind account to unlock the download</p>

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

        {/* What is MixMind? — concise definition for search and answer engines */}
        <section className="max-w-3xl mx-auto px-6 pb-4" aria-labelledby="what-is-heading">
          <div className="border-l-2 pl-5 py-1" style={{ borderColor: "var(--accent)" }}>
            <h2 id="what-is-heading" className="text-base font-semibold mb-2" style={{ color: "var(--text-primary)" }}>What is MixMind?</h2>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              MixMind is a desktop DJ library manager for Mac and Windows that reads your Rekordbox 6 or 7 collection. It gives you a fast, searchable library browser, an AI playlist builder that picks from tracks you already own, a duplicate finder, Pioneer USB drive browsing and an Intelligent Set Builder that sequences warm-up, peak-time or closing sets by BPM and key and can add them to Rekordbox as playlists. Browsing and duplicate cleanup never modify your Rekordbox files. MixMind is made by the BeatMind team and costs from {formatUsd(MIXMIND_PRICE.monthly)}/month ({formatUsd(MIXMIND_PRICE.yearly)}/year), or {formatUsd(MIXMIND_COMBOS[0].monthly)}/month bundled with BeatMind Starter. It is also included in BeatMind Studio ({formatUsd(STUDIO.monthly)}/month).
            </p>
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
            <p className="text-center text-sm mt-12">
              <Link href="/guide#mixmind" className="font-medium transition-colors duration-150 hover:text-white" style={{ color: "var(--accent)" }}>
                Step-by-step MixMind guide &rarr;
              </Link>
            </p>
          </div>
        </section>

        <Showcase product="mixmind" />

        {/* Pricing */}
        <section id="pricing" className="max-w-6xl mx-auto px-6 py-20 text-center" aria-labelledby="pricing-heading">
          <h2 id="pricing-heading" className="text-3xl md:text-4xl font-bold mb-4">Pricing</h2>
          <p className="mb-8 max-w-2xl mx-auto" style={{ color: "var(--text-secondary)" }}>
            Get MixMind on its own, or bundle it with BeatMind and save {formatUsd(MIXMIND_COMBOS[0].savingsMonthly)}/month. Cancel anytime.
          </p>

          {/* Billing interval toggle */}
          <div className="inline-flex p-1 rounded-xl border mb-3" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }} role="group" aria-label="Billing interval">
            {(["month", "year"] as const).map((option) => {
              const selected = billingInterval === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setBillingInterval(option)}
                  aria-pressed={selected}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150"
                  style={{ background: selected ? "var(--accent)" : "transparent", color: selected ? "#fff" : "var(--text-secondary)" }}
                >
                  {option === "month" ? "Monthly" : `Yearly · ${ANNUAL_DISCOUNT_LABEL}`}
                </button>
              );
            })}
          </div>

          <p className="text-xs mb-10" style={{ color: "var(--text-secondary)" }}>{MIXMIND_TRIAL_NOTE}</p>

          {/* Price cards */}
          <div className="grid gap-6 md:grid-cols-3 text-left">
            {PRICE_CARDS.map((card) => {
              const price = billingInterval === "month" ? card.monthly : card.yearly;
              const unit = billingInterval === "month" ? "month" : "year";
              let savingsLabel: string | null = null;
              if (card.savings) {
                savingsLabel = billingInterval === "month"
                  ? `Save ${formatUsd(card.savings.monthly)}/mo vs separate`
                  : `Save ${formatUsd(card.savings.yearly)}/yr vs separate`;
              }
              return (
                <div
                  key={card.id}
                  className="rounded-2xl border p-8 relative overflow-hidden flex flex-col"
                  style={{ background: "var(--bg-secondary)", borderColor: card.highlight ? "var(--accent)" : "var(--border)" }}
                >
                  {card.highlight && (
                    <div className="absolute top-0 right-0 text-xs font-semibold px-3 py-1 rounded-bl-xl" style={{ background: "var(--accent)", color: "#fff" }}>
                      FOR DJS
                    </div>
                  )}
                  <h3 className="text-xl font-semibold mb-4">{card.name}</h3>
                  <div className="text-5xl font-black mb-2" aria-label={`${price} dollars per ${unit}`}>{formatUsd(price)}</div>
                  <div className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>
                    per {unit}
                    {billingInterval === "year" ? ` · ${ANNUAL_DISCOUNT_LABEL}` : " · cancel anytime"}
                  </div>
                  <div className="text-sm font-semibold mb-6 min-h-5" style={{ color: "var(--accent)" }}>{savingsLabel}</div>
                  <ul className="text-sm space-y-3 mb-8 flex-1">
                    {card.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <span className="mt-0.5 flex-shrink-0"><CheckIcon size={16} color="var(--accent)" /></span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  {card.available ? (
                    <Link
                      href={signupHref(card.id, billingInterval)}
                      className={card.highlight
                        ? "block w-full py-4 rounded-xl font-semibold text-lg text-center transition-opacity duration-150 hover:opacity-90"
                        : "block w-full py-4 rounded-xl font-semibold text-lg text-center transition-colors duration-150 border hover:border-white"}
                      style={card.highlight ? { background: "var(--accent)", color: "#fff" } : { borderColor: "var(--border)", color: "var(--text-primary)" }}
                    >
                      Choose {card.name} &rarr;
                    </Link>
                  ) : (
                    <span className="block w-full py-4 rounded-xl font-semibold text-lg text-center border opacity-60" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }} aria-disabled="true">
                      Not available yet
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Studio */}
          <div className="mt-6 p-5 rounded-xl border text-sm text-left md:text-center" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)", color: "var(--text-secondary)" }}>
            <span className="font-semibold" style={{ color: "var(--text-primary)" }}>Included in BeatMind {STUDIO.name}: </span>
            MixMind comes with Studio ({formatUsd(STUDIO.monthly)}/mo or {formatUsd(STUDIO.yearly)}/yr), along with {STUDIO.includedTracks} BeatMind tracks and {STUDIO.includedCloud} cloud HQ separations a month and priority support.{" "}
            <Link href={signupHref(STUDIO.id, billingInterval)} className="font-medium transition-colors duration-150 hover:text-white" style={{ color: "var(--accent)" }}>
              Choose Studio &rarr;
            </Link>
          </div>

          {/* Also have BeatMind? */}
          <div className="mt-8 p-5 rounded-xl border text-sm" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)", color: "var(--text-secondary)" }}>
            Also a music producer?{" "}
            <Link href="/" className="font-medium transition-colors duration-150 hover:text-white" style={{ color: "var(--accent)" }}>
              Check out BeatMind →
            </Link>
            {" "}— our AI that builds drums, bass and melodies part by part inside your Ableton Live Set.
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-2xl mx-auto px-6 pb-20" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="text-3xl font-bold text-center mb-10">Frequently asked</h2>
          <div className="space-y-3">
            {MIXMIND_FAQS.map((faq, i) => (
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
            MixMind is {formatUsd(MIXMIND_PRICE.monthly)}/month, or included with BeatMind + MixMind and Studio. Sign in with your BeatMind account to download. Your Rekordbox library loads in seconds.
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
                <Link href="/guide" className="hover:text-white transition-colors duration-150">Guide</Link>
                <Link href="/blog" className="hover:text-white transition-colors duration-150">Blog</Link>
                <Link href="/privacy" className="hover:text-white transition-colors duration-150">Privacy</Link>
                <Link href="/terms" className="hover:text-white transition-colors duration-150">Terms</Link>
                <a href="mailto:support@beatmind.io" className="hover:text-white transition-colors duration-150">Support</a>
              </div>
            </nav>
          </div>
          <div className="mt-6">
            <SocialLinks />
          </div>
          <div className="mt-6 text-xs text-center" style={{ color: "var(--text-secondary)" }}>
            Made with <span className="heart-pulse" style={{ color: "var(--accent)" }} aria-label="love">♥</span> for DJs everywhere
          </div>
        </div>
      </footer>
    </div>
  );
}
