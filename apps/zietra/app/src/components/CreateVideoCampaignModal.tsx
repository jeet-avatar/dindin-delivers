import { useState, useEffect } from 'react';
import { XMarkIcon, SparklesIcon, ClockIcon } from '@heroicons/react/24/outline';
import { CompactVideoSourceSelector } from './CompactVideoSourceSelector';
import { LogoUploader } from './LogoUploader';
import { TextLayoverEditor } from './TextLayoverEditor';
import { VoiceSelector } from './VoiceSelector';
import { videoService, type VideoTemplate, type TextOverlay } from '../services/videoService';
import { useTheme } from '../contexts/ThemeContext';
import { useDraftCampaign } from '../hooks/useDraftCampaign';

interface CreateVideoCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (campaign: any) => void;
  companyIds?: string[];
}

type StepType = 'basics' | 'voice' | 'source' | 'design' | 'overlays' | 'preview';

export function CreateVideoCampaignModal({
  isOpen,
  onClose,
  onSuccess,
  companyIds = [],
}: CreateVideoCampaignModalProps) {
  const { gradients } = useTheme();
  const [step, setStep] = useState<StepType>('basics');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [targetCompanyName, setTargetCompanyName] = useState('');
  const [userCompanyName, setUserCompanyName] = useState('');
  const [script, setScript] = useState('');
  const [tone, setTone] = useState(''); // No default - user must select
  const [voiceId, setVoiceId] = useState('');
  const [customVoiceUrl, setCustomVoiceUrl] = useState('');
  const [isCustomVoice, setIsCustomVoice] = useState(false);
  const [videoSource, setVideoSource] = useState<'template' | 'upload'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<VideoTemplate | null>(null);
  const [customVideoUrl, setCustomVideoUrl] = useState('');
  const [clientLogo, setClientLogo] = useState('');
  const [userLogo, setUserLogo] = useState('');
  const [bgmUrl, setBgmUrl] = useState('');
  const [overlays, setOverlays] = useState<TextOverlay[]>([]);
  const [generatingScript, setGeneratingScript] = useState(false);

  // Draft auto-save functionality
  const { draftId, isSaving, lastSaved, saveDraft, clearDraft, saveLocalDraft, loadLocalDraft } = useDraftCampaign({
    onSaveSuccess: (id) => console.log('Draft saved:', id),
    onSaveError: (error) => console.error('Draft save failed:', error),
  });

  // Load draft on modal open
  useEffect(() => {
    if (!isOpen) return;

    const draft = loadLocalDraft();
    if (draft) {
      // Only load if user hasn't started entering data
      const hasUserData = name || targetCompanyName || script;
      if (!hasUserData) {
        if (draft.name) setName(draft.name);
        if (draft.targetCompanyName) setTargetCompanyName(draft.targetCompanyName);
        if (draft.userCompanyName) setUserCompanyName(draft.userCompanyName);
        if (draft.script) setScript(draft.script);
        if (draft.tone) setTone(draft.tone);
        if (draft.voiceId) setVoiceId(draft.voiceId);
        if (draft.customVoiceUrl) setCustomVoiceUrl(draft.customVoiceUrl);
        if (draft.isCustomVoice !== undefined) setIsCustomVoice(draft.isCustomVoice);
        if (draft.videoSource) setVideoSource(draft.videoSource);
        if (draft.customVideoUrl) setCustomVideoUrl(draft.customVideoUrl);
        if (draft.clientLogo) setClientLogo(draft.clientLogo);
        if (draft.userLogo) setUserLogo(draft.userLogo);
        if (draft.bgmUrl) setBgmUrl(draft.bgmUrl);
        if (draft.overlays && draft.overlays.length > 0) setOverlays(draft.overlays);
        console.log('Draft loaded from localStorage');
      }
    }
  }, [isOpen, loadLocalDraft]);

  // Auto-save to backend every 10 seconds
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      const draftData = {
        name,
        targetCompanyName,
        userCompanyName,
        script,
        tone,
        voiceId,
        customVoiceUrl,
        isCustomVoice,
        videoSource,
        selectedTemplateId: selectedTemplate?.id || null,
        customVideoUrl,
        clientLogo,
        userLogo,
        bgmUrl,
        overlays,
      };

      // Save to localStorage immediately (backup)
      saveLocalDraft(draftData);

      // Save to backend every 10 seconds
      saveDraft(draftData);
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, [
    isOpen,
    name,
    targetCompanyName,
    userCompanyName,
    script,
    tone,
    voiceId,
    customVoiceUrl,
    isCustomVoice,
    videoSource,
    selectedTemplate,
    customVideoUrl,
    clientLogo,
    userLogo,
    bgmUrl,
    overlays,
    saveDraft,
    saveLocalDraft,
  ]);

  const steps: { id: StepType; label: string; description: string }[] = [
    { id: 'basics', label: '1. Message', description: 'Write your video script' },
    { id: 'voice', label: '2. Voice', description: 'Choose narration voice' },
    { id: 'source', label: '3. Template', description: 'Select or generate video template' },
    { id: 'design', label: '4. Design', description: 'Add logos & branding' },
    { id: 'overlays', label: '5. Overlays', description: 'Add text overlays' },
    { id: 'preview', label: '6. Create Video', description: 'Review & generate final video' },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === step);

  const handleGenerateScript = async () => {
    if (!targetCompanyName) {
      setError('Please enter the target company name first');
      return;
    }

    setGeneratingScript(true);
    setError('');

    try {
      const result = await videoService.generateScript({
        companyName: targetCompanyName,
        userCompanyName: userCompanyName || undefined,
        tone,
      });
      setScript(result.script);
    } catch (err: any) {
      console.error('Video AI Generation Error:', err.response?.data);
      const errorDetails = err.response?.data?.details || err.response?.data?.error || 'Failed to generate script';
      setError(errorDetails);
    } finally {
      setGeneratingScript(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!name || !script) {
      setError('Name and script are required');
      return;
    }

    // Need a voice selected
    if (!voiceId) {
      setError('Please select a voice in Step 2');
      return;
    }

    // Need either a template OR a custom video URL
    if (!selectedTemplate && !customVideoUrl) {
      setError('Please select a video source (template, Pexels, or upload)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const campaignData = {
        name,
        narrationScript: script,
        tone,
        videoSource: videoSource === 'template' ? 'TEMPLATE' : 'CUSTOM_UPLOAD',
        templateId: selectedTemplate?.id,
        customVideoUrl: videoSource === 'upload' ? customVideoUrl : undefined,
        voiceId: voiceId || undefined, // Always use voiceId for cloned voices
        customVoiceUrl: customVoiceUrl || undefined,
        clientLogoUrl: clientLogo || undefined,
        userLogoUrl: userLogo || undefined,
        bgmUrl: bgmUrl || undefined,
        textOverlays: overlays.length > 0 ? overlays : undefined,
        companyIds: companyIds.length > 0 ? companyIds : undefined,
      };

      const result = await videoService.createCampaign(campaignData);

      // Start video generation
      await videoService.generateVideo(result.campaign.id);

      // Pass campaign to success callback for polling
      onSuccess(result.campaign);

      // Clear draft on successful creation
      clearDraft();
      resetForm();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep('basics');
    setName('');
    setTargetCompanyName('');
    setUserCompanyName('');
    setScript('');
    setTone(''); // Reset to empty - user must select
    setVideoSource('template');
    setSelectedTemplate(null);
    setCustomVideoUrl('');
    setClientLogo('');
    setUserLogo('');
    setBgmUrl('');
    setOverlays([]);
    setError('');
  };

  const handleNext = () => {
    if (step === 'basics') {
      if (!name) {
        setError('Please enter campaign name');
        return;
      }
      if (!targetCompanyName) {
        setError('Please enter target company name');
        return;
      }
      if (!script) {
        setError('Please enter or generate a script');
        return;
      }
    }
    if (step === 'source') {
      // Need either a template OR a custom video URL
      if (!selectedTemplate && !customVideoUrl) {
        setError('Please select a template, choose a Pexels video, or upload your own');
        return;
      }
    }

    setError('');
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setStep(steps[nextIndex].id);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setStep(steps[prevIndex].id);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-[#161625] border-4 border-black rounded-3xl max-w-6xl w-full my-8 shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b sticky top-0 bg-[#161625] z-10 rounded-t-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-[#F1F5F9]">Create Video Campaign</h2>

              {/* Draft Auto-Save Indicator */}
              {isSaving ? (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-200 rounded-lg">
                  <ClockIcon className="w-4 h-4 text-blue-600 animate-pulse" />
                  <span className="text-xs font-medium text-blue-400">Saving draft...</span>
                </div>
              ) : lastSaved ? (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-200 rounded-lg">
                  <ClockIcon className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-medium text-green-400">
                    Saved {new Date(lastSaved).toLocaleTimeString()}
                  </span>
                </div>
              ) : null}
            </div>

            <button
              onClick={() => {
                resetForm();
                onClose();
              }}
              className="text-[#64748B] hover:text-[#94A3B8] transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-2">
            {steps.map((s, index) => (
              <div key={s.id} className="flex items-center flex-1">
                <div className="flex-1">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      index <= currentStepIndex
                        ? `bg-gradient-to-r ${gradients.brand.primary.gradient}`
                        : 'bg-[#252540]'
                    }`}
                  />
                  <p
                    className={`text-xs mt-1 font-medium ${
                      index <= currentStepIndex ? 'text-indigo-400' : 'text-[#64748B]'
                    }`}
                  >
                    {s.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(90vh-150px)] overflow-y-auto scrollbar-thin scrollbar-thumb-orange-500 scrollbar-track-gray-200">
          {/* Current Step Header */}
          <div className="mb-6 pb-4 border-b-2 border-[#1c1c30]">
            <h3 className="text-xl font-bold text-[#F1F5F9]">{steps[currentStepIndex].label}</h3>
            <p className="text-sm text-[#94A3B8] mt-1">{steps[currentStepIndex].description}</p>
          </div>

          {/* Step 1: Basics */}
          {step === 'basics' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#CBD5E1] mb-2">
                  Campaign Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Welcome Video - Q1 2025"
                  className="w-full px-4 py-3 border border-[#33335a] rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#CBD5E1] mb-2">
                  Tone
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['professional', 'friendly', 'enthusiastic', 'persuasive'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setTone(t)}
                      className={`px-4 py-2.5 rounded-xl font-bold capitalize transition-all tracking-wide ${
                        tone === t
                          ? `bg-gradient-to-r ${gradients.brand.primary.gradient} text-white shadow-lg hover:shadow-xl`
                          : 'bg-[#1c1c30] text-[#CBD5E1] hover:bg-[#252540]'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#CBD5E1] mb-2">
                  Target Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={targetCompanyName}
                  onChange={(e) => setTargetCompanyName(e.target.value)}
                  placeholder="e.g., Acme Corp"
                  className="w-full px-4 py-3 border border-[#33335a] rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="text-xs text-[#94A3B8] mt-1">
                  The company you're creating this video for
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#CBD5E1] mb-2">
                  Your Company Name (Optional)
                </label>
                <input
                  type="text"
                  value={userCompanyName}
                  onChange={(e) => setUserCompanyName(e.target.value)}
                  placeholder="e.g., Zietra"
                  className="w-full px-4 py-3 border border-[#33335a] rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="text-xs text-[#94A3B8] mt-1">
                  Your company name to include in the video
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-[#CBD5E1]">
                    Narration Script
                  </label>
                  <button
                    onClick={handleGenerateScript}
                    disabled={generatingScript || !targetCompanyName}
                    className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${gradients.brand.primary.gradient} text-white rounded-xl font-bold tracking-wide shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <SparklesIcon className="w-4 h-4" />
                    {generatingScript ? 'Generating...' : 'AI Generate'}
                  </button>
                </div>
                <textarea
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  placeholder="Enter the narration script for your video..."
                  rows={8}
                  className="w-full px-4 py-3 border border-[#33335a] rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="text-xs text-[#94A3B8] mt-1">
                  Keep it between 100-150 words (30-60 seconds when spoken)
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Voice Selection */}
          {step === 'voice' && (
            <div className="space-y-4">
              <VoiceSelector
                value={voiceId}
                onChange={(voice, custom) => {
                  // All cloned voices use voiceId (voice_id format: "user_id/voice_name")
                  setVoiceId(voice);
                  setIsCustomVoice(custom);
                  if (!custom) {
                    setCustomVoiceUrl('');
                  }
                }}
                onCustomVoiceUpload={async (file) => {
                  // Upload voice file
                  const formData = new FormData();
                  formData.append('voice', file);
                  const result = await videoService.uploadVoice(formData);
                  return result.voiceUrl;
                }}
              />
            </div>
          )}

          {/* Step 3: Video Source */}
          {step === 'source' && (
            <div className="space-y-4">
              {/* Info Box */}
              <div className="p-4 bg-blue-500/10 border-2 border-blue-200 rounded-xl">
                <p className="text-sm font-medium text-blue-900">
                  ℹ️ <strong>Choose a video template</strong> - This is the background video for your campaign.
                  You'll add your voice narration, logos, and text overlays in the next steps.
                </p>
              </div>

              <CompactVideoSourceSelector
                onSelectTemplate={(template) => {
                  setSelectedTemplate(template);
                  setVideoSource('template');
                  setCustomVideoUrl('');
                }}
                onSelectPexelsVideo={(video) => {
                  // Treat Pexels video as custom video URL
                  setCustomVideoUrl(video.url);
                  setVideoSource('upload');
                  setSelectedTemplate(null);
                }}
                onSelectCustomVideo={(videoUrl) => {
                  setCustomVideoUrl(videoUrl);
                  setVideoSource('upload');
                  setSelectedTemplate(null);
                }}
                selectedTemplateId={selectedTemplate?.id}
                selectedVideoUrl={customVideoUrl}
              />
            </div>
          )}

          {/* Step 3: Design */}
          {step === 'design' && (
            <div className="space-y-6">
              <LogoUploader
                label="Client Company Logo"
                value={clientLogo}
                onChange={setClientLogo}
                placeholder="Enter client logo URL or upload"
              />
              <LogoUploader
                label="Your Company Logo"
                value={userLogo}
                onChange={setUserLogo}
                placeholder="Enter your company logo URL or upload"
              />
              <div>
                <label className="block text-sm font-semibold text-[#CBD5E1] mb-2">
                  Background Music URL (Optional)
                </label>
                <input
                  type="url"
                  value={bgmUrl}
                  onChange={(e) => setBgmUrl(e.target.value)}
                  placeholder="https://example.com/music.mp3"
                  className="w-full px-4 py-3 border border-[#33335a] rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="text-xs text-[#94A3B8] mt-1">
                  Leave empty to use default background music
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Overlays */}
          {step === 'overlays' && (
            <div>
              <TextLayoverEditor overlays={overlays} onChange={setOverlays} maxDuration={60} />
            </div>
          )}

          {/* Step 6: Preview & Create */}
          {step === 'preview' && (
            <div className="space-y-6">
              {/* Important Notice */}
              <div className="p-4 bg-green-500/10 border-2 border-green-200 rounded-xl">
                <p className="text-sm font-medium text-green-900">
                  ✅ <strong>Ready to create your video!</strong> Review the details below, then click "Create & Generate" to produce your final personalized video.
                </p>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-rose-50 rounded-xl p-6 border-2 border-orange-200 shadow-lg">
                <h3 className="text-lg font-bold text-[#F1F5F9] mb-4">Campaign Summary</h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-semibold text-[#CBD5E1]">Name:</dt>
                    <dd className="text-[#F1F5F9]">{name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-semibold text-[#CBD5E1]">Video Source:</dt>
                    <dd className="text-[#F1F5F9]">
                      {videoSource === 'template'
                        ? selectedTemplate?.name || 'Template'
                        : 'Custom Upload'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-semibold text-[#CBD5E1]">Script:</dt>
                    <dd className="text-[#94A3B8] text-sm">{script.substring(0, 150)}...</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-semibold text-[#CBD5E1]">Text Overlays:</dt>
                    <dd className="text-[#F1F5F9]">{overlays.length} overlay(s)</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-semibold text-[#CBD5E1]">Logos:</dt>
                    <dd className="text-[#F1F5F9]">
                      {clientLogo && userLogo
                        ? 'Both logos added'
                        : clientLogo
                        ? 'Client logo only'
                        : userLogo
                        ? 'Your logo only'
                        : 'No logos'}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-400">
                  ⚡ Video generation will start immediately after creation. This may take 3-5 minutes.
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-200 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-[#12121f] rounded-b-xl flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={step === 'basics'}
            className="px-6 py-2 text-[#CBD5E1] font-semibold hover:text-[#F1F5F9] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Back
          </button>

          <div className="flex gap-3">
            <button
              onClick={() => {
                resetForm();
                onClose();
              }}
              className="px-6 py-2 bg-[#1c1c30] text-[#CBD5E1] rounded-lg font-semibold hover:bg-[#252540] transition-colors"
            >
              Cancel
            </button>

            {step === 'preview' ? (
              <button
                onClick={handleCreateCampaign}
                disabled={loading}
                className={`px-8 py-3 bg-gradient-to-r ${gradients.brand.primary.gradient} text-white rounded-xl font-bold tracking-wide shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading ? 'Creating...' : '🎬 Create & Generate'}
              </button>
            ) : (
              <button
                onClick={handleNext}
                className={`px-6 py-3 bg-gradient-to-r ${gradients.brand.primary.gradient} text-white rounded-xl font-bold tracking-wide shadow-lg hover:shadow-xl hover:scale-105 transition-all`}
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
