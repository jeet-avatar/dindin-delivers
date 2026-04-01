interface BadgeProps {
  label: string
  variant: 'hot' | 'new' | 'trend' | 'emerging'
  dot?: boolean
  className?: string
}

const variantStyles = {
  hot: 'bg-orange-500/10 border-orange-500/20 text-orange-400 [.light_&]:text-orange-600',
  new: 'bg-blue-500/10 border-blue-500/20 text-blue-400 [.light_&]:text-blue-600',
  trend: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 [.light_&]:text-emerald-600',
  emerging: 'bg-purple-500/10 border-purple-500/20 text-purple-400 [.light_&]:text-purple-600',
}

export function Badge({ label, variant, dot, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold border ${variantStyles[variant]} ${className}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current animate-[pulse-dot_2s_infinite]" />}
      {label}
    </span>
  )
}
