import { useState, useEffect } from 'react';
import {
  RectangleStackIcon,
  FilmIcon,
  SparklesIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';
import { videoService, type VideoTemplate } from '../services/videoService';
import { useTheme } from '../contexts/ThemeContext';

interface CompactVideoSourceSelectorProps {
  onSelectTemplate?: (template: VideoTemplate) => void;
  onSelectPexelsVideo?: (video: {
    url: string;
    thumbnailUrl: string;
    duration: number;
    width: number;
    height: number;
    source: string;
    author: string;
    pexelsId: number;
  }) => void;
  onSelectCustomVideo?: (videoUrl: string) => void;
  onAIGenerate?: () => void;
  selectedTemplateId?: string;
  selectedVideoUrl?: string;
}

type ViewMode = 'select-source' | 'my-templates' | 'pexels' | 'ai-prompt' | 'upload';

const TECH_CATEGORIES = [
  'technology',
  'cloud computing',
  'coding programming',
  'data analytics',
  'artificial intelligence',
  'cybersecurity',
];

export function CompactVideoSourceSelector({
  onSelectTemplate,
  onSelectPexelsVideo,
  onSelectCustomVideo,
  onAIGenerate,
  selectedTemplateId,
  selectedVideoUrl,
}: CompactVideoSourceSelectorProps) {
  const { gradients } = useTheme();
  const [viewMode, setViewMode] = useState<ViewMode>('select-source');

  // My Templates state
  const [templates, setTemplates] = useState<VideoTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');

  // Pexels state
  const [pexelsVideos, setPexelsVideos] = useState<any[]>([]);
  const [pexelsLoading, setPexelsLoading] = useState(false);
  const [pexelsQuery, setPexelsQuery] = useState('technology');
  const [selectedPexelsId, setSelectedPexelsId] = useState<number | null>(null);

  // AI Prompt state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  // Upload state
  const [uploadUrl, setUploadUrl] = useState('');

  useEffect(() => {
    if (viewMode === 'my-templates') {
      loadTemplates();
    }
  }, [viewMode]);

  useEffect(() => {
    if (viewMode === 'pexels') {
      searchPexels(pexelsQuery);
    }
  }, [viewMode]);

  const loadTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const result = await videoService.getTemplates({});
      setTemplates(result.templates);
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setTemplatesLoading(false);
    }
  };

  const searchPexels = async (query: string) => {
    setPexelsLoading(true);
    try {
      const result = await videoService.searchPexelsVideos(query, 1, 6);
      setPexelsVideos(result.videos);
    } catch (err) {
      console.error('Failed to search Pexels:', err);
    } finally {
      setPexelsLoading(false);
    }
  };

  const handleTemplateSelect = (template: VideoTemplate) => {
    if (onSelectTemplate) {
      onSelectTemplate(template);
    }
    setViewMode('select-source');
  };

  const handlePexelsSelect = (video: any) => {
    const hdFile = video.video_files.find((f: any) => f.quality === 'hd') || video.video_files[0];
    setSelectedPexelsId(video.id);

    if (onSelectPexelsVideo) {
      onSelectPexelsVideo({
        url: hdFile.link,
        thumbnailUrl: video.image,
        duration: video.duration,
        width: hdFile.width,
        height: hdFile.height,
        source: 'Pexels',
        author: video.user.name,
        pexelsId: video.id,
      });
    }
    setViewMode('select-source');
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) return;

    setAiGenerating(true);
    try {
      const result = await videoService.generateFromPrompt(aiPrompt);

      // Reload templates to show the newly created one
      await loadTemplates();

      if (onSelectTemplate) {
        onSelectTemplate(result.template);
      }
      setAiPrompt('');

      // Show success message and return to selection view (template is auto-selected)
      alert(`✅ Video template "${result.template.name}" created successfully!\n\nTemplate selected! Click "Next" to continue adding your voice, logos, and overlays.`);
      setViewMode('select-source');
    } catch (err) {
      console.error('AI generation failed:', err);
      alert('Failed to generate video. Please try again.');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleUploadSubmit = () => {
    if (!uploadUrl.trim()) return;

    if (onSelectCustomVideo) {
      onSelectCustomVideo(uploadUrl);
    }
    setViewMode('select-source');
  };

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
    t.category?.toLowerCase().includes(templateSearch.toLowerCase())
  );

  // Check if template was created in last 5 minutes (NEW badge)
  const isNewTemplate = (template: VideoTemplate): boolean => {
    const createdAt = new Date(template.createdAt);
    const now = new Date();
    const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
    return diffMinutes < 5;
  };

  // Selection Source View
  if (viewMode === 'select-source') {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-[#F1F5F9] mb-4">Choose Video Source</h3>

        <div className="grid grid-cols-2 gap-3">
          {/* My Templates */}
          <button
            onClick={() => setViewMode('my-templates')}
            className={`p-4 rounded-xl border-2 transition-all text-left hover:shadow-md ${
              selectedTemplateId
                ? `border-green-500 bg-green-500/10`
                : 'border-[#2a2a44] hover:border-[#33335a]'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${selectedTemplateId ? 'bg-green-500' : 'bg-[#1c1c30]'}`}>
                <RectangleStackIcon className={`w-5 h-5 ${selectedTemplateId ? 'text-white' : 'text-[#94A3B8]'}`} />
              </div>
              {selectedTemplateId && <CheckCircleIcon className="w-5 h-5 text-green-600 ml-auto" />}
            </div>
            <h4 className="font-bold text-[#F1F5F9] text-sm">My Templates</h4>
            <p className="text-xs text-[#94A3B8] mt-1">Saved templates</p>
          </button>

          {/* Pexels Stock */}
          <button
            onClick={() => setViewMode('pexels')}
            className={`p-4 rounded-xl border-2 transition-all text-left hover:shadow-md ${
              selectedPexelsId
                ? `border-purple-500 bg-purple-500/10`
                : 'border-[#2a2a44] hover:border-[#33335a]'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${selectedPexelsId ? 'bg-purple-500' : 'bg-[#1c1c30]'}`}>
                <FilmIcon className={`w-5 h-5 ${selectedPexelsId ? 'text-white' : 'text-[#94A3B8]'}`} />
              </div>
              {selectedPexelsId && <CheckCircleIcon className="w-5 h-5 text-purple-600 ml-auto" />}
            </div>
            <h4 className="font-bold text-[#F1F5F9] text-sm">Stock Videos</h4>
            <p className="text-xs text-[#94A3B8] mt-1">Browse Pexels</p>
          </button>

          {/* AI Generate */}
          <button
            onClick={() => setViewMode('ai-prompt')}
            className="p-4 rounded-xl border-2 border-[#2a2a44] hover:border-[#33335a] transition-all text-left hover:shadow-md"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-[#1c1c30]">
                <SparklesIcon className="w-5 h-5 text-[#94A3B8]" />
              </div>
            </div>
            <h4 className="font-bold text-[#F1F5F9] text-sm">AI Generate</h4>
            <p className="text-xs text-[#94A3B8] mt-1">From text prompt</p>
          </button>

          {/* Upload Custom */}
          <button
            onClick={() => setViewMode('upload')}
            className={`p-4 rounded-xl border-2 transition-all text-left hover:shadow-md ${
              selectedVideoUrl && !selectedTemplateId && !selectedPexelsId
                ? `border-blue-500 bg-blue-500/10`
                : 'border-[#2a2a44] hover:border-[#33335a]'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${selectedVideoUrl && !selectedTemplateId ? 'bg-blue-500' : 'bg-[#1c1c30]'}`}>
                <CloudArrowUpIcon className={`w-5 h-5 ${selectedVideoUrl && !selectedTemplateId ? 'text-white' : 'text-[#94A3B8]'}`} />
              </div>
              {selectedVideoUrl && !selectedTemplateId && <CheckCircleIcon className="w-5 h-5 text-blue-600 ml-auto" />}
            </div>
            <h4 className="font-bold text-[#F1F5F9] text-sm">Upload Custom</h4>
            <p className="text-xs text-[#94A3B8] mt-1">Your own video</p>
          </button>
        </div>

        {/* Selection Summary */}
        {(selectedTemplateId || selectedPexelsId || selectedVideoUrl) && (
          <div className="mt-4 p-3 bg-green-500/10 border-2 border-green-200 rounded-xl">
            <p className="text-sm font-medium text-green-400 mb-1">
              ✓ Video template selected!
            </p>
            <p className="text-xs text-green-400">
              Click "Next" to add your voice narration, logos, and text overlays. Your final video will be created at the end.
            </p>
          </div>
        )}
      </div>
    );
  }

  // My Templates View
  if (viewMode === 'my-templates') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#F1F5F9]">My Templates</h3>
          <button
            onClick={() => setViewMode('select-source')}
            className="text-sm text-[#94A3B8] hover:text-[#F1F5F9] font-medium"
          >
            ← Back
          </button>
        </div>

        {/* Info about newest templates */}
        {templates.length > 0 && isNewTemplate(templates[0]) && (
          <div className="p-3 bg-orange-500/10 border-2 border-orange-200 rounded-lg">
            <p className="text-xs font-medium text-orange-900">
              🎉 Newest templates appear at the top with a "NEW!" badge
            </p>
          </div>
        )}

        <input
          type="text"
          value={templateSearch}
          onChange={(e) => setTemplateSearch(e.target.value)}
          placeholder="Search templates..."
          className="w-full px-4 py-2 border-2 border-[#2a2a44] rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />

        <div className="max-h-[400px] overflow-y-auto space-y-2">
          {templatesLoading ? (
            <div className="text-center py-8 text-[#94A3B8]">Loading templates...</div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-8 text-[#94A3B8]">No templates found</div>
          ) : (
            filteredTemplates.map((template, index) => (
              <button
                key={template.id}
                onClick={() => handleTemplateSelect(template)}
                className={`w-full p-3 rounded-lg border-2 transition-all text-left hover:shadow-md relative ${
                  selectedTemplateId === template.id
                    ? 'border-green-500 bg-green-500/10'
                    : isNewTemplate(template)
                    ? 'border-orange-300 bg-orange-500/10'
                    : 'border-[#2a2a44] hover:border-[#33335a]'
                }`}
              >
                {/* NEW Badge */}
                {isNewTemplate(template) && index === 0 && (
                  <div className="absolute -top-2 -right-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg animate-pulse">
                    NEW!
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 bg-[#1c1c30] rounded overflow-hidden flex-shrink-0">
                    {template.thumbnailUrl ? (
                      <img src={template.thumbnailUrl} alt={template.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FilmIcon className="w-6 h-6 text-[#64748B]" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-[#F1F5F9] truncate">{template.name}</h4>
                      {isNewTemplate(template) && (
                        <span className="text-xs font-bold text-indigo-400">✨ New</span>
                      )}
                    </div>
                    <p className="text-xs text-[#94A3B8] truncate">{template.category}</p>
                  </div>
                  {selectedTemplateId === template.id && (
                    <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  // Pexels View
  if (viewMode === 'pexels') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#F1F5F9]">Stock Videos</h3>
          <button
            onClick={() => setViewMode('select-source')}
            className="text-sm text-[#94A3B8] hover:text-[#F1F5F9] font-medium"
          >
            ← Back
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {TECH_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setPexelsQuery(cat);
                searchPexels(cat);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                pexelsQuery === cat
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                  : 'bg-[#1c1c30] text-[#CBD5E1] hover:bg-[#252540]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {pexelsLoading ? (
            <div className="text-center py-8 text-[#94A3B8]">Loading videos...</div>
          ) : pexelsVideos.length === 0 ? (
            <div className="text-center py-8 text-[#94A3B8]">No videos found</div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {pexelsVideos.map((video) => (
                <button
                  key={video.id}
                  onClick={() => handlePexelsSelect(video)}
                  className={`relative rounded-lg overflow-hidden border-2 transition-all hover:shadow-md ${
                    selectedPexelsId === video.id
                      ? 'border-purple-500 ring-2 ring-purple-200'
                      : 'border-[#2a2a44] hover:border-[#33335a]'
                  }`}
                >
                  <div className="aspect-video bg-[#1c1c30] relative">
                    <img
                      src={video.image}
                      alt={`Video by ${video.user.name}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <PlayIcon className="w-8 h-8 text-white" />
                    </div>
                    {selectedPexelsId === video.id && (
                      <div className="absolute top-1 right-1">
                        <CheckCircleIcon className="w-5 h-5 text-green-500 bg-[#161625] rounded-full" />
                      </div>
                    )}
                  </div>
                  <div className="p-2 bg-[#161625]">
                    <p className="text-xs text-[#94A3B8] truncate">By {video.user.name}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // AI Prompt View
  if (viewMode === 'ai-prompt') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#F1F5F9]">AI Generate Video</h3>
          <button
            onClick={() => setViewMode('select-source')}
            className="text-sm text-[#94A3B8] hover:text-[#F1F5F9] font-medium"
          >
            ← Back
          </button>
        </div>

        <textarea
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          placeholder="Example: Create a video about cloud computing benefits for small businesses..."
          rows={6}
          className="w-full px-4 py-3 border-2 border-[#2a2a44] rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
        />

        <button
          onClick={handleAIGenerate}
          disabled={!aiPrompt.trim() || aiGenerating}
          className={`w-full py-3 bg-gradient-to-r ${gradients.brand.primary.gradient} text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {aiGenerating ? 'Generating...' : '✨ Generate Video Template'}
        </button>

        <div className="p-3 bg-purple-500/10 border-2 border-purple-200 rounded-lg">
          <p className="text-xs text-purple-800">
            AI will extract keywords, search stock footage, and create a reusable template.
          </p>
        </div>
      </div>
    );
  }

  // Upload View
  if (viewMode === 'upload') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#F1F5F9]">Upload Custom Video</h3>
          <button
            onClick={() => setViewMode('select-source')}
            className="text-sm text-[#94A3B8] hover:text-[#F1F5F9] font-medium"
          >
            ← Back
          </button>
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#CBD5E1] mb-2">
            Video URL
          </label>
          <input
            type="url"
            value={uploadUrl}
            onChange={(e) => setUploadUrl(e.target.value)}
            placeholder="https://example.com/video.mp4"
            className="w-full px-4 py-3 border-2 border-[#2a2a44] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-[#94A3B8] mt-1">
            Enter a direct URL to your video file (MP4, MOV, WEBM)
          </p>
        </div>

        <button
          onClick={handleUploadSubmit}
          disabled={!uploadUrl.trim()}
          className={`w-full py-3 bg-gradient-to-r ${gradients.brand.primary.gradient} text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          Use This Video
        </button>

        <div className="p-3 bg-blue-500/10 border-2 border-blue-200 rounded-lg">
          <p className="text-xs font-semibold text-blue-900 mb-1">Supported Formats:</p>
          <p className="text-xs text-blue-800">MP4, MOV, AVI, WEBM • Max 500MB • HD recommended</p>
        </div>
      </div>
    );
  }

  return null;
}
