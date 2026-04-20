import { useState, useRef, useEffect } from 'react';
import {
  SparklesIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  LightBulbIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIAssistantProps {
  context: string;
  title?: string;
  placeholder?: string;
  contextData?: any; // Real-time data from the current tab
}

export default function AIAssistant({ context, title, placeholder, contextData }: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [insights, setInsights] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-generate insights when context data changes
  useEffect(() => {
    if (contextData && isOpen && !isMinimized) {
      generateInsights();
    }
  }, [contextData, context]);

  const generateInsights = async () => {
    try {
      const token = localStorage.getItem('crmToken');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/super-admin/ai-assist`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            message: `Based on the current ${context} data, provide 3 key insights or observations. Data summary: ${JSON.stringify(contextData).substring(0, 500)}`,
            context,
            conversationHistory: [],
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const insightsList = data.message
          .split('\n')
          .filter((line: string) => line.trim().startsWith('-') || line.trim().match(/^\d+\./))
          .slice(0, 3);
        setInsights(insightsList);
      }
    } catch (error) {
      console.error('Failed to generate insights:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('crmToken');

      // Add context data to the message for better understanding
      const enhancedMessage = contextData
        ? `${inputMessage}\n\nContext Data: ${JSON.stringify(contextData).substring(0, 300)}`
        : inputMessage;

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/super-admin/ai-assist`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            message: enhancedMessage,
            context,
            conversationHistory: messages,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('AI Assistant error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const suggestedQuestions = {
    overview: [
      'What patterns do you see in user growth?',
      'Any anomalies in the current metrics?',
      'How can I improve conversion rates?',
    ],
    users: [
      'What are best practices for role management?',
      'How should I handle inactive users?',
      'Security recommendations for user access?',
    ],
    'tech-stack': [
      'Should I upgrade any technologies?',
      'Performance optimization tips?',
      'What are potential security risks?',
    ],
    database: [
      'How can I optimize this query?',
      'What indexes should I add?',
      'Data integrity concerns?',
    ],
    apis: [
      'How to improve API response times?',
      'Which endpoints are underperforming?',
      'Rate limiting recommendations?',
    ],
    logs: [
      'Any suspicious activity patterns?',
      'What events should I investigate?',
      'Compliance concerns?',
    ],
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-full shadow-2xl hover:shadow-orange-500/50 hover:scale-110 transition-all duration-300 z-50 group"
      >
        <SparklesIcon className="w-6 h-6 animate-pulse" />
        <span className="absolute -top-12 right-0 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          AI Learning Assistant
        </span>
      </button>
    );
  }

  return (
    <div
      className={`fixed bottom-6 right-6 bg-[#161625] rounded-2xl shadow-2xl transition-all duration-300 z-50 ${
        isMinimized ? 'w-80 h-16' : 'w-[450px] h-[700px]'
      }`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-t-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SparklesIcon className="w-6 h-6" />
          <div>
            <h3 className="font-bold">{title || 'AI Learning Assistant'}</h3>
            <p className="text-xs text-rose-100">Observing & Learning - Read Only Mode</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="hover:bg-[#161625]/20 p-1 rounded transition-colors"
          >
            {isMinimized ? (
              <ChevronUpIcon className="w-5 h-5" />
            ) : (
              <ChevronDownIcon className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="hover:bg-[#161625]/20 p-1 rounded transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* AI Insights Panel */}
          {insights.length > 0 && (
            <div className="bg-gradient-to-r from-orange-50 to-rose-50 border-b border-rose-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <LightBulbIcon className="w-5 h-5 text-purple-400" />
                <h4 className="font-semibold text-rose-900">AI Observations</h4>
              </div>
              <div className="space-y-1">
                {insights.slice(0, 2).map((insight, index) => (
                  <p key={index} className="text-xs text-rose-400">
                    {insight.replace(/^[-•\d.]\s*/, '')}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ height: insights.length > 0 ? 'calc(700px - 280px)' : 'calc(700px - 180px)' }}>
            {messages.length === 0 && (
              <div className="space-y-4">
                <div className="text-center py-6">
                  <SparklesIcon className="w-12 h-12 text-orange-300 mx-auto mb-4" />
                  <p className="text-[#94A3B8] font-semibold mb-2">
                    AI Learning Mode
                  </p>
                  <p className="text-[#94A3B8] text-sm px-4">
                    I'm observing this {context} section to learn and provide insights. Ask me anything to improve your understanding!
                  </p>
                </div>

                {/* Suggested Questions */}
                {(suggestedQuestions as any)[context] && (
                  <div className="bg-[#12121f] rounded-xl p-4">
                    <h5 className="text-sm font-semibold text-[#CBD5E1] mb-3 flex items-center gap-2">
                      <ChartBarIcon className="w-4 h-4" />
                      Suggested Questions
                    </h5>
                    <div className="space-y-2">
                      {(suggestedQuestions as any)[context].map((question: string, index: number) => (
                        <button
                          key={index}
                          onClick={() => setInputMessage(question)}
                          className="w-full text-left text-sm text-purple-400 hover:bg-rose-500/10 p-2 rounded-lg transition-colors"
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-yellow-500/10 border-2 border-yellow-200 rounded-xl p-3">
                  <p className="text-xs text-yellow-400">
                    <strong>🔒 Read-Only Mode:</strong> This AI observes and learns to provide insights. It cannot perform actions or modify data without your explicit approval.
                  </p>
                </div>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                      : 'bg-[#1c1c30] text-[#F1F5F9] border-2 border-indigo-100'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  <p
                    className={`text-xs mt-2 ${
                      message.role === 'user' ? 'text-rose-100' : 'text-[#94A3B8]'
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-[#1c1c30] rounded-2xl px-4 py-3 border-2 border-indigo-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-purple-400 font-medium">AI is analyzing...</span>
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full animate-bounce" />
                      <div
                        className="w-2 h-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full animate-bounce"
                        style={{ animationDelay: '0.1s' }}
                      />
                      <div
                        className="w-2 h-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full animate-bounce"
                        style={{ animationDelay: '0.2s' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-[#2a2a44] p-4 bg-[#12121f]">
            <div className="flex items-end gap-2">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about this section..."
                rows={2}
                className="flex-1 resize-none rounded-xl border-2 border-[#2a2a44] focus:border-rose-500 focus:ring-4 focus:ring-indigo-500/20 transition-all p-3 text-sm bg-[#161625]"
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-3 rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <PaperAirplaneIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
