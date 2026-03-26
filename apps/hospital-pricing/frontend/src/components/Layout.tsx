import { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  ShieldCheck,
  LayoutDashboard,
  FileText,
  Receipt,
  AlertTriangle,
  LogOut,
} from 'lucide-react'
import { useAuthContext } from '../contexts/AuthContext'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/contracts', icon: FileText, label: 'Contracts', end: false },
  { to: '/invoices', icon: Receipt, label: 'Invoices', end: false },
  { to: '/discrepancies', icon: AlertTriangle, label: 'Discrepancies', end: false },
]

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuthContext()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : '??'

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-56 bg-surface border-r border-border flex flex-col z-20">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
            <ShieldCheck className="w-4 h-4 text-primary" strokeWidth={1.75} />
          </div>
          <span className="text-sm font-semibold text-text-primary leading-tight">
            Pricing<br />Assurance
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5" aria-label="Main navigation">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 min-h-[44px] ${
                  isActive
                    ? 'bg-primary/10 text-primary border-r-2 border-primary'
                    : 'text-text-muted hover:text-text-primary hover:bg-white/5'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User area */}
        <div className="px-3 py-4 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">{user?.username ?? '—'}</p>
              <p className="text-xs text-text-muted truncate capitalize">{user?.role ?? ''}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-text-muted hover:text-destructive hover:bg-destructive/10 transition-colors duration-150 min-h-[44px]"
          >
            <LogOut className="w-4 h-4 shrink-0" strokeWidth={1.75} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-56 flex-1 min-h-screen p-8 bg-background">
        {children}
      </main>
    </div>
  )
}
