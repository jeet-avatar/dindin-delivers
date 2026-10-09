import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "BeatMind terms of service — your rights and responsibilities when using BeatMind and MixMind. Zietra Technologies Inc.",
  alternates: {
    canonical: "https://www.beatmind.io/terms",
  },
  openGraph: {
    title: "Terms of Service | BeatMind",
    description: "Terms and conditions for using BeatMind and MixMind services.",
    url: "https://www.beatmind.io/terms",
    type: "website",
  },
  robots: {
    index: true,
    follow: false,
  },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
