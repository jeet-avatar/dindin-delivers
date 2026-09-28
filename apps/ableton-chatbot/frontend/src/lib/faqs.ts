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
    a: "Plans start at $19/month. Starter is $19/month ($190/year) with 10 tracks a month; Pro is $39/month ($390/year) with 30 tracks and 5 cloud HQ separations a month; Studio is $79/month ($790/year) with 80 tracks, 20 cloud HQ separations, MixMind and priority support. DJs can also get MixMind for $12/month, or bundle it: Starter + MixMind is $25/month and Pro + MixMind is $45/month. You can start with a 7-day free trial that includes 3 tracks and needs no credit card.",
  },
  {
    q: "What's included in the free trial?",
    a: "The 7-day free trial needs no credit card and includes 3 tracks (processed on your own computer) and limited AI (about 50 messages). It covers BeatMind only: MixMind isn't part of the trial. Cloud HQ separations and packs need a paid plan. If you start a plan during the trial, the trial ends and your plan begins immediately.",
  },
  {
    q: "Will I be charged after the trial?",
    a: "No. We never take a card for the trial; you only pay if you choose a plan.",
  },
  {
    q: "What counts as a track?",
    a: "A track is one stem separation of a reference track. High-quality separation runs on your own computer through the BeatMind Bridge, so each reference you split uses one track from your monthly allowance. The AI producer itself is included on every plan under fair use.",
  },
  {
    q: "What are cloud HQ separations?",
    a: "Cloud HQ separations run high-quality stem separation on our cloud GPU instead of your computer. They are for machines that can't run HQ separation locally and need a paid plan (they aren't part of the free trial). Pro includes 5 a month, Studio includes 20, and Cloud HQ packs are 10 for $7.99 or 50 for $34.99.",
  },
  {
    q: "Do unused tracks roll over?",
    a: "No. Your monthly allowance resets each month. Purchased packs never expire: track packs are 10 for $9, 25 for $19 or 60 for $39, and they are used after your monthly allowance. Packs need a paid plan.",
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
    a: "Yes. Go to Dashboard → Billing → Cancel subscription. Your access continues until the end of the period you've paid for, and you won't be charged again.",
  },
];

export const MIXMIND_FAQS: Faq[] = [
  {
    q: "Do I need a separate account for MixMind?",
    a: "No. BeatMind and MixMind use one login: sign in to the MixMind app with the same email and password you use on beatmind.io. One account and one subscription cover BeatMind, the Bridge and MixMind, with a single billing page.",
  },
  {
    q: "Do I need Rekordbox?",
    a: "Yes — MixMind reads your Rekordbox library (XML or database). It works with Rekordbox 6 and 7. You don't need Rekordbox open while using MixMind.",
  },
  {
    q: "Does it modify my Rekordbox library?",
    a: "Browsing and duplicate cleanup are read-only: duplicate cleanup marks tracks as hidden inside MixMind and does not delete or modify your Rekordbox files. The only time MixMind writes to Rekordbox is when you choose to add a built set as a playlist, and it backs up your library first.",
  },
  {
    q: "Mac or Windows?",
    a: "Both. The Mac DMG runs natively on Apple Silicon (M1/M2/M3/M4). Intel Macs need Rosetta 2 — if you don't have it, macOS will prompt you to install it free. The EXE installer works on Windows 10/11.",
  },
  {
    q: "Is this the same as BeatMind?",
    a: "No — they're separate tools. BeatMind makes music inside Ableton Live. MixMind organizes your existing DJ library and builds sets from it. Both are made by the same team and use the same BeatMind account.",
  },
  {
    q: "How much does MixMind cost?",
    a: "MixMind is $12/month or $120/year (2 months free). You can also bundle it with BeatMind: Starter + MixMind is $25/month ($250/year) and Pro + MixMind is $45/month ($450/year), each saving $6/month compared with buying them separately. MixMind is also included in BeatMind Studio ($79/month or $790/year). Cancel anytime.",
  },
  {
    q: "Is MixMind included in the free trial?",
    a: "No. The 7-day free trial (3 tracks, no card) is for BeatMind. To use MixMind you need a MixMind, BeatMind + MixMind (Starter or Pro) or Studio plan.",
  },
  {
    q: "Can I get BeatMind and MixMind together?",
    a: "Yes. Starter + MixMind is $25/month ($250/year) and Pro + MixMind is $45/month ($450/year), each $6/month less than buying the two separately. BeatMind Studio ($79/month or $790/year) also includes MixMind, along with 80 tracks, 20 cloud HQ separations a month and priority support.",
  },
  {
    q: "What does the Set Builder do?",
    a: "The Intelligent Set Builder sequences a set from your own library. Choose a warm-up, peak-time or closing shape, set a BPM range and skip tracks you played recently; MixMind orders the tracks for smooth key flow and can add the finished set to Rekordbox as a playlist. Rekordbox must be closed while MixMind writes the playlist, and it backs up your library first.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Go to Dashboard → Billing → Cancel subscription. Your access continues until the end of the period you've paid for, and you won't be charged again.",
  },
];
