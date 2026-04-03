import { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../hooks/useWebRTC';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  onClose: () => void;
}

export function ChatPanel({ messages, onSend, onClose }: ChatPanelProps) {
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSend(text.trim());
      setText('');
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <span>Chat</span>
        <button className="chat-close" onClick={onClose}>&times;</button>
      </div>
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">No messages yet</div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`chat-msg ${msg.isMe ? 'me' : ''}`}>
            <div className="chat-msg-header">
              <span className="chat-msg-name">{msg.isMe ? 'You' : msg.fromName}</span>
              <span className="chat-msg-time">{formatTime(msg.timestamp)}</span>
            </div>
            <div className="chat-msg-text">{msg.text}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form className="chat-input" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
        />
        <button type="submit" disabled={!text.trim()}>Send</button>
      </form>
    </div>
  );
}
