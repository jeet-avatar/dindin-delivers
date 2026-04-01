import { type ReactNode } from 'react'
import type { PillarColor } from '../../data/services'

interface GlassCardProps {
  children: ReactNode
  color?: PillarColor
  className?: string
  onClick?: () => void
  href?: string
}

const glowColors = {
  ai: 'rgba(37,99,235,0.1)',
  erp: 'rgba(139,92,246,0.1)',
  cyber: 'rgba(244,63,94,0.1)',
  staff: 'rgba(16,185,129,0.1)',
}

const topLineGradients = {
  ai: 'from-transparent via-blue-500 to-transparent',
  erp: 'from-transparent via-purple-500 to-transparent',
  cyber: 'from-transparent via-rose-500 to-transparent',
  staff: 'from-transparent via-emerald-500 to-transparent',
}

export function GlassCard({ children, color, className = '', onClick }: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-2xl p-6
        bg-[var(--glass)] border border-[var(--glass-border)]
        backdrop-blur-xl
        transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
        hover:-translate-y-2.5 hover:border-[var(--glass-border-hover)]
        [.light_&]:bg-white [.light_&]:shadow-[var(--card-shadow)]
        [.light_&]:hover:shadow-[var(--card-hover-shadow)]
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {/* Top accent line */}
      {color && (
        <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${topLineGradients[color]} opacity-0 transition-opacity duration-300 group-hover:opacity-100 hover:opacity-100`}
          style={{ opacity: 'inherit' }}
        />
      )}
      {/* Hover glow */}
      {color && (
        <div
          className="absolute -inset-1/2 opacity-0 transition-opacity duration-500 pointer-events-none hover-glow"
          style={{ background: `radial-gradient(circle at 30% 20%, ${glowColors[color]}, transparent 60%)` }}
        />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  )
}
