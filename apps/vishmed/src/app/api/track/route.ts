import { NextRequest, NextResponse } from 'next/server'
import { redis, isRedisConfigured } from '@/lib/redis'

export async function POST(req: NextRequest) {
  // Always return 200 so page load is never blocked
  if (!isRedisConfigured()) return NextResponse.json({ ok: true })

  try {
    const body = await req.json() as { path?: string; referrer?: string }
    const path = (body.path ?? '/').slice(0, 200)
    const referrer = (body.referrer ?? '').slice(0, 300)
    const ua = (req.headers.get('user-agent') ?? '').slice(0, 300)
    const ts = new Date().toISOString()
    const day = ts.slice(0, 10).replace(/-/g, '') // "20260415"
    const device = /mobile|android|iphone|ipad/i.test(ua) ? 'mobile' : 'desktop'

    let source = 'direct'
    if (referrer) {
      if (/google\./i.test(referrer)) source = 'google'
      else if (/facebook\.|fb\./i.test(referrer)) source = 'facebook'
      else if (/bing\./i.test(referrer)) source = 'bing'
      else source = 'referral'
    }

    const visit = JSON.stringify({ path, referrer, ua, ts, device, source })

    await Promise.all([
      redis('INCR', 'vv:total'),
      redis('INCR', `vv:day:${day}`),
      redis('EXPIRE', `vv:day:${day}`, 7_776_000), // 90 days
      redis('ZINCRBY', 'vv:pages', 1, path),
      redis('LPUSH', 'vv:recent', visit),
      redis('LTRIM', 'vv:recent', 0, 499),
    ])
  } catch {
    // never throw — tracking must be silent
  }

  return NextResponse.json({ ok: true })
}
