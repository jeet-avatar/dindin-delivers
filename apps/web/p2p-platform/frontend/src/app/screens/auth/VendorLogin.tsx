import React, { useState, useEffect, useCallback } from 'react';
import { Form, Input, Button, message, Checkbox, Divider } from 'antd';
import { UserOutlined, LockOutlined, ShopOutlined, RocketOutlined, DollarOutlined, SafetyCertificateOutlined, CustomerServiceOutlined, GoogleOutlined } from '@ant-design/icons';
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

const VendorLogin: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const API_URL = getApiUrl();

  // Google OAuth callback handler
  const handleGoogleCallback = useCallback(async (response: { credential: string }) => {
    setGoogleLoading(true);
    try {
      const result = await axios.post(`${API_URL}/api/auth/vendor/google-auth`, {
        id_token: response.credential,
      });

      localStorage.setItem('access_token', result.data.access_token);
      localStorage.setItem('user', JSON.stringify(result.data.user));

      message.success('Welcome! Redirecting to your dashboard...');
      navigate('/vendor/dashboard');
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      const detail = error.response?.data?.detail;
      if (error.response?.status === 403) {
        message.error(typeof detail === 'string' ? detail : 'Your vendor account is pending approval');
      } else if (error.response?.status === 404) {
        message.info('No account found. Please apply as a restaurant partner first.');
        navigate('/restaurant/apply');
      } else {
        message.error(typeof detail === 'string' ? detail : 'Google sign-in failed. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  }, [API_URL, navigate]);

  // Initialize Google Sign-In
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      console.warn('Google Client ID not configured');
      return;
    }

    // Load Google Sign-In script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCallback,
        });
        window.google.accounts.id.renderButton(
          document.getElementById('vendor-google-signin-button'),
          {
            theme: 'outline',
            size: 'large',
            width: 380,
            text: 'signin_with',
            shape: 'rectangular',
          }
        );
      }
    };
    document.body.appendChild(script);

    return () => {
      const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, [handleGoogleCallback]);

  // Fallback Google sign-in handler
  const handleCustomGoogleSignIn = () => {
    if (window.google) {
      window.google.accounts.id.prompt();
    } else {
      message.error('Google Sign-In not available. Please try again later.');
    }
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append('username', values.email);
      formData.append('password', values.password);

      const response = await axios.post(
        `${API_URL}/api/auth/vendor/login`,
        formData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      message.success('Welcome back! Redirecting to your dashboard...');
      navigate('/vendor/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      const getErrorMsg = (defaultMsg: string) => {
        const detail = error.response?.data?.detail;
        if (typeof detail === 'string') return detail;
        if (Array.isArray(detail) && detail.length > 0) return detail[0]?.msg || defaultMsg;
        return defaultMsg;
      };
      if (error.response?.status === 403) {
        message.error(getErrorMsg('Your vendor account is pending approval'));
      } else {
        message.error(getErrorMsg('Login failed. Please check your credentials.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="vendor-login-page">
      {/* Left Side - Branding */}
      <div className="brand-section">
        <div className="brand-content">
          <div className="logo-container">
            <DollarOutlined className="logo-icon" />
            <span className="logo-text">Dollor.AI</span>
          </div>

          <h1 className="brand-headline">
            Empower Your Restaurant.<br />
            <span className="highlight">Maximize Your Revenue.</span>
          </h1>

          <p className="brand-tagline">
            Join thousands of restaurants using AI-powered insights to grow their business,
            reduce costs, and deliver exceptional customer experiences.
          </p>

          <div className="features-list">
            <div className="feature-item">
              <RocketOutlined className="feature-icon" />
              <div>
                <strong>Smart Analytics</strong>
                <p>AI-powered insights to optimize your menu and pricing</p>
              </div>
            </div>
            <div className="feature-item">
              <SafetyCertificateOutlined className="feature-icon" />
              <div>
                <strong>Zero Commission*</strong>
                <p>Keep more of what you earn with transparent pricing</p>
              </div>
            </div>
            <div className="feature-item">
              <CustomerServiceOutlined className="feature-icon" />
              <div>
                <strong>24/7 Support</strong>
                <p>Dedicated partner success team at your service</p>
              </div>
            </div>
          </div>

          <div className="trust-badges">
            <span>Trusted by 5,000+ restaurants</span>
            <span>•</span>
            <span>$50M+ in partner revenue</span>
          </div>
        </div>

        <div className="brand-footer">
          <p>© 2024 Dollor.AI — Empowering Local Businesses</p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="login-section">
        <div className="login-container">
          <div className="login-header">
            <ShopOutlined className="header-icon" />
            <h2>Restaurant Partner Portal</h2>
            <p>Sign in to manage your restaurant and orders</p>
          </div>

          <Form
            name="vendor_login"
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
                placeholder="your@restaurant.com"
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
              <Link to="/forgot-password?return=/vendor/login" className="forgot-link">Forgot password?</Link>
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
          </Form>

          <Divider>Or continue with</Divider>

          <div className="google-signin-container">
            <div id="vendor-google-signin-button"></div>
            {!GOOGLE_CLIENT_ID && (
              <Button
                size="large"
                block
                icon={<GoogleOutlined />}
                onClick={handleCustomGoogleSignIn}
                loading={googleLoading}
                className="google-fallback-button"
              >
                Sign in with Google
              </Button>
            )}
          </div>

          <div className="divider">
            <span>New to Dollor.ai?</span>
          </div>

          <Button
            size="large"
            block
            onClick={() => navigate('/restaurant/apply')}
            className="apply-button"
          >
            Apply as Restaurant Partner
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
        .vendor-login-page {
          min-height: 100vh;
          display: flex;
          background: #f8fafc;
        }

        /* Brand Section - Left Side */
        .brand-section {
          flex: 1;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
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
          background: radial-gradient(circle, rgba(255,215,0,0.1) 0%, transparent 70%);
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
          color: #ffd700;
        }

        .logo-text {
          font-size: 32px;
          font-weight: 800;
          letter-spacing: -1px;
          background: linear-gradient(135deg, #ffd700 0%, #ffed4a 100%);
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
          color: #ffd700;
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
          color: #ffd700;
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
          color: #1a1a2e;
          margin-bottom: 16px;
        }

        .login-header h2 {
          font-size: 28px;
          font-weight: 700;
          color: #1a1a2e;
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
          border-color: #1a1a2e;
          box-shadow: 0 0 0 3px rgba(26,26,46,0.1);
        }

        .form-options {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .forgot-link {
          color: #1a1a2e;
          font-weight: 500;
        }

        .forgot-link:hover {
          color: #ffd700;
        }

        .login-button {
          height: 48px;
          font-size: 16px;
          font-weight: 600;
          background: linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%);
          border: none;
          border-radius: 8px;
        }

        .login-button:hover {
          background: linear-gradient(135deg, #0f3460 0%, #1a1a2e 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(26,26,46,0.3);
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
          border: 2px solid #1a1a2e;
          color: #1a1a2e;
          border-radius: 8px;
        }

        .apply-button:hover {
          background: #ffd700;
          border-color: #ffd700;
          color: #1a1a2e;
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
          color: #1a1a2e;
          font-weight: 500;
        }

        .login-footer a:hover {
          color: #ffd700;
        }

        .google-signin-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 16px;
        }

        .google-signin-container > div {
          width: 100%;
          display: flex;
          justify-content: center;
        }

        .google-fallback-button {
          height: 48px;
          font-size: 16px;
          font-weight: 500;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .google-fallback-button:hover {
          border-color: #1a1a2e;
          background: #f8fafc;
        }

        .google-fallback-button .anticon {
          font-size: 20px;
          color: #4285f4;
        }

        /* Responsive - Tablet */
        @media (max-width: 1024px) {
          .vendor-login-page {
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

export default VendorLogin;
