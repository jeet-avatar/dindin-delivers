import type { Metadata } from 'next'
import Link from 'next/link'
import { blogPosts, CATEGORY_LABELS } from '@/data/blogPosts'
import type { BlogCategory } from '@/data/blogPosts'

export const metadata: Metadata = {
  title: 'Health & Wellness Blog | Vish Medical',
  description:
    'Expert health articles from Dr. Arpana Pillay on weight loss, primary care, telehealth, and chronic conditions in Orlando, FL.',
}

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

interface BlogIndexPageProps {
  searchParams?: Promise<{ category?: string }>
}

export default async function BlogIndexPage({ searchParams }: BlogIndexPageProps) {
  const resolved = await searchParams
  const category = resolved?.category as BlogCategory | undefined
  const filtered = category
    ? blogPosts.filter((p) => p.category === category)
    : blogPosts

  const allCategories = Array.from(
    new Set(blogPosts.map((p) => p.category))
  ) as BlogCategory[]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Page Header ─────────────────────────────────── */}
      <section className="bg-white border-b border-slate-100 py-12 lg:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-2">
            Vish Medical Blog
          </p>
          <h1 className="font-heading text-3xl lg:text-4xl font-bold text-slate-800 mb-3">
            Health &amp; Wellness Blog
          </h1>
          <p className="text-slate-500 text-lg max-w-2xl">
            Evidence-based insights from Dr. Arpana Pillay on weight loss, primary care, telehealth,
            and living well in Central Florida.
          </p>
        </div>
      </section>

      {/* ── Category Filter Tabs ─────────────────────────── */}
      <section className="bg-white border-b border-slate-100 px-4 sm:px-6 lg:px-8 sticky top-[72px] z-40">
        <div className="max-w-6xl mx-auto overflow-x-auto">
          <nav
            aria-label="Filter posts by category"
            className="flex gap-2 py-3 min-w-max"
          >
            <Link
              href="/blog"
              className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium motion-safe:transition-colors motion-safe:duration-150 focus-visible:outline-[3px] focus-visible:outline-primary ${
                !category
                  ? 'bg-primary text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-primary hover:text-primary'
              }`}
            >
              All Posts
              <span className="ml-1.5 text-xs opacity-75">({blogPosts.length})</span>
            </Link>
            {allCategories.map((cat) => {
              const count = blogPosts.filter((p) => p.category === cat).length
              return (
                <Link
                  key={cat}
                  href={`/blog?category=${cat}`}
                  className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium motion-safe:transition-colors motion-safe:duration-150 focus-visible:outline-[3px] focus-visible:outline-primary ${
                    category === cat
                      ? 'bg-primary text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:border-primary hover:text-primary'
                  }`}
                >
                  {CATEGORY_LABELS[cat]}
                  <span className="ml-1.5 text-xs opacity-75">({count})</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </section>

      {/* ── Post Grid ───────────────────────────────────── */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-slate-500 text-lg">No posts found in this category.</p>
              <Link
                href="/blog"
                className="mt-4 inline-flex items-center text-primary font-semibold hover:underline"
              >
                View all posts →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((post) => (
                <article
                  key={post.slug}
                  className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md motion-safe:transition-shadow motion-safe:duration-200 flex flex-col"
                >
                  <div className="p-6 flex flex-col flex-1">
                    {/* Category + date row */}
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full ${CATEGORY_COLORS[post.category]}`}
                      >
                        {CATEGORY_LABELS[post.category]}
                      </span>
                      <time
                        dateTime={post.date}
                        className="text-xs text-slate-400"
                      >
                        {formatDate(post.date)}
                      </time>
                    </div>

                    {/* Title */}
                    <h2 className="font-heading font-semibold text-slate-800 text-base leading-snug mb-2 flex-grow-0">
                      <Link
                        href={`/blog/${post.slug}`}
                        className="hover:text-primary motion-safe:transition-colors focus-visible:outline-[3px] focus-visible:outline-primary rounded"
                      >
                        {post.title}
                      </Link>
                    </h2>

                    {/* Excerpt */}
                    <p className="text-slate-500 text-sm leading-relaxed mb-4 flex-1">
                      {post.excerpt}
                    </p>

                    {/* Footer row */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <span className="text-xs text-slate-400">{post.readTime} min read</span>
                      <Link
                        href={`/blog/${post.slug}`}
                        className="text-primary text-sm font-semibold hover:underline focus-visible:outline-[3px] focus-visible:outline-primary rounded"
                        aria-label={`Read more about ${post.title}`}
                      >
                        Read More →
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
