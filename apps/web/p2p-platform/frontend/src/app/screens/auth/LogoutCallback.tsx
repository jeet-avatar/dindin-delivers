import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import FullScreenLoader from '../../components/ui/FullScreenLoader';

const LogoutCallback = () => {
  const navigate = useNavigate();
  const { setUser } = useUser();

  useEffect(() => {
    // Clear all user-related data from the browser
    localStorage.removeItem('id_token');
    localStorage.removeItem('access_token');
    setUser(null);

    // Redirect to the login page after cleanup
    navigate('/login');
  }, [navigate, setUser]);

  return <FullScreenLoader />;
};

export default LogoutCallback;
