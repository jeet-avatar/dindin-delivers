import { useState } from 'react'

interface Props {
  message: string
  onDismiss?: () => void
}

export function ErrorBanner({ message, onDismiss }: Props) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  const handleDismiss = () => {
    setDismissed(true)
    onDismiss?.()
  }

  return (
    <div className="flex items-center justify-between bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4 text-sm">
      <span>{message}</span>
      <button
        onClick={handleDismiss}
        className="ml-4 text-red-500 hover:text-red-700 font-bold text-lg leading-none"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  )
}
