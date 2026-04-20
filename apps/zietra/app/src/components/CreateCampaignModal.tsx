import { useState, useEffect } from 'react';
import {
  XMarkIcon,
  SparklesIcon,
  PaperAirplaneIcon,
  ClockIcon,
  UserGroupIcon,
  ChartBarIcon,
  LightBulbIcon,
  BoltIcon,
  ArrowPathIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { useTheme } from '../contexts/ThemeContext';
import DOMPurify from 'dompurify';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type CampaignStep = 'basics' | 'content' | 'audience' | 'schedule' | 'review';

export function CreateCampaignModal({ isOpen, onClose, onSuccess }: Props) {
  const { gradients } = useTheme();
  const [currentStep, setCurrentStep] = useState<CampaignStep>('basics');
  const [loading, setLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form data
  const [campaignName, setCampaignName] = useState('');
  const [campaignGoal, setCampaignGoal] = useState('');
  const [subject, setSubject] = useState('');
  const [emailContent, setEmailContent] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [sendTime, setSendTime] = useState('immediate');
  const [scheduledDate, setScheduledDate] = useState('');
  const [enableABTest, setEnableABTest] = useState(false);
  const [subjectVariantB, setSubjectVariantB] = useState('');
  const [subjectVariants, setSubjectVariants] = useState<string[]>([]);
  const [selectedVariantA, setSelectedVariantA] = useState(0);
  const [selectedVariantB, setSelectedVariantB] = useState(1);
  const [abTestSplit, setAbTestSplit] = useState(20);
  const [enablePersonalization, setEnablePersonalization] = useState(true);
  const [aiTone, setAiTone] = useState<'professional' | 'friendly' | 'persuasive' | 'casual'>('professional');
  const [showPreview, setShowPreview] = useState(true);
  const [contentMode, setContentMode] = useState<'plain' | 'html'>('plain');
  const [plainTextContent, setPlainTextContent] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setCurrentStep('basics');
      setCampaignName('');
      setCampaignGoal('');
      setSubject('');
      setEmailContent('');
      setPreviewText('');
      setPlainTextContent('');
      setContentMode('plain');
      setError('');
      setSuccess('');
    }
  }, [isOpen]);

  const generateCampaignBasics = async () => {
    setAiGenerating(true);
    setError('');

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('crmToken');
      // Pass whatever the user has typed as context for the AI
      const description = campaignGoal || campaignName || '';
      const response = await fetch(`${apiUrl}/api/campaigns/ai/generate-basics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tone: aiTone,
          description,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Only fill fields that the user hasn't typed yet
        if (!campaignName) setCampaignName(data.name);
        if (!campaignGoal) setCampaignGoal(data.goal);
        // If both were already filled, update both (user explicitly clicked Generate)
        if (campaignName && campaignGoal) {
          setCampaignName(data.name);
          setCampaignGoal(data.goal);
        }
      } else {
        setError(data.error || 'Failed to generate campaign basics');
      }
    } catch (err) {
      setError('Failed to generate campaign basics');
    } finally {
      setAiGenerating(false);
    }
  };

  const generateAISubject = async () => {
    if (!campaignGoal) {
      setError('Please describe your campaign goal first');
      return;
    }

    setAiGenerating(true);
    setError('');

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('crmToken');
      const response = await fetch(`${apiUrl}/api/campaigns/ai/generate-subject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          goal: campaignGoal,
          tone: aiTone,
          campaignName,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Set all 5 variants
        if (data.variants && Array.isArray(data.variants)) {
          setSubjectVariants(data.variants);
          setSubject(data.variants[0] || '');
          if (enableABTest && data.variants[1]) {
            setSubjectVariantB(data.variants[1]);
          }
        } else {
          // Fallback for old API response
          setSubject(data.subject);
          if (enableABTest && data.variantB) {
            setSubjectVariantB(data.variantB);
          }
        }
      } else {
        setError(data.error || 'Failed to generate subject');
      }
    } catch (err) {
      setError('Failed to generate AI subject line');
    } finally {
      setAiGenerating(false);
    }
  };

  const generateAIContent = async () => {
    if (!campaignGoal || !subject) {
      setError('Please add campaign goal and subject first');
      return;
    }

    setAiGenerating(true);
    setError('');

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('crmToken');
      const response = await fetch(`${apiUrl}/api/campaigns/ai/generate-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          goal: campaignGoal,
          subject,
          tone: aiTone,
          personalization: enablePersonalization,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setEmailContent(data.content);
        setPreviewText(data.previewText);
      } else {
        setError(data.error || 'Failed to generate content');
      }
    } catch (err) {
      setError('Failed to generate AI content');
    } finally {
      setAiGenerating(false);
    }
  };

  const optimizeSendTime = async () => {
    setAiGenerating(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('crmToken');
      const response = await fetch(`${apiUrl}/api/campaigns/ai/optimize-send-time`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      const data = await response.json();

      if (response.ok) {
        setScheduledDate(data.optimalTime);
        setSendTime('scheduled');
      }
    } catch (err) {
      console.error('Failed to optimize send time');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleNext = () => {
    const steps: CampaignStep[] = ['basics', 'content', 'audience', 'schedule', 'review'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const steps: CampaignStep[] = ['basics', 'content', 'audience', 'schedule', 'review'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  // Convert plain text to basic HTML for saving
  const getEmailHtml = () => {
    if (emailContent) return emailContent;
    if (plainTextContent) {
      const lines = plainTextContent.split('\n').map(l => l.trim());
      const htmlLines = lines.map(l => l ? `<p style="margin:0 0 12px;color:#333;font-size:15px;line-height:1.6;">${l}</p>` : '<br/>');
      return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">${htmlLines.join('')}</div>`;
    }
    return '';
  };

  const handleCreateCampaign = async () => {
    const finalContent = getEmailHtml();
    if (!campaignName || !subject || !finalContent) {
      setError('Please fill in Campaign Name, Subject, and Email Content');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('crmToken');
      const response = await fetch(`${apiUrl}/api/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: campaignName,
          subject,
          htmlContent: finalContent,
          status: sendTime === 'immediate' ? 'SENDING' : 'SCHEDULED',
          scheduledAt: sendTime === 'scheduled' ? scheduledDate : null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Add selected companies to campaign
        if (selectedCompanies.length > 0) {
          await Promise.all(
            selectedCompanies.map((companyId) =>
              fetch(`${apiUrl}/api/campaigns/${data.campaign.id}/companies/${companyId}`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              })
            )
          );
        }

        setSuccess('Campaign created successfully!');
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1500);
      } else {
        setError(data.error || 'Failed to create campaign');
      }
    } catch (err) {
      setError('Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const stepConfig = {
    basics: { title: 'Campaign Basics', icon: LightBulbIcon },
    content: { title: 'Email Content', icon: SparklesIcon },
    audience: { title: 'Target Audience', icon: UserGroupIcon },
    schedule: { title: 'Schedule & Send', icon: ClockIcon },
    review: { title: 'Review & Launch', icon: ChartBarIcon },
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div
        className="bg-[#161625] border-4 border-black rounded-3xl shadow-2xl max-w-4xl w-full my-8 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Gradient */}
        <div className={`bg-gradient-to-r ${gradients.brand.primary.gradient} p-6 text-white`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-black bg-opacity-10 rounded-xl flex items-center justify-center">
                {(() => {
                  const StepIcon = stepConfig[currentStep]?.icon;
                  return StepIcon ? <StepIcon className="w-6 h-6 text-white" /> : null;
                })()}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Create AI-Powered Campaign</h2>
                <p className="text-white text-sm font-semibold">{stepConfig[currentStep]?.title}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white hover:bg-black hover:bg-opacity-10 p-2 rounded-lg transition-all">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex gap-2">
            {(['basics', 'content', 'audience', 'schedule', 'review'] as CampaignStep[]).map((step, index) => (
              <div
                key={step}
                className={`flex-1 h-2 rounded-full transition-all ${
                  step === currentStep ? 'bg-black' : index < (['basics', 'content', 'audience', 'schedule', 'review'] as CampaignStep[]).indexOf(currentStep) ? 'bg-black bg-opacity-60' : 'bg-black bg-opacity-20'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto"  style={{ maxHeight: 'calc(90vh - 240px)' }}>
          {error && (
            <div className={`mb-4 bg-gradient-to-r ${gradients.semantic.error?.gradient || 'from-red-500 to-red-600'} bg-opacity-10 border-2 border-red-200 text-red-400 px-4 py-3 rounded-xl text-sm font-semibold`}>
              {error}
            </div>
          )}

          {success && (
            <div className={`mb-4 bg-gradient-to-r ${gradients.semantic.success?.gradient || 'from-green-500 to-green-600'} bg-opacity-10 border-2 border-green-200 text-green-400 px-4 py-3 rounded-xl text-sm font-semibold`}>
              {success}
            </div>
          )}

          {/* Step: Basics */}
          {currentStep === 'basics' && (
            <div className="space-y-6">
              {/* AI Generate Basics Button */}
              <div className={`bg-gradient-to-r ${gradients.brand.primary.gradient} bg-opacity-10 border-2 border-orange-200 rounded-xl p-4`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-[#F1F5F9] text-sm">Let AI Create Your Campaign</h3>
                    <p className="text-xs text-[#94A3B8] mt-1">Generate campaign name and goal automatically</p>
                  </div>
                  <button
                    onClick={generateCampaignBasics}
                    disabled={aiGenerating}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r ${gradients.brand.primary.gradient} text-white text-sm font-semibold rounded-lg hover:shadow-lg disabled:opacity-50 transition-all whitespace-nowrap`}
                  >
                    {aiGenerating ? (
                      <>
                        <ArrowPathIcon className="h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <SparklesIcon className="h-4 w-4" />
                        AI Generate
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#CBD5E1] mb-2">Campaign Name *</label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g., Q1 Product Launch"
                  className="w-full px-4 py-3 border border-[#33335a] rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#CBD5E1] mb-2">Campaign Goal *</label>
                <textarea
                  value={campaignGoal}
                  onChange={(e) => setCampaignGoal(e.target.value)}
                  placeholder="Describe what you want to achieve with this campaign..."
                  rows={4}
                  className="w-full px-4 py-3 border border-[#33335a] rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none"
                />
                <p className="text-xs text-[#94A3B8] mt-2">AI will use this to generate personalized content</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#CBD5E1] mb-3">AI Tone</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'professional', label: 'Professional', icon: '💼' },
                    { value: 'friendly', label: 'Friendly', icon: '😊' },
                    { value: 'persuasive', label: 'Persuasive', icon: '🎯' },
                    { value: 'casual', label: 'Casual', icon: '✨' },
                  ].map((tone) => (
                    <button
                      key={tone.value}
                      onClick={() => setAiTone(tone.value as any)}
                      className={`px-4 py-3 rounded-xl font-semibold transition-all border-2 ${
                        aiTone === tone.value
                          ? `bg-gradient-to-r ${gradients.brand.primary.gradient} text-white border-transparent shadow-lg`
                          : 'bg-[#161625] text-[#CBD5E1] border-[#2a2a44] hover:border-orange-300'
                      }`}
                    >
                      <span className="mr-2">{tone.icon}</span>
                      {tone.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step: Content */}
          {currentStep === 'content' && (
            <div className="space-y-0">
              {/* Subject Line Section */}
              <div className="border-b-2 border-[#1c1c30] pb-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-[#CBD5E1]">Email Subject Line *</label>
                  <button
                    onClick={generateAISubject}
                    disabled={aiGenerating || !campaignGoal}
                    className={`inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${gradients.brand.primary.gradient} text-white text-sm font-semibold rounded-lg hover:shadow-lg disabled:opacity-50 transition-all`}
                  >
                    {aiGenerating ? (
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    ) : (
                      <SparklesIcon className="h-4 w-4" />
                    )}
                    AI Generate
                  </button>
                </div>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter subject line..."
                  className="w-full px-4 py-3 border-2 border-[#33335a] rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all"
                />
              </div>

              {/* A/B Testing Section */}
              <div className="border-b-2 border-[#1c1c30] py-6 bg-[#12121f]">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={enableABTest}
                    onChange={(e) => setEnableABTest(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-[#33335a] text-indigo-400 focus:ring-indigo-500"
                  />
                  <div>
                    <label className="text-sm font-semibold text-[#F1F5F9]">Enable A/B Testing</label>
                    <p className="text-sm text-[#94A3B8] mt-1">Test two subject lines to optimize open rates</p>
                  </div>
                </div>
              </div>

              {enableABTest && (
                <div className="bg-[#12121f] rounded-xl p-5">
                  <h3 className="font-semibold text-[#F1F5F9] mb-4 flex items-center gap-2">
                    <SparklesIcon className="h-5 w-5 text-indigo-400" />
                    A/B Test Setup
                  </h3>

                  {/* Show variants if generated */}
                  {subjectVariants.length > 0 && (
                    <div className="mb-4 p-3 rounded-lg" style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-accent)' }}>
                      <p className="text-xs font-semibold text-orange-400 mb-2">AI Generated Variants</p>
                      <div className="space-y-1">
                        {subjectVariants.map((variant, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              if (selectedVariantA === index) {
                                setSubject(variant);
                              } else if (selectedVariantB === index) {
                                setSubjectVariantB(variant);
                              } else {
                                // Set as variant A by default
                                setSubject(variant);
                                setSelectedVariantA(index);
                              }
                            }}
                            className="w-full text-left px-3 py-2 bg-[#161625] rounded-lg text-xs text-[#CBD5E1] hover:bg-orange-500/15 transition-all border border-transparent hover:border-orange-300"
                          >
                            {index + 1}. {variant}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="border-2 border-indigo-500 rounded-lg p-4 bg-[#161625]">
                      <span className="text-xs font-bold text-indigo-400 uppercase tracking-wide">Variant A</span>
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Subject line A"
                        className="w-full mt-2 px-3 py-2 border border-[#33335a] rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
                      />
                    </div>
                    <div className="border-2 border-orange-600 rounded-lg p-4 bg-[#161625]">
                      <span className="text-xs font-bold text-orange-400 uppercase tracking-wide">Variant B</span>
                      <input
                        type="text"
                        value={subjectVariantB}
                        onChange={(e) => setSubjectVariantB(e.target.value)}
                        placeholder="Subject line B"
                        className="w-full mt-2 px-3 py-2 border border-[#33335a] rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
                      />
                    </div>
                  </div>

                  <div className="mt-4 p-4 bg-[#161625] rounded-lg border border-[#2a2a44]">
                    <label className="block text-sm font-semibold text-[#CBD5E1] mb-3">Test Configuration</label>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-[#94A3B8]">Test Split: {abTestSplit}%</span>
                          <span className="text-xs text-[#94A3B8]">Winner: {100 - abTestSplit}%</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="50"
                          step="5"
                          value={abTestSplit}
                          onChange={(e) => setAbTestSplit(parseInt(e.target.value))}
                          className="w-full h-2 bg-gradient-to-r from-orange-200 to-orange-300 rounded-lg appearance-none cursor-pointer accent-orange-600"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-[#94A3B8] mt-2">
                      Test <strong>{abTestSplit}%</strong> of audience, send winner to remaining <strong>{100 - abTestSplit}%</strong>
                    </p>
                  </div>
                </div>
              )}

              {/* Preview Text Section */}
              <div className="border-b-2 border-[#1c1c30] py-6">
                <label className="block text-sm font-semibold text-[#CBD5E1] mb-3">Preview Text</label>
                <input
                  type="text"
                  value={previewText}
                  onChange={(e) => setPreviewText(e.target.value)}
                  placeholder="Text shown in inbox preview..."
                  className="w-full px-4 py-3 border-2 border-[#33335a] rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all"
                />
              </div>

              {/* Email Content Section */}
              <div className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-semibold text-[#CBD5E1]">Email Content *</label>
                    {/* Plain text / HTML toggle */}
                    <div className="flex border-2 border-[#2a2a44] rounded-lg overflow-hidden text-xs font-semibold">
                      <button
                        onClick={() => setContentMode('plain')}
                        className={`px-3 py-1.5 transition-all ${contentMode === 'plain' ? 'bg-indigo-500 text-white' : 'bg-[#161625] text-[#94A3B8] hover:bg-[#12121f]'}`}
                      >
                        Plain Text
                      </button>
                      <button
                        onClick={() => setContentMode('html')}
                        className={`px-3 py-1.5 transition-all ${contentMode === 'html' ? 'bg-indigo-500 text-white' : 'bg-[#161625] text-[#94A3B8] hover:bg-[#12121f]'}`}
                      >
                        HTML
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {contentMode === 'html' && (
                      <button
                        onClick={() => setShowPreview(!showPreview)}
                        className="inline-flex items-center gap-1 px-4 py-2 border-2 border-[#33335a] text-[#CBD5E1] text-sm font-medium rounded-lg hover:bg-[#12121f] transition-all"
                      >
                        <EyeIcon className="h-4 w-4" />
                        {showPreview ? 'Hide Preview' : 'Show Preview'}
                      </button>
                    )}
                    <button
                      onClick={generateAIContent}
                      disabled={aiGenerating || !campaignGoal || !subject}
                      className={`inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${gradients.brand.primary.gradient} text-white text-sm font-medium rounded-lg hover:shadow-lg disabled:opacity-50 transition-all`}
                    >
                      {aiGenerating ? (
                        <ArrowPathIcon className="h-4 w-4 animate-spin" />
                      ) : (
                        <SparklesIcon className="h-4 w-4" />
                      )}
                      AI Generate Content
                    </button>
                  </div>
                </div>

                {/* Plain Text Mode */}
                {contentMode === 'plain' && (
                  <div className="border-2 border-[#2a2a44] rounded-lg overflow-hidden">
                    <div className="bg-[#12121f] px-4 py-2 border-b border-[#2a2a44]">
                      <span className="text-xs text-[#94A3B8] font-semibold">Write your email — type naturally, it will be formatted automatically</span>
                    </div>
                    <textarea
                      value={emailContent ? '' : plainTextContent}
                      onChange={(e) => {
                        setPlainTextContent(e.target.value);
                        setEmailContent(''); // clear AI-generated HTML when user types manually
                      }}
                      placeholder={emailContent ? '(AI-generated HTML content is set — switch to HTML tab to view/edit it, or type here to replace it)' : 'Type your email here...\n\nDear {{firstName}},\n\nI wanted to reach out about...\n\nBest regards,\n{{senderName}}'}
                      rows={14}
                      className="w-full p-4 text-sm text-[#E2E8F0] bg-[#161625] resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                    {emailContent && (
                      <div className="px-4 py-2 bg-green-500/10 border-t border-green-200 flex items-center justify-between">
                        <span className="text-xs text-green-400 font-semibold">AI-generated HTML content is ready</span>
                        <button onClick={() => setEmailContent('')} className="text-xs text-red-500 hover:text-red-400 font-medium">Clear and type manually</button>
                      </div>
                    )}
                  </div>
                )}

                {/* HTML Mode — Split View */}
                {contentMode === 'html' && (
                  <div className={`grid ${showPreview ? 'grid-cols-2' : 'grid-cols-1'} gap-4 border-2 border-[#2a2a44] rounded-lg overflow-hidden`}>
                    <div className={showPreview ? 'border-r-2 border-[#2a2a44]' : ''}>
                      <div className="bg-gray-800 px-4 py-2 border-b border-gray-700">
                        <span className="text-xs text-[#64748B] font-mono font-semibold">HTML Code</span>
                      </div>
                      <textarea
                        value={emailContent}
                        onChange={(e) => setEmailContent(e.target.value)}
                        placeholder="Paste or edit HTML email content..."
                        className="w-full h-96 p-4 font-mono text-sm bg-gray-900 text-green-400 overflow-y-auto resize-none focus:outline-none"
                        style={{ fontFamily: 'Monaco, Consolas, monospace' }}
                      />
                    </div>
                    {showPreview && (
                      <div>
                        <div className={`bg-gradient-to-r ${gradients.brand.primary.gradient} px-4 py-2 border-b border-orange-700`}>
                          <span className="text-xs text-white font-semibold">Live Preview</span>
                        </div>
                        <div
                          className="h-96 overflow-y-auto bg-[#12121f] p-4"
                          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(emailContent) }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-default)' }}>
                <input
                  type="checkbox"
                  checked={enablePersonalization}
                  onChange={(e) => setEnablePersonalization(e.target.checked)}
                  className="w-5 h-5 rounded border-[#33335a] text-indigo-400 focus:ring-indigo-500"
                />
                <div>
                  <label className="text-sm font-semibold text-[#F1F5F9]">Enable AI Personalization</label>
                  <p className="text-xs text-[#94A3B8]">Customize content for each recipient using AI</p>
                </div>
              </div>
            </div>
          )}

          {/* Step: Audience */}
          {currentStep === 'audience' && (
            <div className="space-y-6">
              <div className="text-center py-8">
                <UserGroupIcon className="h-16 w-16 text-[#64748B] mx-auto mb-4" />
                <h3 className="text-lg font-bold text-[#F1F5F9] mb-2">Select Target Companies</h3>
                <p className="text-[#94A3B8] mb-6">Choose which companies to include in this campaign</p>
                <p className="text-sm text-indigo-400 font-medium">
                  You can add companies from the Companies page after creating the campaign
                </p>
              </div>
            </div>
          )}

          {/* Step: Schedule */}
          {currentStep === 'schedule' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-[#CBD5E1] mb-3">When to Send</label>
                <div className="space-y-3">
                  <button
                    onClick={() => setSendTime('immediate')}
                    className={`w-full px-4 py-4 rounded-xl font-semibold transition-all border-2 flex items-center gap-3 ${
                      sendTime === 'immediate'
                        ? `bg-gradient-to-r ${gradients.brand.primary.gradient} text-white border-transparent shadow-lg`
                        : 'bg-[#161625] text-[#CBD5E1] border-[#2a2a44] hover:border-orange-300'
                    }`}
                  >
                    <BoltIcon className="h-6 w-6" />
                    <div className="text-left">
                      <div className="font-bold">Send Immediately</div>
                      <div className={`text-sm ${sendTime === 'immediate' ? 'text-white opacity-90' : 'text-[#94A3B8]'}`}>
                        Campaign will be sent right away
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setSendTime('scheduled')}
                    className={`w-full px-4 py-4 rounded-xl font-semibold transition-all border-2 flex items-center gap-3 ${
                      sendTime === 'scheduled'
                        ? `bg-gradient-to-r ${gradients.brand.primary.gradient} text-white border-transparent shadow-lg`
                        : 'bg-[#161625] text-[#CBD5E1] border-[#2a2a44] hover:border-orange-300'
                    }`}
                  >
                    <ClockIcon className="h-6 w-6" />
                    <div className="text-left">
                      <div className="font-bold">Schedule for Later</div>
                      <div className={`text-sm ${sendTime === 'scheduled' ? 'text-white opacity-90' : 'text-[#94A3B8]'}`}>
                        Choose the best time to send
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {sendTime === 'scheduled' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-[#CBD5E1]">Schedule Date & Time</label>
                    <button
                      onClick={optimizeSendTime}
                      disabled={aiGenerating}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r ${gradients.brand.primary.gradient} text-white text-xs font-semibold rounded-lg hover:shadow-lg disabled:opacity-50 transition-all`}
                    >
                      {aiGenerating ? (
                        <ArrowPathIcon className="h-4 w-4 animate-spin" />
                      ) : (
                        <SparklesIcon className="h-4 w-4" />
                      )}
                      AI Optimize Time
                    </button>
                  </div>
                  <input
                    type="datetime-local"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full px-4 py-3 border border-[#33335a] rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
              )}
            </div>
          )}

          {/* Step: Review */}
          {currentStep === 'review' && (
            <div className="space-y-6">
              <div className="rounded-xl p-6 border-2" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-accent)' }}>
                <h3 className="text-lg font-bold text-[#F1F5F9] mb-4">Campaign Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-[#94A3B8]">Campaign Name:</span>
                    <span className="font-semibold text-[#F1F5F9]">{campaignName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#94A3B8]">Subject Line:</span>
                    <span className="font-semibold text-[#F1F5F9]">{subject}</span>
                  </div>
                  {enableABTest && (
                    <div className="flex justify-between">
                      <span className="text-[#94A3B8]">A/B Testing:</span>
                      <span className="font-semibold text-indigo-400">Enabled</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[#94A3B8]">Personalization:</span>
                    <span className="font-semibold text-[#F1F5F9]">{enablePersonalization ? 'Enabled' : 'Disabled'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#94A3B8]">Send Time:</span>
                    <span className="font-semibold text-[#F1F5F9]">
                      {sendTime === 'immediate' ? 'Immediate' : `Scheduled: ${scheduledDate}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#94A3B8]">AI Tone:</span>
                    <span className="font-semibold text-[#F1F5F9] capitalize">{aiTone}</span>
                  </div>
                </div>
              </div>

              <div className={`bg-gradient-to-r ${gradients.semantic.info?.gradient || gradients.brand.primary.gradient} bg-opacity-10 border-2 border-orange-200 rounded-xl p-4`}>
                <p className="text-sm text-[#E2E8F0]">
                  <strong>Note:</strong> You can add companies to this campaign from the Companies page after creation.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#2a2a44] p-6 bg-[#12121f] flex justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] flex-shrink-0">
          <button
            onClick={handleBack}
            disabled={currentStep === 'basics' || loading}
            className="px-6 py-3 border border-[#33335a] rounded-xl text-[#CBD5E1] hover:bg-[#1c1c30] font-semibold transition-all disabled:opacity-50"
          >
            Back
          </button>

          <div className="flex gap-3">
            {currentStep !== 'review' ? (
              <button
                onClick={handleNext}
                disabled={
                  (currentStep === 'basics' && (!campaignName || !campaignGoal)) ||
                  (currentStep === 'content' && (!subject || !emailContent))
                }
                className={`px-6 py-3 bg-gradient-to-r ${gradients.brand.primary.gradient} text-white rounded-xl hover:shadow-lg disabled:opacity-50 font-semibold transition-all`}
              >
                Next Step
              </button>
            ) : (
              <button
                onClick={handleCreateCampaign}
                disabled={loading || !campaignName || !subject || !emailContent}
                className={`inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r ${gradients.brand.primary.gradient} text-white rounded-xl hover:shadow-lg disabled:opacity-50 font-semibold transition-all`}
              >
                {loading ? (
                  <>
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <PaperAirplaneIcon className="h-5 w-5" />
                    Create Campaign
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateCampaignModal;
