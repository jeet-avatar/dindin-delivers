import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import DOMPurify from 'dompurify';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  requiresApproval?: boolean;
  approvalData?: any;
  suggestedActions?: string[];
}

type ChatState = 'hidden' | 'minimized' | 'open';

interface AIChatWidgetProps {
  isOpen?: boolean;
  onClose?: () => void;
}

/* ── Indigo Noir Design Tokens ─────────────────────────────────────────── */
const C = {
  bgDeep:      '#080810',
  bgBase:      '#0F0F1A',
  bgElevated:  '#161625',
  bgSurface:   '#1c1c30',
  bgInput:     '#1e1e34',
  border:      '#2a2a44',
  borderLight: '#33335a',
  accent:      '#6366F1',
  accentLight: '#818CF8',
  accentSoft:  '#A5B4FC',
  textPrimary: '#F1F5F9',
  textSecondary:'#94A3B8',
  textMuted:   '#64748B',
  userBubble:  'linear-gradient(135deg, #6366F1, #7C3AED)',
  botBubble:   '#1a1a30',
};

export const AIChatWidget: React.FC<AIChatWidgetProps> = ({ isOpen: externalOpen, onClose: externalOnClose }) => {
  const [chatState, setChatState] = useState<ChatState>('hidden');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm your Zietra AI Assistant. I can help with contacts, campaigns, importing from ERP, and more. What would you like to do?",
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState<string>(Date.now().toString());
  const [pendingApproval, setPendingApproval] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (externalOpen) setChatState('open'); }, [externalOpen]);
  useEffect(() => { if (chatState === 'open') messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, chatState]);
  useEffect(() => { if (chatState === 'open') setUnreadCount(0); }, [chatState]);

  // Detect modal overlays — minimize chat when a modal is open
  const [modalOpen, setModalOpen] = useState(false);
  useEffect(() => {
    const check = () => {
      // Look for modal backdrops (bg-black/60, bg-black/80) that are direct children of body or #root
      const overlays = document.querySelectorAll('[class*="fixed"][class*="inset-0"][class*="bg-"]');
      // Filter to only actual modal overlays (have backdrop/overlay styling)
      let found = false;
      overlays.forEach(el => {
        const cls = el.className || '';
        if ((cls.includes('bg-black') || cls.includes('bg-opacity')) && cls.includes('z-50')) {
          found = true;
        }
      });
      // Also check inline-style modals
      document.querySelectorAll('[style*="position: fixed"][style*="inset"]').forEach(el => {
        const style = (el as HTMLElement).style;
        if (style.zIndex && parseInt(style.zIndex) >= 50 && style.background?.includes('rgba(0')) {
          found = true;
        }
      });
      setModalOpen(found);
    };
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true });
    check(); // initial check
    return () => observer.disconnect();
  }, []);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim()) return;
    const userMessage: Message = { role: 'user', content: messageText, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('crmToken');
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/ai-chat/message`,
        { message: messageText, sessionId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      let cleanContent = response.data.response;
      if (cleanContent.includes('{')) cleanContent = cleanContent.substring(0, cleanContent.indexOf('{'));
      cleanContent = cleanContent.replace(/[\{\}\[\]]/g, '');
      cleanContent = cleanContent.replace(/"message":|"requiresApproval":|"approvalData":/g, '');
      cleanContent = cleanContent.replace(/\btrue\b|\bfalse\b/g, '');
      cleanContent = cleanContent.replace(/\n{3,}/g, '\n\n').trim();

      if (!cleanContent || cleanContent.length < 10) {
        cleanContent = response.data.requiresApproval
          ? "I've prepared your campaign! Review the details below."
          : "I'm ready to help! What would you like to do?";
      }

      const assistantMessage: Message = {
        role: 'assistant', content: cleanContent, timestamp: new Date(),
        requiresApproval: response.data.requiresApproval,
        approvalData: response.data.approvalData,
        suggestedActions: response.data.suggestedActions,
      };

      setMessages(prev => [...prev, assistantMessage]);
      if (response.data.requiresApproval) setPendingApproval(response.data.approvalData);
      if (chatState !== 'open') setUnreadCount(n => n + 1);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.', timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!pendingApproval) return;
    setIsLoading(true);
    try {
      const token = localStorage.getItem('crmToken');
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/ai-chat/approve`,
        { action: pendingApproval.action, data: pendingApproval.details, sessionId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages(prev => [...prev, { role: 'assistant', content: `Action completed successfully! ${JSON.stringify(response.data.result, null, 2)}`, timestamp: new Date() }]);
      setPendingApproval(null);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Failed to execute action. Please try again.', timestamp: new Date() }]);
    } finally { setIsLoading(false); }
  };

  const handleReject = () => {
    setPendingApproval(null);
    setMessages(prev => [...prev, { role: 'assistant', content: 'Understood. The action has been cancelled.', timestamp: new Date() }]);
  };

  const quickActions = [
    { label: 'New Computer Setup', prompt: 'How do I access Zietra on a new computer?' },
    { label: 'Import Contacts', prompt: 'How do I import more contacts from ERP or a CSV file?' },
    { label: 'Create Campaign', prompt: 'Walk me through creating and sending an email campaign' },
    { label: 'Lead Discovery', prompt: 'How do I use lead discovery to find new prospects?' },
  ];

  const PANEL_HEIGHT = 600;
  const HEADER_HEIGHT = 56;
  const translateY =
    chatState === 'hidden' ? PANEL_HEIGHT :
    chatState === 'minimized' ? PANEL_HEIGHT - HEADER_HEIGHT :
    0;

  const formatContent = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#F1F5F9">$1</strong>')
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <div style={{ display: modalOpen ? 'none' : 'block' }}>
      {/* ── FAB button ─────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setChatState('open')}
        aria-label="Open AI Assistant"
        style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 40,
          width: 52, height: 52, borderRadius: '50%',
          background: C.userBubble, border: `2px solid ${C.borderLight}`,
          color: '#fff', cursor: 'pointer',
          boxShadow: `0 4px 24px rgba(99,102,241,0.3)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'opacity 200ms, transform 200ms',
          opacity: chatState === 'hidden' ? 1 : 0,
          transform: chatState === 'hidden' ? 'scale(1)' : 'scale(0.7)',
          pointerEvents: chatState === 'hidden' ? 'auto' : 'none',
        }}
      >
        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: '#EF4444', color: '#fff', fontSize: 10, fontWeight: 700,
            borderRadius: '50%', width: 20, height: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{unreadCount}</span>
        )}
      </button>

      {/* ── Chat panel ─────────────────────────────────────────────── */}
      <div style={{
        position: 'fixed', bottom: 0, right: 24,
        width: 380, height: PANEL_HEIGHT, zIndex: 40,
        transform: `translateY(${translateY}px)`,
        transition: 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'flex', flexDirection: 'column',
        borderRadius: '14px 14px 0 0', overflow: 'hidden',
        border: `1px solid ${C.border}`, borderBottom: 'none',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.1)',
        background: C.bgDeep,
      }}>

        {/* ── Header ─────────────────────────────────────────────── */}
        <div
          onClick={() => { if (chatState === 'minimized') setChatState('open'); }}
          style={{
            height: HEADER_HEIGHT, flexShrink: 0,
            background: 'linear-gradient(135deg, #4F46E5, #6D28D9)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 16px', cursor: chatState === 'minimized' ? 'pointer' : 'default',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16,
            }}>
              <svg width="18" height="18" fill="none" stroke="#fff" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: 14, color: '#fff', margin: 0, lineHeight: 1.2 }}>Zietra AI</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', margin: 0, lineHeight: 1.2 }}>
                {chatState === 'minimized' ? 'Click to expand' : 'Ask me anything'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 2 }}>
            <button type="button" aria-label={chatState === 'minimized' ? 'Expand' : 'Minimize'}
              onClick={(e) => { e.stopPropagation(); setChatState(chatState === 'minimized' ? 'open' : 'minimized'); }}
              style={{ width: 32, height: 32, borderRadius: 8, background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {chatState === 'minimized' ? (
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
              ) : (
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" /></svg>
              )}
            </button>
            <button type="button" aria-label="Close chat"
              onClick={(e) => { e.stopPropagation(); setChatState('hidden'); externalOnClose?.(); }}
              style={{ width: 32, height: 32, borderRadius: 8, background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────────── */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
          background: C.bgBase,
          opacity: chatState === 'minimized' ? 0 : 1,
          transition: 'opacity 200ms ease',
          pointerEvents: chatState === 'minimized' ? 'none' : 'auto',
        }}>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.map((message, index) => (
              <div key={index} style={{ display: 'flex', justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '82%', borderRadius: 14,
                  ...(message.role === 'user' ? {
                    borderBottomRightRadius: 4,
                    background: C.userBubble,
                    color: '#fff',
                    padding: '10px 14px',
                  } : {
                    borderBottomLeftRadius: 4,
                    background: C.botBubble,
                    color: C.textSecondary,
                    border: `1px solid ${C.border}`,
                    padding: '10px 14px',
                  }),
                }}>
                  <div
                    style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(formatContent(message.content)) }}
                  />
                  <p style={{ fontSize: 10, marginTop: 6, opacity: 0.4, margin: '6px 0 0' }}>
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>

                  {/* Approval card */}
                  {message.requiresApproval && pendingApproval && (
                    <div style={{ marginTop: 10, borderRadius: 10, padding: 12, background: 'rgba(99,102,241,0.1)', border: `1px solid rgba(99,102,241,0.25)` }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: C.accentSoft, marginBottom: 10 }}>Campaign Ready for Approval</p>
                      {pendingApproval.details && (
                        <div style={{ marginBottom: 10, fontSize: 11, color: C.textSecondary }}>
                          {pendingApproval.details.name && <div style={{ marginBottom: 4 }}>Name: {pendingApproval.details.name}</div>}
                          {pendingApproval.details.subject && <div style={{ marginBottom: 4 }}>Subject: {pendingApproval.details.subject}</div>}
                          {pendingApproval.details.targetSegment && <div>Target: {pendingApproval.details.targetSegment}</div>}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={handleApprove} disabled={isLoading}
                          style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: 'none', background: '#22C55E', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', opacity: isLoading ? 0.5 : 1 }}>
                          Approve
                        </button>
                        <button onClick={handleReject} disabled={isLoading}
                          style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'rgba(239,68,68,0.7)', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', opacity: isLoading ? 0.5 : 1 }}>
                          Reject
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Suggested actions */}
                  {message.suggestedActions && message.suggestedActions.length > 0 && (
                    <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {message.suggestedActions.map((action, i) => (
                        <button key={i} onClick={() => sendMessage(action)}
                          style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, background: 'rgba(99,102,241,0.15)', color: C.accentSoft, border: `1px solid rgba(99,102,241,0.25)`, cursor: 'pointer' }}>
                          {action}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ borderRadius: 14, borderBottomLeftRadius: 4, background: C.botBubble, border: `1px solid ${C.border}`, padding: '12px 16px', display: 'flex', gap: 6, alignItems: 'center' }}>
                  {[0, 0.15, 0.3].map((delay, i) => (
                    <div key={i} style={{
                      width: 7, height: 7, borderRadius: '50%', background: C.accentLight,
                      animation: 'bounce 0.6s infinite alternate',
                      animationDelay: `${delay}s`,
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick actions */}
          {messages.length <= 2 && (
            <div style={{ padding: '8px 12px 4px', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
              <p style={{ fontSize: 11, color: C.textMuted, marginBottom: 6 }}>Quick Actions</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {quickActions.map((action, i) => (
                  <button key={i} onClick={() => sendMessage(action.prompt)}
                    style={{
                      fontSize: 11, padding: '8px 10px', borderRadius: 8, textAlign: 'left',
                      background: C.bgSurface, color: C.accentSoft,
                      border: `1px solid ${C.border}`, cursor: 'pointer',
                      overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                    }}>
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div style={{ padding: '10px 12px', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
            <form onSubmit={(e) => { e.preventDefault(); sendMessage(inputMessage); }} style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask anything..."
                disabled={isLoading}
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: 10, fontSize: 13,
                  background: C.bgInput, border: `1px solid ${C.borderLight}`,
                  color: C.textPrimary, outline: 'none',
                  opacity: isLoading ? 0.5 : 1,
                }}
              />
              <button type="submit" disabled={isLoading || !inputMessage.trim()}
                aria-label="Send message"
                style={{
                  width: 40, height: 40, borderRadius: 10, border: 'none',
                  background: (!inputMessage.trim() || isLoading) ? C.bgSurface : C.userBubble,
                  color: '#fff', cursor: (!inputMessage.trim() || isLoading) ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: (!inputMessage.trim() || isLoading) ? 0.4 : 1,
                  flexShrink: 0,
                }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Bounce animation for loading dots */}
      <style>{`
        @keyframes bounce {
          from { transform: translateY(0); opacity: 0.5; }
          to { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export interface AIChatProps { isOpen: boolean; onClose: () => void; }
export const AIChat = AIChatWidget;
export default AIChatWidget;
