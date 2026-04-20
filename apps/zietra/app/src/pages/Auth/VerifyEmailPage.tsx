import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { EnvelopeIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import apiClient from '../../services/api';

export const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resending, setResending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes in seconds

  const email = searchParams.get('email') || localStorage.getItem('pendingVerificationEmail') || '';

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle OTP input
  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Only allow numbers

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  // Handle backspace
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  // Handle paste
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otp];

    pastedData.split('').forEach((char, index) => {
      if (index < 6) newOtp[index] = char;
    });

    setOtp(newOtp);

    // Focus last filled input
    const lastFilledIndex = Math.min(pastedData.length - 1, 5);
    document.getElementById(`otp-${lastFilledIndex}`)?.focus();
  };

  // Verify OTP
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await apiClient.post('/auth/verify-email', {
        email,
        token: otpCode,
      });

      setSuccess('Email verified successfully! Redirecting...');

      // Store token
      localStorage.setItem('crmToken', response.data.token);
      localStorage.setItem('crmUser', JSON.stringify(response.data.user));
      localStorage.removeItem('pendingVerificationEmail');

      // Redirect to dashboard
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Verification failed');
      setOtp(['', '', '', '', '', '']); // Clear OTP on error
      document.getElementById('otp-0')?.focus();
    } finally {
      setLoading(false);
    }
  };

  // Resend code
  const handleResend = async () => {
    setResending(true);
    setError('');
    setSuccess('');

    try {
      await apiClient.post('/auth/resend-verification', { email });
      setSuccess('New verification code sent!');
      setTimeLeft(900); // Reset timer
      setOtp(['', '', '', '', '', '']); // Clear OTP
      document.getElementById('otp-0')?.focus();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <p className="text-red-600 mb-4">No email address found</p>
          <button
            onClick={() => navigate('/signup')}
            className="w-full py-3 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Back to Register
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100 py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-primary-100 rounded-full mb-4">
            <EnvelopeIcon className="w-8 h-8 text-primary-600" />
          </div>
          <h1 className="text-3xl font-bold text-[#F1F5F9] mb-2">
            Verify Your Email
          </h1>
          <p className="text-[#94A3B8]">
            We sent a 6-digit code to<br />
            <strong>{email}</strong>
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-6">
          {/* OTP Input */}
          <div>
            <label className="block text-sm font-medium text-[#CBD5E1] mb-3 text-center">
              Enter Verification Code
            </label>
            <div className="flex justify-center gap-2">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all"
                  disabled={loading}
                />
              ))}
            </div>
          </div>

          {/* Timer */}
          <div className="text-center">
            <p className="text-sm text-[#94A3B8]">
              {timeLeft > 0 ? (
                <>Code expires in <strong>{formatTime(timeLeft)}</strong></>
              ) : (
                <span className="text-red-600">Code expired</span>
              )}
            </p>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 text-center">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-600 text-center">{success}</p>
            </div>
          )}

          {/* Verify Button */}
          <button
            type="submit"
            disabled={loading || otp.join('').length !== 6}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Verifying...
              </>
            ) : (
              <>
                Verify Email
                <ArrowRightIcon className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Resend Button */}
          <div className="text-center">
            <p className="text-sm text-[#94A3B8] mb-2">
              Didn't receive the code?
            </p>
            <button
              type="button"
              onClick={handleResend}
              disabled={resending || timeLeft <= 0}
              className="text-primary-600 hover:text-primary-700 font-medium text-sm disabled:opacity-50"
            >
              {resending ? 'Sending...' : 'Resend Code'}
            </button>
          </div>
        </form>

        {/* Back to Register */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/signup')}
            className="text-sm text-[#94A3B8] hover:text-[#F1F5F9]"
          >
            Wrong email? Go back to register
          </button>
        </div>
      </div>
    </div>
  );
};
