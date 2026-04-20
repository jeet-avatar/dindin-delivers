import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircleIcon, ArrowRightIcon } from '@heroicons/react/24/solid';

export function SubscriptionSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const verifySession = async () => {
      if (!sessionId) {
        setError('No session ID found');
        setIsLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem('crmToken');

        // Wait a moment for Stripe webhook to process
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Verify the subscription was created
        const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/subscriptions/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to verify subscription');
        }

        const data = await response.json();

        if (!data.hasSubscription) {
          throw new Error('Subscription not found');
        }

        setIsLoading(false);
      } catch (err: any) {
        console.error('Verification error:', err);
        setError(err.message || 'Failed to verify subscription');
        setIsLoading(false);
      }
    };

    verifySession();
  }, [sessionId]);

  const handleContinue = () => {
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-600 mx-auto mb-4"></div>
          <p className="text-lg text-[#CBD5E1]">Verifying your subscription...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#161625] rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-[#F1F5F9] mb-2">Verification Failed</h2>
          <p className="text-[#94A3B8] mb-6">{error}</p>
          <button
            onClick={() => navigate('/pricing')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors"
          >
            Return to Pricing
            <ArrowRightIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-950 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-[#161625] rounded-2xl shadow-xl p-8 md:p-12 text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-green-500/15 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircleIcon className="w-12 h-12 text-green-600" />
          </div>

          {/* Success Message */}
          <h1 className="text-3xl md:text-4xl font-bold text-[#F1F5F9] mb-4">
            Welcome to CRM Pro!
          </h1>
          <p className="text-lg text-[#94A3B8] mb-8">
            Your subscription is now active. Get ready to supercharge your business!
          </p>

          {/* Features List */}
          <div className="bg-orange-500/10 border border-indigo-100 rounded-xl p-6 mb-8 text-left">
            <h3 className="font-semibold text-[#F1F5F9] mb-4 text-center">What's included:</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-[#CBD5E1]">Full access to all CRM features</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-[#CBD5E1]">Email campaigns and automation</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-[#CBD5E1]">Analytics and reporting</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-[#CBD5E1]">Priority customer support</span>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={handleContinue}
            className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl active:scale-95"
          >
            Go to Dashboard
            <ArrowRightIcon className="w-5 h-5" />
          </button>

          {/* Additional Info */}
          <p className="mt-6 text-sm text-[#94A3B8]">
            A confirmation email has been sent to your inbox.
          </p>
        </div>

        {/* Help Card */}
        <div className="mt-6 bg-[#161625] rounded-xl shadow p-6 text-center">
          <p className="text-sm text-[#94A3B8]">
            Need help getting started?{' '}
            <a href="#" className="text-indigo-400 hover:text-orange-400 font-medium">
              Check out our quick start guide
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
