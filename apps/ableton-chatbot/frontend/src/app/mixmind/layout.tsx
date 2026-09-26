import type { Metadata } from "next";

const BASE_URL = "https://www.beatmind.io";

export const metadata: Metadata = {
  title: "MixMind — AI DJ Library Manager for Rekordbox",
  description:
    "MixMind reads your Rekordbox collection and gives you a fast library browser, an AI playlist builder, and a one-click duplicate cleaner. Mac + Windows desktop app.",
  keywords: [
    "DJ library manager",
    "Rekordbox organizer",
    "AI playlist builder",
    "DJ duplicate finder",
    "Pioneer USB library",
    "Rekordbox AI",
    "MixMind",
    "DJ tools Mac Windows",
  ],
  alternates: {
    canonical: `${BASE_URL}/mixmind`,
  },
  openGraph: {
    title: "MixMind — AI DJ Library Manager for Rekordbox",
    description:
      "Browse your Rekordbox library, find duplicates, and build AI playlists from music you already own. Mac + Windows desktop app. 7-day free trial.",
    url: `${BASE_URL}/mixmind`,
    siteName: "BeatMind",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og-mixmind.svg",
        width: 1200,
        height: 630,
        alt: "MixMind — AI DJ Library Manager for Rekordbox",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MixMind — AI DJ Library Manager for Rekordbox",
    description:
      "Browse every track in your Rekordbox library, kill duplicates, and build AI playlists. Mac + Windows. 7-day free trial.",
    images: ["/og-mixmind.svg"],
  },
};

const mixmindSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "MixMind",
  applicationCategory: "MusicApplication",
  operatingSystem: "macOS, Windows",
  url: `${BASE_URL}/mixmind`,
  description:
    "DJ library manager that reads your Rekordbox collection. Browse every track, find duplicates, and build AI playlists from music you already own.",
  offers: {
    "@type": "Offer",
    price: "19.00",
    priceCurrency: "USD",
    priceSpecification: {
      "@type": "UnitPriceSpecification",
      price: "19.00",
      priceCurrency: "USD",
      unitText: "MONTH",
    },
  },
  featureList: [
    "Full Rekordbox library browser",
    "AI playlist builder",
    "Duplicate track detection and cleanup",
    "Pioneer USB drive support",
    "Mac and Windows native app",
  ],
};

export default function MixMindLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(mixmindSchema) }}
      />
      {children}
    </>
  );
}
