// Upstash Redis REST client — zero npm dependencies
// Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN in Vercel env vars

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

export function isRedisConfigured(): boolean {
  return Boolean(REDIS_URL && REDIS_TOKEN)
}

export async function redis<T = unknown>(
  ...args: (string | number)[]
): Promise<T | null> {
  if (!isRedisConfigured()) return null
  try {
    const res = await fetch(REDIS_URL!, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
      cache: 'no-store',
    })
    const json = (await res.json()) as { result: T }
    return json.result ?? null
  } catch {
    return null
  }
}
