interface TrendPillProps {
  label: string
  variant?: 'fire' | 'bolt' | 'leaf' | 'gem' | 'default'
}

const variantStyles = {
  fire: 'border-orange-500/20 text-orange-400 [.light_&]:text-orange-600',
  bolt: 'border-blue-500/20 text-blue-400 [.light_&]:text-blue-700',
  leaf: 'border-emerald-500/20 text-emerald-400 [.light_&]:text-emerald-600',
  gem: 'border-purple-500/20 text-purple-400 [.light_&]:text-purple-600',
  default: 'border-[var(--glass-border)] text-[var(--text-dim)]',
}

export function TrendPill({ label, variant = 'default' }: TrendPillProps) {
  return (
    <span className={`inline-flex text-[10px] font-semibold px-3 py-1 rounded-full bg-[var(--glass)] border ${variantStyles[variant]}`}>
      {label}
    </span>
  )
}
