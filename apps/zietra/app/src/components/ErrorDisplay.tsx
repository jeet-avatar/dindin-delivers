import {
  ExclamationTriangleIcon,
  XCircleIcon,
  WifiIcon,
  ShieldExclamationIcon,
  DocumentTextIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

interface ErrorDisplayProps {
  code?: number;
  title?: string;
  message?: string;
  details?: string[];
  onRetry?: () => void;
  onClose?: () => void;
  className?: string;
}

export function ErrorDisplay({
  code,
  title,
  message,
  details,
  onRetry,
  onClose,
  className = "",
}: ErrorDisplayProps) {
  // Determine error type and styling based on code
  const getErrorConfig = () => {
    if (!code) {
      return {
        icon: XCircleIcon,
        gradient: "from-red-500 to-red-600",
        bg: "bg-red-500/10",
        border: "border-red-300",
        iconColor: "text-red-500",
        title: title || "Error Occurred",
        defaultMessage: message || "An unexpected error occurred. Please try again.",
      };
    }

    switch (Math.floor(code / 100)) {
      case 4: // Client errors (400-499)
        if (code === 400) {
          return {
            icon: DocumentTextIcon,
            gradient: "from-orange-500 to-orange-600",
            bg: "bg-orange-500/10",
            border: "border-orange-300",
            iconColor: "text-indigo-400",
            title: title || "Invalid Request",
            defaultMessage: message || "The request contains invalid data. Please check your input.",
          };
        }
        if (code === 401 || code === 403) {
          return {
            icon: ShieldExclamationIcon,
            gradient: "from-yellow-500 to-yellow-600",
            bg: "bg-yellow-500/10",
            border: "border-yellow-300",
            iconColor: "text-yellow-500",
            title: title || "Access Denied",
            defaultMessage: message || "You don't have permission to perform this action.",
          };
        }
        if (code === 404) {
          return {
            icon: DocumentTextIcon,
            gradient: "from-indigo-500 to-purple-600",
            bg: "bg-rose-500/10",
            border: "border-rose-300",
            iconColor: "text-rose-500",
            title: title || "Not Found",
            defaultMessage: message || "The requested resource could not be found.",
          };
        }
        return {
          icon: ExclamationTriangleIcon,
          gradient: "from-orange-500 to-orange-600",
          bg: "bg-orange-500/10",
          border: "border-orange-300",
          iconColor: "text-indigo-400",
          title: title || `Error ${code}`,
          defaultMessage: message || "Client error occurred. Please check your request.",
        };

      case 5: // Server errors (500-599)
        return {
          icon: XCircleIcon,
          gradient: "from-red-500 to-red-600",
          bg: "bg-red-500/10",
          border: "border-red-300",
          iconColor: "text-red-500",
          title: title || "Server Error",
          defaultMessage: message || "A server error occurred. Our team has been notified.",
        };

      default: // Network or other errors
        return {
          icon: WifiIcon,
          gradient: "from-[#12121f]0 to-gray-600",
          bg: "bg-[#12121f]",
          border: "border-[#33335a]",
          iconColor: "text-[#94A3B8]",
          title: title || "Connection Error",
          defaultMessage: message || "Unable to connect to the server. Please check your internet connection.",
        };
    }
  };

  const config = getErrorConfig();
  const Icon = config.icon;

  return (
    <div className={`min-h-[400px] flex items-center justify-center p-8 ${className}`}>
      <div className={`max-w-2xl w-full ${config.bg} border-2 ${config.border} rounded-2xl shadow-lg`}>
        {/* Header */}
        <div className={`bg-gradient-to-r ${config.gradient} px-8 py-6`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Icon className="w-12 h-12 text-white" />
              <div>
                <h2 className="text-2xl font-bold text-white">{config.title}</h2>
                {code && <p className="text-white/90 text-sm font-mono mt-1">Error Code: {code}</p>}
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-white hover:bg-[#161625]/20 rounded-lg p-2 transition-colors"
                aria-label="Close"
              >
                <XCircleIcon className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          {/* Main Message */}
          <div className={`flex items-start gap-3 ${config.bg} border-2 ${config.border} rounded-lg p-4`}>
            <ExclamationTriangleIcon className={`w-6 h-6 ${config.iconColor} flex-shrink-0 mt-0.5`} />
            <p className="text-[#E2E8F0] text-lg">{config.defaultMessage}</p>
          </div>

          {/* Error Details */}
          {details && details.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-[#E2E8F0] flex items-center gap-2">
                <DocumentTextIcon className="w-5 h-5" />
                Error Details:
              </h3>
              <div className="bg-[#161625] border-2 border-[#2a2a44] rounded-lg p-4 space-y-2">
                {details.map((detail, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className="text-[#64748B] font-mono text-sm mt-0.5">•</span>
                    <p className="text-[#CBD5E1] text-sm flex-1">{detail}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Common Solutions */}
          <div className="bg-orange-500/10 border-2 border-orange-200 rounded-lg p-4">
            <h4 className="font-semibold text-orange-400 mb-2">Suggested Solutions:</h4>
            <ul className="text-sm text-orange-400 space-y-1">
              {code === 400 && (
                <>
                  <li>• Check that all required fields are filled correctly</li>
                  <li>• Verify file format and size requirements</li>
                  <li>• Ensure data is in the expected format</li>
                </>
              )}
              {(code === 401 || code === 403) && (
                <>
                  <li>• Try logging out and logging back in</li>
                  <li>• Contact your administrator for access permissions</li>
                  <li>• Verify your session hasn't expired</li>
                </>
              )}
              {code === 404 && (
                <>
                  <li>• Check that the item still exists</li>
                  <li>• Verify the URL or ID is correct</li>
                  <li>• Refresh the page and try again</li>
                </>
              )}
              {code && code >= 500 && (
                <>
                  <li>• Wait a moment and try again</li>
                  <li>• Check system status page</li>
                  <li>• Contact support if the issue persists</li>
                </>
              )}
              {!code && (
                <>
                  <li>• Check your internet connection</li>
                  <li>• Refresh the page</li>
                  <li>• Try again in a few moments</li>
                </>
              )}
            </ul>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 pt-4">
            {onRetry && (
              <button
                onClick={onRetry}
                className={`flex-1 px-6 py-3 bg-gradient-to-r ${config.gradient} text-white rounded-xl font-semibold hover:opacity-90 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2`}
              >
                <ArrowPathIcon className="w-5 h-5" />
                Try Again
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-[#252540] text-[#E2E8F0] rounded-xl font-semibold hover:bg-gray-300 transition-colors border-2 border-[#33335a]"
              >
                Close
              </button>
            )}
          </div>

          {/* Support Info */}
          <div className="text-center text-sm text-[#94A3B8] pt-4 border-t-2 border-[#2a2a44]">
            <p>
              Need help?{" "}
              <a href="mailto:support@zietra.com" className="text-indigo-400 hover:underline font-medium">
                Contact Support
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Compact inline error component
export function InlineError({
  message,
  details,
  onRetry,
  className = "",
}: {
  message: string;
  details?: string[];
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={`bg-red-500/10 border-2 border-red-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <ExclamationTriangleIcon className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-red-400 font-medium">{message}</p>
          {details && details.length > 0 && (
            <ul className="mt-2 space-y-1">
              {details.map((detail, index) => (
                <li key={index} className="text-sm text-red-400">
                  • {detail}
                </li>
              ))}
            </ul>
          )}
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <ArrowPathIcon className="w-4 h-4" />
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
