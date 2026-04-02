import { type ReactNode } from 'react'
import { Link } from 'react-router'

interface ButtonProps {
  children: ReactNode
  variant?: 'primary' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  href?: string
  external?: boolean
  onClick?: () => void
  className?: string
  type?: 'button' | 'submit'
}

const variants = {
  primary: 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:shadow-lg hover:shadow-orange-500/30 hover:-translate-y-0.5',
  ghost: 'bg-transparent border border-[var(--glass-border)] text-[var(--text)] hover:bg-[var(--glass)]',
  outline: 'bg-transparent border border-primary text-primary hover:bg-primary/10',
}

const sizes = {
  sm: 'px-4 py-2 text-xs rounded-lg',
  md: 'px-6 py-2.5 text-sm rounded-xl',
  lg: 'px-8 py-3.5 text-base rounded-xl',
}

export function Button({ children, variant = 'primary', size = 'md', href, external, onClick, className = '', type = 'button' }: ButtonProps) {
  const classes = `inline-flex items-center gap-2 font-semibold font-[family-name:var(--font-heading)] cursor-pointer transition-all duration-200 ${variants[variant]} ${sizes[size]} ${className}`

  const isExternal = external || href?.startsWith('http') || href?.startsWith('mailto:') || href?.startsWith('tel:')
  if (href && isExternal) {
    return <a href={href} target={href?.startsWith('mailto:') || href?.startsWith('tel:') ? undefined : '_blank'} rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined} className={classes}>{children}</a>
  }
  if (href) {
    return <Link to={href} className={classes}>{children}</Link>
  }
  return <button type={type} onClick={onClick} className={classes}>{children}</button>
}
