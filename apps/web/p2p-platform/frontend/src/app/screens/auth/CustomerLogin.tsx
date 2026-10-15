import React, { useState, useEffect, useCallback } from 'react';
import { Form, Input, Button, message, Divider } from 'antd';
import { MailOutlined, LockOutlined, UserOutlined, PhoneOutlined } from '@ant-design/icons';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { getApiUrl } from '../../api/api';
import { DollorTheme } from '../../theme';

// Google OAuth Configuration
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const APPLE_CLIENT_ID = import.meta.env.VITE_APPLE_CLIENT_ID || 'com.dollor.customer.web';
const APPLE_REDIRECT_URI = import.meta.env.VITE_APPLE_REDIRECT_URI || `${window.location.origin}/api/auth/apple/callback`;

// Declare global types
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement | null,
            config: {
              theme?: string;
              size?: string;
              width?: number;
              text?: string;
              shape?: string;
            }
          ) => void;
          prompt: () => void;
        };
      };
    };
    AppleID?: {
      auth: {
        init: (config: {
          clientId: string;
          scope: string;
          redirectURI: string;
          usePopup: boolean;
        }) => void;
        signIn: () => Promise<{
          authorization: {
            code: string;
            id_token: string;
            state?: string;
          };
          user?: {
            email?: string;
            name?: {
              firstName?: string;
              lastName?: string;
            };
          };
        }>;
      };
    };
  }
}

