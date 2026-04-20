import { useState } from 'react';
import { SparklesIcon, CheckCircleIcon, PlayIcon } from '@heroicons/react/24/outline';
import { CreateVideoCampaignModal } from './CreateVideoCampaignModal';
import { videoService } from '../services/videoService';
import { useTheme } from '../contexts/ThemeContext';

interface AICampaignGeneratorProps {
  onVideoGenerated?: (videoUrl: string, campaignId: string, name: string) => void;
}

export function AICampaignGenerator({ onVideoGenerated }: AICampaignGeneratorProps) {
  const { gradients } = useTheme();
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showManualCreate, setShowManualCreate] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [progress, setProgress] = useState(0);

  const pollForVideoCompletion = async (campaignId: string) => {
    setIsGenerating(true);
    setShowManualCreate(false); // Close modal
    setCurrentStep('🎬 Creating your personalized video...');
    setProgress(65);

    const maxAttempts = 60; // 5 minutes max (5 seconds * 60)
    let attempts = 0;

    const checkStatus = async () => {
      try {
        const status = await videoService.getCampaignStatus(campaignId);

        if (status.status === 'READY' && status.videoUrl) {
          setProgress(100);
          setCurrentStep('✅ Video ready!');

          // Get campaign details
          const campaign = await videoService.getCampaign(campaignId);

          setTimeout(() => {
            setIsGenerating(false);
            if (onVideoGenerated) {
              onVideoGenerated(status.videoUrl, campaignId, campaign.name);
            }
          }, 1000);
        } else if (status.status === 'FAILED') {
          setIsGenerating(false);
          alert(`Video generation failed: ${status.error || 'Unknown error'}`);
        } else if (attempts < maxAttempts) {
          // Update progress smoothly from 65% to 95%
          const progressIncrement = (attempts / maxAttempts) * 30; // 30% range
          setProgress(Math.min(95, 65 + progressIncrement));

          // Show actual backend status or friendly message
          if (status.currentStep) {
            setCurrentStep(status.currentStep);
          } else {
            // Friendly messages based on progress
            if (progress < 75) {
              setCurrentStep('🎤 Adding voice narration...');
            } else if (progress < 85) {
              setCurrentStep('🎨 Composing video with logos and overlays...');
            } else {
              setCurrentStep('✨ Finalizing your video...');
            }
          }

          attempts++;
          setTimeout(checkStatus, 5000); // Check again in 5 seconds
        } else {
          setIsGenerating(false);
          alert('Video generation is taking longer than expected. Please check back later.');
        }
      } catch (error) {
        console.error('Failed to check video status:', error);
        if (attempts < maxAttempts) {
          attempts++;
          setTimeout(checkStatus, 5000);
        } else {
          setIsGenerating(false);
          alert('Failed to check video status. Please try again.');
        }
      }
    };

    checkStatus();
  };

  const handleAIGenerate = async () => {
    if (!prompt.trim()) {
      alert('Please enter a campaign description');
      return;
    }

    setIsGenerating(true);
    setCurrentStep('🤖 AI is analyzing your request...');
    setProgress(10);

    try {
      // Call AI to generate full campaign from prompt
      setCurrentStep('✨ AI is creating your campaign...');
      setProgress(30);

      const result = await videoService.generateCampaignFromPrompt(prompt);

      setCurrentStep('🎬 Generating video...');
      setProgress(50);

      // Start video generation
      await videoService.generateVideo(result.campaign.id);

      // Start polling for completion
      pollForVideoCompletion(result.campaign.id);
    } catch (error: any) {
      console.error('AI generation failed:', error);
      setIsGenerating(false);
      alert(error.response?.data?.error || 'AI generation failed. Please try manual setup instead.');
    }
  };

  const handleManualSetup = () => {
    setShowManualCreate(true);
  };

  const examplePrompts = [
    'Create a product launch video for our new CRM platform targeting small businesses',
    'Make a customer testimonial video showcasing our success stories',
    'Generate a holiday sale announcement with 25% off promotion',
    'Create an onboarding welcome video for new customers',
    'Make a social media teaser for our upcoming webinar',
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(135deg, var(--bg-base) 0%, var(--bg-deep) 100%)' }}>
      <div className="w-full max-w-4xl relative z-0">
        {!isGenerating ? (
          <>
            {/* Header */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full mb-6 shadow-2xl">
                <SparklesIcon className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-5xl font-bold text-[#F1F5F9] mb-4">
                AI Video Campaign Generator
              </h1>
              <p className="text-xl text-[#94A3B8] max-w-2xl mx-auto">
                Describe your campaign idea in plain English. Our AI will create a professional video campaign in minutes.
              </p>
            </div>

            {/* Main Input Area */}
            <div className="bg-[#161625] rounded-3xl shadow-2xl p-8 mb-8 border-2 border-[#1c1c30]">
              <label className="block text-lg font-semibold text-[#F1F5F9] mb-4">
                What kind of video campaign do you want to create?
              </label>

              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Example: Create a 30-second product demo video for our CRM software, highlighting time-saving automation features with an energetic professional voice..."
                className="w-full h-40 px-6 py-4 border-2 border-[#2a2a44] rounded-2xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all resize-none text-[#F1F5F9] placeholder-[#64748B] text-lg"
              />

              {/* Character Count */}
              <div className="flex justify-between items-center mt-3">
                <p className="text-sm text-[#94A3B8]">
                  {prompt.length} characters • Be specific for best results
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 mt-6">
                <button
                  onClick={handleAIGenerate}
                  disabled={!prompt.trim()}
                  className={`flex-1 px-8 py-4 bg-gradient-to-r ${gradients.brand.primary.gradient} text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <span className="flex items-center justify-center gap-2">
                    <SparklesIcon className="w-6 h-6" />
                    Generate with AI
                  </span>
                </button>

                <button
                  onClick={handleManualSetup}
                  className="px-8 py-4 bg-[#161625] border-2 border-[#33335a] text-[#CBD5E1] rounded-2xl font-semibold text-lg hover:bg-[#12121f] transition-all shadow-md hover:shadow-lg active:scale-95"
                >
                  Manual Setup
                </button>
              </div>
            </div>

            {/* Example Prompts */}
            <div className="bg-[#161625] rounded-2xl shadow-lg p-6 border-2 border-[#1c1c30]">
              <h3 className="font-semibold text-[#F1F5F9] mb-4 flex items-center gap-2">
                <SparklesIcon className="w-5 h-5 text-indigo-400" />
                Example Prompts
              </h3>
              <div className="space-y-2">
                {examplePrompts.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => setPrompt(example)}
                    className="w-full text-left px-4 py-3 rounded-xl text-sm transition-all border hover:border-opacity-60"
                    style={{ background: 'var(--glass-bg)', borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              {[
                { icon: '🎤', title: 'Professional Voices', desc: '20+ AI voices' },
                { icon: '🎬', title: 'Smart Templates', desc: 'Auto-selected visuals' },
                { icon: '⚡', title: 'Instant Generation', desc: 'Ready in minutes' },
              ].map((feature, index) => (
                <div key={index} className="bg-[#161625] rounded-xl p-6 shadow-md text-center border-2 border-[#1c1c30]">
                  <div className="text-4xl mb-2">{feature.icon}</div>
                  <h4 className="font-bold text-[#F1F5F9] mb-1">{feature.title}</h4>
                  <p className="text-sm text-[#94A3B8]">{feature.desc}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="bg-[#161625] rounded-3xl shadow-2xl p-12 text-center border-4 border-orange-200">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full mb-8 shadow-2xl animate-pulse">
              <PlayIcon className="w-12 h-12 text-white" />
            </div>

            <h2 className="text-3xl font-bold text-[#F1F5F9] mb-4">
              Creating Your Video
            </h2>

            <p className="text-lg text-[#94A3B8] mb-8 font-medium">
              {currentStep}
            </p>

            {/* Progress Bar */}
            <div className="w-full max-w-md mx-auto mb-8">
              <div className="h-4 bg-[#252540] rounded-full overflow-hidden shadow-inner">
                <div
                  className={`h-full bg-gradient-to-r ${gradients.brand.primary.gradient} transition-all duration-500 ease-out`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-[#94A3B8] mt-3 font-semibold">{progress}% complete</p>
            </div>

            <div className="bg-blue-500/10 border-2 border-blue-200 rounded-xl p-4 max-w-md mx-auto">
              <p className="text-sm text-blue-900 font-medium">
                ⏱️ <strong>Hang tight!</strong> We're composing your video with voice narration, logos, and overlays. This usually takes 2-3 minutes.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Manual Create Modal */}
      {showManualCreate && (
        <CreateVideoCampaignModal
          isOpen={showManualCreate}
          onClose={() => setShowManualCreate(false)}
          onSuccess={(campaign) => {
            // Start polling for video completion
            pollForVideoCompletion(campaign.id);
          }}
        />
      )}
    </div>
  );
}
