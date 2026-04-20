import { ArrowPathIcon } from "@heroicons/react/24/outline";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  message?: string;
  fullScreen?: boolean;
  className?: string;
}

export function LoadingSpinner({
  size = "md",
  message,
  fullScreen = false,
  className = ""
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
    xl: "w-24 h-24",
  };

  const borderClasses = {
    sm: "border-4",
    md: "border-4",
    lg: "border-6",
    xl: "border-8",
  };

  const textClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
    xl: "text-xl",
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <div
          className={`${sizeClasses[size]} ${borderClasses[size]} border-orange-200 border-t-orange-600 rounded-full animate-spin`}
        />
      </div>
      {message && (
        <p className={`${textClasses[size]} text-[#CBD5E1] font-medium animate-pulse`}>
          {message}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className={`fixed inset-0 bg-[#161625]/90 backdrop-blur-sm flex items-center justify-center z-50 ${className}`}>
        {spinner}
      </div>
    );
  }

  return <div className={`flex items-center justify-center p-8 ${className}`}>{spinner}</div>;
}

// Inline loading component for buttons
export function ButtonLoading({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex items-center justify-center gap-2">
      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      <span>{message}</span>
    </div>
  );
}

// Skeleton loader for content
export function SkeletonLoader({ rows = 3, className = "" }: { rows?: number; className?: string }) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="animate-pulse space-y-3">
          <div className="h-4 bg-[#252540] rounded w-3/4"></div>
          <div className="h-4 bg-[#252540] rounded w-1/2"></div>
        </div>
      ))}
    </div>
  );
}

// Progress bar loader
export function ProgressLoader({
  progress,
  message,
  className = "",
}: {
  progress: number;
  message?: string;
  className?: string;
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      {message && <p className="text-sm text-[#CBD5E1] font-medium">{message}</p>}
      <div className="w-full bg-[#252540] rounded-full h-3 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
      <p className="text-xs text-[#94A3B8] text-right">{Math.round(progress)}%</p>
    </div>
  );
}
