import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getDashboardData, isBlobConfigured } from '@/lib/blobStore'
import { LogoutButton } from './logout-button'

// ── Helpers ──────────────────────────────────────────────────────────

function formatDayLabel(yyyymmdd: string): string {
  const y = yyyymmdd.slice(0, 4)
  const m = yyyymmdd.slice(4, 6)
  const d = yyyymmdd.slice(6, 8)
  return new Date(`${y}-${m}-${d}`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ── Setup-required screen ─────────────────────────────────────────────

function SetupRequired() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 max-w-md w-full">
        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center mb-4">
          <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="font-heading font-bold text-slate-800 text-lg mb-2">Analytics Setup Required</h1>
        <p className="text-slate-500 text-sm mb-5 leading-relaxed">
          One step to enable visitor tracking. In your Vercel dashboard:
        </p>
        <ol className="text-sm text-slate-600 space-y-2 mb-5 list-decimal list-inside">
          <li>Go to your <strong>vishmed</strong> project → Storage</li>
          <li>Click <strong>Create</strong> → select <strong>Blob</strong></li>
          <li>Name it anything and click <strong>Create</strong></li>
          <li>Click <strong>Connect to project</strong></li>
          <li><strong>Redeploy</strong> — the token is set automatically</li>
        </ol>
        <p className="text-slate-400 text-xs">No separate account or credit card needed — Blob is part of Vercel.</p>
      </div>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────

export default async function AdminPage() {
  // Auth check
  const cookieStore = await cookies()
  const session = cookieStore.get('vv_admin')
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminPassword || !session || session.value !== adminPassword) {
    redirect('/admin/login')
  }

  if (!isBlobConfigured()) {
    return <SetupRequired />
  }

  // Load last 7 days of data
  const entries = await getDashboardData(7)

  // Aggregate stats
  const todayData = entries[0]?.data
  const todayViews = todayData?.total ?? 0
  const weekViews = entries.reduce((s, e) => s + e.data.total, 0)

  // All-time total and top pages: aggregate across all 7 days
  const allPages: Record<string, number> = {}
  const allSources: Record<string, number> = {}
  for (const { data } of entries) {
    for (const [p, n] of Object.entries(data.pages)) {
      allPages[p] = (allPages[p] ?? 0) + n
    }
    for (const [s, n] of Object.entries(data.sources)) {
      allSources[s] = (allSources[s] ?? 0) + n
    }
  }

  const topPages = Object.entries(allPages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  const sourceList = Object.entries(allSources).sort((a, b) => b[1] - a[1])

  // Chart data (oldest → newest)
  const chartData = [...entries].reverse().map((e, i) => ({
    label: formatDayLabel(e.day),
    views: e.data.total,
    isToday: i === entries.length - 1,
  }))
  const maxBar = Math.max(...chartData.map((d) => d.views), 1)

  // Recent visitors (from today, fallback to yesterday)
  const recentVisits = [
    ...(entries[0]?.data.recent ?? []),
    ...(entries[1]?.data.recent ?? []),
  ].slice(0, 25)

  const sourceLabels: Record<string, string> = {
    google: 'Google Search',
    direct: 'Direct / Bookmark',
    facebook: 'Facebook',
    bing: 'Bing',
    referral: 'Other Referral',
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 leading-none">Vish Medical</p>
            <p className="text-xs text-slate-400 mt-0.5">Visitor Analytics</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-slate-400 hover:text-primary transition-colors hidden sm:block focus-visible:outline-[3px] focus-visible:outline-primary rounded"
          >
            View site ↗
          </Link>
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* ── KPI cards ───────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Today', value: todayViews },
            { label: 'Last 7 Days', value: weekViews },
            { label: 'Top Page', value: topPages[0]?.[0] ?? '—', isText: true },
            { label: 'Pages Tracked', value: topPages.length },
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                {card.label}
              </p>
              {card.isText ? (
                <p className="text-base font-bold text-slate-800 truncate">{card.value}</p>
              ) : (
                <p className="text-2xl font-bold text-slate-800 tabular-nums">
                  {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* ── 7-day bar chart ─────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-6">Page Views — Last 7 Days</h2>
          <div
            className="flex items-end gap-2 sm:gap-3 h-36"
            role="img"
            aria-label="Bar chart of page views per day over the last 7 days"
          >
            {chartData.map((d) => (
              <div key={d.label} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-xs text-slate-400 tabular-nums font-medium h-4 flex items-center">
                  {d.views > 0 ? d.views : ''}
                </span>
                <div
                  className={`w-full rounded-t-lg min-h-[3px] ${d.isToday ? 'bg-primary' : 'bg-blue-200'}`}
                  style={{
                    height: `${Math.max((d.views / maxBar) * 88, d.views > 0 ? 4 : 3)}px`,
                  }}
                />
                <span className="text-xs text-slate-400 text-center whitespace-nowrap">
                  {d.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Top pages + Traffic sources ─────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-slate-800 mb-5">Top Pages (7 days)</h2>
            {topPages.length === 0 ? (
              <p className="text-slate-400 text-sm">No data yet — visit a few pages first.</p>
            ) : (
              <ol className="space-y-3">
                {topPages.map(([path, views], i) => {
                  const pct = Math.round((views / (topPages[0][1] || 1)) * 100)
                  return (
                    <li key={path} className="flex items-center gap-3">
                      <span className="text-xs text-slate-300 font-medium w-4 shrink-0 tabular-nums">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-sm text-slate-700 font-medium truncate">{path}</span>
                          <span className="text-sm font-semibold text-slate-500 shrink-0 tabular-nums">
                            {views.toLocaleString()}
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-slate-800 mb-5">Traffic Sources (7 days)</h2>
            {sourceList.length === 0 ? (
              <p className="text-slate-400 text-sm">No data yet.</p>
            ) : (
              <ul className="space-y-3">
                {sourceList.map(([src, count]) => {
                  const total = weekViews || 1
                  const pct = Math.round((count / total) * 100)
                  const barColors: Record<string, string> = {
                    google: 'bg-blue-500',
                    direct: 'bg-slate-400',
                    facebook: 'bg-indigo-500',
                    bing: 'bg-green-500',
                    referral: 'bg-amber-500',
                  }
                  return (
                    <li key={src}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-slate-700 font-medium">{sourceLabels[src] ?? src}</span>
                        <span className="text-slate-500 tabular-nums">{count} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${barColors[src] ?? 'bg-slate-300'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        {/* ── Recent visitors ──────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-5">Recent Visitors</h2>
          {recentVisits.length === 0 ? (
            <p className="text-slate-400 text-sm">No visits recorded yet.</p>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['Page', 'Device', 'Source', 'Time'].map((h) => (
                      <th
                        key={h}
                        className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider pb-3 pr-4 last:pr-0"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentVisits.map((v, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 pr-4 font-medium text-slate-700 max-w-[200px] truncate">
                        {v.path}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                            v.device === 'mobile'
                              ? 'bg-purple-50 text-purple-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {v.device === 'mobile' ? (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          ) : (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          )}
                          {v.device}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-slate-500 capitalize">{v.source}</td>
                      <td className="py-3 text-slate-400 text-xs whitespace-nowrap">
                        {formatTime(v.ts)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
