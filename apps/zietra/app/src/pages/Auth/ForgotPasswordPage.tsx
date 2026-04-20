import { useState } from 'react';
import { Link } from 'react-router-dom';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
      } else {
        setError(data.error || 'Failed to send reset email');
      }
    } catch (err: any) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'var(--bg-deep)' }}>
        <div className="max-w-md w-full">
          <div className="rounded-2xl p-8" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-lg)' }}>
            {/* Success Message */}
            <h2 className="text-center text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              Check Your Email
            </h2>
            <p className="text-center mb-6" style={{ color: 'var(--text-secondary)' }}>
              If an account exists with <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>, we've sent password reset instructions to that email address.
            </p>
            <p className="text-center text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
              Please check your inbox and spam folder. The link will expire in 1 hour.
            </p>

            {/* Back to Login Button */}
            <Link
              to="/login"
              className="w-full block text-center py-3 px-6 rounded-xl font-bold transition-all"
              style={{ background: 'var(--accent-gradient)', color: '#fff' }}
            >
              Back to Login
            </Link>

            {/* Didn't receive email? */}
            <div className="mt-6 text-center">
              <button
                onClick={() => setSuccess(false)}
                className="text-sm text-indigo-400 hover:text-purple-400 font-medium"
              >
                Didn't receive the email? Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'var(--bg-deep)' }}>
      <div className="max-w-md w-full">
        <div className="rounded-2xl p-8" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-lg)' }}>
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              Forgot Password?
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              No worries! Enter your email and we'll send you reset instructions.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 rounded-xl p-4" style={{ backgroundColor: 'var(--color-error-100)', border: '1px solid rgba(248, 113, 113, 0.3)' }}>
              <p className="text-sm" style={{ color: 'var(--color-error-500)' }}>{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                Email address
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
                placeholder="Enter your email"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-6 text-white font-bold rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
              style={{ background: 'var(--accent-gradient)' }}
            >
              {loading ? 'Sending...' : 'Send Reset Instructions'}
            </button>
          </form>

          {/* Back to Login Link */}
          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-sm font-medium transition-colors duration-200"
              style={{ color: 'var(--text-muted)' }}
            >
              ← Back to Login
            </Link>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          <p>
            Need help?{' '}
            <a href="mailto:support@zietra.com" className="text-indigo-400 hover:text-purple-400 font-medium">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
