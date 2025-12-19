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

      message.success('Account created! Welcome to Dollor.ai');
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
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="20" fill={DollorTheme.Brand.green}/>
              <path d="M20 8C13.4 8 8 13.4 8 20s5.4 12 12 12 12-5.4 12-12S26.6 8 20 8zm1.2 17.2h-2.4V16h2.4v9.2zm0-10.8h-2.4v-2.4h2.4v2.4z" fill="white" transform="translate(0, 1)"/>
              <text x="20" y="26" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold" fontFamily="system-ui">$</text>
            </svg>
          </div>
          <h1 className="app-name">Dollor.ai</h1>
        </div>

        {/* Title */}
        <div className="auth-header">
          <h2>{isSignUp ? 'Create your account' : 'Welcome back'}</h2>
          <p className="subtitle">
            {isSignUp
              ? 'Start riding with just $1 platform fee'
              : 'Log in to continue to Dollor.ai'}
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
        .auth-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          padding: 24px;
        }

        .auth-container {
          width: 100%;
          max-width: 400px;
          text-align: center;
        }

        /* Logo */
        .logo-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 32px;
        }

        .logo {
          width: 48px;
          height: 48px;
          margin-bottom: 12px;
        }

        .logo svg {
          width: 100%;
          height: 100%;
        }

        .app-name {
          font-size: 24px;
          font-weight: 600;
          color: #202123;
          margin: 0;
          letter-spacing: -0.5px;
        }

        /* Header */
        .auth-header {
          margin-bottom: 24px;
        }

        .auth-header h2 {
          font-size: 32px;
          font-weight: 600;
          color: #202123;
          margin: 0 0 8px 0;
          letter-spacing: -0.5px;
        }

        .subtitle {
          font-size: 16px;
          color: #6e6e80;
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
          border-radius: 6px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1px solid #c5c5d2;
          background: #ffffff;
          color: #202123;
        }

        .social-btn:hover:not(:disabled) {
          background: #f7f7f8;
          border-color: #8e8ea0;
        }

        .social-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .apple-btn {
          background: #000000;
          border-color: #000000;
          color: #ffffff;
        }

        .apple-btn:hover:not(:disabled) {
          background: #1a1a1a;
          border-color: #000000;
        }

        /* Divider */
        .divider {
          margin: 20px 0 !important;
        }

        .divider .ant-divider-inner-text {
          color: #8e8ea0;
          font-size: 13px;
          font-weight: 400;
          padding: 0 16px;
        }

        /* Auth Form */
        .auth-form {
          text-align: left;
        }

        .auth-form .ant-form-item {
          margin-bottom: 16px;
        }

        .auth-input {
          height: 52px;
          border-radius: 6px;
          border: 1px solid #c5c5d2;
          font-size: 16px;
        }

        .auth-input:hover,
        .auth-input:focus {
          border-color: ${DollorTheme.Brand.green};
        }

        .auth-input.ant-input-affix-wrapper-focused {
          border-color: ${DollorTheme.Brand.green};
          box-shadow: 0 0 0 2px rgba(6, 193, 103, 0.1);
        }

        .input-icon {
          color: #8e8ea0;
          font-size: 16px;
          margin-right: 4px;
        }

        .forgot-password {
          text-align: right;
          margin-bottom: 20px;
        }

        .forgot-password a {
          color: ${DollorTheme.Brand.green};
          font-size: 14px;
          font-weight: 500;
        }

        .forgot-password a:hover {
          color: ${DollorTheme.Brand.greenDark};
          text-decoration: underline;
        }

        .submit-btn {
          height: 52px;
          font-size: 16px;
          font-weight: 600;
          border-radius: 6px;
          background: ${DollorTheme.Brand.green};
          border: none;
        }

        .submit-btn:hover {
          background: ${DollorTheme.Brand.greenDark} !important;
        }

        /* Toggle Auth */
        .toggle-auth {
          margin-top: 24px;
          font-size: 14px;
          color: #6e6e80;
        }

        .toggle-btn {
          background: none;
          border: none;
          color: ${DollorTheme.Brand.green};
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          margin-left: 4px;
          padding: 0;
        }

        .toggle-btn:hover {
          color: ${DollorTheme.Brand.greenDark};
          text-decoration: underline;
        }

        /* Fee Info */
        .fee-info {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 32px;
          padding: 16px;
          background: #f7f7f8;
          border-radius: 8px;
          font-size: 14px;
          color: #6e6e80;
        }

        .fee-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: ${DollorTheme.Brand.green};
          color: white;
          border-radius: 50%;
          font-size: 14px;
          font-weight: 700;
        }

        /* Footer */
        .auth-footer {
          margin-top: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 13px;
        }

        .auth-footer a {
          color: #6e6e80;
        }

        .auth-footer a:hover {
          color: ${DollorTheme.Brand.green};
        }

        .dot {
          color: #c5c5d2;
        }

        /* Responsive */
        @media (max-width: 480px) {
          .auth-page {
            padding: 16px;
          }

          .auth-header h2 {
            font-size: 26px;
          }

          .social-btn,
          .auth-input,
          .submit-btn {
            height: 48px;
            font-size: 15px;
          }

          .auth-footer {
            flex-wrap: wrap;
          }
        }

        /* Ant Design Overrides */
        .ant-input-password .ant-input {
          font-size: 16px;
        }

        .ant-form-item-explain-error {
          font-size: 13px;
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
};

export default CustomerLogin;
