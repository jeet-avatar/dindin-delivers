import { Link } from 'react-router'
import { Monitor, Shield, Sparkles, Users } from 'lucide-react'
import { pillars, type PillarColor } from '../../data/services'

const iconMap: Record<string, React.ElementType> = { Monitor, Shield, Sparkles, Users }

const colorClasses: Record<PillarColor, { icon: string; label: string; dot: string; topline: string; glow: string }> = {
  ai: {
    icon: 'bg-blue-500/12 text-blue-400 [.light_&]:bg-blue-600/8 [.light_&]:text-blue-600',
    label: 'text-blue-400 [.light_&]:text-blue-600',
    dot: 'bg-blue-500',
    topline: 'from-transparent via-blue-500 to-transparent',
    glow: 'rgba(37,99,235,0.1)',
  },
  erp: {
    icon: 'bg-purple-500/12 text-purple-400 [.light_&]:bg-purple-600/8 [.light_&]:text-purple-600',
    label: 'text-purple-400 [.light_&]:text-purple-600',
    dot: 'bg-purple-500',
    topline: 'from-transparent via-purple-500 to-transparent',
    glow: 'rgba(139,92,246,0.1)',
  },
  cyber: {
    icon: 'bg-rose-500/12 text-rose-400 [.light_&]:bg-rose-600/8 [.light_&]:text-rose-600',
    label: 'text-rose-400 [.light_&]:text-rose-600',
    dot: 'bg-rose-500',
    topline: 'from-transparent via-rose-500 to-transparent',
    glow: 'rgba(244,63,94,0.1)',
  },
  staff: {
    icon: 'bg-emerald-500/12 text-emerald-400 [.light_&]:bg-emerald-600/8 [.light_&]:text-emerald-600',
    label: 'text-emerald-400 [.light_&]:text-emerald-600',
    dot: 'bg-emerald-500',
    topline: 'from-transparent via-emerald-500 to-transparent',
    glow: 'rgba(16,185,129,0.1)',
  },
}

const badgeStyles: Record<string, string> = {
  hot: 'bg-orange-500/15 text-orange-400',
  new: 'bg-blue-500/15 text-blue-400',
  trend: 'bg-emerald-500/15 text-emerald-400',
  emerging: 'bg-purple-500/15 text-purple-400',
}

interface PillarGridProps {
  expanded?: boolean
}

export function PillarGrid({ expanded = false }: PillarGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
      {pillars.map(pillar => {
        const Icon = iconMap[pillar.icon] || Sparkles
        const cc = colorClasses[pillar.color]
        const displayServices = expanded ? pillar.subServices : pillar.subServices.slice(0, 6)

        return (
          <Link
            to={`/services/${pillar.slug}`}
            key={pillar.slug}
            className="group relative overflow-hidden rounded-2xl p-7 bg-[var(--glass)] border border-[var(--glass-border)] backdrop-blur-xl transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-2.5 hover:border-[var(--glass-border-hover)] [.light_&]:bg-white [.light_&]:shadow-[var(--card-shadow)] [.light_&]:hover:shadow-[var(--card-hover-shadow)] block"
          >
            {/* Top line */}
            <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${cc.topline} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
            {/* Glow */}
            <div className="absolute -inset-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ background: `radial-gradient(circle at 30% 20%, ${cc.glow}, transparent 60%)` }} />

            <div className="relative z-10">
              <div className={`w-12 h-12 rounded-[14px] flex items-center justify-center mb-5 ${cc.icon}`}>
                <Icon size={22} />
              </div>
              <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1.5 ${cc.label}`}>{pillar.label}</p>
              <h3 className="text-lg font-bold mb-2">{pillar.title}</h3>
              <p className="text-[12.5px] text-[var(--text-muted)] leading-relaxed mb-4">{pillar.tagline}</p>

              <ul className="space-y-0">
                {displayServices.map(sub => (
                  <li key={sub.name} className="flex items-center gap-2 text-[11.5px] text-[var(--text-dim)] py-1.5 border-t border-white/4 [.light_&]:border-black/4">
                    <span className={`w-1 h-1 rounded-full flex-shrink-0 ${cc.dot}`} />
                    <span className="flex-1">{sub.name}</span>
                    {sub.badge && (
                      <span className={`text-[7px] font-bold px-1.5 py-0.5 rounded-full uppercase ${badgeStyles[sub.badge.variant]}`}>
                        {sub.badge.label}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
