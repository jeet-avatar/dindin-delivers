import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

interface VideoGenerationProgressProps {
  status: string;
  progress: number;
  currentStep?: string;
  error?: string;
}

export function VideoGenerationProgress({
  status,
  progress,
  currentStep,
  error,
}: VideoGenerationProgressProps) {
  return (
    <div className="space-y-4">
      {status === 'FAILED' ? (
        <div className="flex items-center gap-3 text-red-600">
          <XCircleIcon className="w-8 h-8" />
          <div>
            <p className="font-semibold">Generation Failed</p>
            {error && <p className="text-sm">{error}</p>}
          </div>
        </div>
      ) : status === 'READY' ? (
        <div className="flex items-center gap-3 text-green-600">
          <CheckCircleIcon className="w-8 h-8" />
          <p className="font-semibold">Video Ready!</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-medium text-[#CBD5E1]">
              {currentStep || 'Processing...'}
            </p>
            <span className="text-sm text-[#94A3B8]">{progress}%</span>
          </div>
          <div className="w-full bg-[#252540] rounded-full h-2">
            <div
              className="bg-gradient-to-r from-indigo-600 to-purple-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-[#94A3B8]">
            This may take a few minutes. You can close this and check back later.
          </p>
        </div>
      )}
    </div>
  );
}
