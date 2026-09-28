// Single source of truth for the FAQ sections and their FAQPage JSON-LD.

export interface Faq {
  q: string;
  a: string;
}

export const BEATMIND_FAQS: Faq[] = [
  {
    q: "Do I need Ableton Live?",
    a: "Yes — BeatMind directly controls Ableton Live 11 or 12 (Standard or Suite). It’s the bridge between AI and your DAW.",
  },
  {
    q: "What genres does it support?",
    a: "Describe your style, mood and sources, including house, techno, minimal, drum and bass or ambient. Genre labels guide the plan rather than selecting a fixed template.",
  },
  {
    q: "Who owns the music I create?",
    a: "You do. 100%. Everything BeatMind generates in your Ableton project is yours to release, sell, or license.",
  },
  {
    q: "Does it work on Mac and Windows?",
    a: "Bridge downloads are available for macOS and Windows. Captured auditions and automatic Live Set file-menu actions currently require macOS; supported controls depend on Ableton and your installed devices.",
  },
  {
    q: "How much does BeatMind cost?",
    a: "Plans start at $19/month. Starter is $19/month ($190/year) with 10 tracks a month; Pro is $39/month ($390/year) with 30 tracks and 5 cloud HQ separations a month; Studio is $79/month ($790/year) with 80 tracks, 20 cloud HQ separations, MixMind early access and priority support. Every plan has a 7-day free trial with no credit card required.",
  },
  {
    q: "What counts as a track?",
    a: "A track is one stem separation of a reference track. High-quality separation runs on your own computer through the BeatMind Bridge, so each reference you split uses one track from your monthly allowance. The AI producer itself is included on every plan under fair use.",
  },
  {
    q: "What are cloud HQ separations?",
    a: "Cloud HQ separations run high-quality stem separation on our cloud GPU instead of your computer. They are for machines that can't run HQ separation locally. Pro includes 5 a month, Studio includes 20, and Cloud HQ packs are 10 for $7.99 or 50 for $34.99.",
  },
  {
    q: "Do unused tracks roll over?",
    a: "No. Your monthly allowance resets each month. Purchased packs never expire: track packs are 10 for $9, 25 for $19 or 60 for $39, and they are used after your monthly allowance. Packs need an active plan or trial.",
  },
  {
    q: "Can I switch plans?",
    a: "Yes. You can move between Starter, Pro and Studio anytime from your billing settings.",
  },
  {
    q: "Is there an annual discount?",
    a: "Yes. Annual billing gives you 2 months free: $190/year for Starter, $390/year for Pro and $790/year for Studio. The first 100 annual subscribers also get 40% off for life with code FOUNDING100 (annual plans only).",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from your dashboard with one click. No questions, no lock-in.",
  },
];

export const MIXMIND_FAQS: Faq[] = [
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
    a: "No — they're separate tools. BeatMind makes music inside Ableton Live. MixMind organizes your existing DJ library. MixMind is in early access and included with BeatMind Studio ($79/month); standalone MixMind at $12/month is coming soon.",
  },
  {
    q: "How much does MixMind cost?",
    a: "Today MixMind is available as early access inside BeatMind Studio ($79/month or $790/year, 7-day free trial, no credit card required). Standalone MixMind at $12/month ($120/year) and BeatMind + MixMind combos from $25/month are coming soon. Email support@beatmind.io to get notified.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from your account with one click. No questions, no lock-in.",
  },
];
