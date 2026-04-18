import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  // Fail loudly in dev; in a prod build with missing env, users would see "Login failed" instead of confusing 401s.
  // eslint-disable-next-line no-console
  console.error('[supabase] VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY missing. Check .env.local.')
}

export const supabase: SupabaseClient = createClient(
  SUPABASE_URL ?? '',
  SUPABASE_PUBLISHABLE_KEY ?? '',
  {
    auth: {
      persistSession: true,       // Keeps session across page reloads (localStorage under the hood — Supabase-managed, not our legacy zietra:auth key)
      autoRefreshToken: true,     // Silently refreshes JWT before expiry
      detectSessionInUrl: true,   // Handles email-verification callback when user clicks link back to /login
      storageKey: 'zietra:sb-auth',
    },
  },
)
