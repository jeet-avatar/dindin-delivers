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
    a: "No — they're separate tools. BeatMind makes music inside Ableton Live. MixMind organizes your existing DJ library. Both are $19/month.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from your account with one click. No questions, no lock-in.",
  },
];
