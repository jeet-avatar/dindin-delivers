import { useEffect, useRef } from 'react'
import { StoryCard } from './StoryCard'
import { STORIES } from '../data/stories'

export function SuccessStories() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) el.classList.add('revealed') },
      { threshold: 0.08 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section id="stories" ref={ref} className="reveal" style={{ padding: '100px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div className="label-cap" style={{ color: 'var(--text-3)', marginBottom: 12 }}>
            Success stories
          </div>
          <h2 className="section-headline">Real SMBs. Real results.</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          {STORIES.map(story => <StoryCard key={story.id} story={story} />)}
        </div>
      </div>
    </section>
  )
}
