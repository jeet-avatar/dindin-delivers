import { NextRequest, NextResponse } from 'next/server'
import { recordVisit, isBlobConfigured } from '@/lib/blobStore'

export async function POST(req: NextRequest) {
  // Always return 200 — tracking must never block page load
  if (!isBlobConfigured()) return NextResponse.json({ ok: true })

  try {
    const body = (await req.json()) as { path?: string; referrer?: string }
    const path = (body.path ?? '/').slice(0, 200)
    const referrer = (body.referrer ?? '').slice(0, 300)
    const ua = (req.headers.get('user-agent') ?? '').slice(0, 300)
    const ts = new Date().toISOString()
    const device = /mobile|android|iphone|ipad/i.test(ua) ? 'mobile' : 'desktop'

    let source = 'direct'
    if (referrer) {
      if (/google\./i.test(referrer)) source = 'google'
      else if (/facebook\.|fb\./i.test(referrer)) source = 'facebook'
      else if (/bing\./i.test(referrer)) source = 'bing'
      else source = 'referral'
    }

    // fire-and-forget — don't await so the response returns immediately
    recordVisit({ path, device: device as 'mobile' | 'desktop', source, ts }).catch(() => {})
  } catch {
    // silent — never expose tracking errors to the visitor
  }

  return NextResponse.json({ ok: true })
}
