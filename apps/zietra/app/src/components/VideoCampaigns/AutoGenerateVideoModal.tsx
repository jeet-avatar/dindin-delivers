import { useState, useEffect } from 'react';
import { XMarkIcon, SparklesIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { VoiceSelector } from '../VoiceSelector';

interface AutoGenerateVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (campaignId: string) => void;
}

interface VideoTemplate {
  id: string;
  name: string;
  category: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: number;
}

interface ScriptPreview {
  companyName: string;
  industry: string;
  targetAudience: string;
  narrationScript: string;
  keyMessage: string;
  overlays: Array<{ text: string; timing: string }>;
  callToAction: string;
}

export function AutoGenerateVideoModal({ isOpen, onClose, onSuccess }: AutoGenerateVideoModalProps) {
  // Step 1: Company Info
  const [step, setStep] = useState(1); // 1: Company Info, 2: Voice, 3: Template, 4: Script Preview, 5: Generating
  const [companyName, setCompanyName] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');

  // Step 2: Voice
  const [voiceId, setVoiceId] = useState('');
  const [customVoiceUrl, setCustomVoiceUrl] = useState('');

  // Step 3: Template
  const [templates, setTemplates] = useState<VideoTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Step 4: Script Preview & Edit
  const [scriptPreview, setScriptPreview] = useState<ScriptPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Step 5: Generation
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generationDetails, setGenerationDetails] = useState<any>(null);
  const [campaignId, setCampaignId] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [estimatedTimeLeft, setEstimatedTimeLeft] = useState(3);

  // Load templates when reaching step 3
  useEffect(() => {
    if (step === 3 && templates.length === 0) {
      loadTemplates();
    }
  }, [step]);

  // Poll for progress when in step 5
  useEffect(() => {
    if (step !== 5 || !campaignId) return;

    const pollProgress = async () => {
      try {
        const token = localStorage.getItem('crmToken');
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/video-campaigns/${campaignId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          const campaign = data.campaign;

          // Calculate progress based on elapsed time
          const startTime = new Date(campaign.createdAt).getTime();
          const elapsed = Date.now() - startTime;
          const estimatedTotal = 180000; // 3 minutes
          const progress = Math.min(Math.floor((elapsed / estimatedTotal) * 100), 99);
          const remaining = Math.max(0, Math.ceil((estimatedTotal - elapsed) / 60000));

          setProgressPercent(progress);
          setEstimatedTimeLeft(remaining);

          // If status changed to READY, set to 100%
          if (campaign.status === 'READY') {
            setProgressPercent(100);
            setEstimatedTimeLeft(0);
            // Wait a moment then redirect
            setTimeout(() => {
              onSuccess(campaignId);
              handleClose();
            }, 1000);
          }
        }
      } catch (err) {
        console.error('Failed to fetch progress:', err);
      }
    };

    // Poll immediately
    pollProgress();

    // Then poll every 3 seconds
    const interval = setInterval(pollProgress, 3000);

    return () => clearInterval(interval);
  }, [step, campaignId]);

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const token = localStorage.getItem('crmToken');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/video-campaigns/templates`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);

        // Auto-select first template if available
        if (data.templates && data.templates.length > 0) {
          setSelectedTemplateId(data.templates[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const generateScriptPreview = async () => {
    setIsLoadingPreview(true);
    setError(null);

    try {
      const token = localStorage.getItem('crmToken');

      console.log('🚀 Calling preview-script API...', {
        url: `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/video-campaigns/preview-script`,
        companyName: companyName.trim()
      });

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/video-campaigns/preview-script`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            companyName: companyName.trim(),
            additionalContext: additionalContext.trim() || undefined,
          }),
        }
      );

      console.log('📡 Response status:', response.status, response.statusText);

      let data;
      try {
        data = await response.json();
        console.log('📦 Response data:', data);
      } catch (parseError) {
        console.error('❌ Failed to parse response JSON:', parseError);
        throw new Error('Server returned invalid response. Please try again.');
      }

      if (!response.ok) {
        const errorMsg = data.details || data.error || `Server error: ${response.status}`;
        console.error('❌ API returned error:', errorMsg);
        throw new Error(errorMsg);
      }

      if (!data.preview) {
        console.error('❌ No preview data in response:', data);
        throw new Error('Server did not return script preview data');
      }

      console.log('✅ Script preview loaded successfully');
      setScriptPreview(data.preview);
      setStep(4); // Move to script preview step
    } catch (err: any) {
      console.error('❌ Script preview error:', err);
      setError(err.message || 'Failed to generate script preview. Please try again.');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const regenerateScript = async () => {
    if (!scriptPreview) return;

    setIsRegenerating(true);
    setError(null);

    try {
      const token = localStorage.getItem('crmToken');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/video-campaigns/regenerate-script`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            companyName: companyName.trim(),
            additionalContext: additionalContext.trim() || undefined,
            currentScript: scriptPreview.narrationScript,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to regenerate script');
      }

      setScriptPreview(data.preview);
    } catch (err: any) {
      console.error('Regenerate error:', err);
      setError(err.message || 'Failed to regenerate script');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleNext = () => {
    // Validation
    if (step === 1 && !companyName.trim()) {
      setError('Please enter a company name');
      return;
    }

    if (step === 2 && !voiceId && !customVoiceUrl) {
      setError('Please select a voice for narration');
      return;
    }

    if (step === 3 && !selectedTemplateId) {
      setError('Please select a video template');
      return;
    }

    setError(null);

    // After step 3 (template selection), generate script preview
    if (step === 3) {
      generateScriptPreview();
      return;
    }

    // After step 4 (script preview), generate video
    if (step === 4) {
      handleGenerate();
      return;
    }

    // For steps 1-2, just move to next step
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setError(null);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setGenerationDetails(null);

    try {
      const token = localStorage.getItem('crmToken');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/video-campaigns/auto-generate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            companyName: companyName.trim(),
            additionalContext: additionalContext.trim() || undefined,
            voiceId: voiceId || undefined,
            customVoiceUrl: customVoiceUrl || undefined,
            templateId: selectedTemplateId,
            // Pass script preview data (edited by user)
            ...(scriptPreview && {
              narrationScript: scriptPreview.narrationScript,
              industry: scriptPreview.industry,
              targetAudience: scriptPreview.targetAudience,
              keyMessage: scriptPreview.keyMessage,
              overlays: scriptPreview.overlays,
              callToAction: scriptPreview.callToAction,
            }),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate video');
      }

      setGenerationDetails(data.campaign);
      setCampaignId(data.campaign.id);
      setProgressPercent(0);
      setEstimatedTimeLeft(3);
      setStep(5); // Move to generation progress screen (step 5 now)

      // Don't auto-close - let progress polling handle it
    } catch (err: any) {
      console.error('Auto-generate error:', err);
      setError(err.message || 'Failed to generate video automatically');
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setCompanyName('');
    setAdditionalContext('');
    setVoiceId('');
    setCustomVoiceUrl('');
    setSelectedTemplateId(null);
    setTemplates([]);
    setScriptPreview(null);
    setIsLoadingPreview(false);
    setIsRegenerating(false);
    setError(null);
    setIsGenerating(false);
    setGenerationDetails(null);
    setCampaignId('');
    setProgressPercent(0);
    setEstimatedTimeLeft(3);
    onClose();
  };

  if (!isOpen) return null;

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#161625] rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 p-6 rounded-t-2xl z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SparklesIcon className="w-8 h-8 text-white" />
              <div>
                <h2 className="text-2xl font-bold text-white">AI Auto-Generate Video</h2>
                <p className="text-sm text-purple-100 mt-1">
                  {step === 1 && "Tell us about your company"}
                  {step === 2 && "Choose a voice for narration"}
                  {step === 3 && "Select a video template"}
                  {step === 4 && "Review and edit your script"}
                  {step === 5 && "Generating your video..."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="text-white/80 hover:text-white p-2 rounded-lg transition-all"
              aria-label="Close"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Progress Steps */}
          {step < 5 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    s < step ? 'bg-green-500 text-white' :
                    s === step ? 'bg-[#161625] text-purple-600' :
                    'bg-purple-400 text-purple-100'
                  }`}>
                    {s < step ? '✓' : s}
                  </div>
                  {s < 4 && (
                    <div className={`w-16 h-1 mx-1 rounded transition-all ${
                      s < step ? 'bg-green-500' : 'bg-purple-400'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-6">
              {/* Company Name */}
              <div>
                <label htmlFor="companyName" className="block text-sm font-bold text-[#CBD5E1] mb-2">
                  Company Name *
                </label>
                <input
                  id="companyName"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g., Zietra, Acme Corp, Tech Solutions Inc."
                  className="w-full px-4 py-3 border border-[#33335a] rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-lg"
                  autoFocus
                />
              </div>

              {/* Additional Context */}
              <div>
                <label htmlFor="additionalContext" className="block text-sm font-bold text-[#CBD5E1] mb-2">
                  Additional Context (Optional)
                </label>
                <textarea
                  id="additionalContext"
                  value={additionalContext}
                  onChange={(e) => setAdditionalContext(e.target.value)}
                  placeholder="e.g., We're a B2B SaaS platform for project management, targeting remote teams..."
                  rows={4}
                  className="w-full px-4 py-3 border border-[#33335a] rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                />
                <p className="text-xs text-[#94A3B8] mt-1">
                  Provide details about your industry, target audience, and unique value proposition
                </p>
              </div>

              {/* How It Works */}
              <div className="bg-purple-500/10 border border-purple-200 rounded-xl p-4">
                <h3 className="font-bold text-purple-900 mb-2 flex items-center gap-2">
                  <SparklesIcon className="w-5 h-5" />
                  What Happens Next
                </h3>
                <ul className="text-sm text-purple-800 space-y-1 ml-6 list-disc">
                  <li>AI detects your company's industry automatically</li>
                  <li>Choose from 20+ professional ElevenLabs AI voices</li>
                  <li>Select a video template that matches your brand</li>
                  <li>AI generates script, text overlays, and complete video</li>
                  <li>Video ready in 2-3 minutes!</li>
                </ul>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-blue-500/10 border border-blue-200 rounded-xl p-4 mb-4">
                <p className="text-sm text-blue-900">
                  <span className="font-bold">Company:</span> {companyName}
                  {additionalContext && (
                    <span className="block mt-1 text-blue-400">{additionalContext.substring(0, 100)}{additionalContext.length > 100 ? '...' : ''}</span>
                  )}
                </p>
              </div>

              <div className="border-2 border-purple-200 rounded-xl p-4 max-h-[500px] overflow-y-auto">
                <VoiceSelector
                  value={voiceId || customVoiceUrl}
                  onChange={(voice, isCustom) => {
                    console.log('Voice selected:', voice, 'isCustom:', isCustom);
                    if (isCustom) {
                      setCustomVoiceUrl(voice);
                      setVoiceId('');
                    } else {
                      setVoiceId(voice);
                      setCustomVoiceUrl('');
                    }
                    setError(null);
                  }}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 relative">
              <div className="bg-blue-500/10 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-900">
                  <span className="font-bold">Company:</span> {companyName} •
                  <span className="font-bold ml-2">Voice:</span> {voiceId ? `Selected (${voiceId.split(':')[0]})` : 'Custom Voice'}
                </p>
              </div>

              <div className="relative">
                <h3 className="text-lg font-bold text-[#F1F5F9] mb-3">Choose a Video Template</h3>

                {loadingTemplates ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                  </div>
                ) : templates.length === 0 ? (
                  <div className="text-center py-12 text-[#94A3B8]">
                    No templates available
                  </div>
                ) : (
                  <div className="relative">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto p-2">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        onClick={() => setSelectedTemplateId(template.id)}
                        className={`relative cursor-pointer rounded-xl overflow-hidden border-4 transition-all transform hover:scale-105 ${
                          selectedTemplateId === template.id
                            ? 'border-purple-600 shadow-lg'
                            : 'border-[#2a2a44] hover:border-purple-300'
                        }`}
                      >
                        {template.thumbnailUrl || template.videoUrl ? (
                          <video
                            src={template.videoUrl}
                            poster={template.thumbnailUrl}
                            className="w-full h-32 object-cover"
                            muted
                            loop
                            onMouseEnter={(e) => e.currentTarget.play()}
                            onMouseLeave={(e) => {
                              e.currentTarget.pause();
                              e.currentTarget.currentTime = 0;
                            }}
                          />
                        ) : (
                          <div className="w-full h-32 bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                            <SparklesIcon className="w-12 h-12 text-purple-400" />
                          </div>
                        )}

                        <div className="p-3 bg-[#161625]">
                          <p className="font-bold text-sm text-[#F1F5F9] truncate">{template.name}</p>
                          <p className="text-xs text-[#94A3B8]">{template.category}</p>
                        </div>

                        {selectedTemplateId === template.id && (
                          <div className="absolute top-2 right-2 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                    ))}
                    </div>

                    {/* Loading Overlay - Appears when generating script preview */}
                    {isLoadingPreview && (
                      <div className="absolute inset-0 bg-[#161625]/95 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center z-10 animate-fadeIn">
                        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-8 shadow-2xl border-2 border-purple-200 max-w-md mx-auto">
                          <div className="flex flex-col items-center">
                            {/* Animated AI Icon */}
                            <div className="relative mb-6">
                              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full blur-xl opacity-50 animate-pulse"></div>
                              <div className="relative w-20 h-20 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center animate-bounce">
                                <SparklesIcon className="w-10 h-10 text-white" />
                              </div>
                            </div>

                            {/* Progress Text */}
                            <h3 className="text-2xl font-bold text-[#F1F5F9] mb-2 text-center">
                              Crafting Your Script
                            </h3>
                            <p className="text-sm text-[#94A3B8] text-center mb-4">
                              AI is analyzing your company and creating the perfect message
                            </p>

                            {/* Animated Progress Bar */}
                            <div className="w-full bg-[#252540] rounded-full h-2 overflow-hidden mb-3">
                              <div className="h-full bg-gradient-to-r from-purple-600 to-blue-600 rounded-full animate-progress"></div>
                            </div>

                            {/* Fun Loading Messages */}
                            <div className="text-xs text-purple-600 font-medium animate-pulse">
                              This usually takes 5-10 seconds...
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Script Preview & Edit */}
          {step === 4 && (
            <div className="space-y-6">
              {isLoadingPreview ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mb-4"></div>
                  <p className="text-lg font-semibold text-[#CBD5E1]">Generating your script...</p>
                  <p className="text-sm text-[#94A3B8] mt-2">AI is analyzing your company and creating the perfect message</p>
                </div>
              ) : scriptPreview ? (
                <>
                  {/* Header */}
                  <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-xl p-4 border border-purple-200">
                    <h3 className="text-lg font-bold text-[#F1F5F9] flex items-center gap-2">
                      📝 Review Your Video Script
                    </h3>
                    <p className="text-sm text-[#94A3B8] mt-1">
                      Edit the script below, adjust overlays, or regenerate for a different version
                    </p>
                  </div>

                  {/* Industry & Audience */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#161625] border-2 border-[#2a2a44] rounded-lg p-3">
                      <span className="text-xs font-bold text-[#94A3B8] uppercase">Detected Industry</span>
                      <p className="text-sm font-semibold text-[#F1F5F9] mt-1">{scriptPreview.industry}</p>
                    </div>
                    <div className="bg-[#161625] border-2 border-[#2a2a44] rounded-lg p-3">
                      <span className="text-xs font-bold text-[#94A3B8] uppercase">Target Audience</span>
                      <p className="text-sm font-semibold text-[#F1F5F9] mt-1">{scriptPreview.targetAudience}</p>
                    </div>
                  </div>

                  {/* Script Editor */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-bold text-[#CBD5E1]">
                        Video Script (Narration)
                      </label>
                      <button
                        type="button"
                        onClick={regenerateScript}
                        disabled={isRegenerating}
                        className="text-sm text-purple-600 hover:text-purple-400 font-medium flex items-center gap-1 disabled:opacity-50"
                      >
                        {isRegenerating ? (
                          <>
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Regenerating...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Regenerate Script
                          </>
                        )}
                      </button>
                    </div>
                    <textarea
                      value={scriptPreview.narrationScript}
                      onChange={(e) => setScriptPreview({ ...scriptPreview, narrationScript: e.target.value })}
                      rows={8}
                      className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-sm leading-relaxed"
                      placeholder="Edit your video script..."
                    />
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-[#94A3B8]">
                        {scriptPreview.narrationScript.split(' ').filter(w => w).length} words •
                        ~{Math.ceil(scriptPreview.narrationScript.split(' ').filter(w => w).length / 150)} min speaking time
                      </span>
                    </div>
                  </div>

                  {/* Text Overlays */}
                  <div>
                    <label className="block text-sm font-bold text-[#CBD5E1] mb-2">
                      Text Overlays (will appear on video)
                    </label>
                    <div className="space-y-2">
                      {scriptPreview.overlays.map((overlay, index) => (
                        <div key={index} className="flex items-center gap-3 bg-[#12121f] border border-[#2a2a44] rounded-lg p-3">
                          <span className="text-xs font-bold text-[#94A3B8] bg-[#161625] px-2 py-1 rounded border border-[#33335a]">
                            {overlay.timing}
                          </span>
                          <input
                            type="text"
                            value={overlay.text}
                            onChange={(e) => {
                              const updatedOverlays = [...scriptPreview.overlays];
                              updatedOverlays[index] = { ...overlay, text: e.target.value };
                              setScriptPreview({ ...scriptPreview, overlays: updatedOverlays });
                            }}
                            className="flex-1 px-3 py-2 border border-[#33335a] rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                            placeholder={`Overlay ${index + 1}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Key Message & CTA */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#94A3B8] mb-2 uppercase">
                        Key Message
                      </label>
                      <input
                        type="text"
                        value={scriptPreview.keyMessage}
                        onChange={(e) => setScriptPreview({ ...scriptPreview, keyMessage: e.target.value })}
                        className="w-full px-3 py-2 border-2 border-[#2a2a44] rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                        placeholder="Main value proposition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#94A3B8] mb-2 uppercase">
                        Call to Action
                      </label>
                      <input
                        type="text"
                        value={scriptPreview.callToAction}
                        onChange={(e) => setScriptPreview({ ...scriptPreview, callToAction: e.target.value })}
                        className="w-full px-3 py-2 border-2 border-[#2a2a44] rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                        placeholder="Visit us at..."
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-[#94A3B8]">
                  Failed to load script preview
                </div>
              )}
            </div>
          )}

          {/* Step 5: Generation Progress */}
          {step === 5 && generationDetails && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-6 text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <SparklesIcon className="w-10 h-10 text-white" />
                </div>

                <h3 className="text-2xl font-bold text-[#F1F5F9] mb-2">
                  {progressPercent === 100 ? '🎉 Video Complete!' : '⚡ Generating Your Video...'}
                </h3>

                <p className="text-[#CBD5E1] mb-6">
                  {progressPercent === 100
                    ? 'Your professional video is ready!'
                    : 'AI is creating your professional marketing video'}
                </p>

                {/* Progress Bar */}
                <div className="w-full bg-[#252540] rounded-full h-6 mb-4 overflow-hidden shadow-inner">
                  <div
                    className="bg-gradient-to-r from-purple-600 to-blue-600 h-full rounded-full transition-all duration-500 ease-out flex items-center justify-center text-white text-sm font-bold shadow-lg"
                    style={{ width: `${progressPercent}%` }}
                  >
                    {progressPercent > 10 && `${progressPercent}%`}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-purple-600 rounded-full animate-pulse"></div>
                    <span className="font-bold text-purple-900">{progressPercent}% Complete</span>
                  </div>
                  {estimatedTimeLeft > 0 && (
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-bold text-blue-900">{estimatedTimeLeft} min remaining</span>
                    </div>
                  )}
                </div>

                {progressPercent === 100 && (
                  <p className="text-sm text-green-600 mt-4 animate-bounce">Redirecting to your video...</p>
                )}
              </div>

              <div className="bg-[#12121f] rounded-xl p-4 space-y-3">
                <div>
                  <span className="text-sm font-bold text-[#94A3B8]">Company:</span>
                  <p className="text-[#F1F5F9]">{companyName}</p>
                </div>
                {scriptPreview?.industry && (
                  <div>
                    <span className="text-sm font-bold text-[#94A3B8]">Detected Industry:</span>
                    <p className="text-[#F1F5F9]">{scriptPreview.industry}</p>
                  </div>
                )}
                <div>
                  <span className="text-sm font-bold text-[#94A3B8]">Voice:</span>
                  <p className="text-[#F1F5F9]">{voiceId || 'Custom Voice'}</p>
                </div>
                <div>
                  <span className="text-sm font-bold text-[#94A3B8]">Template:</span>
                  <p className="text-[#F1F5F9]">{selectedTemplate?.name || 'Selected'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 bg-red-500/10 border border-red-200 text-red-400 px-4 py-3 rounded-xl">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        {step < 5 && (
          <div className="bg-[#12121f] px-6 py-4 rounded-b-2xl flex justify-between gap-3">
            <button
              type="button"
              onClick={step === 1 ? handleClose : handleBack}
              className="px-6 py-2.5 text-[#CBD5E1] bg-[#161625] border border-[#33335a] rounded-xl font-medium hover:bg-[#12121f] transition-all flex items-center gap-2"
              disabled={isGenerating || isLoadingPreview || isRegenerating}
            >
              {step === 1 ? (
                <>
                  <XMarkIcon className="w-5 h-5" />
                  Cancel
                </>
              ) : (
                <>
                  <ChevronLeftIcon className="w-5 h-5" />
                  Back
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={
                isGenerating ||
                isLoadingPreview ||
                isRegenerating ||
                (step === 1 && !companyName.trim()) ||
                (step === 2 && !voiceId && !customVoiceUrl) ||
                (step === 3 && !selectedTemplateId) ||
                (step === 4 && !scriptPreview)
              }
              className="px-8 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:shadow-lg transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
            >
              {isLoadingPreview ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Generating Script...
                </>
              ) : isGenerating ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating Video...
                </>
              ) : step === 4 ? (
                <>
                  <SparklesIcon className="w-5 h-5" />
                  Generate Video
                </>
              ) : step === 3 ? (
                <>
                  Preview Script
                  <ChevronRightIcon className="w-5 h-5" />
                </>
              ) : (
                <>
                  Next
                  <ChevronRightIcon className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
