import React, { useState } from 'react';
import { Brain, Send } from 'lucide-react';
import Button from '../ui/Button';

interface AIOnboardingAssistantProps {
  vendor: any;
  // onSuggestionApply: (suggestion: string) => void;
}

const AIOnboardingAssistant: React.FC<AIOnboardingAssistantProps> = ({ 
  vendor, 
  // onSuggestionApply 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: '1',
      type: 'ai',
      content: `Hello! I'm analyzing ${vendor.companyName}'s onboarding progress. I can help identify bottlenecks and suggest optimizations.`,
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Simulate AI response
    await new Promise(resolve => setTimeout(resolve, 2000));

    const aiResponse = generateAIResponse(inputMessage, vendor);
    const aiMessage = {
      id: (Date.now() + 1).toString(),
      type: 'ai',
      content: aiResponse,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, aiMessage]);
    setIsTyping(false);
  };

  const generateAIResponse = (userInput: string, vendor: any): string => {
    const input = userInput.toLowerCase();
    
    if (input.includes('stuck') || input.includes('delay') || input.includes('slow')) {
      return `I've analyzed ${vendor.companyName}'s onboarding and identified potential delays in the ${vendor.onboardingPhase} phase. The main blockers appear to be missing documentation and pending approvals. I recommend: 1) Sending automated document requests, 2) Scheduling a follow-up call, 3) Escalating to the onboarding manager if needed.`;
    }
    
    if (input.includes('document') || input.includes('upload')) {
      const missingDocs = Object.entries(vendor.requiredDocuments)
        .filter(([_, uploaded]) => !uploaded)
        .map(([doc, _]) => doc.replace(/([A-Z])/g, ' $1'));
      
      if (missingDocs.length > 0) {
        return `${vendor.companyName} is missing ${missingDocs.length} required documents: ${missingDocs.join(', ')}. I suggest sending a personalized email with document templates and offering upload assistance. This could reduce onboarding time by 3-5 days.`;
      } else {
        return `All required documents have been uploaded for ${vendor.companyName}. Great progress!`;
      }
    }
    
    if (input.includes('zip') || input.includes('payment')) {
      if (vendor.zipStatus === 'not_uploaded') {
        return `${vendor.companyName} hasn't been uploaded to ZIP yet, which will block payment processing. I recommend initiating the ZIP upload process immediately and collecting any missing banking information.`;
      } else {
        return `ZIP status for ${vendor.companyName} is ${vendor.zipStatus}. Payment processing setup is progressing well.`;
      }
    }
    
    if (input.includes('risk') || input.includes('compliance')) {
      return `${vendor.companyName} has a ${vendor.riskRating} risk rating. ${vendor.riskRating === 'high' ? 'I recommend enhanced due diligence and additional documentation.' : 'The risk profile looks manageable with standard onboarding procedures.'}`;
    }
    
    if (input.includes('timeline') || input.includes('completion')) {
      const estimatedDays = Math.floor(Math.random() * 10) + 5;
      return `Based on current progress and similar vendors, I estimate ${vendor.companyName} will complete onboarding in approximately ${estimatedDays} days. To accelerate this, focus on document collection and streamlining the approval process.`;
    }
    
    // Default response
    return `I'm analyzing ${vendor.companyName}'s onboarding progress. Current phase: ${vendor.onboardingPhase.replace('_', ' ')}. Ask me about specific aspects like documents, timeline, risks, or ZIP status for detailed insights and recommendations.`;
  };

  const quickSuggestions = [
    'What documents are missing?',
    'How can we speed up onboarding?',
    'What are the main blockers?',
    'Check ZIP upload status',
    'Analyze risk factors'
  ];

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-40">
        <Button
          variant="primary"
          onClick={() => setIsOpen(true)}
          leftIcon={<Brain size={20} />}
          className="rounded-full shadow-lg hover:shadow-xl transition-shadow duration-300"
        >
          AI Assistant
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 w-96 bg-white rounded-lg shadow-xl border border-neutral-200 overflow-hidden">
      <div className="bg-gradient-to-r from-primary-600 to-secondary-600 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brain className="h-5 w-5" />
            <h3 className="font-medium">AI Onboarding Assistant</h3>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="text-white hover:text-neutral-200"
          >
            ×
          </button>
        </div>
        <p className="text-sm text-primary-100 mt-1">
          Analyzing {vendor.companyName}
        </p>
      </div>

      <div className="h-80 overflow-y-auto p-4 space-y-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                message.type === 'user'
                  ? 'bg-primary-600 text-white'
                  : 'bg-neutral-100 text-neutral-900'
              }`}
            >
              <p className="text-sm">{message.content}</p>
              <p className="text-xs opacity-70 mt-1">
                {new Date(message.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-neutral-100 p-3 rounded-lg">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Suggestions */}
      <div className="p-3 border-t border-neutral-200 bg-neutral-50">
        <p className="text-xs text-neutral-600 mb-2">Quick questions:</p>
        <div className="flex flex-wrap gap-1">
          {quickSuggestions.map((suggestion, index) => {
            const key = `${index}`;
            return (
              <button
                key={key}
                onClick={() => setInputMessage(suggestion)}
                className="text-xs bg-white border border-neutral-200 rounded-full px-2 py-1 hover:bg-neutral-100 transition-colors duration-150"
              >
                {suggestion}
              </button>
            );  
          })}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-neutral-200">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask about onboarding progress..."
            className="flex-1 text-sm border border-neutral-300 rounded-md px-3 py-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <Button
            variant="primary"
            size="sm"
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isTyping}
            leftIcon={<Send size={16} />}
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AIOnboardingAssistant;