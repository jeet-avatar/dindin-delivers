import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    const userParam = searchParams.get('user');
    const error = searchParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      navigate('/login?error=' + error);
      return;
    }

    if (token && userParam) {
      try {
        const user = JSON.parse(decodeURIComponent(userParam));

        // Store authentication data
        localStorage.setItem('crmToken', token);
        localStorage.setItem('crmUser', JSON.stringify(user));

        // Force redirect to home page to trigger app reload with auth
        window.location.href = '/';
      } catch (err) {
        console.error('Error parsing OAuth callback data:', err);
        navigate('/login?error=invalid_callback');
      }
    } else {
      navigate('/login?error=missing_credentials');
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-950">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mb-4"></div>
        <p className="text-[#94A3B8]">Completing sign in...</p>
      </div>
    </div>
  );
}
