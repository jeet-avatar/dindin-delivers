import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.beatmind.io"),
  title: "BeatMind — AI Music Producer for Ableton",
  description: "Describe what you want. BeatMind builds full tracks — drums, bass, pads, effects, mix — directly inside your Ableton Live project.",
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "BeatMind — AI Music Producer for Ableton",
    description: "Describe what you want. BeatMind builds full tracks — drums, bass, pads, effects, mix — directly inside your Ableton Live project.",
    url: "https://www.beatmind.io",
    siteName: "BeatMind",
    type: "website",
    locale: "en_US",
    // TODO: add og-image.png
  },
  twitter: {
    card: "summary",
    title: "BeatMind — AI Music Producer for Ableton",
    description: "Describe what you want. BeatMind builds full tracks — drums, bass, pads, effects, mix — directly inside your Ableton Live project.",
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
