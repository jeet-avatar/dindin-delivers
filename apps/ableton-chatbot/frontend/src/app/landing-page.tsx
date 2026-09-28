"use client";

import Link from "next/link";
import { Showcase } from "@/components/Showcase";
import { SocialLinks } from "@/components/SocialLinks";
import { useEffect, useState } from "react";
import { BoltIcon, SlidersIcon, SparklesIcon, RefreshIcon, CheckIcon } from "@/components/Icons";
import { isLoggedIn } from "@/lib/auth";
import { BEATMIND_FAQS } from "@/lib/faqs";
import {
  ANNUAL_DISCOUNT_LABEL,
  CLOUD_HQ_PACKS,
  FOUNDING_CODE,
  FOUNDING_DISCOUNT_PERCENT,
  FOUNDING_SEATS,
  LOWEST_MONTHLY_USD,
  MIXMIND_COMBO_FROM_MONTHLY,
  MIXMIND_PRICE,
  PACK_TERMS,
  PLANS,
  TRACK_DEFINITION,
  TRACK_PACKS,
  type BillingInterval,
  type Pack,
  ctaHref,
  formatUsd,
} from "@/lib/pricing";
import { TRIAL_DETAILS, TRIAL_SHORT, TRIAL_TERMS } from "@/lib/site";

const FEATURES = [
  {
    Icon: BoltIcon,
    title: "Build one part at a time",
    desc: "Start with a kick, bassline or melody. Hear a captured audition of each part before you decide what comes next.",
  },
  {
    Icon: SlidersIcon,
    title: "Works in your own Live Set",
    desc: "BeatMind loads your installed sounds, writes real MIDI clips and adjusts supported device controls, so everything stays editable in Ableton.",
  },
  {
    Icon: SparklesIcon,
    title: "Thinks like a producer",
    desc: "Genre, tempo, key and mood shape every decision, from groove and sound choice to effects and levels.",
  },
  {
    Icon: RefreshIcon,
    title: "Refine in plain English",
    desc: "Ask for a warmer bass, a busier hi-hat or a quieter pad. Keep what you like and change the rest.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Connect",
    desc: "Install BeatMind Bridge, sign in and connect AbletonOSC in Live. Grant audio permission for captured auditions on supported Macs.",
  },
  {
    n: "02",
    title: "Describe",
    desc: "Tell BeatMind what you want to create. Genre, mood, tempo, instruments \u2014 in plain English.",
  },
  {
    n: "03",
    title: "Create",
    desc: "Watch clips appear in Ableton, one part at a time. When you like the idea, take over and arrange it your way.",
  },
];

function packList(packs: Pack[]): string {
  return packs.map((pack) => `${pack.quantity} for ${formatUsd(pack.price)}`).join(" · ");
}


