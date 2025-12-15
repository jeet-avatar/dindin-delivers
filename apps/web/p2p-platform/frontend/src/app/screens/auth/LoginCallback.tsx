import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const LoginCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const idToken = params.get('id_token');
    const accessToken = params.get('access_token');

    if (idToken && accessToken && idToken !== 'None' && accessToken !== 'None') {
      // Store tokens securely
      localStorage.setItem('id_token', idToken);
      localStorage.setItem('access_token', accessToken);

      // Redirect to the dashboard
      navigate('/');
    } else {
      // Handle error or redirect to login
      console.error("Authentication tokens not found in URL", location.search);
      navigate('/login-error'); // Or some other error page
    }
  }, [navigate, location]);

  return <div>Loading...</div>;
};

export default LoginCallback;
