import { useState } from 'react';
import axios from 'axios';

interface Props { slug: string }

export default function CommentForm({ slug }: Props) {
  const [name, setName] = useState('');
  const [body, setBody] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !body.trim()) return;
    setLoading(true);
    try {
      await axios.post(`/api/blog/${slug}/comments`, { name: name.trim(), body: body.trim() });
      setSubmitted(true);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 8, padding: '16px 20px', color: '#34d399', fontSize: 14 }}>
        Thanks — your comment is under review. We'll publish it shortly.
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#94a3b8', marginBottom: 16 }}>Leave a Comment</h3>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your name"
          required
          style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '10px 14px', color: '#e2e8f0', fontSize: 14 }}
        />
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Share your thoughts..."
          required
          rows={4}
          style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '10px 14px', color: '#e2e8f0', fontSize: 14, resize: 'vertical' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#64748b' }}>No account needed · Comments reviewed before publishing</span>
          <button
            type="submit"
            disabled={loading || !name.trim() || !body.trim()}
            style={{ background: loading ? '#4338ca' : '#6366f1', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 6, fontWeight: 700, fontSize: 14, cursor: loading ? 'wait' : 'pointer' }}
          >
            {loading ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
      </form>
    </div>
  );
}
