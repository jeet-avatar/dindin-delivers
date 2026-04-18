import { supabase } from './supabase'
import type { Session as SbSession, User } from '@supabase/supabase-js'

// PUBLIC API — must stay stable. LoginPage/SignupPage/DashboardPage import these.
export type Session = { email: string; name: string; token: string }

// Module-level mirror of the current session so getSession() can stay synchronous.
let currentSession: Session | null = null

function toSession(sb: SbSession | null): Session | null {
  if (!sb || !sb.user) return null
  return {
    email: sb.user.email ?? '',
    name: deriveName(sb.user),
    token: sb.access_token,
  }
}

function deriveName(user: User): string {
  const meta = (user.user_metadata ?? {}) as { name?: string; full_name?: string }
  if (meta.name && meta.name.trim()) return meta.name.trim()
  if (meta.full_name && meta.full_name.trim()) return meta.full_name.trim()
  const email = user.email ?? ''
  return email.includes('@') ? email.split('@')[0] : email
}

// Hydrate synchronously-ish on module import: fire async getSession() and cache the result.
// DashboardPage's useEffect runs on mount (a tick later), by which time this promise has typically resolved.
// If it hasn't (cold network), onAuthStateChange will still fire INITIAL_SESSION and update the mirror,
// then DashboardPage's redirect-to-login is still correct behaviour for "not yet known".
supabase.auth.getSession().then(({ data }) => {
  currentSession = toSession(data.session)
})

supabase.auth.onAuthStateChange((_event, sbSession) => {
  currentSession = toSession(sbSession)
})

// SYNC — safe to call from useEffect without await.
export function getSession(): Session | null {
  return currentSession
}

export async function login(email: string, password: string): Promise<Session> {
  const e = email.trim().toLowerCase()
  const { data, error } = await supabase.auth.signInWithPassword({ email: e, password })
  if (error || !data.session) {
    // Supabase returns "Invalid login credentials" — match the existing UX copy.
    throw new Error('Invalid email or password.')
  }
  const session = toSession(data.session)
  if (!session) throw new Error('Invalid email or password.')
  currentSession = session
  return session
}

export async function signup(name: string, email: string, password: string): Promise<Session> {
  const e = email.trim().toLowerCase()
  if (!e || !password || password.length < 8) {
    throw new Error('Password must be at least 8 characters.')
  }
  const { data, error } = await supabase.auth.signUp({
    email: e,
    password,
    options: {
      data: { name: name.trim() || e.split('@')[0] },
      // Where Supabase sends the user after they click the email verification link.
      // Must be an allowed redirect URL in Supabase dashboard -> Authentication -> URL Configuration.
      emailRedirectTo: 'https://zietra.com/login',
    },
  })
  if (error) {
    // Map Supabase error messages to our existing UX copy where useful.
    if (/already registered|already exists/i.test(error.message)) {
      throw new Error('An account with that email already exists.')
    }
    throw new Error(error.message || 'Signup failed.')
  }

  // If the project requires email confirmation (default), data.session will be null here.
  // The user sees the spinner stop and navigate('/dashboard') fires, but DashboardPage's
  // getSession() check will push them to /login. That's acceptable for now.
  // TODO(follow-up): surface "Check your email to confirm" UX on SignupPage.
  if (data.session) {
    const session = toSession(data.session)
    if (session) {
      currentSession = session
      return session
    }
  }

  // No active session yet (email confirmation pending). Return a stub session so the caller's
  // `await signup(...)` resolves without throwing. The next navigation to /dashboard will bounce
  // to /login, which is the correct behaviour until the user confirms their email.
  return {
    email: e,
    name: name.trim() || e.split('@')[0],
    token: '',
  }
}

export function signOut(): void {
  // Fire-and-forget — Supabase will clear storage + emit onAuthStateChange(SIGNED_OUT)
  // which flips currentSession to null. We also clear synchronously so DashboardPage's
  // immediate navigate('/') has the right state if it re-checks.
  currentSession = null
  void supabase.auth.signOut()
}
