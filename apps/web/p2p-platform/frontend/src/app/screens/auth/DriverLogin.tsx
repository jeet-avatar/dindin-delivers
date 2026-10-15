import React, { useState, useEffect, useCallback } from 'react';
import { Form, Input, Button, message, Checkbox, Divider } from 'antd';
import { UserOutlined, LockOutlined, CarOutlined, DollarOutlined, ClockCircleOutlined, WalletOutlined, EnvironmentOutlined, GoogleOutlined } from '@ant-design/icons';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { getApiUrl } from '../../api/api';

// Google OAuth Configuration
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// Declare google global type
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
  }
}

const DriverLogin: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const API_URL = getApiUrl();

  // Handle Google Sign-In callback
  const handleGoogleCallback = useCallback(async (response: { credential: string }) => {
    setGoogleLoading(true);
    try {
      const result = await axios.post(`${API_URL}/api/auth/driver/google`, {
        id_token: response.credential,
      });

      // Store driver credentials
      localStorage.setItem('driver_token', result.data.access_token);
      localStorage.setItem('driver_id', result.data.driver_id);
      localStorage.setItem('driver_code', result.data.driver_code);
      localStorage.setItem('driver_name', result.data.name);
      localStorage.setItem('driver_email', result.data.email);

      message.success('Welcome! Signed in with Google');
      navigate('/driver/dashboard');
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      const detail = error.response?.data?.detail;
      if (error.response?.status === 403) {
        message.error('Your driver account is pending approval');
      } else {
        const errorMsg = typeof detail === 'string' ? detail : 'Google sign-in failed. Please try again.';
        message.error(errorMsg);
      }
    } finally {
      setGoogleLoading(false);
    }
  }, [API_URL, navigate]);

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

      const buttonContainer = document.getElementById('google-signin-button-driver');
      if (buttonContainer) {
        window.google.accounts.id.renderButton(buttonContainer, {
          theme: 'outline',
          size: 'large',
          width: 350,
          text: 'signin_with',
          shape: 'rectangular',
        });
      }
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

  // Custom Google button for fallback
  const handleCustomGoogleSignIn = () => {
    if (window.google) {
      window.google.accounts.id.prompt();
    } else {
      message.warning('Google Sign-In is loading. Please try again in a moment.');
    }
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append('username', values.email);
      formData.append('password', values.password);

      const response = await axios.post(
        `${API_URL}/api/auth/driver/login`,
        formData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      // Store driver credentials. Also overwrite access_token so the shared
      // axios interceptor (which prefers access_token) sends the driver JWT —
      // otherwise driver pages send a stale vendor/customer token and 401.
      localStorage.setItem('driver_token', response.data.access_token);
      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('driver_id', response.data.driver_id);
      localStorage.setItem('driver_code', response.data.driver_code);
      localStorage.setItem('driver_name', response.data.name);
      localStorage.setItem('driver_email', response.data.email);

      message.success('Welcome back! Redirecting to your dashboard...');
      navigate('/driver/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      const getErrorMsg = (defaultMsg: string) => {
        const detail = error.response?.data?.detail;
        if (typeof detail === 'string') return detail;
        if (Array.isArray(detail) && detail.length > 0) return detail[0]?.msg || defaultMsg;
        return defaultMsg;
      };
      if (error.response?.status === 403) {
        message.error(getErrorMsg('Your driver account is pending approval'));
      } else {
        message.error(getErrorMsg('Login failed. Please check your credentials.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="driver-login-page">
      <div className="driver-login-container">

        {/* Logo */}
        <div className="driver-logo-section">
          <div className="driver-logo">
            <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
              <circle cx="28" cy="28" r="28" fill="#ff6b00"/>
              <text x="28" y="37" textAnchor="middle" fill="white" fontSize="26" fontWeight="800" fontFamily="system-ui">$</text>
            </svg>
          </div>
          <span className="driver-logo-name">Dollor</span>
        </div>

        {/* Header */}
        <div className="driver-header">
          <h2>Drive with Dollor</h2>
          <p>Earn on your schedule in California</p>
        </div>

        {/* Google Sign-In */}
        <div className="driver-social-buttons">
          <button
            className="driver-social-btn"
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

          {/* Hidden Google SDK button container */}
          <div id="google-signin-button-driver" style={{ display: 'none' }}></div>
        </div>

        {/* Divider */}
        <div className="driver-divider">
          <span>or sign in with email</span>
        </div>

        {/* Email / Password Form */}
        <Form
          name="driver_login"
          onFinish={onFinish}
          autoComplete="off"
          layout="vertical"
          className="driver-form"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Please enter a valid email' }
            ]}
          >
            <Input
              prefix={<UserOutlined className="driver-input-icon" />}
              placeholder="Email address"
              size="large"
              className="driver-input"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password
              prefix={<LockOutlined className="driver-input-icon" />}
              placeholder="Password"
              size="large"
              className="driver-input"
            />
          </Form.Item>

          <div className="driver-form-footer">
            <Link to="/forgot-password" className="driver-forgot-link">Forgot password?</Link>
          </div>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              size="large"
              block
              className="driver-submit-btn"
            >
              Sign In to Dashboard
            </Button>
          </Form.Item>
        </Form>

        {/* Apply to Drive */}
        <div className="driver-separator">
          <span>New to Dollor?</span>
        </div>

        <button
          className="driver-apply-btn"
          onClick={() => navigate('/driver/apply')}
        >
          Apply to Drive
        </button>

        {/* Legal Footer */}
        <div className="driver-legal">
          <p>
            By signing in, you agree to our{' '}
            <Link to="/terms">Terms of Service</Link> and{' '}
            <Link to="/privacy">Privacy Policy</Link>
          </p>
          <div className="driver-nav-links">
            <Link to="/customer/login">Ride with Dollor</Link>
          </div>
        </div>
      </div>

      <style>{`
        * {
          box-sizing: border-box;
        }

        .driver-login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0a0a0f;
          padding: 24px 16px;
          font-family: system-ui, -apple-system, sans-serif;
        }

        .driver-login-container {
          width: 100%;
          max-width: 440px;
          text-align: center;
        }

        /* Logo */
        .driver-logo-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 28px;
        }

        .driver-logo {
          width: 56px;
          height: 56px;
          margin-bottom: 14px;
        }

        .driver-logo svg {
          width: 100%;
          height: 100%;
        }

        .driver-logo-name {
          font-size: 22px;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: -0.3px;
        }

        /* Header */
        .driver-header {
          margin-bottom: 28px;
        }

        .driver-header h2 {
          font-size: 28px;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 8px 0;
          letter-spacing: -0.5px;
        }

        .driver-header p {
          font-size: 15px;
          color: rgba(255,255,255,0.6);
          margin: 0;
        }

        /* Social Buttons */
        .driver-social-buttons {
          margin-bottom: 20px;
        }

        .driver-social-btn {
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

        .driver-social-btn:hover:not(:disabled) {
          border-color: #ff6b00;
          background: rgba(255,107,0,0.06);
        }

        .driver-social-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Divider */
        .driver-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 20px 0;
          color: rgba(255,255,255,0.3);
          font-size: 13px;
        }

        .driver-divider::before,
        .driver-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: rgba(255,255,255,0.08);
        }

        /* Form */
        .driver-form {
          text-align: left;
        }

        .driver-form .ant-form-item {
          margin-bottom: 14px;
        }

        .driver-input {
          height: 52px;
          border-radius: 10px;
          font-size: 15px;
          background: #111118 !important;
          border: 1px solid rgba(255,107,0,0.2) !important;
          color: #ffffff !important;
        }

        .driver-input input {
          background: #111118 !important;
          color: #ffffff !important;
        }

        .driver-input input::placeholder {
          color: rgba(255,255,255,0.35) !important;
        }

        .driver-input:hover {
          border-color: rgba(255,107,0,0.5) !important;
        }

        .driver-input:focus,
        .driver-input.ant-input-affix-wrapper-focused {
          border-color: #ff6b00 !important;
          box-shadow: 0 0 0 2px rgba(255,107,0,0.15) !important;
        }

        .driver-input-icon {
          color: rgba(255,255,255,0.4);
          font-size: 16px;
          margin-right: 4px;
        }

        .ant-form-item-explain-error {
          font-size: 13px;
          margin-top: 4px;
          color: #ff6b6b !important;
        }

        .driver-form-footer {
          text-align: right;
          margin-bottom: 18px;
          margin-top: -6px;
        }

        .driver-forgot-link {
          color: #ff6b00;
          font-size: 14px;
          font-weight: 500;
        }

        .driver-forgot-link:hover {
          color: #ff8c33;
          text-decoration: underline;
        }

        .driver-submit-btn {
          height: 52px;
          font-size: 16px;
          font-weight: 600;
          border-radius: 28px;
          background: #ff6b00 !important;
          border: none !important;
          color: #ffffff !important;
          font-family: system-ui, -apple-system, sans-serif;
        }

        .driver-submit-btn:hover:not(:disabled) {
          background: #ff8c33 !important;
        }

        /* Apply section */
        .driver-separator {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 24px 0 16px;
          color: rgba(255,255,255,0.3);
          font-size: 13px;
        }

        .driver-separator::before,
        .driver-separator::after {
          content: '';
          flex: 1;
          height: 1px;
          background: rgba(255,255,255,0.08);
        }

        .driver-apply-btn {
          display: block;
          width: 100%;
          height: 52px;
          border-radius: 28px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: border-color 0.2s ease, color 0.2s ease;
          border: 1px solid rgba(255,107,0,0.4);
          background: transparent;
          color: #ff6b00;
          font-family: system-ui, -apple-system, sans-serif;
          margin-bottom: 28px;
        }

        .driver-apply-btn:hover {
          border-color: #ff6b00;
          color: #ff8c33;
          background: rgba(255,107,0,0.06);
        }

        /* Legal */
        .driver-legal {
          font-size: 12px;
          color: rgba(255,255,255,0.3);
          line-height: 1.6;
        }

        .driver-legal p {
          margin: 0 0 10px;
        }

        .driver-legal a {
          color: rgba(255,255,255,0.4);
        }

        .driver-legal a:hover {
          color: #ff6b00;
        }

        .driver-nav-links {
          display: flex;
          justify-content: center;
          gap: 16px;
        }

        .driver-nav-links a {
          color: rgba(255,107,0,0.7);
          font-weight: 500;
        }

        .driver-nav-links a:hover {
          color: #ff6b00;
        }

        /* Ant Design Dark Overrides */
        .driver-input .ant-input-password-icon,
        .driver-input .ant-input-suffix svg {
          color: rgba(255,255,255,0.4) !important;
        }

        .ant-input-password .ant-input {
          font-size: 15px;
          background: transparent !important;
          color: #ffffff !important;
        }

        /* Responsive — works at 320px */
        @media (max-width: 480px) {
          .driver-login-page {
            padding: 20px 16px;
            align-items: flex-start;
            padding-top: 40px;
          }

          .driver-header h2 {
            font-size: 24px;
          }

          .driver-social-btn,
          .driver-submit-btn,
          .driver-apply-btn {
            height: 50px;
            font-size: 15px;
          }
        }
      `}</style>
    </div>
  );
};

export default DriverLogin;