export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("month");
  // Computed after mount (not during the static export) so a signed-in visitor's pricing clicks go
  // straight to the dashboard's plan picker instead of a redundant, failing /signup.
  const [loggedIn, setLoggedIn] = useState(false);
  useEffect(() => { setLoggedIn(isLoggedIn()); }, []);

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
          <Link href="/guide" className="hover:text-white transition-colors duration-150">Guide</Link>
          <Link href="/blog" className="hover:text-white transition-colors duration-150">Blog</Link>
          <Link href="/mixmind" className="hover:text-white transition-colors duration-150" style={{ color: "var(--accent)" }}>MixMind ↗</Link>
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
            ✦ Works inside Ableton Live 11 &amp; 12 · Mac (Apple Silicon)
          </div>
          <h1 className="text-5xl md:text-7xl font-black leading-tight mb-6 tracking-tight">
            The AI that builds music<br />
            <span style={{ color: "var(--accent)" }}>inside Ableton.</span>
          </h1>
          <p className="text-lg md:text-xl mb-10 max-w-2xl mx-auto" style={{ color: "var(--text-secondary)", lineHeight: "1.6" }}>
            Describe a sound in plain English. BeatMind builds drums, bass and melodies as real clips in your own Live Set, one part at a time, and lets you hear each idea before you keep it.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup" className="px-8 py-4 rounded-xl font-semibold text-lg transition-opacity duration-150 hover:opacity-90" style={{ background: "var(--accent)", color: "#fff" }}>
              Try it free for 7 days
            </Link>
            <a href="#how" className="px-8 py-4 rounded-xl font-semibold text-lg transition-colors duration-150 border hover:border-white" style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}>
              See how it works
            </a>
          </div>
          <p className="text-xs mt-4" style={{ color: "var(--text-secondary)" }}>{TRIAL_SHORT} · Only pay if you choose a plan</p>

          {/* Product preview terminal */}
          <div className="mt-16 rounded-2xl border text-left overflow-hidden" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }} role="img" aria-label="Illustrative BeatMind conversation planning a first kick">
            <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "var(--border)" }} aria-hidden="true">
              <div className="w-3 h-3 rounded-full" style={{ background: "#ff5f57" }} />
              <div className="w-3 h-3 rounded-full" style={{ background: "#febc2e" }} />
              <div className="w-3 h-3 rounded-full" style={{ background: "#28c840" }} />
              <span className="ml-2 text-xs" style={{ color: "var(--text-secondary)" }}>beatmind — AI Music Producer</span>
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
                  Let&apos;s start with the kick at 126 BPM and keep Am for the tonal parts.<br /><br />
                  I&apos;ll inspect the current set and available sources before making changes.<br /><br />
                  Do you have a sample pack in mind, or should I suggest an installed sound?
                  <div className="mt-3 pt-3 border-t text-xs" style={{ borderColor: "var(--border)", color: "var(--accent)" }}>
                    Example conversation
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* What is BeatMind? — concise definition for search and answer engines */}
        <section className="max-w-3xl mx-auto px-6 pb-4" aria-labelledby="what-is-heading">
          <div className="border-l-2 pl-5 py-1" style={{ borderColor: "var(--accent)" }}>
            <h2 id="what-is-heading" className="text-base font-semibold mb-2" style={{ color: "var(--text-primary)" }}>What is BeatMind?</h2>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              BeatMind is an AI music-production assistant that works inside Ableton Live 11 and 12. Through the local BeatMind Bridge and AbletonOSC, it builds drums, bass and melodies one part at a time as Session-view clips and scenes in your own Live Set, with a captured audition to review before the next part. You keep control of the arrangement. Plans start at {formatUsd(LOWEST_MONTHLY_USD)}/month, and you can try it first with a 7-day free trial that includes 3 tracks and needs no credit card.
            </p>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="max-w-6xl mx-auto px-6 py-20" aria-labelledby="features-heading">
          <h2 id="features-heading" className="text-3xl md:text-4xl font-bold text-center mb-4">
            From idea to groove, without leaving Ableton
          </h2>
          <p className="text-center mb-14" style={{ color: "var(--text-secondary)" }}>
            BeatMind works in Session View, so you get editable clips and scenes to build on, and the final arrangement stays yours.
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
              Connect your Live Set, agree on a sound and develop it together.
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
              <Link href="/guide" className="font-medium transition-colors duration-150 hover:text-white" style={{ color: "var(--accent)" }}>
                New to BeatMind? Read the 5-minute guide &rarr;
              </Link>
            </p>
          </div>
        </section>

        <Showcase product="beatmind" />

        {/* Pricing */}
        <section id="pricing" className="max-w-6xl mx-auto px-6 py-20 text-center" aria-labelledby="pricing-heading">
          <h2 id="pricing-heading" className="text-3xl md:text-4xl font-bold mb-4">Pricing</h2>
          <p className="mb-8 max-w-2xl mx-auto" style={{ color: "var(--text-secondary)" }}>
            Every plan includes the AI producer inside Ableton Live. Pick how many reference tracks you separate each month.
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

          <p className="text-xs mb-10" style={{ color: "var(--text-secondary)" }}>{TRIAL_SHORT}</p>

          {/* Founding Member banner */}
          <div className="rounded-2xl border p-5 mb-10 text-sm text-left md:text-center" style={{ background: "var(--bg-secondary)", borderColor: "var(--accent)" }}>
            <span className="font-semibold" style={{ color: "var(--accent)" }}>Founding Member offer: </span>
            the first {FOUNDING_SEATS} annual subscribers who use code{" "}
            <code className="px-2 py-0.5 rounded font-mono font-semibold" style={{ background: "var(--bg-tertiary)", color: "var(--text-primary)" }}>{FOUNDING_CODE}</code>{" "}
            get {FOUNDING_DISCOUNT_PERCENT}% off for as long as their subscription stays active.{" "}
            <span style={{ color: "var(--text-secondary)" }}>Annual plans only.</span>
          </div>

          {/* Tier cards */}
          <div className="grid gap-6 md:grid-cols-3 text-left">
            {PLANS.map((plan) => {
              const price = billingInterval === "month" ? plan.monthly : plan.yearly;
              const unit = billingInterval === "month" ? "month" : "year";
              return (
                <div
                  key={plan.id}
                  className="rounded-2xl border p-8 relative overflow-hidden flex flex-col"
                  style={{ background: "var(--bg-secondary)", borderColor: plan.highlight ? "var(--accent)" : "var(--border)" }}
                >
                  {plan.highlight && (
                    <div className="absolute top-0 right-0 text-xs font-semibold px-3 py-1 rounded-bl-xl" style={{ background: "var(--accent)", color: "#fff" }}>
                      MOST POPULAR
                    </div>
                  )}
                  <h3 className="text-xl font-semibold mb-4">{plan.name}</h3>
                  <div className="text-5xl font-black mb-2" aria-label={`${price} dollars per ${unit}`}>{formatUsd(price)}</div>
                  <div className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>
                    per {unit}
                    {billingInterval === "year" ? ` · ${ANNUAL_DISCOUNT_LABEL}` : " · cancel anytime"}
                  </div>
                  <ul className="text-sm space-y-3 mb-8 flex-1">
                    {plan.features.map((feature) => feature.endsWith(":") ? (
                      <li key={feature} className="font-medium" style={{ color: "var(--text-secondary)" }}>{feature}</li>
                    ) : (
                      <li key={feature} className="flex items-start gap-2">
                        <span className="mt-0.5 flex-shrink-0"><CheckIcon size={16} color="var(--accent)" /></span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={ctaHref(plan.id, billingInterval, loggedIn)}
                    className={plan.highlight
                      ? "block w-full py-4 rounded-xl font-semibold text-lg text-center transition-opacity duration-150 hover:opacity-90"
                      : "block w-full py-4 rounded-xl font-semibold text-lg text-center transition-colors duration-150 border hover:border-white"}
                    style={plan.highlight ? { background: "var(--accent)", color: "#fff" } : { borderColor: "var(--border)", color: "var(--text-primary)" }}
                  >
                    {loggedIn ? `Choose ${plan.name} →` : "Start free trial →"}
                  </Link>
                  <p className="text-xs mt-3 text-center" style={{ color: "var(--text-secondary)" }}>No card for the trial · only charged if you choose this plan</p>
                </div>
              );
            })}
          </div>

          <p className="text-xs mt-6 max-w-2xl mx-auto" style={{ color: "var(--text-secondary)" }}>{TRACK_DEFINITION}</p>
          <p className="text-xs mt-2 max-w-2xl mx-auto" style={{ color: "var(--text-secondary)" }}>{TRIAL_DETAILS}</p>

          {/* Packs */}
          <div className="mt-10 rounded-2xl border p-6 text-left" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
            <h3 className="text-lg font-semibold mb-4">Need more? Track packs &amp; Cloud HQ packs</h3>
            <div className="grid gap-4 md:grid-cols-2 text-sm">
              <div>
                <div className="font-medium mb-1">Track packs</div>
                <div style={{ color: "var(--text-secondary)" }}>{packList(TRACK_PACKS)}</div>
              </div>
              <div>
                <div className="font-medium mb-1">Cloud HQ packs</div>
                <div style={{ color: "var(--text-secondary)" }}>{packList(CLOUD_HQ_PACKS)}</div>
              </div>
            </div>
            <p className="text-xs mt-4" style={{ color: "var(--text-secondary)" }}>{PACK_TERMS}</p>
          </div>

          {/* MixMind for DJs */}
          <div className="mt-6 p-5 rounded-xl border text-sm text-left" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)", color: "var(--text-secondary)" }}>
            <span className="font-semibold" style={{ color: "var(--text-primary)" }}>MixMind for DJs: </span>
            {formatUsd(MIXMIND_PRICE.monthly)}/month, or save with BeatMind + MixMind from {formatUsd(MIXMIND_COMBO_FROM_MONTHLY)}/month. Studio includes MixMind.{" "}
            <Link href="/mixmind#pricing" className="font-medium transition-colors duration-150 hover:text-white" style={{ color: "var(--accent)" }}>
              MixMind pricing &rarr;
            </Link>{" "}
            <Link href="/mixmind" className="font-medium transition-colors duration-150 hover:text-white" style={{ color: "var(--accent)" }}>
              About MixMind &rarr;
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-2xl mx-auto px-6 pb-20" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="text-3xl font-bold text-center mb-10">Frequently asked</h2>
          <div className="space-y-3">
            {BEATMIND_FAQS.map((faq, i) => (
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

        {/* Our Products */}
        <section className="border-t py-20" style={{ borderColor: "var(--border)" }} aria-labelledby="products-heading">
          <div className="max-w-4xl mx-auto px-6">
            <h2 id="products-heading" className="text-3xl font-bold text-center mb-4">Two tools. One workflow.</h2>
            <p className="text-center mb-12" style={{ color: "var(--text-secondary)" }}>
              Built for working musicians and DJs.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              {/* BeatMind */}
              <div className="p-6 rounded-2xl border relative" style={{ background: "var(--bg-secondary)", borderColor: "var(--accent)" }}>
                <div className="absolute top-0 right-0 text-xs font-semibold px-3 py-1 rounded-bl-xl" style={{ background: "var(--accent)", color: "#fff" }}>
                  YOU'RE HERE
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 text-lg font-black" style={{ background: "var(--accent)", color: "#fff" }}>B</div>
                <h3 className="text-xl font-semibold mb-2">BeatMind</h3>
                <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--text-secondary)" }}>
                  Develop drums, bass and melodies inside your Ableton Live project, with captured auditions and one part to review at a time.
                </p>
                <div className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>Web app + bridge agent · Requires Ableton Live 11 or 12</div>
                <div className="text-sm font-semibold mb-5">From {formatUsd(LOWEST_MONTHLY_USD)}/mo</div>
                <Link href="/signup" className="block w-full py-3 rounded-xl font-semibold text-sm text-center transition-opacity duration-150 hover:opacity-90" style={{ background: "var(--accent)", color: "#fff" }}>
                  Start free trial →
                </Link>
              </div>

              {/* MixMind */}
              <div className="p-6 rounded-2xl border" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 text-lg font-black" style={{ background: "var(--bg-tertiary)", color: "var(--accent)" }}>M</div>
                <h3 className="text-xl font-semibold mb-2">MixMind</h3>
                <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--text-secondary)" }}>
                  DJ library manager that reads your Rekordbox collection. Browse every track, find duplicates, and build AI playlists and full sets from music you already own.
                </p>
                <div className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>Desktop app · Mac (Apple Silicon) · Requires Rekordbox 6 or 7</div>
                <div className="text-sm font-semibold mb-5">{formatUsd(MIXMIND_PRICE.monthly)}/mo · or included in Studio</div>
                <Link href="/mixmind" className="block w-full py-3 rounded-xl font-semibold text-sm text-center transition-colors duration-150 border hover:border-white" style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}>
                  See MixMind →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t px-6 py-20 text-center" style={{ borderColor: "var(--border)" }}>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Your next track starts with one sentence.</h2>
          <p className="mb-8" style={{ color: "var(--text-secondary)" }}>
            {TRIAL_TERMS} You only pay if you choose a plan.
          </p>
          <Link href="/signup" className="inline-block px-10 py-4 rounded-xl font-semibold text-lg transition-opacity duration-150 hover:opacity-90" style={{ background: "var(--accent)", color: "#fff" }}>
            Get started free &rarr;
          </Link>
          <p className="text-sm mt-6">
            <Link href="/guide" className="font-medium transition-colors duration-150 hover:text-white" style={{ color: "var(--accent)" }}>
              New to BeatMind? Read the 5-minute guide &rarr;
            </Link>
          </p>
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
            Made with <span className="heart-pulse" style={{ color: "var(--accent)" }} aria-label="love">♥</span> for producers everywhere
          </div>
        </div>
      </footer>
    </div>
  );
}
