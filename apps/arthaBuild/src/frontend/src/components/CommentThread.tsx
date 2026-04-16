import { useState, useEffect } from 'react';
import axios from 'axios';

interface Comment {
  id: number;
  parent_id: number | null;
  name: string;
  body: string;
  is_team_reply: number;
  created_at: string;
  status: string;
}

interface Props { slug: string }

export default function CommentThread({ slug }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);

  useEffect(() => {
    axios.get(`/api/blog/${slug}/comments`).then(r => {
      const data = r.data?.data ?? r.data;
      setComments(Array.isArray(data) ? data : []);
    }).catch(() => {});
  }, [slug]);

  const topLevel = comments.filter(c => !c.parent_id);
  const replies = (parentId: number) => comments.filter(c => c.parent_id === parentId);

  if (topLevel.length === 0) return null;

  return (
    <div style={{ marginBottom: 32 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#94a3b8', marginBottom: 20 }}>
        {topLevel.length} Comment{topLevel.length !== 1 ? 's' : ''}
      </h3>
      {topLevel.map(c => (
        <div key={c.id} style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ width: 32, height: 32, background: '#4338ca', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'white' }}>
              {c.name[0].toUpperCase()}
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '12px 16px', flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#a5b4fc', marginBottom: 6 }}>{c.name}</div>
              <p style={{ fontSize: 14, color: '#94a3b8', margin: 0, lineHeight: 1.6 }}>{c.body}</p>
            </div>
          </div>
          {replies(c.id).map(r => (
            <div key={r.id} style={{ display: 'flex', gap: 12, marginLeft: 44, marginTop: 10 }}>
              <div style={{ width: 28, height: 28, background: '#6366f1', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white' }}>A</div>
              <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, padding: '10px 14px', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#a5b4fc' }}>ArthaBuild</span>
                  <span style={{ fontSize: 10, background: 'rgba(99,102,241,0.3)', color: '#a5b4fc', padding: '1px 6px', borderRadius: 3, fontWeight: 700 }}>Team</span>
                </div>
                <p style={{ fontSize: 14, color: '#94a3b8', margin: 0, lineHeight: 1.6 }}>{r.body}</p>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
