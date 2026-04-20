import { useState } from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { BRANDING } from '../../config/branding';

export function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      localStorage.setItem('crmToken', data.token);
      localStorage.setItem('crmUser', JSON.stringify(data.user));

      // Check if user needs to change password
      if (data.requirePasswordChange) {
        window.location.href = '/change-password';
      } else {
        window.location.href = '/';
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to login. Please try again.');
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Redirect to Google OAuth endpoint
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    window.location.href = `${apiUrl}/api/auth/google`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-950 flex">
      {/* Left side - Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          {/* Logo and Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <svg
                width="180"
                height="50"
                viewBox="0 0 180 50"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Orange Circular Icon */}
                <circle cx="25" cy="25" r="20" fill="#FF6B35" />

                {/* "B" inside circle */}
                <text
                  x="25"
                  y="25"
                  fontSize="24"
                  fontWeight="bold"
                  fill="white"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontFamily="-apple-system, BlinkMacSystemFont, 'Inter', 'SF Pro Text', 'Segoe UI', sans-serif"
                >
                  B
                </text>

                {/* "Zietra" text */}
                <text
                  x="55"
                  y="25"
                  fontSize="20"
                  fontWeight="700"
                  fill="#ffffff"
                  dominantBaseline="central"
                  fontFamily="-apple-system, BlinkMacSystemFont, 'Inter', 'SF Pro Text', 'Segoe UI', sans-serif"
                >
                  Brand
                </text>
                <text
                  x="112"
                  y="25"
                  fontSize="20"
                  fontWeight="700"
                  fill="#FF6B35"
                  dominantBaseline="central"
                  fontFamily="-apple-system, BlinkMacSystemFont, 'Inter', 'SF Pro Text', 'Segoe UI', sans-serif"
                >
                  Monkz
                </text>
              </svg>
            </div>
            <h2 className="text-2xl font-semibold mb-2" style={{ color: '#fff' }}>{BRANDING.login.welcomeTitle}</h2>
            <p className="text-base" style={{ color: '#CBD5E1' }}>
              {BRANDING.login.welcomeSubtitle}
            </p>
          </div>

          <div className="rounded-2xl p-8" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-lg)' }}>
            {/* Google Sign In Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl font-semibold transition-all duration-200"
              style={{ color: 'var(--text-primary)', backgroundColor: 'var(--glass-bg)', border: '2px solid var(--border-default)' }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {BRANDING.login.googleButtonText}
            </button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full" style={{ borderTop: '1px solid var(--border-default)' }}></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-elevated)' }}>
                  {BRANDING.login.orDividerText}
                </span>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 rounded-xl" style={{ backgroundColor: 'var(--color-error-100)', border: '2px solid rgba(248, 113, 113, 0.3)' }}>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-error-500)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm font-semibold" style={{ color: 'var(--color-error-500)' }}>{error}</div>
                </div>
              </div>
            )}

            {/* Login Form */}
            <form className="space-y-5" onSubmit={handleSubmit}>
              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                  {BRANDING.login.emailLabel}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl outline-none transition-all"
                  style={{ color: 'var(--text-primary)', backgroundColor: 'var(--glass-bg)', border: '2px solid var(--border-default)' }}
                  placeholder={BRANDING.login.emailPlaceholder}
                />
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                  {BRANDING.login.passwordLabel}
                </label>
                <div className="relative" style={{position:'relative'}}>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl outline-none transition-all"
                    style={{ color: 'var(--text-primary)', backgroundColor: 'var(--glass-bg)', border: '2px solid var(--border-default)', paddingRight: '3rem' }}
                    placeholder={BRANDING.login.passwordPlaceholder}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[#64748B] hover:text-indigo-400 transition-colors focus:outline-none"
                    style={{position:'absolute', right:'0.75rem', top:'50%', transform:'translateY(-50%)', padding:'0.25rem', zIndex:10, background:'none', border:'none', cursor:'pointer'}}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="w-5 h-5" />
                    ) : (
                      <EyeIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center cursor-pointer">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-indigo-400 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                  />
                  <span className="ml-2 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {BRANDING.login.rememberMeText}
                  </span>
                </label>

                <div className="text-sm">
                  <a href="/forgot-password" className="font-medium text-indigo-400 hover:text-purple-400 transition-colors">
                    {BRANDING.login.forgotPasswordText}
                  </a>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {BRANDING.login.signingInButtonText}
                  </span>
                ) : (
                  BRANDING.login.signInButtonText
                )}
              </button>
            </form>

            {/* Sign Up Link */}
            <p className="mt-6 text-center text-base font-medium" style={{ color: 'var(--text-muted)' }}>
              {BRANDING.login.noAccountText}{' '}
              <a href="/signup" className="text-indigo-400 hover:text-purple-400 font-bold transition-colors">
                {BRANDING.login.signUpLinkText}
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Branding */}
      <div className="hidden lg:block relative w-0 flex-1">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500 via-rose-500 to-rose-600">
          <div className="h-full w-full flex flex-col items-center justify-center p-12 text-white">
            <div className="max-w-md">
              {/* Logo Section */}
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-3 mb-6">
                  <svg
                    width="180"
                    height="50"
                    viewBox="0 0 180 50"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="drop-shadow-lg"
                  >
                    {/* Orange Circular Icon */}
                    <circle cx="25" cy="25" r="20" fill="white" fillOpacity="0.95" />

                    {/* "B" inside circle */}
                    <text
                      x="25"
                      y="25"
                      fontSize="24"
                      fontWeight="bold"
                      fill="#FF6B35"
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontFamily="-apple-system, BlinkMacSystemFont, 'Inter', 'SF Pro Text', 'Segoe UI', sans-serif"
                    >
                      B
                    </text>

                    {/* "Zietra" text */}
                    <text
                      x="55"
                      y="25"
                      fontSize="20"
                      fontWeight="700"
                      fill="white"
                      dominantBaseline="central"
                      fontFamily="-apple-system, BlinkMacSystemFont, 'Inter', 'SF Pro Text', 'Segoe UI', sans-serif"
                    >
                      Brand
                    </text>
                    <text
                      x="112"
                      y="25"
                      fontSize="20"
                      fontWeight="700"
                      fill="white"
                      fillOpacity="0.9"
                      dominantBaseline="central"
                      fontFamily="-apple-system, BlinkMacSystemFont, 'Inter', 'SF Pro Text', 'Segoe UI', sans-serif"
                    >
                      Monkz
                    </text>
                  </svg>
                </div>
                <p className="text-xl text-indigo-200">
                  {BRANDING.tagline}
                </p>
              </div>

              <h1 className="text-3xl font-bold tracking-tight mb-6">
                {BRANDING.login.brandingPanel.heading}
              </h1>
              <p className="text-lg text-indigo-200 mb-8">
                {BRANDING.login.brandingPanel.description}
              </p>

              <div className="space-y-4">
                {BRANDING.login.brandingPanel.features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold">{feature.title}</p>
                      <p className="text-sm text-indigo-200">{feature.description}</p>
                    </div>
                  </div>
                ))}</div>
            </div>

            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
