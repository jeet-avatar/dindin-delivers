import { useState, useEffect } from 'react'

export function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const accepted = localStorage.getItem('tcp-cookies-accepted')
    if (!accepted) {
      const timer = setTimeout(() => setVisible(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [])

  function accept() {
    localStorage.setItem('tcp-cookies-accepted', 'true')
    setVisible(false)
  }

  function decline() {
    localStorage.setItem('tcp-cookies-accepted', 'declined')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[999] p-4 md:p-6">
      <div className="max-w-4xl mx-auto rounded-2xl border border-[var(--glass-border)] bg-[var(--bg)]/95 backdrop-blur-2xl p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-4 shadow-2xl">
        <div className="flex-1">
          <p className="text-sm font-semibold mb-1">We value your privacy</p>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            We use cookies to enhance your browsing experience, remember your theme preference, and understand how you interact with our site. No personal data is sold to third parties.{' '}
            <a href="/privacy-policy" className="underline hover:text-[var(--text)] transition-colors">Privacy Policy</a>
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={decline}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-[var(--glass-border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--glass-border-hover)] transition-all cursor-pointer"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={accept}
            className="px-5 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:shadow-lg hover:shadow-orange-500/30 transition-all cursor-pointer"
          >
            Accept Cookies
          </button>
        </div>
      </div>
    </div>
  )
}
