import React, { useState, useEffect, useRef } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  requiresApproval?: boolean;
  codeChanges?: CodeChange[];
}

interface CodeChange {
  filePath: string;
  originalCode: string;
  newCode: string;
  description: string;
  changeType: 'add' | 'modify' | 'delete';
}

interface AICodeAssistantProps {
  userEmail: string;
  currentPage: string;
  pageContext?: any;
  isOpen: boolean;
  onClose: () => void;
}

export const AICodeAssistant: React.FC<AICodeAssistantProps> = ({
  userEmail,
  currentPage,
  pageContext,
  isOpen,
  onClose
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "👋 Hi! I'm your AI Code Assistant powered by Claude 4.5 Sonnet. I can help you generate code, modify files, and deploy changes. All modifications require your approval before being applied. What would you like to build today?",
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<CodeChange[] | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check authorization
  const isAuthorized = userEmail === 'ethan@zietra.com';

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim()) return;

    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('crmToken');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/ai-code/analyze`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            command: messageText,
            currentPage,
            pageContext,
            conversationHistory: messages,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();

      // Add assistant response
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response || 'I analyzed your request. Please review the code changes below.',
        timestamp: new Date(),
        requiresApproval: data.codeChanges && data.codeChanges.length > 0,
        codeChanges: data.codeChanges,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Set pending changes if needed
      if (data.codeChanges && data.codeChanges.length > 0) {
        setPendingChanges(data.codeChanges);
      }
    } catch (error) {
      console.error('Code Assistant error:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: '❌ Sorry, I encountered an error. Please try again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!pendingChanges) return;

    setIsLoading(true);
    try {
      const token = localStorage.getItem('crmToken');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/ai-code/apply`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            changes: pendingChanges,
            currentPage,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to apply changes');
      }

      const data = await response.json();

      // Add success message
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `✅ Changes applied successfully!\n\n📁 Files modified: ${data.filesModified?.join(', ')}\n🔄 Commit: ${data.commitHash}\n\nYour changes are now live!`,
          timestamp: new Date(),
        },
      ]);

      setPendingChanges(null);
    } catch (error) {
      console.error('Apply error:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: '❌ Failed to apply changes. Please try again or make the changes manually.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = () => {
    setPendingChanges(null);
    setMessages(prev => [
      ...prev,
      {
        role: 'assistant',
        content: 'Understood. Changes rejected. Feel free to ask for different modifications!',
        timestamp: new Date(),
      },
    ]);
  };

  if (!isAuthorized || !isOpen) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        width: '384px',
        height: '600px',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 99999,
        border: '1px solid #e5e7eb'
      }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-[#161625] rounded-full flex items-center justify-center">
            <span className="text-2xl">💻</span>
          </div>
          <div>
            <h3 className="font-bold text-lg">Code Assistant</h3>
            <p className="text-xs text-pink-100">Powered by Claude 4.5 Sonnet</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-white hover:text-gray-200 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#12121f]">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-pink-600 text-white'
                  : 'bg-[#161625] text-[#E2E8F0] border border-[#2a2a44]'
              }`}
            >
              <div className="text-sm whitespace-pre-wrap leading-relaxed">
                {message.content}
              </div>
              <p className="text-xs mt-2 opacity-70">
                {new Date(message.timestamp).toLocaleTimeString()}
              </p>

              {/* Code Changes Preview */}
              {message.requiresApproval && message.codeChanges && pendingChanges && (
                <div className="mt-4 bg-gradient-to-r from-green-50 to-orange-50 border-2 border-green-300 rounded-lg p-4">
                  <div className="text-sm font-bold text-green-400 mb-3 flex items-center">
                    <span className="text-lg mr-2">📝</span>
                    Code Changes Ready for Approval
                  </div>

                  {message.codeChanges.map((change, idx) => (
                    <div key={idx} className="mb-3 last:mb-0">
                      <div className="space-y-2 text-xs">
                        <div className="flex items-start">
                          <span className="font-semibold text-[#CBD5E1] mr-2">📁 File:</span>
                          <span className="text-[#F1F5F9] break-all">{change.filePath}</span>
                        </div>
                        <div className="flex items-start">
                          <span className="font-semibold text-[#CBD5E1] mr-2">📝 Change:</span>
                          <span className="text-[#F1F5F9]">{change.description}</span>
                        </div>
                        <div className="bg-gray-900 rounded p-2 overflow-x-auto max-h-32 overflow-y-auto">
                          <pre className="text-xs text-green-400 font-mono">{change.newCode.substring(0, 200)}...</pre>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="flex space-x-2 mt-4">
                    <button
                      onClick={handleApprove}
                      disabled={isLoading}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold text-sm py-3 px-4 rounded-lg shadow-md disabled:opacity-50 transition-all transform hover:scale-105"
                    >
                      ✓ Approve & Apply Changes
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={isLoading}
                      className="bg-red-500 hover:bg-red-600 text-white font-bold text-sm py-3 px-4 rounded-lg shadow-md disabled:opacity-50 transition-all"
                    >
                      ✗ Reject
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[#161625] border border-[#2a2a44] rounded-lg p-3">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-pink-600 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-pink-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-pink-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-[#161625] border-t border-[#2a2a44] rounded-b-lg">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(inputMessage);
          }}
          className="flex space-x-2"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Describe the code you want to generate..."
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-[#33335a] rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !inputMessage.trim()}
            className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};

export default AICodeAssistant;
