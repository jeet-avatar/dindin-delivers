import { useState } from 'react';
import { SparklesIcon, VideoCameraIcon } from '@heroicons/react/24/outline';
import { videoService } from '../services/videoService';

interface GenerateVideoFromPromptProps {
  onVideoGenerated?: (template: any) => void;
}

export function GenerateVideoFromPrompt({ onVideoGenerated }: GenerateVideoFromPromptProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!prompt.trim()) {
      setError('Please enter a description for your video');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await videoService.generateFromPrompt(prompt);

      setSuccess('Video template generated successfully!');
      setPrompt('');

      if (onVideoGenerated) {
        onVideoGenerated(result.template);
      }

      // Show success message with details
      setTimeout(() => {
        alert(`✅ Video Generated!\n\nTitle: ${result.template.name}\n\nScript: ${result.videoData.script.substring(0, 200)}...\n\nKeywords: ${result.videoData.keywords.join(', ')}\n\nYou can now use this template to create campaigns!`);
      }, 500);

    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate video. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-8 border-2 border-purple-200 shadow-lg">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white shadow-md">
          <SparklesIcon className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[#F1F5F9]">AI Video Generator</h2>
          <p className="text-[#94A3B8] text-sm">Create 30-second tech videos from a simple prompt</p>
        </div>
      </div>

      <form onSubmit={handleGenerate} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-[#CBD5E1] mb-2">
            Describe your video
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Example: Create a video about cloud computing benefits for small businesses"
            className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all resize-none"
            rows={4}
            disabled={loading}
          />
          <p className="mt-2 text-xs text-[#94A3B8]">
            💡 Tip: Focus on tech topics like cloud, AI, software, data, automation, etc.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border-2 border-red-200 rounded-xl">
            <p className="text-red-400 text-sm font-medium">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-500/10 border-2 border-green-200 rounded-xl">
            <p className="text-green-400 text-sm font-medium">{success}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Generating Video...
            </>
          ) : (
            <>
              <VideoCameraIcon className="w-5 h-5" />
              Generate Video Template
            </>
          )}
        </button>
      </form>

      {loading && (
        <div className="mt-6 space-y-3">
          <div className="flex items-center gap-3 text-sm text-[#94A3B8]">
            <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"></div>
            <span>Analyzing your prompt with AI...</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-[#94A3B8]">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse animation-delay-200"></div>
            <span>Finding perfect stock footage...</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-[#94A3B8]">
            <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse animation-delay-400"></div>
            <span>Creating video template...</span>
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-[#161625] rounded-xl border-2 border-purple-100">
        <h3 className="font-bold text-[#F1F5F9] mb-2 flex items-center gap-2">
          <span className="text-purple-600">✨</span> How it works
        </h3>
        <ul className="space-y-2 text-sm text-[#94A3B8]">
          <li className="flex items-start gap-2">
            <span className="text-purple-600 font-bold">1.</span>
            <span>AI extracts keywords from your prompt</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-600 font-bold">2.</span>
            <span>Searches for relevant tech stock footage</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-600 font-bold">3.</span>
            <span>Generates a professional narration script</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-600 font-bold">4.</span>
            <span>Creates a ready-to-use video template</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
