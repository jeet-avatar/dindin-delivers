import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { blogPosts, CATEGORY_LABELS } from '@/data/blogPosts'
import type { BlogCategory } from '@/data/blogPosts'
import { SchemaMarkup } from '@/components/ui/SchemaMarkup'
import { siteConfig } from '@/lib/config'

const CATEGORY_COLORS: Record<BlogCategory, string> = {
  'weight-loss': 'bg-emerald-100 text-emerald-700',
  'primary-care': 'bg-blue-100 text-blue-700',
  'telehealth': 'bg-purple-100 text-purple-700',
  'chronic-conditions': 'bg-orange-100 text-orange-700',
  'womens-mens-health': 'bg-pink-100 text-pink-700',
  'local-orlando': 'bg-sky-100 text-sky-700',
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate)
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export async function generateStaticParams() {
  return blogPosts.map((p) => ({ slug: p.slug }))
}

interface BlogPostPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params
  const post = blogPosts.find((p) => p.slug === slug)
  if (!post) return {}
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `${siteConfig.siteUrl}/blog/${post.slug}`,
      type: 'article',
      publishedTime: post.date,
      authors: ['Dr. Arpana Pillay'],
    },
  }
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params
  const post = blogPosts.find((p) => p.slug === slug)
  if (!post) notFound()

  const related = blogPosts
    .filter((p) => p.category === post.category && p.slug !== post.slug)
    .slice(0, 3)

  const blogPostingSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    dateModified: post.date,
    author: {
      '@type': 'Person',
      name: 'Dr. Arpana Pillay',
      jobTitle: 'Internal Medicine Physician',
      worksFor: { '@type': 'MedicalClinic', name: 'Vish Medical' },
    },
    publisher: {
      '@type': 'MedicalClinic',
      name: 'Vish Medical',
      url: 'https://vishmed.com',
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${siteConfig.siteUrl}/blog/${post.slug}`,
    },
  }

  return (
    <>
      <SchemaMarkup schema={blogPostingSchema} />

      <div className="min-h-screen bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* ── Breadcrumb ────────────────────────────────── */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-slate-400 mb-8">
            <Link href="/" className="hover:text-primary focus-visible:outline-[3px] focus-visible:outline-primary rounded">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <Link href="/blog" className="hover:text-primary focus-visible:outline-[3px] focus-visible:outline-primary rounded">
              Blog
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-slate-600 font-medium truncate max-w-xs" aria-current="page">
              {post.title}
            </span>
          </nav>

          <div className="lg:grid lg:grid-cols-[1fr_300px] lg:gap-10">
            {/* ── Main Content ───────────────────────────── */}
            <main>
              {/* Category + meta row */}
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full ${CATEGORY_COLORS[post.category]}`}
                >
                  {CATEGORY_LABELS[post.category]}
                </span>
                <time dateTime={post.date} className="text-sm text-slate-400">
                  {formatDate(post.date)}
                </time>
                <span className="text-sm text-slate-400">{post.readTime} min read</span>
              </div>

              {/* Title */}
              <h1 className="font-heading text-2xl lg:text-3xl font-bold text-slate-800 mb-6 leading-tight">
                {post.title}
              </h1>

              {/* Author row */}
              <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-200">
                <div
                  aria-hidden="true"
                  className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm shrink-0"
                >
                  AP
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Dr. Arpana Pillay</p>
                  <p className="text-xs text-slate-500">Internal Medicine Physician, Vish Medical</p>
                </div>
              </div>

              {/* Article Content — manual prose styles since @tailwindcss/typography not installed */}
              <article
                className="blog-prose"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />

              <style>{`
                .blog-prose {
                  color: #475569;
                  font-size: 1rem;
                  line-height: 1.75;
                  max-width: none;
                }
                .blog-prose p {
                  margin-top: 0;
                  margin-bottom: 1.25rem;
                }
                .blog-prose h2 {
                  font-family: var(--font-figtree), system-ui, sans-serif;
                  color: #1e293b;
                  font-size: 1.25rem;
                  font-weight: 700;
                  line-height: 1.4;
                  margin-top: 2rem;
                  margin-bottom: 0.75rem;
                }
                .blog-prose ul {
                  list-style: none;
                  padding: 0;
                  margin: 0 0 1.25rem 0;
                }
                .blog-prose ul li {
                  padding-left: 1.5rem;
                  position: relative;
                  margin-bottom: 0.5rem;
                  color: #475569;
                }
                .blog-prose ul li::before {
                  content: '';
                  position: absolute;
                  left: 0;
                  top: 0.55rem;
                  width: 6px;
                  height: 6px;
                  border-radius: 50%;
                  background-color: #2563EB;
                }
                .blog-prose strong {
                  color: #1e293b;
                  font-weight: 600;
                }
                .blog-prose a {
                  color: #2563EB;
                  text-decoration: underline;
                  text-underline-offset: 2px;
                }
                .blog-prose a:hover {
                  color: #1d4ed8;
                }
              `}</style>

              {/* Back to Blog */}
              <div className="mt-10 pt-8 border-t border-slate-200">
                <Link
                  href="/blog"
                  className="inline-flex items-center text-primary font-semibold hover:underline focus-visible:outline-[3px] focus-visible:outline-primary rounded"
                >
                  ← Back to Blog
                </Link>
              </div>
            </main>

            {/* ── Sidebar ────────────────────────────────── */}
            <aside className="hidden lg:block">
              <div className="sticky top-24 space-y-6">
                {/* Related Posts */}
                {related.length > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <h2 className="font-heading font-bold text-slate-800 text-base mb-4">
                      Related Posts
                    </h2>
                    <ul className="space-y-4">
                      {related.map((rp) => (
                        <li key={rp.slug}>
                          <Link
                            href={`/blog/${rp.slug}`}
                            className="group block"
                          >
                            <p className="text-sm font-medium text-slate-700 group-hover:text-primary motion-safe:transition-colors leading-snug mb-1">
                              {rp.title}
                            </p>
                            <time
                              dateTime={rp.date}
                              className="text-xs text-slate-400"
                            >
                              {formatDate(rp.date)}
                            </time>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Book Appointment CTA */}
                <div className="bg-primary rounded-2xl p-6 text-white">
                  <h2 className="font-heading font-bold text-lg mb-2">
                    Book an Appointment
                  </h2>
                  <p className="text-blue-100 text-sm mb-4 leading-relaxed">
                    See Dr. Arpana Pillay in person or via telehealth. New patients welcome.
                  </p>
                  <Link
                    href="/contact"
                    className="inline-flex items-center justify-center w-full min-h-[44px] bg-cta text-white hover:bg-cta-dark px-5 py-2.5 rounded-lg font-semibold text-sm cursor-pointer motion-safe:transition-colors motion-safe:duration-150 focus-visible:outline-[3px] focus-visible:outline-white"
                  >
                    Schedule a Visit →
                  </Link>
                </div>

                {/* Category browsing */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                  <h2 className="font-heading font-bold text-slate-800 text-base mb-4">
                    Browse by Topic
                  </h2>
                  <ul className="space-y-2">
                    {(Object.keys(CATEGORY_LABELS) as BlogCategory[]).map((cat) => (
                      <li key={cat}>
                        <Link
                          href={`/blog?category=${cat}`}
                          className="text-sm text-slate-600 hover:text-primary motion-safe:transition-colors focus-visible:outline-[3px] focus-visible:outline-primary rounded"
                        >
                          {CATEGORY_LABELS[cat]}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </>
  )
}
