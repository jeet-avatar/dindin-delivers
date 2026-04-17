const STORAGE_KEY = 'zietra:auth'
const USERS_KEY = 'zietra:users'

const DEMO_USERS: Record<string, { password: string; name: string }> = {
  'demo@zietra.com': { password: 'Zietra2026!', name: 'Demo User' },
}

export type Session = { email: string; name: string; token: string }

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

function setSession(session: Session): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function signOut(): void {
  localStorage.removeItem(STORAGE_KEY)
}

function getLocalUsers(): Record<string, { password: string; name: string }> {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    return raw ? (JSON.parse(raw) as Record<string, { password: string; name: string }>) : {}
  } catch {
    return {}
  }
}

function saveLocalUsers(users: Record<string, { password: string; name: string }>): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

export async function login(email: string, password: string): Promise<Session> {
  await new Promise((r) => setTimeout(r, 400))
  const e = email.trim().toLowerCase()
  const demo = DEMO_USERS[e]
  const local = getLocalUsers()[e]
  const record = demo ?? local
  if (!record || record.password !== password) {
    throw new Error('Invalid email or password.')
  }
  const session: Session = {
    email: e,
    name: record.name,
    token: btoa(`${e}:${Date.now()}`),
  }
  setSession(session)
  return session
}

export async function signup(name: string, email: string, password: string): Promise<Session> {
  await new Promise((r) => setTimeout(r, 400))
  const e = email.trim().toLowerCase()
  if (!e || !password || password.length < 8) {
    throw new Error('Password must be at least 8 characters.')
  }
  if (DEMO_USERS[e] || getLocalUsers()[e]) {
    throw new Error('An account with that email already exists.')
  }
  const users = getLocalUsers()
  users[e] = { password, name: name.trim() || e.split('@')[0] }
  saveLocalUsers(users)
  const session: Session = {
    email: e,
    name: users[e].name,
    token: btoa(`${e}:${Date.now()}`),
  }
  setSession(session)
  return session
}
