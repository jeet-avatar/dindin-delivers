import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { LiteYouTube } from "@/components/LiteYouTube";
import {
  BEATMIND_REQUIREMENTS,
  BEATMIND_STEPS,
  BEATMIND_TROUBLESHOOTING,
  EXAMPLE_PROMPTS,
  type GuideStep,
  LIMITS,
  MIXMIND_AVAILABILITY,
  MIXMIND_REQUIREMENTS,
  MIXMIND_STEPS,
  MIXMIND_TROUBLESHOOTING,
  REFERENCE_STEPS,
  TIPS,
} from "@/lib/guide";
import type { Faq } from "@/lib/faqs";
import { BASE_URL, OG_IMAGE, OG_IMAGE_SIZE, SITE_NAME, TRIAL_TERMS } from "@/lib/site";
import { breadcrumbSchema, faqPageSchema, howToSchema } from "@/lib/structured-data";
import { TUTORIALS, type Tutorial, isValidYouTubeId } from "@/lib/tutorials";
import { BlogFooter, BlogNav } from "../blog/blog-chrome";

const PATH = "/guide";
const TITLE = "How to Use BeatMind & MixMind — Quick-Start Guide";
const DESCRIPTION =
  "Set up BeatMind in Ableton Live: install BeatMind Bridge, enable AbletonOSC, write your first prompt and review each part. Plus MixMind for Rekordbox: duplicates, AI playlists and the Set Builder.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${BASE_URL}${PATH}` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${BASE_URL}${PATH}`,
    siteName: SITE_NAME,
    type: "article",
    locale: "en_US",
    images: [{ url: OG_IMAGE, ...OG_IMAGE_SIZE, alt: TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
};

const TOC = [
  { href: "#beatmind", label: "BeatMind quick start" },
  { href: "#example-prompts", label: "Example prompts" },
  { href: "#tips", label: "Tips for better results" },
  { href: "#references", label: "Reference tracks & stems" },
  { href: "#limits", label: "What BeatMind can't do (yet)" },
  { href: "#troubleshooting", label: "Troubleshooting" },
  { href: "#mixmind", label: "MixMind quick start" },
  { href: "#videos", label: "Video tutorials" },
];

function prefixed(product: string, steps: GuideStep[]): GuideStep[] {
  return steps.map((step) => ({ ...step, id: `${product}-${step.id}` }));
}

const BEATMIND = prefixed("beatmind", BEATMIND_STEPS);
const MIXMIND = prefixed("mixmind", MIXMIND_STEPS);

const CARD = { background: "var(--bg-secondary)", borderColor: "var(--border)" };
const MUTED = { color: "var(--text-secondary)" };

function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return <h2 id={id} className="text-2xl md:text-3xl font-bold mb-4 scroll-mt-8">{children}</h2>;
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 text-sm leading-relaxed" style={MUTED}>
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <span aria-hidden="true" style={{ color: "var(--accent)" }}>&bull;</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Requirements({ items }: { items: string[] }) {
  return (
    <div className="p-6 rounded-2xl border mb-8" style={CARD}>
      <h3 className="text-lg font-semibold mb-3">Requirements</h3>
      <BulletList items={items} />
    </div>
  );
}

function Steps({ steps, label }: { steps: GuideStep[]; label: string }) {
  return (
    <ol className="space-y-4" aria-label={label}>
      {steps.map((step, index) => (
        <li key={step.id} id={step.id} className="p-6 rounded-2xl border flex gap-5 scroll-mt-8" style={CARD}>
          <div className="text-3xl font-black flex-shrink-0 w-10" style={{ color: "var(--accent)", opacity: 0.5 }} aria-hidden="true">
            {index + 1}
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold mb-2">{step.name}</h3>
            <p className="text-sm leading-relaxed" style={MUTED}>{step.text}</p>
            {step.details && (
              <ul className="mt-3 space-y-1.5 text-sm leading-relaxed" style={MUTED}>
                {step.details.map((detail) => (
                  <li key={detail} className="flex gap-3">
                    <span aria-hidden="true" style={{ color: "var(--accent)" }}>&rsaquo;</span>
                    <span className="break-words">{detail}</span>
                  </li>
                ))}
              </ul>
            )}
            {step.link && (
              <a
                href={step.link.href}
                {...(step.link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="inline-block mt-4 px-4 py-2 rounded-lg text-sm font-medium transition-opacity duration-150 hover:opacity-90"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                {step.link.label} &rarr;
              </a>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

function QuestionList({ faqs }: { faqs: Faq[] }) {
  return (
    <div className="space-y-3">
      {faqs.map((faq) => (
        <details key={faq.q} className="rounded-xl border overflow-hidden group" style={{ borderColor: "var(--border)" }}>
          <summary className="px-5 py-4 text-sm font-medium flex items-center justify-between gap-4 list-none" style={{ background: "var(--bg-secondary)" }}>
            {faq.q}
            <span aria-hidden="true" className="group-open:rotate-45 transition-transform duration-150" style={{ color: "var(--accent)" }}>+</span>
          </summary>
          <div className="px-5 py-4 text-sm leading-relaxed" style={{ ...MUTED, background: "var(--bg-tertiary)" }}>{faq.a}</div>
        </details>
      ))}
    </div>
  );
}

function TutorialCard({ tutorial }: { tutorial: Tutorial }) {
  const hasVideo = isValidYouTubeId(tutorial.youtubeId);
  return (
    <li className="rounded-2xl border overflow-hidden flex flex-col" style={CARD}>
      <div className="relative aspect-video" style={{ background: "var(--bg-tertiary)" }}>
        {hasVideo ? (
          <LiteYouTube videoId={tutorial.youtubeId as string} title={tutorial.title} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="px-3 py-1 rounded-full text-xs font-medium border" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
              Coming soon
            </span>
          </div>
        )}
      </div>
      <div className="p-5 flex-1">
        <div className="flex items-center gap-2 text-xs mb-2" style={MUTED}>
          <span style={{ color: "var(--accent)" }}>{tutorial.product === "mixmind" ? "MixMind" : "BeatMind"}</span>
          {hasVideo && tutorial.duration && (
            <>
              <span aria-hidden="true">&middot;</span>
              <span>{tutorial.duration}</span>
            </>
          )}
        </div>
        <h3 className="text-base font-semibold mb-2">{tutorial.title}</h3>
        <p className="text-sm leading-relaxed" style={MUTED}>{tutorial.description}</p>
      </div>
    </li>
  );
}

export default function GuidePage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <JsonLd
        data={howToSchema({
          name: "How to set up BeatMind in Ableton Live",
          description: "Install BeatMind Bridge, enable AbletonOSC in Live, write a prompt and build a loop one reviewed part at a time.",
          path: PATH,
          steps: BEATMIND,
          supply: ["Ableton Live 11 or 12", "A BeatMind account"],
          tool: ["BeatMind Bridge", "AbletonOSC"],
        })}
      />
      <JsonLd
        data={howToSchema({
          name: "How to build a DJ set from your Rekordbox library with MixMind",
          description: "Sign in to MixMind with your BeatMind account, clean duplicates, build AI playlists and add a Set Builder set to Rekordbox.",
          path: PATH,
          steps: MIXMIND,
          supply: ["Rekordbox 6 or 7 library", "A BeatMind account with MixMind"],
          tool: ["MixMind"],
        })}
      />
      <JsonLd data={faqPageSchema([...BEATMIND_TROUBLESHOOTING, ...MIXMIND_TROUBLESHOOTING])} />
      <JsonLd
        data={breadcrumbSchema([
          { name: "BeatMind", path: "/" },
          { name: "Guide", path: PATH },
        ])}
      />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-medium"
        style={{ background: "var(--accent)", color: "#fff" }}>
        Skip to main content
      </a>
      <BlogNav />

      <main id="main" className="max-w-3xl mx-auto px-6 pt-20 pb-24">
        <h1 className="text-4xl md:text-5xl font-black leading-tight mb-4 tracking-tight">
          How to use <span style={{ color: "var(--accent)" }}>BeatMind</span> &amp; MixMind
        </h1>
        <p className="text-lg mb-10" style={{ ...MUTED, lineHeight: "1.6" }}>
          Get from install to your first reviewed loop in Ableton Live in about five minutes, then learn how MixMind turns your Rekordbox library into playlists and full sets.
        </p>

        <nav aria-label="On this page" className="p-6 rounded-2xl border mb-16" style={CARD}>
          <h2 className="text-sm font-semibold mb-3">On this page</h2>
          <ul className="grid sm:grid-cols-2 gap-2 text-sm">
            {TOC.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="transition-colors duration-150 hover:text-white" style={{ color: "var(--accent)" }}>{item.label}</a>
              </li>
            ))}
          </ul>
        </nav>

        {/* BeatMind */}
        <section className="mb-16" aria-labelledby="beatmind">
          <SectionHeading id="beatmind">BeatMind quick start</SectionHeading>
          <p className="text-sm leading-relaxed mb-6" style={MUTED}>
            BeatMind builds drums, bass and melodies as real clips in your own Live Set, one part at a time. The web app does the thinking; BeatMind Bridge on your computer passes its instructions to Live through AbletonOSC.
          </p>
          <Requirements items={BEATMIND_REQUIREMENTS} />
          <Steps steps={BEATMIND} label="BeatMind setup steps" />
        </section>

        <section className="mb-16" aria-labelledby="example-prompts">
          <SectionHeading id="example-prompts">Example prompts</SectionHeading>
          <p className="text-sm mb-6" style={MUTED}>Copy one into music chat as a starting point, then refine from what you hear.</p>
          <ul className="grid sm:grid-cols-2 gap-4">
            {EXAMPLE_PROMPTS.map((example) => (
              <li key={example.prompt} className="p-5 rounded-2xl border" style={CARD}>
                <div className="text-xs font-medium mb-2" style={{ color: "var(--accent)" }}>{example.genre}</div>
                <p className="text-sm leading-relaxed">&ldquo;{example.prompt}&rdquo;</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-16" aria-labelledby="tips">
          <SectionHeading id="tips">Tips for better results</SectionHeading>
          <BulletList items={TIPS} />
          <p className="text-sm mt-4" style={MUTED}>
            More on prompting in{" "}
            <Link href="/blog/prompt-to-arrangement-ai-music-production" className="underline underline-offset-4 hover:text-white">From text prompt to arrangement</Link>.
          </p>
        </section>

        <section className="mb-16" aria-labelledby="references">
          <SectionHeading id="references">Reference tracks &amp; stems</SectionHeading>
          <p className="text-sm leading-relaxed mb-4" style={MUTED}>
            Use a track you love as a guide. BeatMind separates it into stems, helps you map its sections and turns your choices into a plan. The parts you then build in chat are your own, original ones.
          </p>
          <ol className="space-y-2 text-sm leading-relaxed list-decimal pl-5" style={MUTED}>
            {REFERENCE_STEPS.map((step) => <li key={step}>{step}</li>)}
          </ol>
        </section>

        <section className="mb-16" aria-labelledby="limits">
          <SectionHeading id="limits">What BeatMind can&apos;t do (yet)</SectionHeading>
          <BulletList items={LIMITS} />
        </section>

        <section className="mb-20" aria-labelledby="troubleshooting">
          <SectionHeading id="troubleshooting">Troubleshooting</SectionHeading>
          <QuestionList faqs={BEATMIND_TROUBLESHOOTING} />
          <p className="text-sm mt-4" style={MUTED}>
            Still stuck? Email <a href="mailto:support@beatmind.io" className="underline underline-offset-4 hover:text-white">support@beatmind.io</a>.
          </p>
        </section>

        {/* MixMind */}
        <section className="mb-20 pt-16 border-t" style={{ borderColor: "var(--border)" }} aria-labelledby="mixmind">
          <SectionHeading id="mixmind">MixMind quick start</SectionHeading>
          <p className="text-sm leading-relaxed mb-6" style={MUTED}>
            MixMind is a desktop DJ library manager for Rekordbox. It finds duplicates, builds AI playlists from tracks you own and sequences full sets you can add to Rekordbox.
          </p>
          <div className="p-5 rounded-2xl border text-sm mb-8" style={{ background: "var(--bg-secondary)", borderColor: "var(--accent)" }}>
            <span className="font-semibold" style={{ color: "var(--accent)" }}>Availability: </span>
            <span style={MUTED}>{MIXMIND_AVAILABILITY}</span>
          </div>
          <Requirements items={MIXMIND_REQUIREMENTS} />
          <Steps steps={MIXMIND} label="MixMind setup steps" />
          <h3 className="text-xl font-semibold mt-10 mb-4">MixMind troubleshooting</h3>
          <QuestionList faqs={MIXMIND_TROUBLESHOOTING} />
        </section>

        {/* Videos */}
        <section className="mb-20" aria-labelledby="videos">
          <SectionHeading id="videos">Video tutorials</SectionHeading>
          <p className="text-sm mb-6" style={MUTED}>Short walkthroughs of each step. New videos appear here as they&apos;re published.</p>
          <ul className="grid sm:grid-cols-2 gap-6">
            {TUTORIALS.map((tutorial) => <TutorialCard key={tutorial.id} tutorial={tutorial} />)}
          </ul>
        </section>

        <aside className="rounded-2xl border p-8 text-center" style={{ background: "var(--bg-secondary)", borderColor: "var(--accent)" }} aria-label="Start BeatMind">
          <h2 className="text-2xl font-bold mb-3">Ready to build your first loop?</h2>
          <p className="text-sm mb-6 max-w-md mx-auto" style={MUTED}>{TRIAL_TERMS}</p>
          <Link href="/signup" className="inline-block px-8 py-3 rounded-xl font-semibold transition-opacity duration-150 hover:opacity-90" style={{ background: "var(--accent)", color: "#fff" }}>
            Start free trial &rarr;
          </Link>
        </aside>
      </main>

      <BlogFooter />
    </div>
  );
}
