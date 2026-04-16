import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { redis, isRedisConfigured } from '@/lib/redis'
import { LogoutButton } from './logout-button'

// ── Helpers ──────────────────────────────────────────────

function dayKey(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().slice(0, 10).replace(/-/g, '') // "20260415"
}

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

function parseNum(v: unknown): number {
  return parseInt(String(v ?? '0')) || 0
}

// ── Types ──────────────────────────────────────────────

interface Visit {
  path: string
  referrer: string
  ts: string
  device: string
  source: string
}

// ── Setup required screen ──────────────────────────────

function SetupRequired() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 max-w-md w-full">
        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center mb-4">
          <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="font-heading font-bold text-slate-800 text-lg mb-2">Analytics Not Configured</h1>
        <p className="text-slate-500 text-sm mb-5 leading-relaxed">
          Add these environment variables in Vercel → Project Settings → Environment Variables to enable visitor tracking:
        </p>
        <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs text-emerald-400 space-y-1 mb-5">
          <p>UPSTASH_REDIS_REST_URL=https://...</p>
          <p>UPSTASH_REDIS_REST_TOKEN=AX...</p>
          <p>ADMIN_PASSWORD=your_secure_password</p>
        </div>
        <p className="text-slate-400 text-xs">
          Create a free Redis database at{' '}
          <span className="text-primary">upstash.com</span> → copy the REST URL and token.
        </p>
      </div>
    </div>
  )
}

// ── Dashboard ──────────────────────────────────────────

