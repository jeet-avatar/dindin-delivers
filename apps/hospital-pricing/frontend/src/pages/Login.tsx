import { useState, FormEvent, KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuthContext } from '../contexts/AuthContext'

export function Login() {
  const { login } = useAuthContext()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault()
    if (!username.trim() || !password.trim()) {
      setError('Please enter your username and password.')
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      await login({ username: username.trim(), password })
      navigate('/', { replace: true })
    } catch {
      setError('Invalid credentials. Please check your username and password.')
    } finally {
      setIsLoading(false)
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-surface-card border border-border rounded-2xl p-8 shadow-card">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-navy/10 border border-navy/20 mb-4">
              <ShieldCheck className="w-7 h-7 text-navy" strokeWidth={1.75} />
            </div>
            <h1 className="text-xl font-bold text-navy">Hospital Pricing Assurance</h1>
            <p className="text-slate-500 text-sm mt-1">Secure procurement verification platform</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>
            <div className="space-y-5">
              {/* Username */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-slate-800 mb-1.5">
                  Username or Email
                </label>
                <input
                  id="username"
                  type="email"
                  autoComplete="username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="you@hospital.org"
                  className="input-field"
                  disabled={isLoading}
                  aria-required="true"
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-800 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="••••••••"
                    className="input-field pr-11"
                    disabled={isLoading}
                    aria-required="true"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={0}
                  >
                    {showPassword
                      ? <EyeOff className="w-4 h-4" />
                      : <Eye className="w-4 h-4" />
                    }
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="btn-primary w-full"
                disabled={isLoading}
              >
                {isLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Signing in...</>
                  : 'Sign In'
                }
              </button>

              {/* Error banner */}
              <div
                role="alert"
                aria-live="polite"
                className={error ? 'block' : 'hidden'}
              >
                <div className="border-l-4 border-red-500 bg-red-50 rounded-r-lg px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <p className="text-slate-400 text-xs text-center mt-8">
          &copy; 2026 Zietra Technologies inc
        </p>
      </div>
    </div>
  )
}
