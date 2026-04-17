import { useState } from 'react'
import type { Story } from '../data/stories'
import { useLocalStorage } from '../hooks/useLocalStorage'

interface Comment {
  id: string
  text: string
  time: string
}

export function StoryCard({ story }: { story: Story }) {
  const [reactions, setReactions] = useLocalStorage<{
    heart: number; hands: number; fire: number;
    myHeart: boolean; myHands: boolean; myFire: boolean;
  }>(`reactions-${story.id}`, {
    heart: story.defaultReactions.heart,
    hands: story.defaultReactions.hands,
    fire: story.defaultReactions.fire,
    myHeart: false, myHands: false, myFire: false,
  })

  const [comments, setComments] = useLocalStorage<Comment[]>(`comments-${story.id}`, [])
  const [commentText, setCommentText] = useState('')
  const [showComments, setShowComments] = useState(false)

  function toggleReaction(type: 'heart' | 'hands' | 'fire') {
    const myKey = `my${type.charAt(0).toUpperCase()}${type.slice(1)}` as 'myHeart' | 'myHands' | 'myFire'
    const wasOn = reactions[myKey]
    setReactions({
      ...reactions,
      [type]: reactions[type] + (wasOn ? -1 : 1),
      [myKey]: !wasOn,
    })
  }

  function submitComment() {
    const text = commentText.trim()
    if (!text) return
    const newComment: Comment = {
      id: Date.now().toString(),
      text,
      time: 'just now',
    }
    setComments([...comments, newComment])
    setCommentText('')
  }

  return (
    <div className="glass-card" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Stars */}
      <div style={{ color: '#ffd60a', fontSize: 14, letterSpacing: 2 }}>★★★★★</div>

      {/* Quote */}
      <p style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--text)', flex: 1 }}>
        "{story.quote}"
      </p>

      {/* Author */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: `${story.moduleColor}33`,
          border: `1px solid ${story.moduleColor}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 14, color: story.moduleColor,
          flexShrink: 0,
        }}>
          {story.initials}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{story.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{story.role}, {story.company}</div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <span style={{
            background: `${story.moduleColor}22`,
            border: `1px solid ${story.moduleColor}44`,
            borderRadius: 980, padding: '3px 10px',
            fontSize: 11, fontWeight: 600, color: story.moduleColor,
          }}>
            {story.module}
          </span>
        </div>
      </div>

      {/* Reactions */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {(
          [
            { key: 'heart' as const, emoji: '❤️', myKey: 'myHeart' as const },
            { key: 'hands' as const, emoji: '🙌', myKey: 'myHands' as const },
            { key: 'fire' as const, emoji: '🔥', myKey: 'myFire' as const },
          ]
        ).map(r => (
          <button
            key={r.key}
            onClick={() => toggleReaction(r.key)}
            style={{
              background: reactions[r.myKey] ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${reactions[r.myKey] ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 980, padding: '4px 10px',
              cursor: 'pointer', fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 5,
              transition: 'background 0.2s, border 0.2s',
            }}
          >
            <span>{r.emoji}</span>
            <span style={{ color: 'var(--text-2)', fontSize: 12 }}>{reactions[r.key]}</span>
          </button>
        ))}

        <button
          onClick={() => setShowComments(!showComments)}
          style={{
            marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-3)', fontSize: 12,
          }}
        >
          💬 {comments.length > 0 ? `${comments.length} comment${comments.length !== 1 ? 's' : ''}` : 'Add comment'}
        </button>
      </div>

      {/* Comments thread */}
      {showComments && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 16 }}>
          {comments.map(c => (
            <div key={c.id} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 13, color: 'var(--text)' }}>{c.text}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>{c.time}</div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submitComment() }}
              placeholder="Add a comment…"
              style={{
                flex: 1, background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, padding: '8px 12px',
                color: 'var(--text)', fontSize: 13, outline: 'none',
              }}
            />
            <button
              onClick={submitComment}
              style={{
                background: 'var(--zietra)', color: '#fff',
                border: 'none', borderRadius: 8, padding: '8px 14px',
                cursor: 'pointer', fontSize: 13, fontWeight: 500,
              }}
            >
              Post
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
