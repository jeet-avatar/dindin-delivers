import { useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/ui/SEO';
import SchemaMarkup from '../components/ui/SchemaMarkup';
import { blogPosts } from '../data/blogPosts';
import { categories, categoryColors, badgeColors, badgeLabels, BlogCategory } from '../data/blog';

export default function Blog() {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filtered = activeCategory === 'all'
    ? blogPosts
    : blogPosts.filter(p => p.category === activeCategory);

  return (
    <div style={{ background: '#030308', minHeight: '100vh', color: '#e2e8f0' }}>
      <SEO
        title="Blog — NetSuite AI Insights"
        description="Practical guides, cost breakdowns, and engineering deep-dives on NetSuite automation and AI-powered SuiteScript development."
        path="/blog"
      />
      <SchemaMarkup
        page="blog"
        breadcrumbs={[
          { name: 'ArthaBuild', url: 'https://artha.build' },
          { name: 'Blog', url: 'https://artha.build/blog' },
        ]}
      />

      {/* Header */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 24px 0' }}>
        <Link to="/" style={{ color: '#6366f1', fontSize: 14, textDecoration: 'none' }}>← ArthaBuild</Link>
        <h1 style={{ fontSize: 40, fontWeight: 800, margin: '24px 0 8px', background: 'linear-gradient(135deg, #a5b4fc, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          NetSuite AI Insights
        </h1>
        <p style={{ color: '#94a3b8', fontSize: 18, marginBottom: 40 }}>
          Practical guides, cost breakdowns, and engineering deep-dives on NetSuite automation.
        </p>

        {/* Category tabs */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 40 }}>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: activeCategory === cat.id ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.1)',
                background: activeCategory === cat.id ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)',
                color: activeCategory === cat.id ? '#a5b4fc' : '#94a3b8',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: activeCategory === cat.id ? 700 : 400,
                transition: 'all 0.15s',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24, paddingBottom: 80 }}>
          {filtered.map(post => (
            <Link key={post.slug} to={`/blog/${post.slug}`} style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                overflow: 'hidden',
                transition: 'border-color 0.15s, transform 0.15s',
                cursor: 'pointer',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#6366f1'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}
              >
                {/* Category color bar */}
                <div style={{ height: 3, background: categoryColors[post.category] }} />
                <div style={{ padding: '20px 20px 24px' }}>
                  {/* Badges */}
                  <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: categoryColors[post.category], textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {categories.find(c => c.id === post.category)?.label}
                    </span>
                    {post.badge && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: badgeColors[post.badge], background: `${badgeColors[post.badge]}22`, padding: '2px 8px', borderRadius: 4, letterSpacing: '0.08em' }}>
                        {badgeLabels[post.badge]}
                      </span>
                    )}
                  </div>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', margin: '0 0 8px', lineHeight: 1.4 }}>
                    {post.title}
                  </h2>
                  <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 16px', lineHeight: 1.6 }}>
                    {post.description}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#64748b' }}>{post.readTime}</span>
                    <span style={{ fontSize: 13, color: '#6366f1', fontWeight: 600 }}>Read →</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
