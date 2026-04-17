// Vercel Blob storage for visitor analytics.
// Setup: Vercel Dashboard → Storage → Create → Blob → link to project
// One env var is auto-set: BLOB_READ_WRITE_TOKEN

import { put, list } from '@vercel/blob'

export function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN)
}

// ── Types ─────────────────────────────────────────────────

export interface VisitEntry {
  path: string
  device: 'mobile' | 'desktop'
  source: string
  ts: string
}

interface DayData {
  total: number
  pages: Record<string, number>
  sources: Record<string, number>
  devices: Record<string, number>
  recent: VisitEntry[] // last 50 for the day
}

const emptyDay = (): DayData => ({
  total: 0,
  pages: {},
  sources: {},
  devices: {},
  recent: [],
})

// ── Internal helpers ──────────────────────────────────────

const BLOB_PREFIX = 'vm/days/'

async function readJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return fallback
    return (await res.json()) as T
  } catch {
    return fallback
  }
}

// Find an existing blob's public URL by its exact pathname
async function findBlobUrl(pathname: string): Promise<string | null> {
  const { blobs } = await list({ prefix: pathname })
  return blobs.find((b) => b.pathname === pathname)?.url ?? null
}

// ── Public API ────────────────────────────────────────────

/** Record one page view. Fire-and-forget from the tracking route. */
export async function recordVisit(visit: VisitEntry): Promise<void> {
  const day = visit.ts.slice(0, 10).replace(/-/g, '') // "20260415"
  const blobPath = `${BLOB_PREFIX}${day}.json`

  const existingUrl = await findBlobUrl(blobPath)
  const data = existingUrl
    ? await readJson<DayData>(existingUrl, emptyDay())
    : emptyDay()

  data.total++
  data.pages[visit.path] = (data.pages[visit.path] ?? 0) + 1
  data.sources[visit.source] = (data.sources[visit.source] ?? 0) + 1
  data.devices[visit.device] = (data.devices[visit.device] ?? 0) + 1
  // Keep last 50 recent entries per day
  data.recent = [
    visit,
    ...data.recent.slice(0, 49),
  ]

  await put(blobPath, JSON.stringify(data), {
    access: 'public',
    addRandomSuffix: false,
  })
}

export interface DashboardEntry {
  day: string // "20260415"
  data: DayData
}

/** Load the last N days of visit data for the admin dashboard. */
export async function getDashboardData(days = 7): Promise<DashboardEntry[]> {
  // Build day keys (index 0 = today)
  const dayKeys = Array.from({ length: days }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - i)
    return d.toISOString().slice(0, 10).replace(/-/g, '')
  })

  // One list call gets all stored day blobs
  const { blobs } = await list({ prefix: BLOB_PREFIX })
  const urlByDay: Record<string, string> = {}
  for (const b of blobs) {
    const day = b.pathname.replace(BLOB_PREFIX, '').replace('.json', '')
    urlByDay[day] = b.url
  }

  // Fetch relevant days in parallel
  const entries = await Promise.all(
    dayKeys.map(async (day) => {
      if (!urlByDay[day]) return { day, data: emptyDay() }
      const data = await readJson<DayData>(urlByDay[day], emptyDay())
      return { day, data }
    })
  )

  return entries
}
