import { useState, useEffect } from 'react';
import {
  MagnifyingGlassIcon,
  PlayIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  ClockIcon,
  FilmIcon,
} from '@heroicons/react/24/outline';
import { videoService } from '../services/videoService';
import { useTheme } from '../contexts/ThemeContext';

interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  duration: number;
  url: string;
  image: string;
  user: {
    name: string;
    url: string;
  };
  video_files: {
    id: number;
    quality: string;
    file_type: string;
    width: number;
    height: number;
    link: string;
  }[];
  video_pictures: {
    id: number;
    picture: string;
  }[];
}

interface PexelsVideoBrowserProps {
  onSelectVideo: (video: {
    url: string;
    thumbnailUrl: string;
    duration: number;
    width: number;
    height: number;
    source: string;
    author: string;
    pexelsId: number;
  }) => void;
  selectedVideoId?: number;
  allowSaveAsTemplate?: boolean;
}

const TECH_CATEGORIES = [
  { id: 'technology', label: 'Technology', icon: '💻' },
  { id: 'cloud computing', label: 'Cloud', icon: '☁️' },
  { id: 'coding programming', label: 'Coding', icon: '👨‍💻' },
  { id: 'data analytics', label: 'Data', icon: '📊' },
  { id: 'artificial intelligence', label: 'AI/ML', icon: '🤖' },
  { id: 'cybersecurity', label: 'Security', icon: '🔒' },
  { id: 'networking', label: 'Network', icon: '🌐' },
  { id: 'mobile apps', label: 'Mobile', icon: '📱' },
  { id: 'business office', label: 'Business', icon: '💼' },
  { id: 'innovation', label: 'Innovation', icon: '💡' },
];

