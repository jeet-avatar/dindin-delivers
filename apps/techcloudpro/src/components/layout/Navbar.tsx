import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import { Moon, Sun, Menu, X } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'
import { mainNav } from '../../data/navigation'
import { Button } from '../ui/Button'

export function Navbar() {
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-[1000] px-6 md:px-12 py-3.5 flex items-center justify-between backdrop-blur-2xl border-b border-[var(--glass-border)] transition-colors duration-300 bg-[var(--bg)]/85">
      {/* Logo */}
      <Link to="/" className="flex items-center">
        <img src="/tcplogo.png" alt="TechCloudPro" className="h-8 md:h-9" />
      </Link>

      {/* Desktop nav */}
      <div className="hidden lg:flex items-center gap-6">
        {mainNav.map(link => {
          const isActive = location.pathname === link.href || (link.href !== '/' && location.pathname.startsWith(link.href))
          return (
            <Link
              key={link.href}
              to={link.href}
              className={`text-[13px] font-medium transition-colors relative ${isActive ? 'text-[var(--text)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}
            >
              {link.label}
              {isActive && <span className="absolute -bottom-[17px] left-0 right-0 h-0.5 bg-blue-600 rounded" />}
            </Link>
          )
        })}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="w-8 h-8 rounded-lg border border-[var(--glass-border)] flex items-center justify-center cursor-pointer transition-all hover:border-[var(--glass-border-hover)] bg-[var(--glass)]"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Moon size={15} className="text-[var(--text-dim)]" /> : <Sun size={15} className="text-[var(--text-dim)]" />}
        </button>
        <Button href="/contact" size="sm" className="hidden md:inline-flex">
          Free Consultation
        </Button>
        {/* Mobile menu toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden w-8 h-8 flex items-center justify-center text-[var(--text)]"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="absolute top-full left-0 right-0 bg-[var(--bg)] border-b border-[var(--glass-border)] p-6 flex flex-col gap-4 lg:hidden backdrop-blur-2xl">
          {mainNav.map(link => (
            <Link
              key={link.href}
              to={link.href}
              onClick={() => setMobileOpen(false)}
              className="text-sm font-medium text-[var(--text-dim)] hover:text-[var(--text)] transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <Button href="/contact" size="sm" className="w-full justify-center mt-2">
            Free Consultation
          </Button>
        </div>
      )}
    </nav>
  )
}
