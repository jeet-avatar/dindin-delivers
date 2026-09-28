import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { MIXMIND_FAQS } from "@/lib/faqs";
import { BASE_URL, OG_IMAGE_MIXMIND, OG_IMAGE_SIZE, SITE_NAME } from "@/lib/site";
import { breadcrumbSchema, faqPageSchema, mixmindAppSchema } from "@/lib/structured-data";

const TITLE = "MixMind — AI DJ Library Manager for Rekordbox";

export const metadata: Metadata = {
  title: TITLE,
  description:
    "MixMind reads your Rekordbox collection and gives you a fast library browser, an AI playlist builder, a set builder and a one-click duplicate cleaner. Mac desktop app (Apple Silicon; Windows coming soon) from $12/month.",
  keywords: [
    "DJ library manager",
    "Rekordbox organizer",
    "AI playlist builder",
    "DJ duplicate finder",
    "Pioneer USB library",
    "Rekordbox AI",
    "MixMind",
    "DJ tools Mac",
  ],
  alternates: {
    canonical: `${BASE_URL}/mixmind`,
  },
  openGraph: {
    title: TITLE,
    description:
      "Browse your Rekordbox library, find duplicates, and build AI playlists and full sets from music you already own. Mac desktop app (Apple Silicon; Windows coming soon). $12/month, or bundled with BeatMind from $25/month.",
    url: `${BASE_URL}/mixmind`,
    siteName: SITE_NAME,
    type: "website",
    locale: "en_US",
    images: [{ url: OG_IMAGE_MIXMIND, ...OG_IMAGE_SIZE, alt: TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description:
      "Browse every track in your Rekordbox library, kill duplicates, and build AI playlists and sets. Mac (Apple Silicon); Windows coming soon. From $12/month.",
    images: [OG_IMAGE_MIXMIND],
  },
};

export default function MixMindLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={mixmindAppSchema()} />
      <JsonLd data={faqPageSchema(MIXMIND_FAQS)} />
      <JsonLd
        data={breadcrumbSchema([
          { name: "BeatMind", path: "/" },
          { name: "MixMind", path: "/mixmind" },
        ])}
      />
      {children}
    </>
  );
}
