import type { Metadata } from "next";
import Link from "next/link";
import { CHANGELOG } from "@/lib/changelog";
import { BASE_URL, OG_IMAGE, OG_IMAGE_SIZE, SITE_NAME } from "@/lib/site";
import { ORGANIZATION_REF, breadcrumbSchema } from "@/lib/structured-data";
import { JsonLd } from "@/components/JsonLd";

const TITLE = "Changelog — BeatMind Bridge release notes";
const DESCRIPTION = "What's new in BeatMind Bridge, version by version.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${BASE_URL}/changelog` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${BASE_URL}/changelog`,
    siteName: SITE_NAME,
    type: "website",
    locale: "en_US",
    images: [{ url: OG_IMAGE, ...OG_IMAGE_SIZE, alt: SITE_NAME }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function ChangelogPage() {
  return (
    <div className="min-h-screen px-4 py-12" style={{ background: "var(--bg-primary)" }}>
      <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Changelog", path: "/changelog" }])} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "BeatMind Bridge",
          applicationCategory: "MusicApplication",
          operatingSystem: "macOS",
          publisher: ORGANIZATION_REF,
          softwareVersion: CHANGELOG[0]?.version,
          releaseNotes: `${BASE_URL}/changelog`,
        }}
      />
      <div className="max-w-2xl mx-auto">
        <div className="mb-10">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-xl mb-6" aria-label="BeatMind home">
            <span
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black"
              style={{ background: "var(--accent)", color: "#fff" }}
              aria-hidden="true"
            >
              B
            </span>
            beatmind
          </Link>
          <h1 className="text-3xl font-bold">Changelog</h1>
          <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
            What&apos;s new in BeatMind Bridge, version by version. Bridge checks for updates automatically and
            installs them with one click — your open Ableton set is never touched.
          </p>
        </div>

        <div className="space-y-6">
          {CHANGELOG.map((entry) => (
            <div
              key={entry.version}
              className="rounded-2xl border p-6"
              style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
            >
              <div className="flex items-baseline justify-between gap-4 flex-wrap mb-3">
                <h2 className="text-lg font-bold">Version {entry.version}</h2>
                <time className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {entry.date}
                </time>
              </div>
              <ul className="space-y-2">
                {entry.notes.map((note, i) => (
                  <li key={i} className="text-sm flex gap-2" style={{ color: "var(--text-primary)" }}>
                    <span aria-hidden="true" style={{ color: "var(--accent)" }}>
                      &bull;
                    </span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="text-sm mt-10" style={{ color: "var(--text-secondary)" }}>
          Don&apos;t have Bridge yet?{" "}
          <Link href="/dashboard" className="font-medium underline" style={{ color: "var(--accent)" }}>
            Open your dashboard
          </Link>{" "}
          to get started, or{" "}
          <a href="mailto:support@beatmind.io" className="font-medium underline" style={{ color: "var(--accent)" }}>
            contact support
          </a>{" "}
          with questions.
        </p>
      </div>
    </div>
  );
}
