import { useState } from 'react'
import { Link } from 'react-router'
import { Clock, User, ArrowRight } from 'lucide-react'
import { Scene3D } from '../components/3d'
import { SectionHeader, GlassCard, SEO } from '../components/ui'
import { SchemaMarkup } from '../components/ui/SchemaMarkup'
import { blogPosts, categories } from '../data/blog'

const categoryColors: Record<string, string> = {
  ai: '#3B82F6',
  erp: '#A855F7',
  cybersecurity: '#EF4444',
  staffing: '#10B981',
  industry: '#F59E0B',
}

export default function Blog() {
  const [activeCategory, setActiveCategory] = useState('all')

  const filtered = activeCategory === 'all'
    ? blogPosts
    : blogPosts.filter(p => p.category === activeCategory)

  return (
    <>
      <SEO
        title="Blog & Insights — AI, ERP, Cybersecurity, IT Staffing"
        description="Expert insights on private AI deployment, Oracle NetSuite ERP, CyberArk cybersecurity, and IT staffing trends. Thought leadership from TechCloudPro."
        path="/blog"
      />
      <SchemaMarkup page="about" breadcrumbs={[
        { name: 'Home', url: 'https://techcloudpro.com/' },
        { name: 'Blog', url: 'https://techcloudpro.com/blog/' },
      ]} />

      {/* Hero */}
      <section className="relative py-28 md:py-32 overflow-hidden">
        <Scene3D showMesh={false} />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <SectionHeader
            as="h1"
            label="Blog & Insights"
            title="Thought Leadership from the Front Lines"
            subtitle="Real-world insights on AI deployment, ERP implementation, cybersecurity, and building high-performance technology teams."
          />
        </div>
      </section>

      {/* Category filter */}
      <section className="px-6 md:px-12 max-w-7xl mx-auto -mt-6 mb-8">
        <div className="flex gap-2 flex-wrap justify-center">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className="px-4 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: activeCategory === cat.id ? 'rgba(99,102,241,0.15)' : 'var(--glass)',
                border: activeCategory === cat.id ? '1px solid #6366F1' : '1px solid var(--glass-border)',
                color: activeCategory === cat.id ? '#A5B4FC' : 'var(--text-muted)',
              }}
            >
              {cat.label} {cat.id !== 'all' && `(${blogPosts.filter(p => p.category === cat.id).length})`}
            </button>
          ))}
        </div>
      </section>

      {/* Blog grid */}
      <section className="py-8 px-6 md:px-12 max-w-7xl mx-auto mb-20">
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-[var(--text-muted)]">
            <p className="text-lg mb-2">No posts in this category yet.</p>
            <p className="text-sm">Check back soon for new insights.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(post => (
              <Link key={post.slug} to={`/blog/${post.slug}`} className="group" data-discover="true">
                <GlassCard className="h-full flex flex-col hover:border-blue-500/30 transition-all">
                  {/* Category bar */}
                  <div className="h-1 rounded-full mb-4" style={{ background: categoryColors[post.category] || '#6366F1' }} />

                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{
                        background: `${categoryColors[post.category]}18`,
                        color: categoryColors[post.category],
                      }}
                    >
                      {post.category}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">{post.publishedAt}</span>
                  </div>

                  <h2 className="text-[16px] font-bold mb-2 group-hover:text-blue-400 transition-colors leading-snug">
                    {post.title}
                  </h2>

                  <p className="text-[12px] text-[var(--text-muted)] leading-relaxed flex-1 mb-4">
                    {post.description}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1"><User size={12} /> {post.author}</span>
                      <span className="flex items-center gap-1"><Clock size={12} /> {post.readTime}</span>
                    </div>
                    <ArrowRight size={14} className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </GlassCard>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
