import { useState, useEffect } from 'react';
import { ArrowLeftIcon, PlayIcon, ArrowDownTrayIcon, ShareIcon, EnvelopeIcon, VideoCameraIcon, TrashIcon, UsersIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { PlayIcon as PlayIconSolid } from '@heroicons/react/24/solid';
import { CreateVideoCampaignModal } from '../../components/CreateVideoCampaignModal';
import { CreateEmailTemplateModal } from '../../components/VideoCampaigns/CreateEmailTemplateModal';
import { AutoGenerateVideoModal } from '../../components/VideoCampaigns/AutoGenerateVideoModal';
import { useNavigate } from 'react-router-dom';
import { videoService, VideoCampaign } from '../../services/videoService';

export function VideoCampaignsPage() {
  const navigate = useNavigate();
  const [generatedVideo, setGeneratedVideo] = useState<{
    url: string;
    campaignId: string;
    name: string;
    narrationScript?: string;
  } | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [previousVideos, setPreviousVideos] = useState<VideoCampaign[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [selectedVideoForModal, setSelectedVideoForModal] = useState<VideoCampaign | null>(null);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'All' | 'Generating' | 'Ready' | 'Failed'>('All');
  const [showAutoGenerate, setShowAutoGenerate] = useState(false);

  // Load previous videos on mount
  useEffect(() => {
    loadPreviousVideos();
  }, []);

  // Auto-refresh videos if any are generating
  useEffect(() => {
    const hasGenerating = previousVideos.some(
      video => video.status === 'GENERATING' || video.status === 'DRAFT'
    );

    if (!hasGenerating) return;

    // Poll every 5 seconds when videos are generating
    const pollInterval = setInterval(() => {
      console.log('🔄 Auto-refreshing video list (generating videos detected)');
      loadPreviousVideos();
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [previousVideos]);

  const loadPreviousVideos = async () => {
    try {
      setLoadingVideos(true);
      // Load all campaign statuses: DRAFT, GENERATING, READY, FAILED
      const [readyResponse, draftResponse, generatingResponse, failedResponse] = await Promise.all([
        videoService.getCampaigns({ status: 'READY', limit: 20 }),
        videoService.getCampaigns({ status: 'DRAFT', limit: 10 }),
        videoService.getCampaigns({ status: 'GENERATING', limit: 10 }),
        videoService.getCampaigns({ status: 'FAILED', limit: 5 }),
      ]);

      // Combine and sort: generating first (most recent), then drafts, then ready, then failed
      const allCampaigns = [
        ...generatingResponse.campaigns,
        ...draftResponse.campaigns,
        ...readyResponse.campaigns,
        ...failedResponse.campaigns,
      ];
      setPreviousVideos(allCampaigns);
    } catch (error) {
      console.error('Failed to load previous videos:', error);
    } finally {
      setLoadingVideos(false);
    }
  };

  const handleVideoGenerated = (videoUrl: string, campaignId: string, name: string = 'My Video Campaign', narrationScript: string = '') => {
    setGeneratedVideo({
      url: videoUrl,
      campaignId,
      name,
      narrationScript,
    });
    // Reload the video list to show the new video
    loadPreviousVideos();
    setShowCreateNew(false);
  };

  const handleManualVideoCreated = (campaign: any) => {
    console.log('Manual video campaign created:', campaign);
    // Start polling for video generation completion
    if (campaign.id) {
      pollForVideoCompletion(campaign.id);
    }
    setShowCreateNew(false);
    loadPreviousVideos();
  };

  const pollForVideoCompletion = async (campaignId: string) => {
    const maxAttempts = 60; // 5 minutes
    let attempts = 0;

    const checkStatus = async () => {
      try {
        const status = await videoService.getCampaignStatus(campaignId);

        if (status.status === 'READY' && status.videoUrl) {
          const result = await videoService.getCampaign(campaignId);
          const campaign = result.campaign;
          setGeneratedVideo({
            url: status.videoUrl,
            campaignId,
            name: campaign.name,
            narrationScript: campaign.narrationScript || '',
          });
        } else if (status.status !== 'FAILED' && attempts < maxAttempts) {
          attempts++;
          setTimeout(checkStatus, 5000);
        }
      } catch (error) {
        console.error('Failed to check video status:', error);
        if (attempts < maxAttempts) {
          attempts++;
          setTimeout(checkStatus, 5000);
        }
      }
    };

    checkStatus();
  };

  const handleEmailTemplateCreated = (templateId: string) => {
    setShowEmailModal(false);
    // Show success message
    alert('Email template created successfully! Redirecting to Email Templates...');
    // Navigate to email templates page
    navigate('/email-templates');
  };

  const handleStartNew = () => {
    setGeneratedVideo(null);
    setShowCreateNew(true);
  };

  const handleViewVideo = (campaign: VideoCampaign, event?: React.MouseEvent) => {
    // Prevent opening modal if clicking on action buttons
    if (event && (event.target as HTMLElement).closest('button')) {
      return;
    }
    setSelectedVideoForModal(campaign);
  };

  const handlePlayInline = (campaignId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setPlayingVideoId(playingVideoId === campaignId ? null : campaignId);
  };

  const handleDownload = () => {
    if (!generatedVideo) return;
    const link = document.createElement('a');
    link.href = generatedVideo.url;
    link.download = `${generatedVideo.name}.mp4`;
    link.click();
  };

  const handleShare = () => {
    if (!generatedVideo) return;
    // Copy video URL to clipboard
    navigator.clipboard.writeText(generatedVideo.url);
    alert('Video URL copied to clipboard!');
  };

  const handleDownloadVideo = (campaign: VideoCampaign, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!campaign.videoUrl) return;
    const link = document.createElement('a');
    link.href = campaign.videoUrl;
    link.download = `${campaign.name}.mp4`;
    link.click();
  };

  const handleDeleteVideo = async (campaign: VideoCampaign, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${campaign.name}"?`)) return;
    try {
      await videoService.deleteCampaign(campaign.id);
      loadPreviousVideos();
      alert('Video deleted successfully!');
    } catch (error) {
      console.error('Failed to delete video:', error);
      alert('Failed to delete video. Please try again.');
    }
  };

  const handlePlayVideo = (campaign: VideoCampaign, event: React.MouseEvent) => {
    event.stopPropagation();
    setPlayingVideoId(playingVideoId === campaign.id ? null : campaign.id);
  };

  const filteredVideos = previousVideos.filter(video => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Ready') return video.status === 'READY';
    if (activeFilter === 'Generating') return video.status === 'GENERATING' || video.status === 'DRAFT';
    if (activeFilter === 'Failed') return video.status === 'FAILED';
    return true;
  });

  // If video is generated, show final result screen
  if (generatedVideo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-rose-50 to-orange-50 flex items-center justify-center p-6">
        <div className="w-full max-w-5xl">
          {/* Success Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full mb-6 shadow-2xl">
              <PlayIcon className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl font-bold text-white mb-4">
              🎉 Your Video is Ready!
            </h1>
            <p className="text-xl text-[#94A3B8] max-w-2xl mx-auto">
              Your professional video campaign has been generated successfully.
            </p>
          </div>

          {/* Video Player */}
          <div className="bg-[#161625] rounded-3xl shadow-2xl overflow-hidden mb-8">
            <div className="aspect-video bg-black relative max-h-[600px]">
              <video
                src={generatedVideo.url}
                controls
                autoPlay
                className="w-full h-full object-contain"
              >
                Your browser does not support the video tag.
              </video>
            </div>

            {/* Video Info */}
            <div className="p-8">
              <h2 className="text-2xl font-bold text-[#F1F5F9] mb-2">
                {generatedVideo.name}
              </h2>
              <p className="text-[#94A3B8] mb-6">
                Campaign ID: {generatedVideo.campaignId}
              </p>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <button
                  type="button"
                  onClick={() => setGeneratedVideo(null)}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-[#161625] text-[#CBD5E1] rounded-xl font-bold border-2 border-[#33335a] hover:bg-[#12121f] hover:border-gray-400 transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                >
                  <ArrowLeftIcon className="w-5 h-5" />
                  Back to Library
                </button>

                <button
                  type="button"
                  onClick={() => setShowEmailModal(true)}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-bold border border-indigo-500/30 transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                >
                  <EnvelopeIcon className="w-5 h-5" />
                  Send as Email
                </button>

                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-bold border border-indigo-500/30 transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                >
                  <ArrowDownTrayIcon className="w-5 h-5" />
                  Download
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-bold border border-indigo-500/30 transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                >
                  <ShareIcon className="w-5 h-5" />
                  Share
                </button>

                <button
                  type="button"
                  onClick={handleStartNew}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-bold border border-indigo-500/30 transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                >
                  <VideoCameraIcon className="w-5 h-5" />
                  New Video
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: '✨', title: 'AI Generated', desc: 'Fully automated creation' },
              { icon: '🎬', title: 'HD Quality', desc: '1920x1080 resolution' },
              { icon: '🚀', title: 'Ready to Use', desc: 'Download and share now' },
            ].map((stat, index) => (
              <div key={index} className="bg-[#161625] rounded-xl p-6 shadow-md text-center">
                <div className="text-4xl mb-2">{stat.icon}</div>
                <h4 className="font-bold text-[#F1F5F9] mb-1">{stat.title}</h4>
                <p className="text-sm text-[#94A3B8]">{stat.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Email Template Modal */}
        {generatedVideo && (
          <CreateEmailTemplateModal
            isOpen={showEmailModal}
            onClose={() => setShowEmailModal(false)}
            campaign={{
              id: generatedVideo.campaignId,
              name: generatedVideo.name,
              narrationScript: generatedVideo.narrationScript || 'Check out this personalized video created just for you!',
              videoUrl: generatedVideo.url,
            }}
            onSuccess={handleEmailTemplateCreated}
          />
        )}
      </div>
    );
  }

  // Default: Show Video Library - VIDEO LIBRARY WITH ACTUAL PLAYERS
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-rose-50 to-orange-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-5xl font-bold text-white">
                Video Library
              </h1>
              <p className="text-[#94A3B8] mt-2">
                {previousVideos.length} video{previousVideos.length !== 1 ? 's' : ''} in library
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowAutoGenerate(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold border border-indigo-500/30 hover:shadow-2xl hover:shadow-purple-200/50 hover:scale-105 transition-all shadow-lg active:scale-95"
              >
                <SparklesIcon className="w-5 h-5" />
                AI Auto-Generate
              </button>
              <button
                type="button"
                onClick={() => setShowCreateNew(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-bold border border-indigo-500/30 hover:shadow-2xl hover:shadow-orange-200/50 hover:scale-105 transition-all shadow-lg active:scale-95"
              >
                <VideoCameraIcon className="w-5 h-5" />
                Create New Video
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          {previousVideos.length > 0 && (
            <div className="flex gap-3">
              {(['All', 'Generating', 'Ready', 'Failed'] as const).map(filter => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={`px-6 py-3 rounded-full text-sm font-bold transition-all duration-300 ease-in-out capitalize tracking-wide ${
                    activeFilter === filter
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white border border-indigo-500/30 shadow-lg hover:shadow-xl hover:scale-105'
                      : 'bg-[#161625] text-[#CBD5E1] border-2 border-[#33335a] hover:bg-[#12121f] hover:border-gray-400 hover:scale-105 shadow-sm'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Loading State */}
        {loadingVideos && (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-orange-200 border-t-orange-500"></div>
            <p className="mt-4 text-[#94A3B8]">Loading your videos...</p>
          </div>
        )}

        {/* Empty State */}
        {!loadingVideos && previousVideos.length === 0 && (
          <div className="text-center py-32">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full mb-6 shadow-lg">
              <VideoCameraIcon className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-3">
              No videos yet
            </h2>
            <p className="text-[#94A3B8] mb-8">
              Create your first AI-powered video campaign
            </p>
            <button
              type="button"
              onClick={() => setShowCreateNew(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-bold border border-indigo-500/30 hover:shadow-2xl hover:shadow-orange-200/50 hover:scale-105 transition-all shadow-lg active:scale-95"
            >
              <VideoCameraIcon className="w-5 h-5" />
              Create New Video
            </button>
          </div>
        )}

        {/* Video Grid - ACTUAL VIDEO PLAYERS WITH METADATA */}
        {!loadingVideos && filteredVideos.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVideos.map((campaign) => (
              <div
                key={campaign.id}
                className="bg-[#161625] rounded-2xl overflow-hidden border-2 border-orange-200 hover:border-indigo-500 shadow-md hover:shadow-xl hover:shadow-orange-200/50 transition-all duration-300"
              >
                {/* Video Player Section */}
                <div className="relative aspect-video bg-gray-900 rounded-t-xl overflow-hidden">
                  {campaign.videoUrl ? (
                    <video
                      controls
                      poster={campaign.thumbnailUrl || undefined}
                      className="w-full h-full object-cover"
                    >
                      <source src={campaign.videoUrl} type="video/mp4" />
                      Your browser doesn't support video playback.
                    </video>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-500 via-orange-600 to-rose-500">
                      <VideoCameraIcon className="w-24 h-24 text-white opacity-40" />
                    </div>
                  )}

                  {/* Status Badge */}
                  {campaign.status === 'READY' && (
                    <span className="absolute top-4 right-4 z-10 px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold rounded-full border-2 border-white shadow-lg">
                      ✓ READY
                    </span>
                  )}
                  {campaign.status === 'GENERATING' && (() => {
                    const elapsed = Date.now() - new Date(campaign.createdAt).getTime();
                    const estimatedTotal = 180000; // 3 minutes in ms
                    const progress = Math.min(Math.floor((elapsed / estimatedTotal) * 100), 99);
                    const remaining = Math.max(0, Math.ceil((estimatedTotal - elapsed) / 60000));

                    return (
                      <div className="absolute top-4 right-4 z-10 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-bold rounded-lg border-2 border-white shadow-lg p-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="animate-pulse">⚡</span>
                          <span>GENERATING</span>
                        </div>
                        <div className="text-xs font-normal">
                          {progress}% • {remaining}min left
                        </div>
                      </div>
                    );
                  })()}
                  {campaign.status === 'DRAFT' && (
                    <span className="absolute top-4 right-4 z-10 px-3 py-1 bg-gradient-to-r from-yellow-500 to-amber-500 text-white text-xs font-bold rounded-full border-2 border-white shadow-lg">
                      📝 DRAFT
                    </span>
                  )}
                  {campaign.status === 'FAILED' && (
                    <span className="absolute top-4 right-4 z-10 px-3 py-1 bg-gradient-to-r from-red-500 to-orange-600 text-white text-xs font-bold rounded-full border-2 border-white shadow-lg">
                      ✗ FAILED
                    </span>
                  )}
                </div>

                {/* Video Info */}
                <div className="p-6">
                  <h3 className="text-lg font-bold text-[#F1F5F9] mb-3 line-clamp-2">
                    {campaign.name}
                  </h3>

                  {/* Metadata */}
                  <div className="flex items-center gap-3 text-sm text-[#94A3B8] mb-4">
                    <UsersIcon className="w-4 h-4 text-indigo-400" />
                    <span>{campaign._count?.companies || 0} companies</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 mb-4">
                    {campaign.videoUrl && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => handlePlayVideo(campaign, e)}
                          className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2.5 rounded-xl font-bold border border-indigo-500/30 flex items-center justify-center gap-2 hover:shadow-lg hover:scale-105 transition-all active:scale-95"
                        >
                          <PlayIconSolid className="w-4 h-4" />
                          Play
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleDownloadVideo(campaign, e)}
                          className="p-2.5 bg-[#161625] border-2 border-indigo-500 rounded-xl hover:bg-orange-500/10 hover:scale-105 transition-all active:scale-95"
                          title="Download video"
                        >
                          <ArrowDownTrayIcon className="w-5 h-5 text-indigo-400" />
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={(e) => handleDeleteVideo(campaign, e)}
                      className="p-2.5 bg-[#161625] border-2 border-red-500 rounded-xl hover:bg-red-500/10 hover:scale-105 transition-all active:scale-95"
                      title="Delete video"
                    >
                      <TrashIcon className="w-5 h-5 text-red-600" />
                    </button>
                  </div>

                  {/* Created Date */}
                  <div className="pt-4 border-t border-[#2a2a44]">
                    <p className="text-xs text-[#94A3B8]">
                      Created {new Date(campaign.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty Filter State */}
        {!loadingVideos && previousVideos.length > 0 && filteredVideos.length === 0 && (
          <div className="text-center py-16">
            <p className="text-[#94A3B8] text-lg">No videos found with status: <span className="font-bold text-indigo-400">{activeFilter}</span></p>
          </div>
        )}
      </div>

      {/* Email Template Modal for library videos */}
      {generatedVideo && (
        <CreateEmailTemplateModal
          isOpen={showEmailModal}
          onClose={() => {
            setShowEmailModal(false);
            setGeneratedVideo(null);
          }}
          campaign={{
            id: generatedVideo.campaignId,
            name: generatedVideo.name,
            narrationScript: generatedVideo.narrationScript || 'Check out this personalized video!',
            videoUrl: generatedVideo.url,
          }}
          onSuccess={handleEmailTemplateCreated}
        />
      )}

      {/* Auto-Generate Video Modal */}
      <AutoGenerateVideoModal
        isOpen={showAutoGenerate}
        onClose={() => setShowAutoGenerate(false)}
        onSuccess={(campaignId) => {
          console.log('Auto-generated video campaign:', campaignId);
          // Immediately reload videos to show the new ready campaign
          loadPreviousVideos();
          // Switch to "All" filter to show all videos including the new one
          setActiveFilter('All');
          setShowAutoGenerate(false);
        }}
      />

      {/* Manual Create Video Modal */}
      <CreateVideoCampaignModal
        isOpen={showCreateNew}
        onClose={() => setShowCreateNew(false)}
        onSuccess={handleManualVideoCreated}
      />
    </div>
  );
}
