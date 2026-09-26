import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "BeatMind privacy policy — how we collect, use, and protect your data. Zietra Technologies Inc.",
  alternates: {
    canonical: "https://www.beatmind.io/privacy",
  },
  openGraph: {
    title: "Privacy Policy | BeatMind",
    description: "How BeatMind collects, uses, and protects your personal data.",
    url: "https://www.beatmind.io/privacy",
    type: "website",
  },
  robots: {
    index: true,
    follow: false,
  },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