export function PexelsVideoBrowser({
  onSelectVideo,
  selectedVideoId,
  allowSaveAsTemplate = true,
}: PexelsVideoBrowserProps) {
  const { gradients } = useTheme();
  const [videos, setVideos] = useState<PexelsVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('technology');
  const [selectedCategory, setSelectedCategory] = useState('technology');
  const [previewVideo, setPreviewVideo] = useState<PexelsVideo | null>(null);
  const [page, setPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  useEffect(() => {
    searchVideos(selectedCategory, 1);
  }, [selectedCategory]);

  const searchVideos = async (query: string, pageNum: number = 1) => {
    if (!query.trim()) {
      setError('Please enter a search query');
      return;
    }

    setLoading(true);
    setError('');
    setPage(pageNum);

    try {
      const result = await videoService.searchPexelsVideos(query, pageNum, 12);
      setVideos(result.videos);
      setTotalResults(result.total_results);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to search videos. Please check your Pexels API key.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchVideos(searchQuery, 1);
  };

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
    setSearchQuery(category);
    searchVideos(category, 1);
  };

  const handleSelectVideo = (video: PexelsVideo) => {
    // Get the best quality video file (prefer HD)
    const hdFile = video.video_files.find(
      (f) => f.quality === 'hd' && f.width === 1920 && f.height === 1080
    ) || video.video_files.find((f) => f.quality === 'hd') || video.video_files[0];

    onSelectVideo({
      url: hdFile.link,
      thumbnailUrl: video.image,
      duration: video.duration,
      width: hdFile.width,
      height: hdFile.height,
      source: 'Pexels',
      author: video.user.name,
      pexelsId: video.id,
    });

    setPreviewVideo(null);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getQualityBadge = (video: PexelsVideo): string => {
    const hasUHD = video.video_files.some((f) => f.quality === 'uhd');
    const hasHD = video.video_files.some((f) => f.quality === 'hd');
    if (hasUHD) return 'UHD';
    if (hasHD) return 'HD';
    return 'SD';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-6 border-2 border-purple-200 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white shadow-md">
            <FilmIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#F1F5F9]">Pexels Stock Video Library</h2>
            <p className="text-[#94A3B8] text-sm">
              Browse thousands of free HD stock videos for your campaigns
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for tech videos... (e.g., cloud computing, AI, coding)"
              className="w-full pl-12 pr-4 py-3 border-2 border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
            />
            <button
              type="submit"
              disabled={loading}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-bold hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50"
            >
              Search
            </button>
          </div>
        </form>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-purple-300 scrollbar-track-purple-100">
          {TECH_CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryClick(category.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-all ${
                selectedCategory === category.id
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg scale-105'
                  : 'bg-[#161625] text-[#CBD5E1] border-2 border-purple-200 hover:border-purple-400'
              }`}
            >
              <span>{category.icon}</span>
              <span>{category.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Results Count */}
      {totalResults > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[#94A3B8]">
            Found <span className="font-bold text-purple-600">{totalResults.toLocaleString()}</span> videos
          </p>
          <p className="text-xs text-[#94A3B8]">
            Page {page} • Showing {videos.length} videos
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border-2 border-red-200 rounded-xl p-4">
          <p className="text-red-400 font-medium">{error}</p>
          <p className="text-red-600 text-sm mt-1">
            Make sure your Pexels API key is configured correctly.
          </p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-video bg-gradient-to-br from-purple-200 to-blue-200 rounded-xl mb-3"></div>
              <div className="h-4 bg-purple-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-purple-500/15 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      )}

      {/* Videos Grid */}
      {!loading && videos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {videos.map((video) => (
            <div
              key={video.id}
              className={`group relative bg-[#161625] rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all cursor-pointer border-2 ${
                selectedVideoId === video.id
                  ? 'border-purple-600 ring-4 ring-purple-200'
                  : 'border-[#2a2a44] hover:border-purple-400'
              }`}
              onClick={() => setPreviewVideo(video)}
            >
              {/* Thumbnail */}
              <div className="relative aspect-video bg-[#1c1c30]">
                <img
                  src={video.image}
                  alt={`Video by ${video.user.name}`}
                  className="w-full h-full object-cover"
                />

                {/* Overlay on Hover */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <PlayIcon className="w-12 h-12 text-white" />
                </div>

                {/* Quality Badge */}
                <div className="absolute top-2 left-2">
                  <span className="px-2 py-1 bg-purple-600 text-white text-xs font-bold rounded">
                    {getQualityBadge(video)}
                  </span>
                </div>

                {/* Duration */}
                <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 bg-black/70 text-white text-xs font-bold rounded">
                  <ClockIcon className="w-3 h-3" />
                  {formatDuration(video.duration)}
                </div>

                {/* Selected Indicator */}
                {selectedVideoId === video.id && (
                  <div className="absolute top-2 right-2">
                    <CheckCircleIcon className="w-6 h-6 text-green-500 bg-[#161625] rounded-full" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-3">
                <p className="text-sm text-[#94A3B8] truncate">
                  By <span className="font-medium text-purple-600">{video.user.name}</span>
                </p>
                <p className="text-xs text-[#94A3B8] mt-1">
                  {video.width} × {video.height}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && videos.length === 0 && (
        <div className="text-center py-12">
          <FilmIcon className="w-16 h-16 text-[#64748B] mx-auto mb-4" />
          <p className="text-[#94A3B8] font-medium">No videos found</p>
          <p className="text-[#94A3B8] text-sm mt-1">Try searching for different keywords</p>
        </div>
      )}

      {/* Pagination */}
      {!loading && videos.length > 0 && totalResults > videos.length && (
        <div className="flex justify-center gap-3">
          <button
            onClick={() => searchVideos(searchQuery, page - 1)}
            disabled={page === 1}
            className="px-6 py-2 bg-[#161625] text-[#CBD5E1] border-2 border-purple-200 rounded-xl font-bold hover:bg-purple-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            ← Previous
          </button>
          <span className="px-6 py-2 bg-purple-500/15 text-purple-800 rounded-xl font-bold">
            Page {page}
          </span>
          <button
            onClick={() => searchVideos(searchQuery, page + 1)}
            className="px-6 py-2 bg-[#161625] text-[#CBD5E1] border-2 border-purple-200 rounded-xl font-bold hover:bg-purple-500/10 transition-all"
          >
            Next →
          </button>
        </div>
      )}

      {/* Preview Modal */}
      {previewVideo && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewVideo(null)}
        >
          <div
            className="bg-[#161625] rounded-2xl max-w-4xl w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-2xl font-bold text-[#F1F5F9]">Video Preview</h3>
                <p className="text-sm text-[#94A3B8] mt-1">
                  By {previewVideo.user.name} • {formatDuration(previewVideo.duration)} • {getQualityBadge(previewVideo)}
                </p>
              </div>
              <button
                onClick={() => setPreviewVideo(null)}
                className="text-[#64748B] hover:text-[#94A3B8] transition-colors p-2"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Video Player */}
            <div className="aspect-video bg-black rounded-xl overflow-hidden mb-4">
              <video
                src={previewVideo.video_files.find((f) => f.quality === 'hd')?.link || previewVideo.video_files[0].link}
                poster={previewVideo.image}
                controls
                autoPlay
                className="w-full h-full"
              />
            </div>

            {/* Quality Options */}
            <div className="mb-4">
              <p className="text-sm font-semibold text-[#CBD5E1] mb-2">Available Qualities:</p>
              <div className="flex gap-2 flex-wrap">
                {previewVideo.video_files.map((file) => (
                  <span
                    key={file.id}
                    className="px-3 py-1 bg-purple-500/15 text-purple-800 text-xs font-bold rounded-lg"
                  >
                    {file.quality.toUpperCase()} • {file.width}×{file.height}
                  </span>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => handleSelectVideo(previewVideo)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r ${gradients.brand.primary.gradient} text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all`}
              >
                <CheckCircleIcon className="w-5 h-5" />
                Use This Video
              </button>
              <button
                onClick={() => setPreviewVideo(null)}
                className="px-6 py-3 bg-[#1c1c30] text-[#CBD5E1] rounded-xl font-bold hover:bg-[#252540] transition-all"
              >
                Close
              </button>
            </div>

            {/* Attribution */}
            <div className="mt-4 pt-4 border-t border-[#2a2a44]">
              <p className="text-xs text-[#94A3B8]">
                Video by{' '}
                <a
                  href={previewVideo.user.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-600 hover:text-purple-400 font-medium"
                >
                  {previewVideo.user.name}
                </a>
                {' '}from{' '}
                <a
                  href={previewVideo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-600 hover:text-purple-400 font-medium"
                >
                  Pexels
                </a>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
