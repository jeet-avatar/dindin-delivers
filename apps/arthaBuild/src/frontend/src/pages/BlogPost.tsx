import { useParams, Navigate, Link } from 'react-router-dom';
import SEO from '../components/ui/SEO';
import SchemaMarkup from '../components/ui/SchemaMarkup';
import ReactionsBar from '../components/ReactionsBar';
import CommentThread from '../components/CommentThread';
import CommentForm from '../components/CommentForm';
import { blogPosts } from '../data/blogPosts';
import { categoryColors, badgeColors, badgeLabels, categories } from '../data/blog';

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post = blogPosts.find(p => p.slug === slug);

  if (!post) return <Navigate to="/blog" replace />;

  const related = blogPosts.filter(p => p.category === post.category && p.slug !== post.slug).slice(0, 3);

  return (
    <div style={{ background: '#030308', minHeight: '100vh', color: '#e2e8f0' }}>
      <SEO
        title={post.title}
        description={post.description}
        path={`/blog/${post.slug}`}
        type="article"
      />
      <SchemaMarkup
        page="blog-post"
        articleTitle={post.title}
        articleDescription={post.description}
        articleUrl={`https://artha.build/blog/${post.slug}`}
        articleDatePublished={post.publishedAt}
        breadcrumbs={[
          { name: 'ArthaBuild', url: 'https://artha.build' },
          { name: 'Blog', url: 'https://artha.build/blog' },
          { name: post.title, url: `https://artha.build/blog/${post.slug}` },
        ]}
      />

      <div style={{ maxWidth: 780, margin: '0 auto', padding: '60px 24px 80px' }}>
        {/* Back */}
        <Link to="/blog" style={{ color: '#6366f1', fontSize: 14, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 32 }}>
          ← Back to Blog
        </Link>

        {/* Badges */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: categoryColors[post.category], textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {categories.find(c => c.id === post.category)?.label}
          </span>
          {post.badge && (
            <span style={{ fontSize: 11, fontWeight: 700, color: badgeColors[post.badge], background: `${badgeColors[post.badge]}22`, padding: '2px 10px', borderRadius: 4, letterSpacing: '0.08em' }}>
              {badgeLabels[post.badge]}
            </span>
          )}
          <span style={{ fontSize: 12, color: '#64748b' }}>{post.readTime}</span>
        </div>

        {/* Title */}
        <h1 style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.25, marginBottom: 40, color: '#f1f5f9' }}>
          {post.title}
        </h1>

        {/* Content */}
        <div
          className="blog-content"
          dangerouslySetInnerHTML={{ __html: post.content }}
          style={{ lineHeight: 1.8, fontSize: 16 }}
        />

        {/* End CTA */}
        <div style={{ margin: '48px 0', padding: '32px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 12, textAlign: 'center' }}>
          <p style={{ color: '#a5b4fc', fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
            See how ArthaBuild handles this automatically
          </p>
          <Link to="/create-account" style={{ display: 'inline-block', background: '#6366f1', color: 'white', padding: '12px 28px', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: 15 }}>
            Get Started Free →
          </Link>
        </div>

        {/* Reactions + Comments */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 40 }}>
          <ReactionsBar slug={post.slug} />
          <CommentThread slug={post.slug} />
          <CommentForm slug={post.slug} />
        </div>

        {/* Related posts */}
        {related.length > 0 && (
          <div style={{ marginTop: 60 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: '#94a3b8' }}>Related Posts</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
              {related.map(r => (
                <Link key={r.slug} to={`/blog/${r.slug}`} style={{ textDecoration: 'none' }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '16px', transition: 'border-color 0.15s' }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', margin: 0, lineHeight: 1.4 }}>{r.title}</p>
                    <span style={{ fontSize: 12, color: '#6366f1', marginTop: 8, display: 'block' }}>Read →</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
