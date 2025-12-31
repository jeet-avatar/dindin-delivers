import React, { useState, useEffect } from 'react';
import { Card, List, Avatar, Typography, Input, Tag, Empty, Spin } from 'antd';
import {
  MessageOutlined,
  SearchOutlined,
  CustomerServiceOutlined,
  UserOutlined,
  DollarOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { getDriverMessages, DriverMessage } from '../../api/api';

const { Title, Text } = Typography;

/**
 * Messages Screen - Aligned with iOS ConversationsListView.swift
 *
 * Features matched from iOS:
 * - Conversations list with unread badges
 * - Customer/Support message threads
 * - Empty state with helpful message
 * - Unread indicator dot
 */

const Messages: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<DriverMessage[]>([]);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const data = await getDriverMessages();
      setConversations(data || []);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const unreadCount = conversations.filter(c => c.is_unread).length;

  const getAvatarColor = (type: string) => {
    switch (type) {
      case 'support': return '#10B981';
      case 'system': return '#F59E0B';
      case 'customer': return '#3B82F6';
      default: return '#6366F1';
    }
  };

  const getAvatarIcon = (type: string) => {
    switch (type) {
      case 'support': return <CustomerServiceOutlined />;
      case 'system': return <DollarOutlined />;
      default: return <UserOutlined />;
    }
  };

  const filteredConversations = conversations.filter(c =>
    c.sender_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.last_message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: 16 }}>
        <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
        <Text type="secondary">Loading messages...</Text>
      </div>
    );
  }

  return (
    <div className="messages-screen">
      {/* Header */}
      <div className="page-header">
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Messages
            {unreadCount > 0 && (
              <Tag color="green" style={{ marginLeft: 12 }}>{unreadCount} new</Tag>
            )}
          </Title>
          <Text type="secondary">Chat with customers and support</Text>
        </div>
      </div>

      {/* Search */}
      <Card className="search-card">
        <Input
          placeholder="Search messages..."
          prefix={<SearchOutlined />}
          size="large"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </Card>

      {/* Conversations List */}
      {filteredConversations.length === 0 ? (
        <Empty
          image={<MessageOutlined style={{ fontSize: 64, color: '#ccc' }} />}
          description={
            <div>
              <Text strong style={{ fontSize: 18, display: 'block' }}>No Messages</Text>
              <Text type="secondary">You'll receive messages from customers and support here.</Text>
            </div>
          }
        />
      ) : (
        <List
          dataSource={filteredConversations}
          renderItem={(conversation) => (
            <Card
              className={`conversation-card ${conversation.is_unread ? 'unread' : ''}`}
              key={conversation.id}
              hoverable
            >
              <div className="conversation-content">
                {/* Unread Indicator */}
                <div className={`unread-dot ${conversation.is_unread ? 'visible' : ''}`} />

                {/* Avatar */}
                <Avatar
                  size={50}
                  style={{ background: getAvatarColor(conversation.sender_type) }}
                  icon={getAvatarIcon(conversation.sender_type)}
                >
                  {conversation.avatar_initial}
                </Avatar>

                {/* Message Content */}
                <div className="message-content">
                  <div className="message-header">
                    <Text
                      strong
                      style={{
                        fontSize: 16,
                        fontWeight: conversation.is_unread ? 700 : 500,
                      }}
                    >
                      {conversation.sender_name}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {conversation.timestamp}
                    </Text>
                  </div>
                  <Text
                    type={conversation.is_unread ? undefined : 'secondary'}
                    style={{
                      fontSize: 14,
                      fontWeight: conversation.is_unread ? 500 : 400,
                    }}
                    ellipsis
                  >
                    {conversation.last_message}
                  </Text>
                </div>

                {/* Chevron */}
                <div className="chevron">›</div>
              </div>
            </Card>
          )}
        />
      )}

      <style>{`
        .messages-screen {
          padding: 0;
        }
        .page-header {
          margin-bottom: 20px;
        }
        .search-card {
          margin-bottom: 20px;
          border-radius: 12px;
        }
        .search-card .ant-card-body {
          padding: 12px;
        }
        .search-input {
          border-radius: 10px;
        }
        .conversation-card {
          margin-bottom: 8px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .conversation-card.unread {
          background: rgba(16, 185, 129, 0.03);
          border-left: 3px solid #10B981;
        }
        .conversation-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }
        .conversation-card .ant-card-body {
          padding: 16px;
        }
        .conversation-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .unread-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: transparent;
          flex-shrink: 0;
        }
        .unread-dot.visible {
          background: #10B981;
        }
        .message-content {
          flex: 1;
          min-width: 0;
        }
        .message-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }
        .chevron {
          font-size: 20px;
          color: #ccc;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
};

export default Messages;
