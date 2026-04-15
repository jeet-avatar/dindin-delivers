/**
 * EmptyState — Phase 17
 * Reusable empty-state card with icon, message, optional subtext and CTA.
 */
import React from "react";
import { MessageSquare } from "lucide-react";

interface EmptyStateProps {
  /** Optional icon element. Defaults to a speech-bubble SVG. */
  icon?: React.ReactNode;
  /** Primary bold message */
  message: string;
  /** Lighter secondary text */
  subtext?: string;
  /** CTA button label */
  ctaLabel?: string;
  /** CTA button handler */
  onCta?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  message,
  subtext,
  ctaLabel,
  onCta,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="mb-4 text-slate-600">
        {icon ?? <MessageSquare className="w-10 h-10 mx-auto opacity-40" />}
      </div>
      <p className="text-sm font-semibold text-slate-300 mb-1">{message}</p>
      {subtext && (
        <p className="text-xs text-slate-500 mb-5 max-w-xs leading-relaxed">{subtext}</p>
      )}
      {ctaLabel && onCta && (
        <button
          onClick={onCta}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors"
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
