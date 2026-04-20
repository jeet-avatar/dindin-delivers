import { useState, useRef } from 'react';
import { PhotoIcon, XMarkIcon, ArrowUpTrayIcon, QuestionMarkCircleIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { videoService } from '../services/videoService';

interface LogoUploaderProps {
  label: string;
  value?: string;
  onChange: (url: string) => void;
  placeholder?: string;
  accept?: string;
  companyDomain?: string; // For auto logo fetch
  helpText?: string;
}

export function LogoUploader({
  label,
  value,
  onChange,
  placeholder = 'Enter logo URL or upload image',
  accept = 'image/png,image/jpeg,image/jpg,image/svg+xml',
  companyDomain,
  helpText,
}: LogoUploaderProps) {
  const [url, setUrl] = useState(value || '');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isFetchingLogo, setIsFetchingLogo] = useState(false);
  const [error, setError] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultHelpText = `
**How to add your logo:**

1. **Upload a file** - Click or drag & drop a PNG, JPG, or SVG (max 5MB)
2. **Paste a URL** - Enter a direct link to your logo image
3. **Auto-fetch** - ${companyDomain ? 'Click the sparkle button to automatically fetch the logo from the company domain' : 'Provide a company domain to auto-fetch the logo'}

**Tips:**
- Use transparent PNG for best results
- Recommended size: 500x500px or larger
- Logo should be centered with padding
- Avoid low-resolution images
`;

  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);
    setError('');
    if (newUrl.trim()) {
      onChange(newUrl.trim());
    }
  };

  const handleFileSelect = async (file: File) => {
    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Please upload PNG, JPG, or SVG');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large. Maximum size is 5MB');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      // Upload to S3 via backend
      const formData = new FormData();
      formData.append('logo', file);
      formData.append('name', file.name);

      const result = await videoService.uploadLogo(formData);
      setUrl(result.logoUrl);
      onChange(result.logoUrl);
    } catch (err: any) {
      // Fallback to local preview if upload fails
      console.error('Upload error:', err);
      const previewUrl = URL.createObjectURL(file);
      setUrl(previewUrl);
      onChange(previewUrl);
      setError('Using local preview - upload to S3 failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFetchLogo = async () => {
    if (!companyDomain) {
      setError('No company domain provided');
      return;
    }

    setIsFetchingLogo(true);
    setError('');

    try {
      // Try multiple sources in order
      const sources = [
        // Clearbit Logo API
        `https://logo.clearbit.com/${companyDomain}`,
        // Google Favicon (as fallback)
        `https://www.google.com/s2/favicons?domain=${companyDomain}&sz=256`,
      ];

      // Try Clearbit first
      const response = await fetch(sources[0]);
      if (response.ok) {
        setUrl(sources[0]);
        onChange(sources[0]);
      } else {
        // Fallback to Google favicon
        setUrl(sources[1]);
        onChange(sources[1]);
      }
    } catch (err: any) {
      setError('Failed to fetch logo. Please upload manually or enter URL.');
      console.error('Logo fetch error:', err);
    } finally {
      setIsFetchingLogo(false);
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

  const handleRemove = () => {
    setUrl('');
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      {/* Label with Help Icon */}
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-[#CBD5E1]">
          {label}
        </label>
        <button
          type="button"
          onClick={() => setShowHelp(!showHelp)}
          className="p-1 text-[#64748B] hover:text-indigo-400 transition-colors"
          title="Show help"
        >
          <QuestionMarkCircleIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Help Panel */}
      {showHelp && (
        <div className="bg-orange-500/10 border border-orange-200 rounded-lg p-4 text-sm space-y-2">
          <div className="flex items-start gap-2">
            <QuestionMarkCircleIcon className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
            <div className="prose prose-sm max-w-none text-[#CBD5E1]">
              {(helpText || defaultHelpText).split('\n').map((line, i) => {
                if (line.startsWith('**') && line.endsWith('**')) {
                  return <p key={i} className="font-semibold text-orange-900 mb-1 mt-2">{line.replace(/\*\*/g, '')}</p>;
                }
                if (line.trim().match(/^\d+\./)) {
                  return <p key={i} className="ml-4 mb-1">{line}</p>;
                }
                if (line.trim().startsWith('-')) {
                  return <p key={i} className="ml-4 mb-1 text-[#94A3B8]">{line}</p>;
                }
                return line.trim() ? <p key={i} className="mb-1">{line}</p> : null;
              })}
            </div>
          </div>
        </div>
      )}

      {/* Preview or Upload Area */}
      {url ? (
        <div className="relative">
          {/* Logo Preview */}
          <div className="border-2 border-[#2a2a44] rounded-lg p-4 bg-[#12121f] flex items-center justify-center min-h-[120px]">
            <img
              src={url}
              alt={label}
              className="max-h-24 max-w-full object-contain"
              onError={() => setError('Failed to load image')}
            />
          </div>

          {/* Remove Button */}
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
            title="Remove logo"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>

          {/* Change URL */}
          <button
            type="button"
            onClick={() => setUrl('')}
            className="mt-2 text-sm text-indigo-400 hover:text-orange-400 font-medium"
          >
            Change logo
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Auto-fetch button (if domain provided) */}
          {companyDomain && (
            <button
              type="button"
              onClick={handleFetchLogo}
              disabled={isFetchingLogo}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
            >
              <SparklesIcon className="w-5 h-5" />
              {isFetchingLogo ? 'Fetching logo...' : `Auto-fetch logo from ${companyDomain}`}
            </button>
          )}

          {/* Drag & Drop Area */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer ${
              isDragging
                ? 'border-indigo-500 bg-orange-500/10'
                : 'border-[#33335a] hover:border-orange-400 hover:bg-[#12121f]'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600"></div>
                <p className="text-sm text-[#94A3B8]">Uploading...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <ArrowUpTrayIcon className="w-10 h-10 text-[#64748B]" />
                <p className="text-sm text-[#94A3B8]">
                  <span className="font-semibold text-indigo-400">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-[#94A3B8]">PNG, JPG, or SVG (max 5MB)</p>
              </div>
            )}
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileInputChange}
            className="hidden"
          />

          {/* OR Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#33335a]"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-[#161625] text-[#94A3B8] uppercase">Or</span>
            </div>
          </div>

          {/* URL Input */}
          <div>
            <input
              type="url"
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder={placeholder}
              className="w-full px-4 py-2 border border-[#33335a] rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <XMarkIcon className="w-4 h-4" />
          {error}
        </p>
      )}

      {/* Help Text */}
      {!showHelp && (
        <p className="text-xs text-[#94A3B8]">
          For best results, use a transparent PNG with your logo centered. Click the ? icon for help.
        </p>
      )}
    </div>
  );
}
