interface SectionHeaderProps {
  label?: string
  title: string
  subtitle?: string
  className?: string
}

export function SectionHeader({ label, title, subtitle, className = '' }: SectionHeaderProps) {
  return (
    <div className={`text-center ${className}`}>
      {label && (
        <p className="text-[11px] uppercase tracking-[3px] text-cyan-500 mb-3 font-semibold">
          {label}
        </p>
      )}
      <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight mb-4">
        {title}
      </h2>
      {subtitle && (
        <p className="text-base text-[var(--text-dim)] max-w-xl mx-auto leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  )
}
