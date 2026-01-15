import React, { useState } from 'react';
import { Form, Input, Button, message, Steps } from 'antd';
import { MailOutlined, LockOutlined, SafetyOutlined, DollarOutlined, ArrowLeftOutlined, CheckCircleOutlined } from '@ant-design/icons';
import axios from 'axios';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { getApiUrl } from '../../api/api';

const { Step } = Steps;

const ForgotPassword: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [email, setEmail] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const API_URL = getApiUrl();

  // Get return URL from query params (e.g., /vendor/login for vendors)
  const returnUrl = searchParams.get('return') || '/customer/login';

  // Step 1: Request password reset
  const onRequestReset = async (values: { email: string }) => {
    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/customer/password-reset/request`, {
        email: values.email,
      });

      setEmail(values.email);
      message.success('Verification code sent to your email!');
      setCurrentStep(1);
    } catch (error: any) {
      console.error('Reset request error:', error);
      const detail = error.response?.data?.detail;
      const errorMsg = typeof detail === 'string' ? detail : 'Failed to send reset code. Please try again.';
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Reset password with code (matches iOS and Android flow)
  // Uses /api/customer/password-reset/confirm which verifies code AND resets password in one step
  const onResetPassword = async (values: { code: string; password: string; confirmPassword: string }) => {
    if (values.password !== values.confirmPassword) {
      message.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/customer/password-reset/confirm`, {
        email: email,
        code: values.code,
        new_password: values.password,
      });

      message.success('Password reset successfully! Please sign in with your new password.');
      navigate(returnUrl);
    } catch (error: any) {
      console.error('Reset error:', error);
      const detail = error.response?.data?.detail;
      const errorMsg = typeof detail === 'string' ? detail : 'Invalid code or failed to reset password. Please try again.';
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Form
            name="request_reset"
            onFinish={onRequestReset}
            autoComplete="off"
            layout="vertical"
            className="reset-form"
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

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                size="large"
                block
                className="submit-button"
              >
                Send Reset Code
              </Button>
            </Form.Item>
          </Form>
        );

      case 1:
        // Step 2: Enter code + new password together (matches iOS and Android flow)
        return (
          <Form
            name="reset_password"
            onFinish={onResetPassword}
            autoComplete="off"
            layout="vertical"
            className="reset-form"
          >
            <div className="email-sent-notice">
              <MailOutlined style={{ fontSize: 24, color: '#52c41a' }} />
              <p>We sent a verification code to <strong>{email}</strong></p>
            </div>

            <Form.Item
              name="code"
              label="Verification Code"
              rules={[
                { required: true, message: 'Please enter the verification code' },
                { len: 6, message: 'Code must be 6 digits' }
              ]}
            >
              <Input
                prefix={<SafetyOutlined />}
                placeholder="Enter 6-digit code"
                size="large"
                maxLength={6}
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="New Password"
              rules={[
                { required: true, message: 'Please enter your new password' },
                { min: 8, message: 'Password must be at least 8 characters' }
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Enter new password"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label="Confirm New Password"
              dependencies={['password']}
              rules={[
                { required: true, message: 'Please confirm your new password' },
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
                placeholder="Confirm new password"
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
                className="submit-button"
              >
                Reset Password
              </Button>
            </Form.Item>

            <div className="resend-link">
              <Button type="link" onClick={() => setCurrentStep(0)}>
                Didn't receive the code? Try again
              </Button>
            </div>
          </Form>
        );

      default:
        return null;
    }
  };

  return (
    <div className="forgot-password-page">
      {/* Left Side - Branding */}
      <div className="brand-section">
        <div className="brand-content">
          <div className="logo-container">
            <DollarOutlined className="logo-icon" />
            <span className="logo-text">Dollor.AI</span>
          </div>

          <h1 className="brand-headline">
            Reset Your<br />
            <span className="highlight">Password</span>
          </h1>

          <p className="brand-tagline">
            Don't worry! It happens to the best of us. Enter your email and we'll
            send you a code to reset your password.
          </p>

          <div className="security-notice">
            <SafetyOutlined style={{ fontSize: 32, color: '#52c41a' }} />
            <div>
              <strong>Secure Reset Process</strong>
              <p>Your password reset code expires in 10 minutes for security.</p>
            </div>
          </div>
        </div>

        <div className="brand-footer">
          <p>© 2024 Dollor.AI Matchmaking, Inc.</p>
        </div>
      </div>

      {/* Right Side - Reset Form */}
      <div className="form-section">
        <div className="form-container">
          <Link to={returnUrl} className="back-link">
            <ArrowLeftOutlined /> Back to Sign In
          </Link>

          <div className="form-header">
            <h2>Reset Password</h2>
            <p>Follow the steps below to reset your password</p>
          </div>

          <Steps current={currentStep} size="small" className="reset-steps">
            <Step title="Email" icon={currentStep > 0 ? <CheckCircleOutlined /> : undefined} />
            <Step title="Reset" />
          </Steps>

          {renderStepContent()}

          <div className="form-footer">
            <p>
              Remember your password?{' '}
              <Link to={returnUrl}>Sign In</Link>
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .forgot-password-page {
          min-height: 100vh;
          display: flex;
          background: #f8fafc;
        }

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
          background: radial-gradient(circle, rgba(82,196,26,0.15) 0%, transparent 70%);
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
          color: #52c41a;
        }

        .logo-text {
          font-size: 32px;
          font-weight: 800;
          letter-spacing: -1px;
          background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%);
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
          color: #52c41a;
        }

        .brand-tagline {
          font-size: 18px;
          line-height: 1.6;
          color: rgba(255,255,255,0.8);
          margin-bottom: 48px;
          max-width: 500px;
        }

        .security-notice {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 20px;
          background: rgba(255,255,255,0.1);
          border-radius: 12px;
          max-width: 400px;
        }

        .security-notice strong {
          display: block;
          font-size: 16px;
          margin-bottom: 4px;
        }

        .security-notice p {
          font-size: 14px;
          color: rgba(255,255,255,0.7);
          margin: 0;
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

        .form-section {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px;
          max-width: 600px;
        }

        .form-container {
          width: 100%;
          max-width: 450px;
        }

        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #64748b;
          font-size: 14px;
          margin-bottom: 32px;
          transition: color 0.3s;
        }

        .back-link:hover {
          color: #52c41a;
        }

        .form-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .form-header h2 {
          font-size: 28px;
          font-weight: 700;
          color: #1a1a2e;
          margin: 0 0 8px 0;
        }

        .form-header p {
          font-size: 16px;
          color: #64748b;
          margin: 0;
        }

        .reset-steps {
          margin-bottom: 32px;
        }

        .reset-steps .ant-steps-item-finish .ant-steps-item-icon {
          background: #52c41a;
          border-color: #52c41a;
        }

        .reset-steps .ant-steps-item-process .ant-steps-item-icon {
          background: #52c41a;
          border-color: #52c41a;
        }

        .reset-form .ant-form-item-label > label {
          font-weight: 600;
          color: #334155;
        }

        .reset-form .ant-input-affix-wrapper {
          border-radius: 8px;
          border: 2px solid #e2e8f0;
          transition: all 0.3s;
        }

        .reset-form .ant-input-affix-wrapper:hover,
        .reset-form .ant-input-affix-wrapper:focus,
        .reset-form .ant-input-affix-wrapper-focused {
          border-color: #52c41a;
          box-shadow: 0 0 0 3px rgba(82,196,26,0.1);
        }

        .submit-button {
          height: 48px;
          font-size: 16px;
          font-weight: 600;
          background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%);
          border: none;
          border-radius: 8px;
        }

        .submit-button:hover {
          background: linear-gradient(135deg, #73d13d 0%, #52c41a 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(82,196,26,0.4);
        }

        .email-sent-notice {
          text-align: center;
          padding: 20px;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 8px;
          margin-bottom: 24px;
        }

        .email-sent-notice p {
          margin: 8px 0 0 0;
          color: #166534;
        }

        .resend-link {
          text-align: center;
          margin-top: 16px;
        }

        .resend-link .ant-btn-link {
          color: #64748b;
        }

        .resend-link .ant-btn-link:hover {
          color: #52c41a;
        }

        .form-footer {
          text-align: center;
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid #e2e8f0;
        }

        .form-footer p {
          font-size: 14px;
          color: #64748b;
          margin: 0;
        }

        .form-footer a {
          color: #52c41a;
          font-weight: 600;
        }

        .form-footer a:hover {
          color: #73d13d;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .forgot-password-page {
            flex-direction: column;
          }

          .brand-section {
            padding: 32px;
            min-height: auto;
          }

          .brand-headline {
            font-size: 32px;
          }

          .security-notice {
            display: none;
          }

          .form-section {
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

          .form-section {
            padding: 24px 16px;
          }

          .form-header h2 {
            font-size: 22px;
          }
        }
      `}</style>
    </div>
  );
};

export default ForgotPassword;
