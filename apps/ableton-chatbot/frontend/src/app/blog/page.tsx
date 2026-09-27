import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { formatPostDate, getAllPosts } from "@/lib/blog";
import { BASE_URL, OG_IMAGE_BLOG, OG_IMAGE_SIZE, SITE_NAME } from "@/lib/site";
import { ORGANIZATION_REF, breadcrumbSchema } from "@/lib/structured-data";
import { BlogFooter, BlogNav } from "./blog-chrome";

const TITLE = "BeatMind Blog — AI Music Production and DJ Library Guides";
const DESCRIPTION =
  "Guides from the BeatMind team on producing in Ableton Live with AI and managing a Rekordbox DJ library with MixMind.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: `${BASE_URL}/blog`,
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${BASE_URL}/blog`,
    siteName: SITE_NAME,
    type: "website",
    locale: "en_US",
    images: [{ url: OG_IMAGE_BLOG, ...OG_IMAGE_SIZE, alt: "BeatMind Blog" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE_BLOG],
  },
};

export default function BlogIndexPage() {
  const posts = getAllPosts();

  const blogSchema = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "BeatMind Blog",
    url: `${BASE_URL}/blog`,
    description: DESCRIPTION,
    publisher: ORGANIZATION_REF,
    blogPost: posts.map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      url: `${BASE_URL}/blog/${post.slug}`,
      datePublished: post.date,
      dateModified: post.updated,
    })),
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <JsonLd data={blogSchema} />
      <JsonLd
        data={breadcrumbSchema([
          { name: "BeatMind", path: "/" },
          { name: "Blog", path: "/blog" },
        ])}
      />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-medium"
        style={{ background: "var(--accent)", color: "#fff" }}>
        Skip to main content
      </a>
      <BlogNav />

      <main id="main" className="max-w-3xl mx-auto px-6 pt-20 pb-24">
        <h1 className="text-4xl md:text-5xl font-black leading-tight mb-4 tracking-tight">
          The BeatMind <span style={{ color: "var(--accent)" }}>Blog</span>
        </h1>
        <p className="text-lg mb-14" style={{ color: "var(--text-secondary)", lineHeight: "1.6" }}>
          {DESCRIPTION}
        </p>

        {posts.length === 0 ? (
          <p style={{ color: "var(--text-secondary)" }}>New guides are on the way.</p>
        ) : (
          <ul className="space-y-5">
            {posts.map((post) => (
              <li key={post.slug}>
                <Link href={`/blog/${post.slug}`} className="block p-6 rounded-2xl border transition-colors duration-150 hover:border-white" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
                  <div className="flex items-center gap-3 text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
                    <time dateTime={post.date}>{formatPostDate(post.date)}</time>
                    <span aria-hidden="true">·</span>
                    <span style={{ color: "var(--accent)" }}>{post.product === "mixmind" ? "MixMind" : "BeatMind"}</span>
                  </div>
                  <h2 className="text-xl font-semibold mb-2">{post.title}</h2>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{post.description}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>

      <BlogFooter />
    </div>
  );
}