export default async function AdminPage() {
  // Auth check
  const cookieStore = await cookies()
  const session = cookieStore.get('vv_admin')
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminPassword || !session || session.value !== adminPassword) {
    redirect('/admin/login')
  }

  if (!isRedisConfigured()) {
    return <SetupRequired />
  }

  // Build day keys for last 7 days (index 0 = today)
  const dayKeys = Array.from({ length: 7 }, (_, i) => dayKey(i))

  // Fetch all data in parallel
  const [total, ...dayResults] = await Promise.all([
    redis<string>('GET', 'vv:total'),
    ...dayKeys.map((k) => redis<string>('GET', `vv:day:${k}`)),
  ])

  const [topPagesRaw, recentRaw] = await Promise.all([
    redis<string[]>('ZREVRANGE', 'vv:pages', 0, 9, 'WITHSCORES'),
    redis<string[]>('LRANGE', 'vv:recent', 0, 24),
  ])

  const totalViews = parseNum(total)
  const todayViews = parseNum(dayResults[0])
  const weekViews = dayResults.reduce((s, v) => s + parseNum(v), 0)

  // Top pages: ZREVRANGE with WITHSCORES returns [path, score, path, score, ...]
  const topPages: Array<{ path: string; views: number }> = []
  if (Array.isArray(topPagesRaw)) {
    for (let i = 0; i < topPagesRaw.length - 1; i += 2) {
      topPages.push({ path: topPagesRaw[i], views: parseNum(topPagesRaw[i + 1]) })
    }
  }

  // Recent visits
  const recentVisits: Visit[] = []
  if (Array.isArray(recentRaw)) {
    for (const item of recentRaw) {
      try {
        recentVisits.push(JSON.parse(item) as Visit)
      } catch {}
    }
  }

  // Chart data (oldest → newest)
  const chartData = dayKeys
    .map((key, i) => ({
      label: formatDayLabel(key),
      views: parseNum(dayResults[i]),
      isToday: i === 0,
    }))
    .reverse()
  const maxBar = Math.max(...chartData.map((d) => d.views), 1)

  // Source breakdown from recent visits
  const sources: Record<string, number> = {}
  for (const v of recentVisits) {
    sources[v.source] = (sources[v.source] ?? 0) + 1
  }
  const sourceList = Object.entries(sources).sort((a, b) => b[1] - a[1])

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Top bar ───────────────────────────────── */}
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

        {/* ── KPI cards ─────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Today', value: todayViews },
            { label: 'Last 7 Days', value: weekViews },
            { label: 'All Time', value: totalViews },
            { label: 'Pages Tracked', value: topPages.length },
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                {card.label}
              </p>
              <p className="text-2xl font-bold text-slate-800 tabular-nums">
                {card.value.toLocaleString()}
              </p>
            </div>
          ))}
        </div>

        {/* ── 7-day bar chart ───────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-semibold text-slate-800 mb-6 text-sm">Page Views — Last 7 Days</h2>
          <div className="flex items-end gap-2 sm:gap-3 h-36" role="img" aria-label="Bar chart showing page views over the last 7 days">
            {chartData.map((d) => (
              <div key={d.label} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-xs text-slate-400 tabular-nums font-medium h-4 flex items-center">
                  {d.views > 0 ? d.views : ''}
                </span>
                <div
                  className={`w-full rounded-t-lg min-h-[3px] transition-all ${
                    d.isToday ? 'bg-primary' : 'bg-blue-200'
                  }`}
                  style={{ height: `${Math.max((d.views / maxBar) * 88, d.views > 0 ? 4 : 3)}px` }}
                />
                <span className="text-xs text-slate-400 text-center leading-tight whitespace-nowrap">
                  {d.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Two-column: top pages + traffic sources ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top pages */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="font-semibold text-slate-800 text-sm mb-5">Top Pages</h2>
            {topPages.length === 0 ? (
              <p className="text-slate-400 text-sm">No page data yet. Visit a few pages to get started.</p>
            ) : (
              <ol className="space-y-3">
                {topPages.map((p, i) => {
                  const pct = Math.round((p.views / (topPages[0]?.views || 1)) * 100)
                  return (
                    <li key={p.path} className="flex items-center gap-3">
                      <span className="text-xs text-slate-300 font-medium w-4 shrink-0 tabular-nums">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-sm text-slate-700 font-medium truncate">{p.path}</span>
                          <span className="text-sm font-semibold text-slate-500 shrink-0 tabular-nums">
                            {p.views.toLocaleString()}
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </div>

          {/* Traffic sources */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="font-semibold text-slate-800 text-sm mb-5">
              Traffic Sources
              <span className="text-xs text-slate-400 font-normal ml-2">(recent 25 visits)</span>
            </h2>
            {sourceList.length === 0 ? (
              <p className="text-slate-400 text-sm">No data yet.</p>
            ) : (
              <ul className="space-y-3">
                {sourceList.map(([src, count]) => {
                  const total25 = recentVisits.length || 1
                  const pct = Math.round((count / total25) * 100)
                  const colors: Record<string, string> = {
                    google: 'bg-blue-500',
                    direct: 'bg-slate-400',
                    facebook: 'bg-indigo-500',
                    bing: 'bg-green-500',
                    referral: 'bg-amber-500',
                  }
                  const barColor = colors[src] ?? 'bg-slate-300'
                  const labels: Record<string, string> = {
                    google: 'Google Search',
                    direct: 'Direct / Bookmark',
                    facebook: 'Facebook',
                    bing: 'Bing',
                    referral: 'Other Referral',
                  }
                  return (
                    <li key={src}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-slate-700 font-medium">{labels[src] ?? src}</span>
                        <span className="text-slate-500 tabular-nums">{count} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        {/* ── Recent visitors ────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-semibold text-slate-800 text-sm mb-5">Recent Visitors</h2>
          {recentVisits.length === 0 ? (
            <p className="text-slate-400 text-sm">No visits recorded yet.</p>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-sm min-w-[500px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider pb-3 pr-4">Page</th>
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider pb-3 pr-4">Device</th>
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider pb-3 pr-4">Source</th>
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider pb-3">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentVisits.map((v, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 pr-4 font-medium text-slate-700 max-w-[220px] truncate">{v.path}</td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                          v.device === 'mobile'
                            ? 'bg-purple-50 text-purple-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
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
                      <td className="py-3 text-slate-400 text-xs whitespace-nowrap">{formatTime(v.ts)}</td>
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
