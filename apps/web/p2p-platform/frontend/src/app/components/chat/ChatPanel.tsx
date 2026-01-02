/**
 * ChatPanel Component
 * Real-time chat between customer and driver with WebSocket support
 * Features: Send/receive messages, typing indicators, read receipts
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input, Button, Avatar, Spin, Badge, Typography } from 'antd';
import type { InputRef } from 'antd';
import {
  SendOutlined,
  UserOutlined,
  CarOutlined,
  CloseOutlined,
  MessageOutlined
} from '@ant-design/icons';
import {
  sendChatMessage,
  getChatMessages,
  markMessagesRead,
  updateTypingIndicator,
  getWebSocketUrl,
  ChatMessage
} from '../../api/api';

const { Text } = Typography;

interface ChatPanelProps {
  orderId: number;
  userType: 'customer' | 'driver';
  userId: number;
  userName?: string;
  otherPartyName?: string;
  isOpen: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({
  orderId,
  userType,
  userId,
  userName,
  otherPartyName,
  isOpen,
  onClose,
  onUnreadCountChange
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<InputRef>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Connect to WebSocket
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const wsUrl = `${getWebSocketUrl()}/${userType}/${userId}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('Chat WebSocket connected');
        setWsConnected(true);

        // Subscribe to order topic
        ws.send(JSON.stringify({
          type: 'subscribe',
          topic: `order:${orderId}`
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'chat_message' && data.data) {
            const newMessage = data.data;
            // Only add if it's for this order and not from us
            if (newMessage.order_id === orderId && newMessage.sender_type !== userType) {
              setMessages(prev => [...prev, {
                id: newMessage.id,
                sender_type: newMessage.sender_type,
                sender_id: newMessage.sender_id,
                sender_name: newMessage.sender_name,
                message: newMessage.message,
                message_type: newMessage.message_type || 'text',
                is_read: false,
                is_delivered: true,
                created_at: newMessage.created_at
              }]);
              scrollToBottom();

              // Mark as read if panel is open
              if (isOpen) {
                markMessagesRead(orderId, userType, userId);
              }
            }
          } else if (data.type === 'typing_indicator') {
            if (data.data?.order_id === orderId && data.data?.sender_type !== userType) {
              setOtherTyping(data.data.is_typing);
            }
          } else if (data.type === 'read_receipt') {
            // Update message read status
            if (data.data?.order_id === orderId) {
              setMessages(prev => prev.map(m => ({
                ...m,
                is_read: m.sender_type === userType ? true : m.is_read
              })));
            }
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      ws.onclose = () => {
        console.log('Chat WebSocket disconnected');
        setWsConnected(false);

        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          if (isOpen) connectWebSocket();
        }, 3000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }, [orderId, userType, userId, isOpen, scrollToBottom]);

  // Load messages
  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getChatMessages(orderId);
      if (response.success && response.messages) {
        setMessages(response.messages);
        scrollToBottom();

        // Mark as read
        if (isOpen) {
          await markMessagesRead(orderId, userType, userId);
          onUnreadCountChange?.(0);
        }
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  }, [orderId, userType, userId, isOpen, scrollToBottom, onUnreadCountChange]);

  // Send message
  const handleSend = async () => {
    if (!inputValue.trim() || sending) return;

    const messageText = inputValue.trim();
    setInputValue('');
    setSending(true);

    // Optimistically add message
    const tempMessage: ChatMessage = {
      id: Date.now(),
      sender_type: userType,
      sender_id: userId,
      sender_name: userName,
      message: messageText,
      message_type: 'text',
      is_read: false,
      is_delivered: false,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempMessage]);
    scrollToBottom();

    try {
      const response = await sendChatMessage(orderId, userType, userId, messageText, userName);
      if (response.success) {
        // Update with real message data
        setMessages(prev => prev.map(m =>
          m.id === tempMessage.id ? { ...m, id: response.message.id, is_delivered: true } : m
        ));
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove failed message
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
    } finally {
      setSending(false);
    }
  };

  // Handle typing indicator
  const handleTyping = () => {
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send typing indicator
    updateTypingIndicator(orderId, userType, userId, true).catch(() => {});

    // Clear typing after 2 seconds of no typing
    typingTimeoutRef.current = setTimeout(() => {
      updateTypingIndicator(orderId, userType, userId, false).catch(() => {});
    }, 2000);
  };

  // Initialize
  useEffect(() => {
    if (isOpen) {
      loadMessages();
      connectWebSocket();
      inputRef.current?.focus();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [isOpen, loadMessages, connectWebSocket]);

  // Scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) return null;

  return (
    <div className="chat-panel">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-info">
          <Avatar
            icon={userType === 'customer' ? <CarOutlined /> : <UserOutlined />}
            style={{ backgroundColor: userType === 'customer' ? '#52c41a' : '#1890ff' }}
          />
          <div>
            <Text strong>{otherPartyName || (userType === 'customer' ? 'Driver' : 'Customer')}</Text>
            {wsConnected && <Badge status="success" text="Online" style={{ marginLeft: 8 }} />}
          </div>
        </div>
        <Button
          type="text"
          icon={<CloseOutlined />}
          onClick={onClose}
        />
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {loading ? (
          <div className="chat-loading">
            <Spin />
          </div>
        ) : messages.length === 0 ? (
          <div className="chat-empty">
            <MessageOutlined style={{ fontSize: 48, color: '#ccc' }} />
            <Text type="secondary">No messages yet</Text>
            <Text type="secondary">Send a message to start chatting</Text>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`chat-message ${msg.sender_type === userType ? 'sent' : 'received'}`}
              >
                <div className="message-bubble">
                  <Text>{msg.message}</Text>
                  <div className="message-meta">
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {formatTime(msg.created_at)}
                    </Text>
                    {msg.sender_type === userType && (
                      <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>
                        {msg.is_read ? '✓✓' : msg.is_delivered ? '✓' : '○'}
                      </Text>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {otherTyping && (
              <div className="chat-message received">
                <div className="message-bubble typing">
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="chat-input">
        <Input
          ref={inputRef}
          placeholder="Type a message..."
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            handleTyping();
          }}
          onPressEnter={handleSend}
          disabled={sending}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSend}
          loading={sending}
          disabled={!inputValue.trim()}
        />
      </div>

      <style>{`
        .chat-panel {
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 360px;
          height: 500px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.15);
          display: flex;
          flex-direction: column;
          z-index: 1000;
          overflow: hidden;
        }

        .chat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid #f0f0f0;
          background: #fafafa;
        }

        .chat-header-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .chat-loading, .chat-empty {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .chat-message {
          display: flex;
          max-width: 80%;
        }

        .chat-message.sent {
          align-self: flex-end;
        }

        .chat-message.received {
          align-self: flex-start;
        }

        .message-bubble {
          padding: 8px 12px;
          border-radius: 16px;
          max-width: 100%;
          word-wrap: break-word;
        }

        .chat-message.sent .message-bubble {
          background: #1890ff;
          color: white;
          border-bottom-right-radius: 4px;
        }

        .chat-message.received .message-bubble {
          background: #f0f0f0;
          border-bottom-left-radius: 4px;
        }

        .message-meta {
          display: flex;
          justify-content: flex-end;
          margin-top: 4px;
        }

        .chat-message.sent .message-meta {
          color: rgba(255,255,255,0.7);
        }

        .message-bubble.typing {
          display: flex;
          gap: 4px;
          padding: 12px 16px;
        }

        .typing-dot {
          width: 8px;
          height: 8px;
          background: #888;
          border-radius: 50%;
          animation: typing 1.4s infinite ease-in-out;
        }

        .typing-dot:nth-child(1) { animation-delay: 0s; }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }

        @keyframes typing {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-8px); }
        }

        .chat-input {
          display: flex;
          gap: 8px;
          padding: 12px;
          border-top: 1px solid #f0f0f0;
        }

        .chat-input input {
          flex: 1;
        }

        @media (max-width: 480px) {
          .chat-panel {
            width: 100%;
            height: 100%;
            bottom: 0;
            right: 0;
            border-radius: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default ChatPanel;
