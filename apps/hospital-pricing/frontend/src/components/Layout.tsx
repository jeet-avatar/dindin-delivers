import { Link, useLocation } from 'react-router-dom'
import { useAppContext } from '../contexts/AppContext'

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard' },
  { path: '/contracts', label: 'Contracts' },
  { path: '/invoices', label: 'Invoices' },
  { path: '/discrepancies', label: 'Discrepancies' },
  { path: '/audit', label: 'Audit Log' },
  { path: '/compliance', label: 'Compliance' },
]

interface Props {
  children: React.ReactNode
}

export function Layout({ children }: Props) {
  const location = useLocation()
  const { currentUser, openDiscrepancyCount } = useAppContext()

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    sessionStorage.removeItem('access_token')
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Top Navigation Bar */}
      <nav className="bg-navy text-white sticky top-0 z-30 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 flex items-center h-14">
          {/* Logo */}
          <Link to="/" className="text-white font-bold text-lg mr-8 flex-shrink-0">
            ⬡ HPA
          </Link>

          {/* Nav tabs */}
          <div className="flex items-center gap-1 flex-1">
            {NAV_ITEMS.map((item) => {
              const active =
                item.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.path)
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative px-3 py-1.5 text-sm rounded transition-colors
                    ${active
                      ? 'text-white border-b-2 border-blue-400 pb-[4px]'
                      : 'text-navy-muted hover:text-white'
                    }`}
                >
                  {item.label}
                  {item.path === '/discrepancies' && openDiscrepancyCount > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-xs bg-red-500 text-white rounded-full font-bold">
                      {openDiscrepancyCount > 9 ? '9+' : openDiscrepancyCount}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>

          {/* Right side: entity name + role + logout */}
          <div className="flex items-center gap-3 text-sm text-navy-muted">
            {currentUser && (
              <>
                <span className="text-white font-medium">{currentUser.entity.name}</span>
                <span className="bg-navy-light px-2 py-0.5 rounded text-xs text-navy-muted">
                  {currentUser.role.replace(/_/g, ' ')}
                </span>
              </>
            )}
            <button
              onClick={handleLogout}
              className="hover:text-white transition-colors text-xs"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      {/* Page content */}
      <main className="max-w-screen-2xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
