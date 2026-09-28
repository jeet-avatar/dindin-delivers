import { type ShowcaseProduct, showcaseFor } from "@/lib/showcase";

const HEADINGS: Record<ShowcaseProduct, { title: string; subtitle: string }> = {
  beatmind: {
    title: "Made with BeatMind",
    subtitle: "Real tracks from producers using BeatMind, with what BeatMind built and what the producer did.",
  },
  mixmind: {
    title: "Built with MixMind",
    subtitle: "Sets and mixes put together from DJs' own libraries with MixMind.",
  },
};

// Renders nothing when the product has no showcase entries.
export function Showcase({ product }: { product: ShowcaseProduct }) {
  const items = showcaseFor(product);
  if (items.length === 0) return null;
  const heading = HEADINGS[product];
  const headingId = `showcase-${product}-heading`;

  return (
    <section id="showcase" className="max-w-6xl mx-auto px-6 py-20" aria-labelledby={headingId}>
      <h2 id={headingId} className="text-3xl md:text-4xl font-bold text-center mb-4">{heading.title}</h2>
      <p className="text-center mb-14 max-w-2xl mx-auto" style={{ color: "var(--text-secondary)" }}>{heading.subtitle}</p>
      <ul className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => {
          const meta = [item.genre, item.bpm ? `${item.bpm} BPM` : null, item.key].filter(Boolean).join(" · ");
          return (
            <li key={item.id} className="p-6 rounded-2xl border flex flex-col" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
              <div className="text-xs mb-2" style={{ color: "var(--accent)" }}>{meta}</div>
              <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
              <p className="text-sm leading-relaxed mb-4 flex-1" style={{ color: "var(--text-secondary)" }}>{item.description}</p>
              {item.prompt && (
                <p className="text-xs mb-4 px-3 py-2 rounded-lg" style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}>
                  <span className="font-medium" style={{ color: "var(--text-primary)" }}>Prompt: </span>&ldquo;{item.prompt}&rdquo;
                </p>
              )}
              {item.audioSrc && (
                <audio controls preload="none" src={item.audioSrc} className="w-full" aria-label={`Play ${item.title}`} />
              )}
              {item.credit && <p className="text-xs mt-3" style={{ color: "var(--text-secondary)" }}>By {item.credit}</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