const CustomerLogin: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();
  const API_URL = getApiUrl();

  // Handle Google Sign-In callback
  const handleGoogleCallback = useCallback(async (response: { credential: string }) => {
    setGoogleLoading(true);
    try {
      const result = await axios.post(`${API_URL}/api/auth/customer/google`, {
        id_token: response.credential,
      });

      localStorage.setItem('customer_token', result.data.access_token);
      localStorage.setItem('customer_id', result.data.customer_id);
      localStorage.setItem('customer_name', result.data.name);
      localStorage.setItem('customer_email', result.data.email);
      localStorage.setItem('customer_phone', result.data.phone || '');

      message.success('Welcome! Signed in with Google');
      navigate('/customer/home');
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      const detail = error.response?.data?.detail;
      const errorMsg = typeof detail === 'string' ? detail : 'Google sign-in failed. Please try again.';
      message.error(errorMsg);
    } finally {
      setGoogleLoading(false);
    }
  }, [API_URL, navigate]);

  // Handle Apple Sign-In
  const handleAppleSignIn = async () => {
    setAppleLoading(true);
    try {
      if (!window.AppleID) {
        message.warning('Apple Sign-In is loading. Please try again.');
        setAppleLoading(false);
        return;
      }

      const response = await window.AppleID.auth.signIn();

      // Send to backend
      const result = await axios.post(`${API_URL}/api/customer/apple-auth`, {
        email: response.user?.email || '',
        name: response.user?.name ?
          `${response.user.name.firstName || ''} ${response.user.name.lastName || ''}`.trim() :
          undefined,
        apple_id: response.authorization.code,
        identity_token: response.authorization.id_token,
      });

      localStorage.setItem('customer_token', result.data.access_token);
      localStorage.setItem('customer_id', result.data.customer_id);
      localStorage.setItem('customer_name', result.data.name);
      localStorage.setItem('customer_email', result.data.email);
      localStorage.setItem('customer_phone', result.data.phone || '');

      message.success('Welcome! Signed in with Apple');
      navigate('/customer/home');
    } catch (error: any) {
      console.error('Apple sign-in error:', error);
      if (error.error !== 'popup_closed_by_user') {
        const detail = error.response?.data?.detail;
        const errorMsg = typeof detail === 'string' ? detail : 'Apple sign-in failed. Please try again.';
        message.error(errorMsg);
      }
    } finally {
      setAppleLoading(false);
    }
  };

  // Initialize Google Sign-In
  useEffect(() => {
    const loadGoogleScript = () => {
      if (document.getElementById('google-signin-script')) return;

      const script = document.createElement('script');
      script.id = 'google-signin-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogleSignIn;
      document.body.appendChild(script);
    };

    const initializeGoogleSignIn = () => {
      if (!GOOGLE_CLIENT_ID || !window.google) return;

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCallback,
        auto_select: false,
      });
    };

    const timer = setTimeout(() => {
      if (window.google) {
        initializeGoogleSignIn();
      } else {
        loadGoogleScript();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [handleGoogleCallback]);

  // Initialize Apple Sign-In
  useEffect(() => {
    const loadAppleScript = () => {
      if (document.getElementById('apple-signin-script')) return;

      const script = document.createElement('script');
      script.id = 'apple-signin-script';
      script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
      script.async = true;
      script.defer = true;
      script.onload = initializeAppleSignIn;
      document.body.appendChild(script);
    };

    const initializeAppleSignIn = () => {
      if (!window.AppleID) return;

      window.AppleID.auth.init({
        clientId: APPLE_CLIENT_ID,
        scope: 'name email',
        redirectURI: APPLE_REDIRECT_URI,
        usePopup: true,
      });
    };

    const timer = setTimeout(() => {
      if (window.AppleID) {
        initializeAppleSignIn();
      } else {
        loadAppleScript();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Custom Google Sign-In handler
  const handleCustomGoogleSignIn = () => {
    if (window.google) {
      window.google.accounts.id.prompt();
    } else {
      message.warning('Google Sign-In is loading. Please try again.');
    }
  };

  const onLogin = async (values: any) => {
    setLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append('username', values.email);
      formData.append('password', values.password);

      const response = await axios.post(
        `${API_URL}/api/auth/customer/login`,
        formData,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      localStorage.setItem('customer_token', response.data.access_token);
      localStorage.setItem('customer_id', response.data.customer_id);
      localStorage.setItem('customer_name', response.data.name);
      localStorage.setItem('customer_email', response.data.email);
      localStorage.setItem('customer_phone', response.data.phone || '');

      message.success('Welcome back!');
      navigate('/customer/home');
    } catch (error: any) {
      console.error('Login error:', error);
      const detail = error.response?.data?.detail;
      const errorMsg = typeof detail === 'string' ? detail : 'Invalid email or password.';
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const onRegister = async (values: any) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/customer/register`, {
        email: values.email,
        password: values.password,
        name: values.name,
        phone: values.phone,
      });

      localStorage.setItem('customer_token', response.data.access_token);
      localStorage.setItem('customer_id', response.data.customer_id);
      localStorage.setItem('customer_name', response.data.name);
      localStorage.setItem('customer_email', response.data.email);
      localStorage.setItem('customer_phone', response.data.phone || '');

      message.success('Account created! Welcome to Dollor.AI');
      navigate('/customer/home');
    } catch (error: any) {
      console.error('Registration error:', error);
      const detail = error.response?.data?.detail;
      const errorMsg = typeof detail === 'string' ? detail : 'Registration failed. Please try again.';
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        {/* Logo */}
        <div className="logo-section">
          <div className="logo">
            <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
              <circle cx="28" cy="28" r="28" fill="#ff6b00"/>
              <text x="28" y="37" textAnchor="middle" fill="white" fontSize="26" fontWeight="800" fontFamily="system-ui">$</text>
            </svg>
          </div>
          <h1 className="app-name">Dollor</h1>
        </div>

        {/* Title */}
        <div className="auth-header">
          <h2>{isSignUp ? 'Create your account' : 'Welcome to Dollor'}</h2>
          <p className="subtitle">
            {isSignUp
              ? 'Start riding with just $1 platform fee'
              : 'Book rides in California'}
          </p>
        </div>

        {/* Social Login Buttons */}
        <div className="social-buttons">
          <button
            className="social-btn apple-btn"
            onClick={handleAppleSignIn}
            disabled={appleLoading}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            <span>{appleLoading ? 'Signing in...' : 'Continue with Apple'}</span>
          </button>

          <button
            className="social-btn google-btn"
            onClick={handleCustomGoogleSignIn}
            disabled={googleLoading}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>{googleLoading ? 'Signing in...' : 'Continue with Google'}</span>
          </button>
        </div>

        <Divider className="divider">
          <span>or</span>
        </Divider>

        {/* Email Form */}
        {!isSignUp ? (
          <Form
            name="customer_login"
            onFinish={onLogin}
            autoComplete="off"
            layout="vertical"
            className="auth-form"
          >
            <Form.Item
              name="email"
              rules={[
                { required: true, message: 'Please enter your email' },
                { type: 'email', message: 'Please enter a valid email' }
              ]}
            >
              <Input
                prefix={<MailOutlined className="input-icon" />}
                placeholder="Email address"
                size="large"
                className="auth-input"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Please enter your password' }]}
            >
              <Input.Password
                prefix={<LockOutlined className="input-icon" />}
                placeholder="Password"
                size="large"
                className="auth-input"
              />
            </Form.Item>

            <div className="forgot-password">
              <Link to="/forgot-password">Forgot password?</Link>
            </div>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                size="large"
                block
                className="submit-btn"
              >
                Continue
              </Button>
            </Form.Item>
          </Form>
        ) : (
          <Form
            name="customer_register"
            onFinish={onRegister}
            autoComplete="off"
            layout="vertical"
            className="auth-form"
          >
            <Form.Item
              name="name"
              rules={[{ required: true, message: 'Please enter your name' }]}
            >
              <Input
                prefix={<UserOutlined className="input-icon" />}
                placeholder="Full name"
                size="large"
                className="auth-input"
              />
            </Form.Item>

            <Form.Item
              name="email"
              rules={[
                { required: true, message: 'Please enter your email' },
                { type: 'email', message: 'Please enter a valid email' }
              ]}
            >
              <Input
                prefix={<MailOutlined className="input-icon" />}
                placeholder="Email address"
                size="large"
                className="auth-input"
              />
            </Form.Item>

            <Form.Item
              name="phone"
              rules={[{ required: true, message: 'Please enter your phone' }]}
            >
              <Input
                prefix={<PhoneOutlined className="input-icon" />}
                placeholder="Phone number"
                size="large"
                className="auth-input"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: 'Please create a password' },
                { min: 8, message: 'Password must be at least 8 characters' }
              ]}
            >
              <Input.Password
                prefix={<LockOutlined className="input-icon" />}
                placeholder="Password"
                size="large"
                className="auth-input"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                size="large"
                block
                className="submit-btn"
              >
                Create account
              </Button>
            </Form.Item>
          </Form>
        )}

        {/* Toggle Sign Up / Sign In */}
        <div className="toggle-auth">
          <span>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          </span>
          <button
            className="toggle-btn"
            onClick={() => setIsSignUp(!isSignUp)}
          >
            {isSignUp ? 'Log in' : 'Sign up'}
          </button>
        </div>

        {/* Platform Fee Info */}
        <div className="fee-info">
          <div className="fee-badge">$1</div>
          <span>flat platform fee. 100% tips go to drivers.</span>
        </div>

        {/* Footer Links */}
        <div className="auth-footer">
          <Link to="/terms">Terms of Use</Link>
          <span className="dot">·</span>
          <Link to="/privacy">Privacy Policy</Link>
          <span className="dot">·</span>
          <Link to="/driver/login">Drive with us</Link>
        </div>
      </div>

      <style>{`
        * {
          box-sizing: border-box;
        }

        .auth-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0a0a0f;
          padding: 24px 16px;
          font-family: system-ui, -apple-system, sans-serif;
        }

        .auth-container {
          width: 100%;
          max-width: 440px;
          text-align: center;
        }

        /* Logo */
        .logo-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 28px;
        }

        .logo {
          width: 56px;
          height: 56px;
          margin-bottom: 14px;
        }

        .logo svg {
          width: 100%;
          height: 100%;
        }

        .app-name {
          font-size: 22px;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
          letter-spacing: -0.3px;
        }

        /* Header */
        .auth-header {
          margin-bottom: 28px;
        }

        .auth-header h2 {
          font-size: 28px;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 8px 0;
          letter-spacing: -0.5px;
        }

        .subtitle {
          font-size: 15px;
          color: rgba(255,255,255,0.6);
          margin: 0;
        }

        /* Social Buttons */
        .social-buttons {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 20px;
        }

        .social-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          width: 100%;
          height: 52px;
          padding: 0 16px;
          border-radius: 28px;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: border-color 0.2s ease, background 0.2s ease;
          border: 1px solid rgba(255,107,0,0.2);
          background: #111118;
          color: #ffffff;
          font-family: system-ui, -apple-system, sans-serif;
        }

        .social-btn:hover:not(:disabled) {
          border-color: #ff6b00;
          background: rgba(255,107,0,0.06);
        }

        .social-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .apple-btn {
          background: #111118;
          border-color: rgba(255,255,255,0.15);
        }

        .apple-btn:hover:not(:disabled) {
          border-color: #ff6b00;
          background: rgba(255,107,0,0.06);
        }

        /* Divider */
        .divider {
          margin: 20px 0 !important;
        }

        .divider .ant-divider-inner-text {
          color: rgba(255,255,255,0.35);
          font-size: 13px;
          font-weight: 400;
          padding: 0 16px;
          background: #0a0a0f;
        }

        .ant-divider-with-text::before,
        .ant-divider-with-text::after {
          border-color: rgba(255,255,255,0.1) !important;
        }

        /* Auth Form */
        .auth-form {
          text-align: left;
        }

        .auth-form .ant-form-item {
          margin-bottom: 14px;
        }

        .auth-input {
          height: 52px;
          border-radius: 10px;
          font-size: 15px;
          background: #111118 !important;
          border: 1px solid rgba(255,107,0,0.2) !important;
          color: #ffffff !important;
        }

        .auth-input input {
          background: #111118 !important;
          color: #ffffff !important;
        }

        .auth-input input::placeholder {
          color: rgba(255,255,255,0.35) !important;
        }

        .auth-input:hover {
          border-color: rgba(255,107,0,0.5) !important;
        }

        .auth-input:focus,
        .auth-input.ant-input-affix-wrapper-focused {
          border-color: #ff6b00 !important;
          box-shadow: 0 0 0 2px rgba(255,107,0,0.15) !important;
        }

        .input-icon {
          color: rgba(255,255,255,0.4);
          font-size: 16px;
          margin-right: 4px;
        }

        .ant-form-item-explain-error {
          font-size: 13px;
          margin-top: 4px;
          color: #ff6b6b !important;
        }

        .forgot-password {
          text-align: right;
          margin-bottom: 20px;
        }

        .forgot-password a {
          color: #ff6b00;
          font-size: 14px;
          font-weight: 500;
        }

        .forgot-password a:hover {
          color: #ff8c33;
          text-decoration: underline;
        }

        .submit-btn {
          height: 52px;
          font-size: 16px;
          font-weight: 600;
          border-radius: 28px;
          background: #ff6b00 !important;
          border: none !important;
          color: #ffffff !important;
          font-family: system-ui, -apple-system, sans-serif;
        }

        .submit-btn:hover:not(:disabled) {
          background: #ff8c33 !important;
        }

        /* Toggle Auth */
        .toggle-auth {
          margin-top: 24px;
          font-size: 14px;
          color: rgba(255,255,255,0.5);
        }

        .toggle-btn {
          background: none;
          border: none;
          color: #ff6b00;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          margin-left: 4px;
          padding: 0;
          font-family: system-ui, -apple-system, sans-serif;
        }

        .toggle-btn:hover {
          color: #ff8c33;
          text-decoration: underline;
        }

        /* Fee Info */
        .fee-info {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-top: 28px;
          padding: 14px 16px;
          background: #111118;
          border: 1px solid rgba(255,107,0,0.15);
          border-radius: 10px;
          font-size: 14px;
          color: rgba(255,255,255,0.5);
        }

        .fee-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          background: #ff6b00;
          color: white;
          border-radius: 50%;
          font-size: 13px;
          font-weight: 700;
          flex-shrink: 0;
        }

        /* Footer */
        .auth-footer {
          margin-top: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 12px;
          flex-wrap: wrap;
        }

        .auth-footer a {
          color: rgba(255,255,255,0.4);
        }

        .auth-footer a:hover {
          color: #ff6b00;
        }

        .dot {
          color: rgba(255,255,255,0.2);
        }

        /* Responsive — works at 320px */
        @media (max-width: 480px) {
          .auth-page {
            padding: 20px 16px;
            align-items: flex-start;
            padding-top: 40px;
          }

          .auth-header h2 {
            font-size: 24px;
          }

          .social-btn,
          .submit-btn {
            height: 50px;
            font-size: 15px;
          }
        }

        /* Ant Design Dark Overrides */
        .ant-input-password .ant-input {
          font-size: 15px;
          background: transparent !important;
          color: #ffffff !important;
        }

        .ant-input-password-icon,
        .ant-input-suffix svg {
          color: rgba(255,255,255,0.4) !important;
        }
      `}</style>
    </div>
  );
};

export default CustomerLogin;
