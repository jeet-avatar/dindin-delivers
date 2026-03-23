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
      const res = await sidecarPost<{ reply: string; playlist: AIPlaylistItem[] }>(
        '/api/ai/chat', { message: msg }
      );
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: res.reply,
        playlist: res.playlist,
      }]);
      if (res.playlist.length > 0) {
        const name = `AI Set — ${new Date().toLocaleDateString()}`;
        onPlaylistCreated(name, res.playlist);
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: 'AI is offline. Check your connection.',
      }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-60 bg-black/20 border-l border-white/10 flex flex-col flex-shrink-0">
      <div className="px-3 py-2 border-b border-white/10">
        <span className="text-purple-400 text-xs font-bold">🤖 AI ASSISTANT</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-gray-600 text-xs">
            Ask anything about your library. Try: "Build a 2hr dark techno set at 128 BPM"
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`text-xs rounded-md p-2 ${
            m.role === 'user'
              ? 'bg-white/5 text-gray-300'
              : 'bg-purple-500/10 text-purple-200'
          }`}>
            {m.text}
            {m.playlist && m.playlist.length > 0 && (
              <div className="mt-1 text-green-400 text-xs">
                ✓ {m.playlist.length} tracks added to Playlists
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="text-purple-400 text-xs animate-pulse">Thinking...</div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-white/10 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ask AI..."
          className="flex-1 bg-white/5 rounded-md px-2 py-1.5 text-xs text-gray-300 placeholder-gray-600 outline-none focus:ring-1 focus:ring-purple-500"
        />
        <button
          onClick={send}
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 rounded-md px-2 py-1.5 text-xs text-white"
        >
          →
        </button>
      </div>
    </div>
  );
}
