import { useState, useEffect } from 'react';
import {
  PlusIcon,
  VideoCameraIcon,
  EyeIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  PlayIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';
import { CreateVideoCampaignModal } from '../../components/CreateVideoCampaignModal';
import { VideoGenerationProgress } from '../../components/VideoGenerationProgress';
import { VideoCampaignsHelpGuide } from '../../components/VideoCampaignsHelpGuide';
import { GenerateVideoFromPrompt } from '../../components/GenerateVideoFromPrompt';
import { videoService, type VideoCampaign } from '../../services/videoService';
import { useTheme } from '../../contexts/ThemeContext';

export function VideoCampaignsPage() {
  const { gradients } = useTheme();
  const [campaigns, setCampaigns] = useState<VideoCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showHelpGuide, setShowHelpGuide] = useState(false);
  const [showPromptGenerator, setShowPromptGenerator] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('all');

  useEffect(() => {
    loadCampaigns();
    // Poll for status updates every 10 seconds
    const interval = setInterval(loadCampaigns, 10000);
    return () => clearInterval(interval);
  }, [selectedStatus]);

  const loadCampaigns = async () => {
    try {
      const result = await videoService.getCampaigns({
        status: selectedStatus === 'all' ? undefined : selectedStatus,
      });
      setCampaigns(result.campaigns);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;

    try {
      await videoService.deleteCampaign(id);
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete campaign');
    }
  };

  const handleDownload = (videoUrl: string, name: string) => {
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = `${name}.mp4`;
    link.click();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'READY':
        return 'bg-green-500/10 text-green-400 border-2 border-green-300';
      case 'GENERATING':
      case 'PROCESSING':
        return 'bg-orange-500/10 text-orange-400 border-2 border-orange-300';
      case 'FAILED':
        return 'bg-red-500/10 text-red-400 border-2 border-red-300';
      case 'DRAFT':
        return 'bg-[#12121f] text-[#E2E8F0] border-2 border-[#33335a]';
      default:
        return 'bg-[#12121f] text-[#E2E8F0] border-2 border-[#33335a]';
    }
  };

  const filteredCampaigns = campaigns;

  return (
    <div className="min-h-screen bg-[#12121f]">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-[#F1F5F9]">Video Campaigns</h1>
              <p className="text-[#94A3B8] mt-1">
                Create personalized marketing videos with AI
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowHelpGuide(true)}
                className="p-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
                title="Show Help Guide"
              >
                <QuestionMarkCircleIcon className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className={`flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r ${gradients.brand.primary.gradient} text-white rounded-xl font-bold tracking-wide shadow-lg hover:shadow-xl hover:scale-105 transition-all`}
              >
                <PlusIcon className="w-4 h-4" />
                Create Campaign
              </button>
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex gap-2 mt-4">
            {['all', 'DRAFT', 'GENERATING', 'READY', 'FAILED'].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setSelectedStatus(status)}
                className={`px-4 py-2.5 rounded-xl font-bold capitalize transition-all tracking-wide ${
                  selectedStatus === status
                    ? `bg-gradient-to-r ${gradients.brand.primary.gradient} text-white shadow-lg hover:shadow-xl hover:scale-105`
                    : 'bg-[#161625] text-[#CBD5E1] border-2 border-[#33335a] hover:bg-[#12121f] shadow-sm'
                }`}
              >
                {status === 'all' ? 'All' : status.toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-200 rounded-lg">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* AI Video Generator Section */}
        <div className="mb-8">
          <GenerateVideoFromPrompt
            onVideoGenerated={(template) => {
              // Reload campaigns to show the new template
              loadCampaigns();
            }}
          />
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-[#161625] rounded-xl p-6 animate-pulse border-2 border-[#2a2a44] shadow-md">
                <div className="aspect-video bg-gradient-to-br from-orange-100 to-rose-100 rounded-lg mb-4"></div>
                <div className="h-6 bg-gradient-to-r from-orange-200 to-rose-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gradient-to-r from-orange-100 to-rose-100 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : filteredCampaigns.length === 0 ? (
          /* Empty State */
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-orange-100 to-rose-100 rounded-full mb-6 shadow-lg">
              <VideoCameraIcon className="w-12 h-12 text-indigo-400" />
            </div>
            <h2 className="text-2xl font-bold text-[#F1F5F9] mb-2">
              No video campaigns yet
            </h2>
            <p className="text-[#94A3B8] mb-6 max-w-md mx-auto">
              Create your first video campaign with AI-powered narration, custom templates, and
              professional overlays
            </p>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r ${gradients.brand.primary.gradient} text-white rounded-xl font-bold tracking-wide shadow-lg hover:shadow-xl hover:scale-105 transition-all`}
            >
              <PlusIcon className="w-4 h-4" />
              Create Your First Campaign
            </button>
          </div>
        ) : (
          /* Campaigns Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCampaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="bg-[#161625] rounded-xl shadow-md hover:shadow-xl transition-shadow overflow-hidden"
              >
                {/* Video Preview or Thumbnail */}
                <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 relative group">
                  {campaign.videoUrl ? (
                    <video
                      src={campaign.videoUrl}
                      poster={campaign.thumbnailUrl}
                      controls
                      className="w-full h-full object-cover"
                    />
                  ) : campaign.thumbnailUrl ? (
                    <img
                      src={campaign.thumbnailUrl}
                      alt={campaign.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <VideoCameraIcon className="w-16 h-16 text-[#64748B]" />
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="absolute top-2 right-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                        campaign.status
                      )}`}
                    >
                      {campaign.status}
                    </span>
                  </div>
                </div>

                {/* Campaign Info */}
                <div className="p-4">
                  <h3 className="font-bold text-lg text-[#F1F5F9] mb-2 line-clamp-1">
                    {campaign.name}
                  </h3>

                  {/* Progress Indicator for Generating */}
                  {(campaign.status === 'GENERATING' || campaign.status === 'PROCESSING') && (
                    <div className="mb-3">
                      <VideoGenerationProgress
                        status={campaign.status}
                        progress={campaign.jobs?.[0]?.progress || 0}
                        currentStep={campaign.jobs?.[0]?.currentStep || 'Initializing...'}
                      />
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-[#94A3B8] mb-4">
                    {campaign._count && (
                      <span className="flex items-center gap-1">
                        👥 {campaign._count.companies} companies
                      </span>
                    )}
                    {campaign.views > 0 && (
                      <span className="flex items-center gap-1">
                        <EyeIcon className="w-4 h-4" /> {campaign.views}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {campaign.videoUrl && campaign.status === 'READY' && (
                      <>
                        <button
                          type="button"
                          onClick={() => window.open(campaign.videoUrl, '_blank')}
                          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r ${gradients.brand.primary.gradient} text-white rounded-xl font-bold tracking-wide shadow-lg hover:shadow-xl hover:scale-105 transition-all`}
                        >
                          <PlayIcon className="w-4 h-4" />
                          Play
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownload(campaign.videoUrl!, campaign.name)}
                          className="flex items-center justify-center px-4 py-2.5 bg-[#161625] text-[#CBD5E1] border-2 border-[#33335a] rounded-xl font-bold hover:bg-[#12121f] shadow-sm transition-all"
                          title="Download"
                        >
                          <ArrowDownTrayIcon className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(campaign.id)}
                      className="flex items-center justify-center px-4 py-2.5 bg-red-500/10 text-red-600 rounded-xl font-bold hover:bg-red-500/15 transition-all border-2 border-red-300 shadow-sm"
                      title="Delete"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Error Message */}
                  {campaign.status === 'FAILED' && campaign.generationError && (
                    <p className="mt-2 text-xs text-red-600">{campaign.generationError}</p>
                  )}

                  {/* Metadata */}
                  <div className="mt-3 pt-3 border-t border-[#1c1c30]">
                    <p className="text-xs text-[#94A3B8]">
                      Created {new Date(campaign.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Campaign Count */}
        {!loading && filteredCampaigns.length > 0 && (
          <div className="mt-6 text-center">
            <p className="text-sm text-[#94A3B8]">
              Showing {filteredCampaigns.length} campaign{filteredCampaigns.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <CreateVideoCampaignModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={loadCampaigns}
      />

      {/* Help Guide */}
      {showHelpGuide && (
        <VideoCampaignsHelpGuide onClose={() => setShowHelpGuide(false)} />
      )}
    </div>
  );
}
