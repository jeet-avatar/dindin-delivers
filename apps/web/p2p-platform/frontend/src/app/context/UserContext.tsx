import { createContext, useState, useContext, ReactNode, useMemo, useEffect, useCallback } from 'react';
import axios from 'axios';
import { getApiUrl } from '../api/api';

// Use centralized API config - supports local, staging, and production
const API_URL = getApiUrl();

// Session timeout in milliseconds (8 hours)
const SESSION_TIMEOUT_MS = 8 * 60 * 60 * 1000;
// Token expiry buffer (5 minutes before actual expiry)
const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;

interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  vendor_id?: number;
  driver_id?: number;
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  login: (user: User) => void;
  logout: () => void;
  loading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

/**
 * Decode JWT token payload without verification (client-side only)
 */
const decodeJwtPayload = (token: string): { exp?: number; sub?: string } | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
};

/**
 * Check if token is expired or about to expire
 */
const isTokenExpired = (token: string): boolean => {
  const payload = decodeJwtPayload(token);
  if (!payload || !payload.exp) {
    // No expiry claim - consider expired for safety
    return true;
  }
  const expiryTime = payload.exp * 1000; // Convert to milliseconds
  const now = Date.now();
  // Token is expired if current time + buffer exceeds expiry
  return now + TOKEN_EXPIRY_BUFFER_MS >= expiryTime;
};

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Logout function - clear all auth state
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('session_start');
    setUser(null);
    window.location.href = '/login';
  }, []);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      const sessionStart = localStorage.getItem('session_start');

      // No token - user must login
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      // Check if token is expired (JWT expiry)
      if (isTokenExpired(token)) {
        console.log('Token expired - requiring re-authentication');
        localStorage.removeItem('token');
        localStorage.removeItem('session_start');
        setUser(null);
        setLoading(false);
        return;
      }

      // Check session timeout (additional security layer)
      if (sessionStart) {
        const sessionAge = Date.now() - parseInt(sessionStart, 10);
        if (sessionAge > SESSION_TIMEOUT_MS) {
          console.log('Session timeout - requiring re-authentication');
          localStorage.removeItem('token');
          localStorage.removeItem('session_start');
          setUser(null);
          setLoading(false);
          return;
        }
      }

      // Token exists and not expired - validate with server
      try {
        const response = await axios.get(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUser(response.data);
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('session_start');
        setUser(null);
      }
      setLoading(false);
    };

    checkAuth();

    // Set up periodic token validation (every 5 minutes)
    const intervalId = setInterval(() => {
      const token = localStorage.getItem('token');
      if (token && isTokenExpired(token)) {
        console.log('Token expired during session - logging out');
        logout();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [logout]);

  const login = (userData: User) => {
    // Set session start time for timeout tracking
    localStorage.setItem('session_start', Date.now().toString());
    setUser(userData);
    setLoading(false);
  };

  const value = useMemo(() => ({ user, setUser, login, logout, loading }), [user, loading, logout]);

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
