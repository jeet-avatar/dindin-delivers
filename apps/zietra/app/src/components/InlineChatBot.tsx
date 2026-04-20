import { useState, useRef, useEffect } from 'react';
import {
  SparklesIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CheckCircleIcon,
  XCircleIcon,
  CodeBracketIcon,
} from '@heroicons/react/24/outline';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestion?: CodeSuggestion;
}

interface CodeSuggestion {
  type: 'ui-improvement' | 'code-change';
  description: string;
  filePath: string;
  oldCode?: string;
  newCode: string;
  reasoning: string;
}

interface InlineChatBotProps {
  context: string;
  title: string;
  contextData?: any;
  actionMode?: boolean; // New prop to enable action mode
}

export default function InlineChatBot({
  context,
  title,
  contextData,
  actionMode = false
}: InlineChatBotProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [applyingChange, setApplyingChange] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      const enhancedMessage = contextData
        ? `${inputMessage}\n\nContext: ${JSON.stringify(contextData).substring(0, 300)}`
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
            actionMode, // Tell backend if we want actionable suggestions
            currentScreen: window.location.pathname,
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
        suggestion: data.suggestion, // Backend can return code suggestions
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

  const handleApproveChange = async (suggestion: CodeSuggestion) => {
    setApplyingChange(true);

    // Copy code to clipboard for easy manual application
    try {
      await navigator.clipboard.writeText(suggestion.newCode);

      const confirmMessage: Message = {
        role: 'assistant',
        content: `✅ Code copied to clipboard!\n\n📋 Instructions:\n1. The code has been copied to your clipboard\n2. Open ${suggestion.filePath} in your editor\n3. Find the section to update\n4. Paste and apply the changes\n5. Save the file\n\nOr you can ask me (Claude Code) to apply this change for you by saying:\n"Apply the code suggestion to ${suggestion.filePath}"`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, confirmMessage]);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: `📝 Please manually apply this code to ${suggestion.filePath}:\n\n${suggestion.newCode}\n\nOr ask me (Claude Code) to apply it for you.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setApplyingChange(false);
    }
  };

  const handleRejectChange = (suggestion: CodeSuggestion) => {
    const rejectMessage: Message = {
      role: 'assistant',
      content: '👍 Understood. Change rejected. Feel free to ask for alternative suggestions!',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, rejectMessage]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="bg-gradient-to-br from-orange-50 to-rose-50 rounded-xl border-2 border-orange-200 overflow-hidden shadow-lg">
      {/* Header */}
      <div
        className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 flex items-center justify-between cursor-pointer hover:from-indigo-700 hover:to-purple-700 transition-all"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#161625]/20 rounded-lg flex items-center justify-center">
            <SparklesIcon className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-sm">{title}</h3>
            <p className="text-xs text-orange-900">
              {actionMode ? '⚡ AI Assistant - Action Mode (Approval Required)' : 'AI Learning Assistant - Read Only'}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="hover:bg-[#161625]/20 p-2 rounded-lg transition-colors"
          aria-label={isExpanded ? "Collapse chat" : "Expand chat"}
        >
          {isExpanded ? (
            <ChevronUpIcon className="w-5 h-5" />
          ) : (
            <ChevronDownIcon className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="bg-[#161625]">
          {/* Messages */}
          <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
            {messages.length === 0 && (
              <div className="text-center py-6">
                <SparklesIcon className="w-12 h-12 text-orange-300 mx-auto mb-3" />
                <p className="text-sm text-[#94A3B8] font-semibold mb-1">
                  {actionMode ? 'AI Ready to Assist' : 'AI Observing & Learning'}
                </p>
                <p className="text-xs text-[#94A3B8]">
                  {actionMode
                    ? 'I can analyze the UI and suggest improvements. All changes require your approval!'
                    : 'Ask me anything about this section. I\'m here to provide insights and help you understand the data better!'}
                </p>
                <div className={`mt-4 border rounded-lg p-3 ${
                  actionMode
                    ? 'bg-green-500/10 border-green-200'
                    : 'bg-yellow-500/10 border-yellow-200'
                }`}>
                  <p className="text-xs font-semibold mb-1">
                    {actionMode ? '⚡ Action Mode Enabled' : '🔒 Read-Only Mode'}
                  </p>
                  <p className="text-xs">
                    {actionMode
                      ? 'I can suggest code changes to improve this UI. You must approve each change before it\'s applied.'
                      : 'This AI observes and learns. No actions will be performed without your approval.'}
                  </p>
                </div>
              </div>
            )}

            {messages.map((message, index) => (
              <div key={index} className="space-y-2">
                <div
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-4 py-2 ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                        : 'bg-[#1c1c30] text-[#F1F5F9] border border-indigo-100'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        message.role === 'user' ? 'text-orange-900' : 'text-[#94A3B8]'
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                {/* Code Suggestion Card */}
                {message.suggestion && (
                  <div className="ml-4 bg-gradient-to-br from-orange-50 to-rose-50 border-2 border-orange-300 rounded-xl p-4 shadow-md">
                    <div className="flex items-center gap-2 mb-3">
                      <CodeBracketIcon className="w-5 h-5 text-indigo-400" />
                      <h4 className="font-bold text-sm text-[#F1F5F9]">Suggested Change</h4>
                      <span className="ml-auto px-2 py-1 bg-orange-500/15 text-orange-400 text-xs font-semibold rounded-full">
                        Requires Approval
                      </span>
                    </div>

                    <p className="text-sm text-[#CBD5E1] mb-3">{message.suggestion.description}</p>

                    <div className="bg-[#161625] rounded-lg p-3 mb-3 border border-[#2a2a44]">
                      <p className="text-xs text-[#94A3B8] mb-1">
                        <strong>File:</strong> {message.suggestion.filePath}
                      </p>
                      <p className="text-xs text-[#94A3B8]">
                        <strong>Reasoning:</strong> {message.suggestion.reasoning}
                      </p>
                    </div>

                    {/* Code Preview */}
                    <div className="bg-gray-900 rounded-lg p-3 mb-3 max-h-48 overflow-y-auto">
                      <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
                        {message.suggestion.newCode}
                      </pre>
                    </div>

                    {/* Approval Buttons */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleApproveChange(message.suggestion!)}
                        disabled={applyingChange}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 transition-all shadow-md"
                      >
                        <CheckCircleIcon className="w-5 h-5" />
                        {applyingChange ? 'Applying...' : 'Approve & Apply'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectChange(message.suggestion!)}
                        disabled={applyingChange}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-lg font-semibold hover:from-red-700 hover:to-pink-700 disabled:opacity-50 transition-all shadow-md"
                      >
                        <XCircleIcon className="w-5 h-5" />
                        Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-[#1c1c30] rounded-xl px-4 py-2 border border-indigo-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-indigo-400 font-medium">
                      {actionMode ? 'Analyzing UI & generating suggestions...' : 'Analyzing...'}
                    </span>
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-orange-600 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-orange-600 rounded-full animate-bounce [animation-delay:100ms]" />
                      <div className="w-2 h-2 bg-orange-600 rounded-full animate-bounce [animation-delay:200ms]" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-orange-200 p-3 bg-[#12121f]">
            <div className="flex items-end gap-2">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  actionMode
                    ? 'Describe what you want to improve about this UI...'
                    : 'Ask about this section...'
                }
                rows={2}
                className="flex-1 resize-none rounded-lg border-2 border-[#2a2a44] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all p-2 text-sm"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-2 rounded-lg hover:shadow-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                aria-label="Send message"
                title="Send message"
              >
                <PaperAirplaneIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collapsed Preview */}
      {!isExpanded && (
        <div className="bg-[#161625] p-3 text-center">
          <p className="text-xs text-[#94A3B8]">
            {actionMode
              ? '⚡ Click to get AI-powered UI improvements'
              : 'Click to chat with AI about this section'}
          </p>
        </div>
      )}
    </div>
  );
}
