import { useState, useRef } from 'react';
import { CloudArrowUpIcon, XMarkIcon, VideoCameraIcon } from '@heroicons/react/24/outline';
import { videoService } from '../services/videoService';

interface VideoUploaderProps {
  onUploadComplete: (videoUrl: string) => void;
  onCancel?: () => void;
}

export function VideoUploader({ onUploadComplete, onCancel }: VideoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
  const MAX_SIZE = 500 * 1024 * 1024; // 500MB

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Invalid file type. Please upload MP4, MOV, AVI, or WEBM';
    }

    if (file.size > MAX_SIZE) {
      return 'File too large. Maximum size is 500MB';
    }

    return null;
  };

  const handleFileSelect = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsUploading(true);
    setError('');
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('video', file);
      formData.append('name', file.name);
      formData.append('category', 'Custom');

      const result = await videoService.uploadTemplate(formData, (progressEvent) => {
        if (progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });

      setUploadProgress(100);

      setTimeout(() => {
        onUploadComplete(result.videoUrl);
      }, 500);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to upload video');
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUrlSubmit = () => {
    if (!urlInput.trim()) {
      setError('Please enter a video URL');
      return;
    }

    // Basic URL validation
    try {
      new URL(urlInput);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    onUploadComplete(urlInput.trim());
  };

  return (
    <div className="space-y-4">
      {/* Mode Selector */}
      <div className="flex gap-2 p-1 bg-[#1c1c30] rounded-lg">
        <button
          onClick={() => setMode('upload')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
            mode === 'upload'
              ? 'bg-[#161625] text-indigo-400 shadow-sm'
              : 'text-[#94A3B8] hover:text-[#F1F5F9]'
          }`}
        >
          <CloudArrowUpIcon className="w-5 h-5 inline mr-2" />
          Upload File
        </button>
        <button
          onClick={() => setMode('url')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
            mode === 'url'
              ? 'bg-[#161625] text-indigo-400 shadow-sm'
              : 'text-[#94A3B8] hover:text-[#F1F5F9]'
          }`}
        >
          <VideoCameraIcon className="w-5 h-5 inline mr-2" />
          Enter URL
        </button>
      </div>

      {/* Upload Mode */}
      {mode === 'upload' && (
        <div>
          {isUploading ? (
            <div className="border-2 border-[#2a2a44] rounded-xl p-8 bg-[#12121f]">
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
                </div>
                <div>
                  <p className="text-center text-[#CBD5E1] font-medium mb-2">
                    Uploading video...
                  </p>
                  <div className="w-full bg-[#252540] rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-center text-sm text-[#94A3B8] mt-2">
                    {uploadProgress}% complete
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer ${
                isDragging
                  ? 'border-indigo-500 bg-orange-500/10 scale-105'
                  : 'border-[#33335a] hover:border-orange-400 hover:bg-[#12121f]'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <CloudArrowUpIcon className="w-16 h-16 text-[#64748B] mx-auto mb-4" />
              <p className="text-lg font-semibold text-[#CBD5E1] mb-2">
                {isDragging ? 'Drop your video here' : 'Upload your video'}
              </p>
              <p className="text-sm text-[#94A3B8] mb-4">
                <span className="font-semibold text-indigo-400">Click to browse</span> or drag and drop
              </p>
              <div className="space-y-1 text-xs text-[#94A3B8]">
                <p>Supported formats: MP4, MOV, AVI, WEBM</p>
                <p>Maximum file size: 500MB</p>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/x-msvideo,video/webm"
            onChange={handleFileInputChange}
            className="hidden"
          />
        </div>
      )}

      {/* URL Mode */}
      {mode === 'url' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#CBD5E1] mb-2">
              Video URL
            </label>
            <input
              type="url"
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value);
                setError('');
              }}
              placeholder="https://example.com/your-video.mp4"
              className="w-full px-4 py-3 border border-[#33335a] rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            />
            <p className="mt-2 text-xs text-[#94A3B8]">
              Enter a direct link to your video file (must be publicly accessible)
            </p>
          </div>

          <button
            onClick={handleUrlSubmit}
            disabled={!urlInput.trim()}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
          >
            Use This Video
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-200 rounded-lg flex items-start gap-2">
          <XMarkIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Cancel Button */}
      {onCancel && !isUploading && (
        <button
          onClick={onCancel}
          className="w-full py-2 text-[#94A3B8] hover:text-[#F1F5F9] font-medium transition-colors"
        >
          Cancel
        </button>
      )}
    </div>
  );
}
