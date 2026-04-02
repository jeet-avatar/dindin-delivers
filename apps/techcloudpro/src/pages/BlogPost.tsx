import { useParams, Navigate, Link } from 'react-router'
import { ArrowLeft, Clock, User, Calendar, Tag } from 'lucide-react'
import { SEO } from '../components/ui'
import { SchemaMarkup } from '../components/ui/SchemaMarkup'
import { blogPosts } from '../data/blog'
import { Helmet } from 'react-helmet-async'

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>()
  const post = blogPosts.find(p => p.slug === slug)

  if (!post) return <Navigate to="/blog" replace />

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    author: {
      '@type': 'Person',
      name: post.author,
      jobTitle: post.authorTitle,
    },
    publisher: {
      '@type': 'Organization',
      name: 'TechCloudPro',
      logo: { '@type': 'ImageObject', url: 'https://techcloudpro.com/tcplogo.png' },
    },
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    url: `https://techcloudpro.com/blog/${post.slug}/`,
    mainEntityOfPage: `https://techcloudpro.com/blog/${post.slug}/`,
  }

  return (
    <>
      <SEO
        title={post.title}
        description={post.description}
        path={`/blog/${post.slug}`}
      />
      <SchemaMarkup page="about" breadcrumbs={[
        { name: 'Home', url: 'https://techcloudpro.com/' },
        { name: 'Blog', url: 'https://techcloudpro.com/blog/' },
        { name: post.title, url: `https://techcloudpro.com/blog/${post.slug}/` },
      ]} />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>
      </Helmet>

      <article className="py-28 md:py-32 px-6">
        <div className="max-w-3xl mx-auto">
          {/* Back link */}
          <Link to="/blog" className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-blue-400 mb-8 transition-colors" data-discover="true">
            <ArrowLeft size={16} /> Back to Blog
          </Link>

          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <span
                className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full"
                style={{ background: `${post.heroColor}18`, color: post.heroColor }}
              >
                {post.category}
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight mb-5">
              {post.title}
            </h1>

            <p className="text-lg text-[var(--text-dim)] leading-relaxed mb-6">
              {post.description}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--text-muted)] pb-6 border-b border-[var(--glass-border)]">
              <span className="flex items-center gap-1.5"><User size={14} /> {post.author}, {post.authorTitle}</span>
              <span className="flex items-center gap-1.5"><Calendar size={14} /> {post.publishedAt}</span>
              <span className="flex items-center gap-1.5"><Clock size={14} /> {post.readTime}</span>
            </div>
          </div>

          {/* Content */}
          <div
            className="prose prose-invert max-w-none
              [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:text-[var(--text)]
              [&_h3]:text-lg [&_h3]:font-bold [&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:text-[var(--text)]
              [&_p]:text-[15px] [&_p]:leading-relaxed [&_p]:text-[var(--text-dim)] [&_p]:mb-4
              [&_ul]:text-[14px] [&_ul]:text-[var(--text-dim)] [&_ul]:mb-4 [&_ul]:pl-5 [&_ul]:space-y-2
              [&_ol]:text-[14px] [&_ol]:text-[var(--text-dim)] [&_ol]:mb-4 [&_ol]:pl-5 [&_ol]:space-y-2
              [&_li]:leading-relaxed
              [&_strong]:text-[var(--text)] [&_strong]:font-semibold
              [&_blockquote]:border-l-4 [&_blockquote]:border-blue-500 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-[var(--text-muted)] [&_blockquote]:my-6
              [&_table]:w-full [&_table]:text-sm [&_table]:mb-6
              [&_th]:text-left [&_th]:p-3 [&_th]:border-b [&_th]:border-[var(--glass-border)] [&_th]:text-[var(--text)] [&_th]:font-semibold
              [&_td]:p-3 [&_td]:border-b [&_td]:border-[var(--glass-border)] [&_td]:text-[var(--text-dim)]
              [&_a]:text-blue-400 [&_a]:underline [&_a]:hover:text-blue-300
              [.light_&_h2]:text-gray-900 [.light_&_h3]:text-gray-900 [.light_&_p]:text-gray-600 [.light_&_strong]:text-gray-900
              [.light_&_ul]:text-gray-600 [.light_&_ol]:text-gray-600
            "
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="mt-10 pt-6 border-t border-[var(--glass-border)] flex items-center gap-2 flex-wrap">
              <Tag size={14} className="text-[var(--text-muted)]" />
              {post.tags.map(tag => (
                <span key={tag} className="text-[11px] px-2.5 py-1 rounded-full bg-[var(--glass)] border border-[var(--glass-border)] text-[var(--text-muted)]">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Author card */}
          <div className="mt-10 p-6 rounded-2xl bg-[var(--glass)] border border-[var(--glass-border)] [.light_&]:bg-white [.light_&]:shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              {post.author.charAt(0)}
            </div>
            <div>
              <div className="font-bold text-sm">{post.author}</div>
              <div className="text-xs text-[var(--text-muted)]">{post.authorTitle} at TechCloudPro</div>
            </div>
          </div>
        </div>
      </article>
    </>
  )
}
