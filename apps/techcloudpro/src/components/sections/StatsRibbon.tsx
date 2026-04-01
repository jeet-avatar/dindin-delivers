import { stats } from '../../data/stats'

export function StatsRibbon() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 border-t border-b border-[var(--glass-border)]">
      {stats.map(stat => (
        <div key={stat.label} className="text-center py-10 px-5 border-r border-[var(--glass-border)] last:border-r-0 relative overflow-hidden group">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(37,99,235,0.06),transparent)] opacity-0 group-hover:opacity-100 transition-opacity duration-400" />
          <div className="text-4xl font-extrabold grad-text-blue leading-tight relative z-10">{stat.number}</div>
          <div className="text-[11px] text-[var(--text-muted)] uppercase tracking-widest mt-1.5 relative z-10">{stat.label}</div>
        </div>
      ))}
    </div>
  )
}
