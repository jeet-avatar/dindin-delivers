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

      // Store driver credentials
      localStorage.setItem('driver_token', response.data.access_token);
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
      {/* Left Side - Branding */}
      <div className="brand-section">
        <div className="brand-content">
          <div className="logo-container">
            <DollarOutlined className="logo-icon" />
            <span className="logo-text">Dollor.AI</span>
          </div>

          <h1 className="brand-headline">
            Drive Your Future.<br />
            <span className="highlight">Earn On Your Terms.</span>
          </h1>

          <p className="brand-tagline">
            Join the fastest-growing delivery network. Set your own schedule,
            keep more of your earnings, and be part of a community that values you.
          </p>

          <div className="features-list">
            <div className="feature-item">
              <ClockCircleOutlined className="feature-icon" />
              <div>
                <strong>Flexible Schedule</strong>
                <p>Work when you want, as much as you want</p>
              </div>
            </div>
            <div className="feature-item">
              <WalletOutlined className="feature-icon" />
              <div>
                <strong>Instant Payouts</strong>
                <p>Get paid daily with instant cash-out options</p>
              </div>
            </div>
            <div className="feature-item">
              <EnvironmentOutlined className="feature-icon" />
              <div>
                <strong>Smart Routing</strong>
                <p>AI-optimized routes for maximum earnings</p>
              </div>
            </div>
          </div>

          <div className="trust-badges">
            <span>10,000+ Active Drivers</span>
            <span>•</span>
            <span>$2M+ Weekly Payouts</span>
          </div>
        </div>

        <div className="brand-footer">
          <p>© 2024 Dollor.AI — Empowering Local Delivery</p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="login-section">
        <div className="login-container">
          <div className="login-header">
            <CarOutlined className="header-icon" />
            <h2>Driver Portal</h2>
            <p>Sign in to manage your deliveries and earnings</p>
          </div>

          <Form
            name="driver_login"
            onFinish={onFinish}
            autoComplete="off"
            layout="vertical"
            className="login-form"
          >
            <Form.Item
              name="email"
              label="Email Address"
              rules={[
                { required: true, message: 'Please enter your email' },
                { type: 'email', message: 'Please enter a valid email' }
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="your@email.com"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, message: 'Please enter your password' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="••••••••"
                size="large"
              />
            </Form.Item>

            <div className="form-options">
              <Checkbox>Remember me</Checkbox>
              <Link to="/forgot-password" className="forgot-link">Forgot password?</Link>
            </div>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                size="large"
                block
                className="login-button"
              >
                Sign In to Dashboard
              </Button>
            </Form.Item>

            <Divider plain>or continue with</Divider>

            {/* Google Sign-In Button Container */}
            <div className="google-signin-container">
              <div id="google-signin-button-driver"></div>
              {/* Fallback button if Google SDK not loaded */}
              {!GOOGLE_CLIENT_ID && (
                <Button
                  icon={<GoogleOutlined />}
                  size="large"
                  block
                  onClick={handleCustomGoogleSignIn}
                  loading={googleLoading}
                  className="google-fallback-button"
                >
                  Sign in with Google
                </Button>
              )}
            </div>
          </Form>

          <div className="divider">
            <span>Ready to start driving?</span>
          </div>

          <Button
            size="large"
            block
            onClick={() => navigate('/driver/apply')}
            className="apply-button"
          >
            Apply as Delivery Partner
          </Button>

          <div className="login-footer">
            <p>
              By signing in, you agree to our{' '}
              <Link to="/terms">Terms of Service</Link> and{' '}
              <Link to="/privacy">Privacy Policy</Link>
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .driver-login-page {
          min-height: 100vh;
          display: flex;
          background: #f8fafc;
        }

        /* Brand Section - Left Side */
        .brand-section {
          flex: 1;
          background: linear-gradient(135deg, #0d1b2a 0%, #1b263b 50%, #415a77 100%);
          color: white;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 48px;
          position: relative;
          overflow: hidden;
        }

        .brand-section::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle, rgba(76,201,240,0.15) 0%, transparent 70%);
          pointer-events: none;
        }

        .brand-content {
          position: relative;
          z-index: 1;
        }

        .logo-container {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 48px;
        }

        .logo-icon {
          font-size: 40px;
          color: #4cc9f0;
        }

        .logo-text {
          font-size: 32px;
          font-weight: 800;
          letter-spacing: -1px;
          background: linear-gradient(135deg, #4cc9f0 0%, #7209b7 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .brand-headline {
          font-size: 42px;
          font-weight: 700;
          line-height: 1.2;
          margin-bottom: 24px;
        }

        .brand-headline .highlight {
          color: #4cc9f0;
        }

        .brand-tagline {
          font-size: 18px;
          line-height: 1.6;
          color: rgba(255,255,255,0.8);
          margin-bottom: 48px;
          max-width: 500px;
        }

        .features-list {
          display: flex;
          flex-direction: column;
          gap: 24px;
          margin-bottom: 48px;
        }

        .feature-item {
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }

        .feature-icon {
          font-size: 28px;
          color: #4cc9f0;
          margin-top: 4px;
        }

        .feature-item strong {
          display: block;
          font-size: 16px;
          margin-bottom: 4px;
        }

        .feature-item p {
          font-size: 14px;
          color: rgba(255,255,255,0.7);
          margin: 0;
        }

        .trust-badges {
          display: flex;
          gap: 16px;
          font-size: 14px;
          color: rgba(255,255,255,0.6);
        }

        .brand-footer {
          position: relative;
          z-index: 1;
        }

        .brand-footer p {
          font-size: 14px;
          color: rgba(255,255,255,0.5);
          margin: 0;
        }

        /* Login Section - Right Side */
        .login-section {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px;
          max-width: 600px;
        }

        .login-container {
          width: 100%;
          max-width: 420px;
        }

        .login-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .header-icon {
          font-size: 48px;
          color: #0d1b2a;
          margin-bottom: 16px;
        }

        .login-header h2 {
          font-size: 28px;
          font-weight: 700;
          color: #0d1b2a;
          margin: 0 0 8px 0;
        }

        .login-header p {
          font-size: 16px;
          color: #64748b;
          margin: 0;
        }

        .login-form .ant-form-item-label > label {
          font-weight: 600;
          color: #334155;
        }

        .login-form .ant-input-affix-wrapper {
          border-radius: 8px;
          border: 2px solid #e2e8f0;
          transition: all 0.3s;
        }

        .login-form .ant-input-affix-wrapper:hover,
        .login-form .ant-input-affix-wrapper:focus,
        .login-form .ant-input-affix-wrapper-focused {
          border-color: #0d1b2a;
          box-shadow: 0 0 0 3px rgba(13,27,42,0.1);
        }

        .form-options {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .forgot-link {
          color: #0d1b2a;
          font-weight: 500;
        }

        .forgot-link:hover {
          color: #4cc9f0;
        }

        .login-button {
          height: 48px;
          font-size: 16px;
          font-weight: 600;
          background: linear-gradient(135deg, #0d1b2a 0%, #415a77 100%);
          border: none;
          border-radius: 8px;
        }

        .login-button:hover {
          background: linear-gradient(135deg, #415a77 0%, #0d1b2a 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(13,27,42,0.3);
        }

        /* Google Sign-In Styles */
        .google-signin-container {
          display: flex;
          justify-content: center;
          margin-bottom: 16px;
        }

        .google-signin-container > div {
          width: 100%;
          display: flex;
          justify-content: center;
        }

        .google-fallback-button {
          height: 48px;
          font-size: 15px;
          font-weight: 500;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .google-fallback-button:hover {
          border-color: #4cc9f0;
          color: #4cc9f0;
        }

        .ant-divider-inner-text {
          font-size: 13px;
          color: #94a3b8;
        }

        .divider {
          display: flex;
          align-items: center;
          margin: 32px 0;
          color: #94a3b8;
          font-size: 14px;
        }

        .divider::before,
        .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #e2e8f0;
        }

        .divider span {
          padding: 0 16px;
        }

        .apply-button {
          height: 48px;
          font-size: 16px;
          font-weight: 600;
          border: 2px solid #0d1b2a;
          color: #0d1b2a;
          border-radius: 8px;
        }

        .apply-button:hover {
          background: #4cc9f0;
          border-color: #4cc9f0;
          color: #0d1b2a;
        }

        .login-footer {
          text-align: center;
          margin-top: 32px;
        }

        .login-footer p {
          font-size: 13px;
          color: #94a3b8;
        }

        .login-footer a {
          color: #0d1b2a;
          font-weight: 500;
        }

        .login-footer a:hover {
          color: #4cc9f0;
        }

        /* Responsive - Tablet */
        @media (max-width: 1024px) {
          .driver-login-page {
            flex-direction: column;
          }

          .brand-section {
            padding: 32px;
            min-height: auto;
            position: relative;
            height: auto;
          }

          .brand-headline {
            font-size: 32px;
          }

          .features-list {
            display: none;
          }

          .trust-badges {
            margin-top: 24px;
          }

          .login-section {
            max-width: none;
            padding: 32px;
          }
        }

        /* Responsive - Mobile */
        @media (max-width: 768px) {
          .brand-section {
            padding: 24px;
          }

          .logo-container {
            margin-bottom: 24px;
          }

          .logo-icon {
            font-size: 32px;
          }

          .logo-text {
            font-size: 24px;
          }

          .brand-headline {
            font-size: 24px;
            margin-bottom: 16px;
          }

          .brand-tagline {
            font-size: 14px;
            margin-bottom: 24px;
          }

          .trust-badges {
            font-size: 12px;
            gap: 12px;
          }

          .brand-footer {
            display: none;
          }

          .login-section {
            padding: 24px 16px;
          }

          .login-container {
            max-width: 100%;
          }

          .login-header {
            margin-bottom: 28px;
          }

          .header-icon {
            font-size: 40px;
            margin-bottom: 12px;
          }

          .login-header h2 {
            font-size: 22px;
          }

          .login-header p {
            font-size: 14px;
          }

          .login-form .ant-input-affix-wrapper {
            height: 48px;
          }

          .form-options {
            flex-direction: column;
            gap: 12px;
            align-items: flex-start;
          }

          .login-button {
            height: 52px;
            font-size: 15px;
          }

          .divider {
            margin: 24px 0;
          }

          .apply-button {
            height: 52px;
            font-size: 15px;
          }

          .login-footer {
            margin-top: 24px;
          }

          .login-footer p {
            font-size: 12px;
          }
        }

        /* Responsive - Small Mobile */
        @media (max-width: 375px) {
          .brand-section {
            padding: 20px 16px;
          }

          .brand-headline {
            font-size: 20px;
          }

          .login-section {
            padding: 20px 12px;
          }

          .login-header h2 {
            font-size: 20px;
          }
        }
      `}</style>
    </div>
  );
};

export default DriverLogin;
