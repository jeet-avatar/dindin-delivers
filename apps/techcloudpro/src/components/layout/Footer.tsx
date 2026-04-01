import { Link } from 'react-router'
import { footerSections } from '../../data/navigation'

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-[var(--glass-border)] mt-20">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-12">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 mb-10">
          {footerSections.map(section => (
            <div key={section.title}>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text)] mb-3">
                {section.title}
              </h4>
              <ul className="space-y-1.5">
                {section.links.map(link => {
                  const isExternal = link.href.startsWith('http')
                  return (
                    <li key={link.label}>
                      {isExternal ? (
                        <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
                          {link.label}
                        </a>
                      ) : (
                        <Link to={link.href} className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
                          {link.label}
                        </Link>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-[var(--glass-border)] pt-6 text-center">
          <p className="text-[11px] text-[var(--text-muted)]">
            &copy; {year} TechCloudPro &mdash; A Zietra Technologies Inc. Company. All rights reserved.
            {' '}&bull;{' '}
            <Link to="/privacy-policy" className="hover:text-[var(--text)] transition-colors">Privacy Policy</Link>
            {' '}&bull;{' '}
            <Link to="/privacy-policy" className="hover:text-[var(--text)] transition-colors">Terms of Service</Link>
          </p>
        </div>
      </div>
    </footer>
  )
}
