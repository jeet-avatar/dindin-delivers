import { clients } from '../../data/clients'

export function ClientMarquee() {
  const names = clients.map(c => c.name.toUpperCase())

  return (
    <div className="py-12 border-t border-b border-[var(--glass-border)] overflow-hidden relative">
      {/* Fade edges */}
      <div className="absolute top-0 bottom-0 left-0 w-28 bg-gradient-to-r from-[var(--bg)] to-transparent z-10" />
      <div className="absolute top-0 bottom-0 right-0 w-28 bg-gradient-to-l from-[var(--bg)] to-transparent z-10" />

      <p className="text-center text-[10px] uppercase tracking-[3px] text-[var(--text-muted)] mb-7">
        Trusted By Fortune 500 & Growing Enterprises
      </p>

      <div className="flex gap-14" style={{ animation: 'marquee 35s linear infinite', width: 'max-content' }}>
        {/* Duplicate for seamless loop */}
        {[...names, ...names].map((name, i) => (
          <span key={`${name}-${i}`} className="text-[17px] font-bold text-white/15 [.light_&]:text-black/10 whitespace-nowrap tracking-wider hover:text-white/30 [.light_&]:hover:text-black/20 transition-colors">
            {name}
          </span>
        ))}
      </div>
    </div>
  )
}
