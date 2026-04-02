interface SectionHeaderProps {
  label?: string
  title: string
  subtitle?: string
  className?: string
  as?: 'h1' | 'h2'
}

export function SectionHeader({ label, title, subtitle, className = '', as: Tag = 'h2' }: SectionHeaderProps) {
  return (
    <div className={`text-center ${className}`}>
      {label && (
        <p className="text-[11px] uppercase tracking-[3px] text-cyan-500 mb-3 font-semibold">
          {label}
        </p>
      )}
      <Tag className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight mb-4">
        {title}
      </Tag>
      {subtitle && (
        <p className="text-base text-[var(--text-dim)] max-w-xl mx-auto leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  )
}
