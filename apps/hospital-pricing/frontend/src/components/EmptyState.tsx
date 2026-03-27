interface Props {
  icon?: string
  message: string
  ctaLabel?: string
  onCta?: () => void
}

export function EmptyState({ icon = '📋', message, ctaLabel, onCta }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <p className="text-slate-500 text-sm max-w-xs">{message}</p>
      {ctaLabel && onCta && (
        <button
          onClick={onCta}
          className="mt-4 px-4 py-2 bg-navy text-white text-sm rounded-md hover:bg-navy-light transition-colors"
        >
          {ctaLabel}
        </button>
      )}
    </div>
  )
}
