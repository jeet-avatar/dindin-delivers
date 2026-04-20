import { useState, useEffect } from 'react';
import { MagnifyingGlassIcon, FunnelIcon, PlusIcon } from '@heroicons/react/24/outline';
import { TemplateCard } from './TemplateCard';
import { VideoPreviewPlayer } from './VideoPreviewPlayer';
import { videoService, type VideoTemplate } from '../services/videoService';

interface TemplateLibraryProps {
  onSelectTemplate: (template: VideoTemplate) => void;
  selectedTemplateId?: string;
  showUploadButton?: boolean;
  onUploadClick?: () => void;
}

const CATEGORIES = ['All', 'Business', 'Tech', 'Creative', 'Minimal', 'Abstract'];

export function TemplateLibrary({
  onSelectTemplate,
  selectedTemplateId,
  showUploadButton = false,
  onUploadClick,
}: TemplateLibraryProps) {
  const [templates, setTemplates] = useState<VideoTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showSystemOnly, setShowSystemOnly] = useState(false);

  const [previewTemplate, setPreviewTemplate] = useState<VideoTemplate | null>(null);

  useEffect(() => {
    loadTemplates();
  }, [selectedCategory, showSystemOnly]);

  const loadTemplates = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await videoService.getTemplates({
        category: selectedCategory === 'All' ? undefined : selectedCategory,
        system: showSystemOnly ? true : undefined,
      });
      setTemplates(result.templates);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (templateId: string) => {
    try {
      const result = await videoService.toggleTemplateFavorite(templateId);
      setTemplates((prev) =>
        prev.map((t) => (t.id === templateId ? result.template : t))
      );
    } catch (err: any) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  // Filter templates by search query
  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesSearch;
  });

  // Sort: favorites first, then by usage count
  const sortedTemplates = [...filteredTemplates].sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    return b.usageCount - a.usageCount;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#F1F5F9]">Template Library</h2>
          <p className="text-sm text-[#94A3B8] mt-1">
            Choose a professional template or upload your own
          </p>
        </div>
        {showUploadButton && onUploadClick && (
          <button
            onClick={onUploadClick}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
          >
            <PlusIcon className="w-5 h-5" />
            Upload Custom
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#64748B]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search templates..."
            className="w-full pl-10 pr-4 py-2 border border-[#33335a] rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
          />
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                selectedCategory === category
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                  : 'bg-[#1c1c30] text-[#CBD5E1] hover:bg-[#252540]'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* System Filter */}
        <div className="flex items-center gap-2">
          <FunnelIcon className="w-5 h-5 text-[#64748B]" />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showSystemOnly}
              onChange={(e) => setShowSystemOnly(e.target.checked)}
              className="rounded text-indigo-400 focus:ring-indigo-500"
            />
            <span className="text-sm text-[#CBD5E1]">System templates only</span>
          </label>
        </div>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-video bg-[#252540] rounded-xl mb-4"></div>
              <div className="h-4 bg-[#252540] rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-[#252540] rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadTemplates}
            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : sortedTemplates.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[#94A3B8] mb-2">No templates found</p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-indigo-400 hover:text-orange-400 font-medium"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onSelect={onSelectTemplate}
              onPreview={setPreviewTemplate}
              onToggleFavorite={handleToggleFavorite}
              isSelected={template.id === selectedTemplateId}
              showActions={true}
            />
          ))}
        </div>
      )}

      {/* Template Count */}
      {!loading && !error && (
        <p className="text-sm text-[#94A3B8] text-center">
          Showing {sortedTemplates.length} of {templates.length} templates
        </p>
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewTemplate(null)}
        >
          <div
            className="bg-[#161625] rounded-xl max-w-4xl w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-[#F1F5F9]">
                  {previewTemplate.name}
                </h3>
                {previewTemplate.description && (
                  <p className="text-sm text-[#94A3B8] mt-1">
                    {previewTemplate.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="text-[#64748B] hover:text-[#94A3B8] transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <VideoPreviewPlayer
              videoUrl={previewTemplate.videoUrl}
              thumbnailUrl={previewTemplate.thumbnailUrl}
              className="aspect-video mb-4"
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  onSelectTemplate(previewTemplate);
                  setPreviewTemplate(null);
                }}
                className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg"
              >
                Use This Template
              </button>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="px-6 py-3 bg-[#1c1c30] text-[#CBD5E1] rounded-lg font-semibold hover:bg-[#252540] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
