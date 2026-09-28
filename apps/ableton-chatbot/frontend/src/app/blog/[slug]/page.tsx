import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { type BlogPost, extractFaqs, formatPostDate, getAllPosts, getPost, getRelatedPosts } from "@/lib/blog";
import { BASE_URL, OG_IMAGE_BLOG, OG_IMAGE_SIZE, SITE_NAME, TRIAL_TERMS, absoluteUrl } from "@/lib/site";
import { ORGANIZATION_REF, breadcrumbSchema, faqPageSchema, organizationSchema } from "@/lib/structured-data";
import { BlogFooter, BlogNav } from "../blog-chrome";
import { PostMarkdown } from "./post-markdown";

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export function generateStaticParams(): { slug: string }[] {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const post = getPost((await params).slug);
  if (!post) return {};
  const url = `${BASE_URL}/blog/${post.slug}`;
  return {
    title: `${post.title} | BeatMind Blog`,
    description: post.description,
    keywords: post.keywords,
    authors: [{ name: post.author }],
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.description,
      url,
      siteName: SITE_NAME,
      type: "article",
      locale: "en_US",
      publishedTime: post.date,
      modifiedTime: post.updated,
      authors: [post.author],
      images: [{ url: OG_IMAGE_BLOG, ...OG_IMAGE_SIZE, alt: post.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: [OG_IMAGE_BLOG],
    },
  };
}

function articleSchema(post: BlogPost): Record<string, unknown> {
  const url = `${BASE_URL}/blog/${post.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.updated,
    author: { "@type": "Organization", name: post.author, url: absoluteUrl("/") },
    publisher: organizationSchema(),
    image: absoluteUrl(OG_IMAGE_BLOG),
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    keywords: post.keywords.join(", "),
    inLanguage: "en-US",
    isPartOf: { "@type": "Blog", name: "BeatMind Blog", url: `${BASE_URL}/blog`, publisher: ORGANIZATION_REF },
  };
}

function PostCta({ product }: { product: BlogPost["product"] }) {
  const isMixMind = product === "mixmind";
  return (
    <aside className="mt-16 rounded-2xl border p-8 text-center" style={{ background: "var(--bg-secondary)", borderColor: "var(--accent)" }} aria-label={isMixMind ? "Try MixMind" : "Try BeatMind"}>
      <h2 className="text-2xl font-bold mb-3">
        {isMixMind ? "Get your Rekordbox library under control" : "Build your next idea inside Ableton"}
      </h2>
      <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: "var(--text-secondary)" }}>
        {isMixMind
          ? "MixMind browses, de-duplicates and builds AI playlists from the Rekordbox collection you already own. Mac + Windows. Early access with BeatMind Studio; standalone MixMind $12/month coming soon."
          : "BeatMind builds drums, bass and melodies part by part in your own Live Set, with captured auditions to review. Ableton Live 11 or 12. Plans from $19/month."}
      </p>
      <Link href={isMixMind ? "/mixmind" : "/signup"} className="inline-block px-8 py-4 rounded-xl font-semibold text-lg transition-opacity duration-150 hover:opacity-90" style={{ background: "var(--accent)", color: "#fff" }}>
        {isMixMind ? "See MixMind →" : "Start free trial →"}
      </Link>
      <p className="text-xs mt-3" style={{ color: "var(--text-secondary)" }}>{TRIAL_TERMS}</p>
    </aside>
  );
}

// The page renders the title as its h1, so a leading "# Title" line in the body is dropped.
function withoutLeadingTitle(body: string): string {
  return body.replace(/^\s*#\s+.*(\r?\n|$)/, "");
}

export default async function BlogPostPage({ params }: PostPageProps) {
  const post = getPost((await params).slug);
  if (!post) notFound();

  const faqs = extractFaqs(post.body);
  const related = getRelatedPosts(post);
  const productName = post.product === "mixmind" ? "MixMind" : "BeatMind";

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <JsonLd data={articleSchema(post)} />
      {faqs.length > 0 && <JsonLd data={faqPageSchema(faqs)} />}
      <JsonLd
        data={breadcrumbSchema([
          { name: "BeatMind", path: "/" },
          { name: "Blog", path: "/blog" },
          { name: post.title, path: `/blog/${post.slug}` },
        ])}
      />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-medium"
        style={{ background: "var(--accent)", color: "#fff" }}>
        Skip to main content
      </a>
      <BlogNav />

      <main id="main" className="px-6 pt-16 pb-24">
        <article className="max-w-[70ch] mx-auto">
          <nav aria-label="Breadcrumb" className="text-xs mb-8" style={{ color: "var(--text-secondary)" }}>
            <Link href="/" className="hover:text-white transition-colors duration-150">Home</Link>
            <span className="mx-2" aria-hidden="true">/</span>
            <Link href="/blog" className="hover:text-white transition-colors duration-150">Blog</Link>
          </nav>
          <header className="mb-10">
            <div className="flex flex-wrap items-center gap-3 text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
              <span style={{ color: "var(--accent)" }}>{productName}</span>
              <span aria-hidden="true">·</span>
              <time dateTime={post.date}>{formatPostDate(post.date)}</time>
              {post.updated !== post.date && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Updated <time dateTime={post.updated}>{formatPostDate(post.updated)}</time></span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span>{post.author}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black leading-tight tracking-tight mb-5">{post.title}</h1>
            {post.description && (
              <p className="text-lg" style={{ color: "var(--text-secondary)", lineHeight: "1.6" }}>{post.description}</p>
            )}
          </header>

          <PostMarkdown body={withoutLeadingTitle(post.body)} />

          <PostCta product={post.product} />

          {related.length > 0 && (
            <section className="mt-16" aria-labelledby="related-heading">
              <h2 id="related-heading" className="text-xl font-bold mb-5">Related posts</h2>
              <ul className="space-y-3">
                {related.map((other) => (
                  <li key={other.slug}>
                    <Link href={`/blog/${other.slug}`} className="block p-5 rounded-xl border transition-colors duration-150 hover:border-white" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
                      <div className="font-semibold mb-1">{other.title}</div>
                      <div className="text-sm" style={{ color: "var(--text-secondary)" }}>{other.description}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </article>
      </main>

      <BlogFooter />
    </div>
  );
}
