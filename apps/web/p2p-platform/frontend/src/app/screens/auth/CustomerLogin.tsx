import React, { useState, useEffect, useCallback } from 'react';
import { Form, Input, Button, message, Checkbox, Tabs, Divider } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, PhoneOutlined, CarOutlined, DollarOutlined, SafetyOutlined, RocketOutlined, HeartOutlined, GoogleOutlined } from '@ant-design/icons';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { getApiUrl } from '../../api/api';
import { BrandColors } from '../../theme/colors';

const { TabPane } = Tabs;

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

const CustomerLogin: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const navigate = useNavigate();
  const API_URL = getApiUrl();

  // Handle Google Sign-In callback
  const handleGoogleCallback = useCallback(async (response: { credential: string }) => {
    setGoogleLoading(true);
    try {
      const result = await axios.post(`${API_URL}/api/auth/customer/google`, {
        id_token: response.credential,
      });

      // Store customer credentials
      localStorage.setItem('customer_token', result.data.access_token);
      localStorage.setItem('customer_id', result.data.customer_id);
      localStorage.setItem('customer_name', result.data.name);
      localStorage.setItem('customer_email', result.data.email);
      localStorage.setItem('customer_phone', result.data.phone || '');

      message.success('Welcome! Signed in with Google');
      navigate('/ride');
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      const detail = error.response?.data?.detail;
      const errorMsg = typeof detail === 'string' ? detail : 'Google sign-in failed. Please try again.';
      message.error(errorMsg);
    } finally {
      setGoogleLoading(false);
    }
  }, [API_URL, navigate]);

  // Initialize Google Sign-In
  useEffect(() => {
    // Load Google Sign-In script
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

      // Render button in login tab
      const loginButtonContainer = document.getElementById('google-signin-button-login');
      if (loginButtonContainer) {
        window.google.accounts.id.renderButton(loginButtonContainer, {
          theme: 'outline',
          size: 'large',
          width: 350,
          text: 'signin_with',
          shape: 'rectangular',
        });
      }

      // Render button in register tab
      const registerButtonContainer = document.getElementById('google-signin-button-register');
      if (registerButtonContainer) {
        window.google.accounts.id.renderButton(registerButtonContainer, {
          theme: 'outline',
          size: 'large',
          width: 350,
          text: 'signup_with',
          shape: 'rectangular',
        });
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      if (window.google) {
        initializeGoogleSignIn();
      } else {
        loadGoogleScript();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [handleGoogleCallback, activeTab]);

  // Custom Google button for fallback when SDK not loaded
  const handleCustomGoogleSignIn = () => {
    if (window.google) {
      window.google.accounts.id.prompt();
    } else {
      message.warning('Google Sign-In is loading. Please try again in a moment.');
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
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      // Store customer credentials
      localStorage.setItem('customer_token', response.data.access_token);
      localStorage.setItem('customer_id', response.data.customer_id);
      localStorage.setItem('customer_name', response.data.name);
      localStorage.setItem('customer_email', response.data.email);
      localStorage.setItem('customer_phone', response.data.phone || '');

      message.success('Welcome back! Redirecting...');
      navigate('/ride');
    } catch (error: any) {
      console.error('Login error:', error);
      const getErrorMsg = (defaultMsg: string) => {
        const detail = error.response?.data?.detail;
        if (typeof detail === 'string') return detail;
        if (Array.isArray(detail) && detail.length > 0) return detail[0]?.msg || defaultMsg;
        return defaultMsg;
      };
      message.error(getErrorMsg('Login failed. Please check your credentials.'));
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

      // Store customer credentials
      localStorage.setItem('customer_token', response.data.access_token);
      localStorage.setItem('customer_id', response.data.customer_id);
      localStorage.setItem('customer_name', response.data.name);
      localStorage.setItem('customer_email', response.data.email);
      localStorage.setItem('customer_phone', response.data.phone || '');

      message.success('Account created! Welcome to Dollor.ai!');
      navigate('/ride');
    } catch (error: any) {
      console.error('Registration error:', error);
      const getErrorMsg = (defaultMsg: string) => {
        const detail = error.response?.data?.detail;
        if (typeof detail === 'string') return detail;
        if (Array.isArray(detail) && detail.length > 0) return detail[0]?.msg || defaultMsg;
        return defaultMsg;
      };
      message.error(getErrorMsg('Registration failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="customer-login-page">
      {/* Left Side - Branding */}
      <div className="brand-section">
        <div className="brand-content">
          <div className="logo-container">
            <DollarOutlined className="logo-icon" />
            <span className="logo-text">Dollor.ai</span>
          </div>

          <h1 className="brand-headline">
            Your Ride.<br />
            <span className="highlight">Your Price. $1 Fee.</span>
          </h1>

          <p className="brand-tagline">
            The world's first $1 rideshare matchmaking platform. We show you the price,
            you confirm, we charge just $1. Transparent. Simple. Fair.
          </p>

          <div className="features-list">
            <div className="feature-item">
              <DollarOutlined className="feature-icon" />
              <div>
                <strong>$1 Flat Platform Fee</strong>
                <p>No surge pricing tricks. Just $1 to us, rest to driver.</p>
              </div>
            </div>
            <div className="feature-item">
              <SafetyOutlined className="feature-icon" />
              <div>
                <strong>Verified Drivers</strong>
                <p>Background-checked drivers you can trust</p>
              </div>
            </div>
            <div className="feature-item">
              <HeartOutlined className="feature-icon" />
              <div>
                <strong>100% Tips to Drivers</strong>
                <p>Your tip goes directly to your driver</p>
              </div>
            </div>
            <div className="feature-item">
              <RocketOutlined className="feature-icon" />
              <div>
                <strong>Fast Matching</strong>
                <p>Get matched with nearby drivers instantly</p>
              </div>
            </div>
          </div>

          <div className="trust-badges">
            <span>50,000+ Happy Riders</span>
            <span>|</span>
            <span>4.9 Average Rating</span>
            <span>|</span>
            <span>$1M+ Saved vs. Competitors</span>
          </div>
        </div>

        <div className="brand-footer">
          <p>2024 Dollor.ai Matchmaking, Inc. Not a transportation company.</p>
        </div>
      </div>

      {/* Right Side - Login/Register Form */}
      <div className="login-section">
        <div className="login-container">
          <div className="login-header">
            <CarOutlined className="header-icon" />
            <h2>Ride Portal</h2>
            <p>Request a ride in seconds</p>
          </div>

          <Tabs activeKey={activeTab} onChange={setActiveTab} centered>
            <TabPane tab="Sign In" key="login">
              <Form
                name="customer_login"
                onFinish={onLogin}
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
                    prefix={<MailOutlined />}
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
                    placeholder="Enter password"
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
                    Sign In & Book a Ride
                  </Button>
                </Form.Item>

                <Divider plain>or continue with</Divider>

                {/* Google Sign-In Button Container */}
                <div className="google-signin-container">
                  <div id="google-signin-button-login"></div>
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
            </TabPane>

            <TabPane tab="Create Account" key="register">
              <Form
                name="customer_register"
                onFinish={onRegister}
                autoComplete="off"
                layout="vertical"
                className="login-form"
              >
                <Form.Item
                  name="name"
                  label="Full Name"
                  rules={[{ required: true, message: 'Please enter your name' }]}
                >
                  <Input
                    prefix={<UserOutlined />}
                    placeholder="John Doe"
                    size="large"
                  />
                </Form.Item>

                <Form.Item
                  name="email"
                  label="Email Address"
                  rules={[
                    { required: true, message: 'Please enter your email' },
                    { type: 'email', message: 'Please enter a valid email' }
                  ]}
                >
                  <Input
                    prefix={<MailOutlined />}
                    placeholder="your@email.com"
                    size="large"
                  />
                </Form.Item>

                <Form.Item
                  name="phone"
                  label="Phone Number"
                  rules={[{ required: true, message: 'Please enter your phone number' }]}
                >
                  <Input
                    prefix={<PhoneOutlined />}
                    placeholder="+1 (555) 123-4567"
                    size="large"
                  />
                </Form.Item>

                <Form.Item
                  name="password"
                  label="Password"
                  rules={[
                    { required: true, message: 'Please create a password' },
                    { min: 8, message: 'Password must be at least 8 characters' }
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined />}
                    placeholder="Create a strong password"
                    size="large"
                  />
                </Form.Item>

                <Form.Item
                  name="confirmPassword"
                  label="Confirm Password"
                  dependencies={['password']}
                  rules={[
                    { required: true, message: 'Please confirm your password' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('password') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error('Passwords do not match'));
                      },
                    }),
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined />}
                    placeholder="Confirm password"
                    size="large"
                  />
                </Form.Item>

                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    size="large"
                    block
                    className="login-button"
                  >
                    Create Account
                  </Button>
                </Form.Item>

                <Divider plain>or sign up with</Divider>

                {/* Google Sign-In Button Container */}
                <div className="google-signin-container">
                  <div id="google-signin-button-register"></div>
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
                      Sign up with Google
                    </Button>
                  )}
                </div>
              </Form>
            </TabPane>
          </Tabs>

          <div className="pricing-highlight">
            <DollarOutlined style={{ fontSize: 24, color: '#52c41a' }} />
            <div>
              <strong>Transparent Pricing</strong>
              <p>$1 platform fee + driver fare = Total price. No hidden charges.</p>
            </div>
          </div>

          <div className="login-footer">
            <p>
              By continuing, you agree to our{' '}
              <Link to="/terms">Terms of Service</Link> and{' '}
              <Link to="/privacy">Privacy Policy</Link>
            </p>
            <div className="driver-link">
              <span>Want to drive and earn?</span>
              <Link to="/driver/login">Join as Driver</Link>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .customer-login-page {
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
          background: radial-gradient(circle, rgba(6,193,103,0.15) 0%, transparent 70%);
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
          color: #06C167;
        }

        .logo-text {
          font-size: 32px;
          font-weight: 800;
          letter-spacing: -1px;
          background: linear-gradient(135deg, #06C167 0%, #4ADE80 100%);
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
          color: #06C167;
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
          color: #06C167;
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
          max-width: 450px;
        }

        .login-header {
          text-align: center;
          margin-bottom: 32px;
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
          border-color: #06C167;
          box-shadow: 0 0 0 3px rgba(6,193,103,0.1);
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
          color: #06C167;
        }

        .login-button {
          height: 48px;
          font-size: 16px;
          font-weight: 600;
          background: linear-gradient(135deg, #06C167 0%, #4ADE80 100%);
          border: none;
          border-radius: 8px;
        }

        .login-button:hover {
          background: linear-gradient(135deg, #4ADE80 0%, #06C167 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(6,193,103,0.4);
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
          border-color: #06C167;
          color: #06C167;
        }

        .ant-divider-inner-text {
          font-size: 13px;
          color: #94a3b8;
        }

        .pricing-highlight {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 8px;
          margin: 24px 0;
        }

        .pricing-highlight strong {
          display: block;
          color: #166534;
          font-size: 14px;
        }

        .pricing-highlight p {
          margin: 0;
          font-size: 12px;
          color: #15803d;
        }

        .login-footer {
          text-align: center;
          margin-top: 24px;
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
          color: #06C167;
        }

        .driver-link {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: center;
          gap: 8px;
          font-size: 14px;
        }

        .driver-link span {
          color: #64748b;
        }

        .driver-link a {
          color: #06C167;
          font-weight: 600;
        }

        /* Tabs styling */
        .ant-tabs-nav-list {
          width: 100%;
        }

        .ant-tabs-tab {
          flex: 1;
          justify-content: center;
          font-weight: 600;
        }

        .ant-tabs-tab-active {
          color: #06C167 !important;
        }

        .ant-tabs-ink-bar {
          background: #06C167 !important;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .customer-login-page {
            flex-direction: column;
          }

          .brand-section {
            padding: 32px;
            min-height: auto;
          }

          .brand-headline {
            font-size: 32px;
          }

          .features-list {
            display: none;
          }

          .login-section {
            max-width: none;
            padding: 32px;
          }
        }

        @media (max-width: 768px) {
          .brand-section {
            padding: 24px;
          }

          .brand-headline {
            font-size: 24px;
          }

          .brand-tagline {
            font-size: 14px;
          }

          .trust-badges {
            font-size: 12px;
            flex-wrap: wrap;
          }

          .login-section {
            padding: 24px 16px;
          }

          .login-header h2 {
            font-size: 22px;
          }
        }
      `}</style>
    </div>
  );
};

export default CustomerLogin;
