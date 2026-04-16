'use client'

import { useRouter } from 'next/navigation'

export function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="text-sm text-slate-400 hover:text-red-500 transition-colors font-medium focus-visible:outline-[3px] focus-visible:outline-red-400 rounded px-2 py-1"
    >
      Sign out
    </button>
  )
}
