// src/components/AIChatSidebar.tsx
import { useState, useRef, useEffect } from 'react';
import { sidecarPost } from '../hooks/useSidecar';
import { AIPlaylistItem } from '../types/track';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  playlist?: AIPlaylistItem[];
}

interface Props {
  onPlaylistCreated: (name: string, items: AIPlaylistItem[]) => void;
}

export function AIChatSidebar({ onPlaylistCreated }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send() {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setLoading(true);
    try {
      const res = await sidecarPost<{ reply: string; playlist: AIPlaylistItem[] }>('/api/ai/chat', { message: msg });
      setMessages(prev => [...prev, { role: 'assistant', text: res.reply, playlist: res.playlist }]);
      if (res.playlist.length > 0) {
        onPlaylistCreated(`AI Set — ${new Date().toLocaleDateString()}`, res.playlist);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'AI is offline. Check your connection.' }]);
    } finally {
      setLoading(false);
    }
  }

  const suggestions = [
    'Dark techno 128 BPM 2hr set',
    'Build a progressive set',
    'Find similar tracks to…',
  ];

  return (
    <div className="w-64 flex-shrink-0 flex flex-col" style={{ background: '#0f0f0f', borderLeft: '1px solid #1a1a1a' }}>
      {/* Header */}
      <div className="px-4 py-3.5 flex items-center gap-2.5" style={{ borderBottom: '1px solid #1a1a1a' }}>
        <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
          </svg>
        </div>
        <div>
          <div className="text-xs font-semibold text-white">AI Assistant</div>
          <div className="text-xs" style={{ color: '#4b5563' }}>Powered by MixMind</div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {messages.length === 0 ? (
          <div className="space-y-3 pt-1">
            <p className="text-xs leading-relaxed" style={{ color: '#4b5563' }}>
              Ask anything about your library or request a custom set.
            </p>
            <div className="space-y-1.5">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(s); }}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg cursor-pointer transition-colors"
                  style={{ background: '#161616', color: '#6b7280', border: '1px solid #1e1e1e' }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.color = '#c084fc';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = '#7c3aed44';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.color = '#6b7280';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = '#1e1e1e';
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[85%] text-xs leading-relaxed px-3 py-2 rounded-xl"
                style={m.role === 'user'
                  ? { background: 'rgba(124,58,237,0.2)', color: '#e9d5ff', borderBottomRightRadius: '4px' }
                  : { background: '#161616', color: '#9ca3af', borderBottomLeftRadius: '4px', border: '1px solid #1e1e1e' }
                }>
                {m.text}
                {m.playlist && m.playlist.length > 0 && (
                  <div className="mt-2 pt-2 flex items-center gap-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', color: '#4ade80' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span>{m.playlist.length} tracks added</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="px-3 py-2.5 rounded-xl" style={{ background: '#161616', border: '1px solid #1e1e1e' }}>
              <div className="flex gap-1 items-center">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full" style={{
                    background: '#7c3aed',
                    animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3" style={{ borderTop: '1px solid #1a1a1a' }}>
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: '#161616', border: '1px solid #222' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Ask AI…"
            className="flex-1 bg-transparent text-xs outline-none"
            style={{ color: '#d1d5db' }}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 cursor-pointer transition-all"
            style={{
              background: input.trim() && !loading ? 'linear-gradient(135deg, #7c3aed, #a855f7)' : '#1e1e1e',
              opacity: loading ? 0.5 : 1,
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
