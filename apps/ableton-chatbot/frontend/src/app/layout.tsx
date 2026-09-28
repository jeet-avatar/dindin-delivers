import type { Metadata, Viewport } from "next";
import { BASE_URL, HOME_DESCRIPTION, HOME_TITLE, OG_IMAGE, OG_IMAGE_SIZE, SITE_NAME } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "AI music producer",
    "AI for Ableton Live",
    "Ableton AI assistant",
    "AI music production",
    "AbletonOSC",
    "AI drum and bass generator for Ableton",
    "BeatMind",
  ],
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    url: `${BASE_URL}/`,
    siteName: SITE_NAME,
    type: "website",
    locale: "en_US",
    images: [{ url: OG_IMAGE, ...OG_IMAGE_SIZE, alt: HOME_TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: [OG_IMAGE],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
