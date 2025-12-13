import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Card, message, Steps, Space, Checkbox, Select } from 'antd';
import {
  CarOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  LockOutlined,
  IdcardOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  WalletOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  SafetyCertificateOutlined,
  ArrowRightOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { getApiUrl } from '../../api/api';

const { Option } = Select;

// Dollor.ai brand colors
const dollor = {
  primary: '#4cc9f0',
  secondary: '#7209b7',
  dark: '#0d1b2a',
  darkAlt: '#1b263b',
  accent: '#415a77',
  gold: '#ffd700',
  success: '#10b981',
  text: '#334155',
  textLight: '#64748b'
};

const DriverApplication: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const API_URL = getApiUrl();

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    vehicle_type: 'car',
    license_number: '',
    agree_terms: false
  });

  const steps = [
    { title: 'Personal', icon: <UserOutlined /> },
    { title: 'Account', icon: <MailOutlined /> },
    { title: 'Vehicle', icon: <CarOutlined /> },
    { title: 'Done', icon: <CheckCircleOutlined /> }
  ];

  const handleNext = async () => {
    try {
      await form.validateFields();
      const values = form.getFieldsValue();
      setFormData({ ...formData, ...values });
      setCurrentStep(currentStep + 1);
    } catch (error) {
      // Validation failed
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const values = form.getFieldsValue();
      const submitData = { ...formData, ...values };

      const response = await axios.post(`${API_URL}/api/auth/driver/register`, {
        email: submitData.email,
        password: submitData.password,
        first_name: submitData.first_name,
        last_name: submitData.last_name,
        phone: submitData.phone,
        vehicle_type: submitData.vehicle_type
      });

      message.success('Application submitted successfully!');

      localStorage.setItem('driver_token', response.data.access_token);
      localStorage.setItem('driver_id', response.data.driver_id);
      localStorage.setItem('driver_code', response.data.driver_code);

      setCurrentStep(3);
    } catch (error: any) {
      console.error('Registration error:', error);
      let errorMsg = 'Registration failed. Please try again.';
      const detail = error.response?.data?.detail;
      if (typeof detail === 'string') {
        errorMsg = detail;
      } else if (Array.isArray(detail) && detail.length > 0) {
        errorMsg = detail[0]?.msg || errorMsg;
      }
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Success Screen
  if (currentStep === 3) {
    return (
      <div className="success-page">
        <div className="success-container">
          <div className="success-icon-wrap">
            <CheckCircleOutlined className="success-check" />
          </div>
          <h1 className="success-title">Application Submitted!</h1>
          <p className="success-subtitle">
            Thank you for applying to become a Dollor.ai delivery partner
          </p>

          <div className="next-steps-card">
            <h3>What's Next?</h3>
            <div className="steps-list">
              <div className="step-item">
                <span className="step-num">1</span>
                <span>We'll review your application (24-48 hours)</span>
              </div>
              <div className="step-item">
                <span className="step-num">2</span>
                <span>Complete your background check</span>
              </div>
              <div className="step-item">
                <span className="step-num">3</span>
                <span>Upload required documents</span>
              </div>
              <div className="step-item">
                <span className="step-num">4</span>
                <span>Start accepting deliveries!</span>
              </div>
            </div>
          </div>

          <div className="success-actions">
            <Button
              type="primary"
              size="large"
              className="primary-btn"
              onClick={() => navigate('/driver/login')}
            >
              Go to Driver Login <ArrowRightOutlined />
            </Button>
            <Button size="large" onClick={() => navigate('/')}>
              Back to Home
            </Button>
          </div>
        </div>

        <style>{`
          .success-page {
            min-height: 100vh;
            background: linear-gradient(135deg, ${dollor.dark} 0%, ${dollor.darkAlt} 50%, ${dollor.accent} 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px 20px;
          }
          .success-container {
            max-width: 500px;
            width: 100%;
            text-align: center;
          }
          .success-icon-wrap {
            width: 100px;
            height: 100px;
            background: linear-gradient(135deg, ${dollor.primary} 0%, ${dollor.secondary} 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 32px;
          }
          .success-check {
            font-size: 48px;
            color: white;
          }
          .success-title {
            color: white;
            font-size: 36px;
            font-weight: 700;
            margin: 0 0 12px 0;
          }
          .success-subtitle {
            color: rgba(255,255,255,0.7);
            font-size: 18px;
            margin: 0 0 40px 0;
          }
          .next-steps-card {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 20px;
            padding: 32px;
            margin-bottom: 32px;
            text-align: left;
          }
          .next-steps-card h3 {
            color: white;
            font-size: 18px;
            margin: 0 0 24px 0;
            text-align: center;
          }
          .steps-list {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .step-item {
            display: flex;
            align-items: center;
            gap: 16px;
            color: rgba(255,255,255,0.8);
          }
          .step-num {
            width: 28px;
            height: 28px;
            background: ${dollor.primary};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: 14px;
            color: ${dollor.dark};
          }
          .success-actions {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .primary-btn {
            height: 50px;
            font-size: 16px;
            font-weight: 600;
            background: linear-gradient(135deg, ${dollor.primary} 0%, ${dollor.secondary} 100%) !important;
            border: none !important;
            border-radius: 12px;
          }
        `}</style>
      </div>
    );
  }

  // Main Application Form
  return (
    <div className="app-container">
      {/* Left Panel - Hero */}
      <div className="hero-panel">
        <div className="hero-content">
          <Link to="/" className="logo-link">
            <DollarOutlined className="logo-icon" />
            <span className="logo-text">Dollor.ai</span>
          </Link>

          <h1 className="hero-title">
            Drive Your Future with <span className="gradient-text">Dollor.ai</span>
          </h1>

          <p className="hero-subtitle">
            Be your own boss. Set your own schedule. Earn competitive pay with instant payouts.
          </p>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">$25/hr</div>
              <div className="stat-label">Avg. Earnings</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">100%</div>
              <div className="stat-label">Tips Kept</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">10K+</div>
              <div className="stat-label">Active Drivers</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">24hr</div>
              <div className="stat-label">Approval Time</div>
            </div>
          </div>

          <div className="features-list">
            {[
              { icon: <ClockCircleOutlined />, text: 'Flexible hours - work when you want' },
              { icon: <WalletOutlined />, text: 'Daily instant payouts available' },
              { icon: <EnvironmentOutlined />, text: 'AI-optimized routes for more earnings' },
              { icon: <SafetyCertificateOutlined />, text: 'Insurance coverage while delivering' },
            ].map((feature, i) => (
              <div key={i} className="feature-item">
                <div className="feature-icon">{feature.icon}</div>
                <span>{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="hero-footer">
          <div className="trust-badges">
            <SafetyCertificateOutlined />
            <span>Secure & Encrypted</span>
          </div>
          <div className="footer-links">
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/driver/login">Login</Link>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="form-panel">
        <div className="form-container">
          {/* Steps */}
          <div className="steps-header">
            {steps.map((step, i) => (
              <div
                key={i}
                className={`step-dot ${i === currentStep ? 'active' : ''} ${i < currentStep ? 'completed' : ''}`}
              >
                {i < currentStep ? <CheckCircleOutlined /> : step.icon}
                <span className="step-label">{step.title}</span>
              </div>
            ))}
          </div>

          {/* Form Card */}
          <Card className="form-card">
            <Form form={form} layout="vertical" initialValues={formData}>
              {currentStep === 0 && (
                <>
                  <h2 className="form-title">Personal Information</h2>
                  <p className="form-subtitle">Tell us about yourself</p>
                  <Form.Item
                    name="first_name"
                    rules={[{ required: true, message: 'First name is required' }]}
                  >
                    <Input prefix={<UserOutlined />} placeholder="First Name" size="large" />
                  </Form.Item>
                  <Form.Item
                    name="last_name"
                    rules={[{ required: true, message: 'Last name is required' }]}
                  >
                    <Input prefix={<UserOutlined />} placeholder="Last Name" size="large" />
                  </Form.Item>
                  <Form.Item
                    name="phone"
                    rules={[{ required: true, message: 'Phone number is required' }]}
                  >
                    <Input prefix={<PhoneOutlined />} placeholder="Phone Number" size="large" />
                  </Form.Item>
                </>
              )}

              {currentStep === 1 && (
                <>
                  <h2 className="form-title">Account Setup</h2>
                  <p className="form-subtitle">Create your driver account</p>
                  <Form.Item
                    name="email"
                    rules={[
                      { required: true, message: 'Email is required' },
                      { type: 'email', message: 'Please enter a valid email' }
                    ]}
                  >
                    <Input prefix={<MailOutlined />} placeholder="Email Address" size="large" />
                  </Form.Item>
                  <Form.Item
                    name="password"
                    rules={[
                      { required: true, message: 'Password is required' },
                      { min: 6, message: 'Password must be at least 6 characters' }
                    ]}
                  >
                    <Input.Password prefix={<LockOutlined />} placeholder="Create Password" size="large" />
                  </Form.Item>
                  <Form.Item
                    name="confirm_password"
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
                    <Input.Password prefix={<LockOutlined />} placeholder="Confirm Password" size="large" />
                  </Form.Item>
                </>
              )}

              {currentStep === 2 && (
                <>
                  <h2 className="form-title">Vehicle Information</h2>
                  <p className="form-subtitle">Tell us about your vehicle</p>
                  <Form.Item
                    name="vehicle_type"
                    rules={[{ required: true, message: 'Please select vehicle type' }]}
                    initialValue="car"
                  >
                    <Select size="large" placeholder="Select Vehicle Type">
                      <Option value="car">Car</Option>
                      <Option value="motorcycle">Motorcycle</Option>
                      <Option value="bicycle">Bicycle</Option>
                      <Option value="scooter">Scooter</Option>
                    </Select>
                  </Form.Item>
                  <Form.Item
                    name="license_number"
                    rules={[{ required: true, message: 'License number is required' }]}
                  >
                    <Input prefix={<IdcardOutlined />} placeholder="Driver's License Number" size="large" />
                  </Form.Item>
                  <Form.Item
                    name="agree_terms"
                    valuePropName="checked"
                    rules={[
                      {
                        validator: (_, value) =>
                          value ? Promise.resolve() : Promise.reject(new Error('You must agree to the terms')),
                      },
                    ]}
                  >
                    <Checkbox>
                      I agree to the <Link to="/terms">Terms of Service</Link> and <Link to="/privacy">Privacy Policy</Link>
                    </Checkbox>
                  </Form.Item>
                </>
              )}

              {/* Navigation */}
              <div className="form-nav">
                {currentStep > 0 && (
                  <button type="button" className="nav-btn back-btn" onClick={() => setCurrentStep(currentStep - 1)}>
                    <ArrowLeftOutlined /> Back
                  </button>
                )}
                <div style={{ flex: 1 }} />
                {currentStep < 2 ? (
                  <button type="button" className="nav-btn next-btn" onClick={handleNext}>
                    Continue <ArrowRightOutlined />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="nav-btn submit-btn"
                    onClick={handleSubmit}
                    disabled={loading}
                  >
                    {loading ? 'Submitting...' : 'Submit Application'}
                  </button>
                )}
              </div>
            </Form>
          </Card>

          <div className="back-home">
            <Link to="/">Back to Home</Link>
          </div>
        </div>
      </div>

      <style>{`
        * {
          box-sizing: border-box;
        }

        .app-container {
          min-height: 100vh;
          display: flex;
          background: #f8fafc;
        }

        /* Hero Panel */
        .hero-panel {
          width: 45%;
          min-height: 100vh;
          background: linear-gradient(135deg, ${dollor.dark} 0%, ${dollor.darkAlt} 50%, ${dollor.accent} 100%);
          padding: 48px;
          display: flex;
          flex-direction: column;
          position: sticky;
          top: 0;
          height: 100vh;
        }

        .hero-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .logo-link {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          margin-bottom: 16px;
        }

        .logo-icon {
          font-size: 36px;
          color: ${dollor.primary};
        }

        .logo-text {
          font-size: 28px;
          font-weight: 800;
          background: linear-gradient(135deg, ${dollor.primary} 0%, ${dollor.secondary} 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hero-title {
          font-size: 42px;
          font-weight: 800;
          color: white;
          line-height: 1.2;
          margin: 24px 0 16px 0;
        }

        .gradient-text {
          background: linear-gradient(135deg, ${dollor.primary} 0%, ${dollor.secondary} 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hero-subtitle {
          font-size: 18px;
          color: rgba(255,255,255,0.7);
          margin: 0 0 40px 0;
          line-height: 1.6;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-bottom: 40px;
        }

        .stat-card {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          padding: 20px;
          text-align: center;
        }

        .stat-value {
          font-size: 28px;
          font-weight: 700;
          color: ${dollor.primary};
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 13px;
          color: rgba(255,255,255,0.6);
          text-transform: uppercase;
        }

        .features-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .feature-item {
          display: flex;
          align-items: center;
          gap: 16px;
          color: rgba(255,255,255,0.8);
          font-size: 15px;
        }

        .feature-icon {
          width: 40px;
          height: 40px;
          background: rgba(76, 201, 240, 0.15);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${dollor.primary};
          font-size: 18px;
        }

        .hero-footer {
          padding-top: 32px;
          border-top: 1px solid rgba(255,255,255,0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .trust-badges {
          display: flex;
          align-items: center;
          gap: 8px;
          color: rgba(255,255,255,0.5);
          font-size: 14px;
        }

        .footer-links {
          display: flex;
          gap: 24px;
        }

        .footer-links a {
          color: rgba(255,255,255,0.5);
          text-decoration: none;
          font-size: 14px;
        }

        .footer-links a:hover {
          color: ${dollor.primary};
        }

        /* Form Panel */
        .form-panel {
          flex: 1;
          padding: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .form-container {
          width: 100%;
          max-width: 480px;
        }

        .steps-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 32px;
        }

        .step-dot {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          opacity: 0.4;
        }

        .step-dot.active, .step-dot.completed {
          opacity: 1;
        }

        .step-dot .anticon {
          width: 44px;
          height: 44px;
          background: #e2e8f0;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          color: #64748b;
        }

        .step-dot.active .anticon {
          background: linear-gradient(135deg, ${dollor.primary} 0%, ${dollor.secondary} 100%);
          color: white;
        }

        .step-dot.completed .anticon {
          background: ${dollor.success};
          color: white;
        }

        .step-label {
          font-size: 12px;
          color: #64748b;
          font-weight: 500;
        }

        .form-card {
          border-radius: 20px !important;
          box-shadow: 0 4px 24px rgba(0,0,0,0.08) !important;
          margin-bottom: 24px;
        }

        .form-title {
          font-size: 24px;
          font-weight: 700;
          color: ${dollor.dark};
          margin: 0 0 8px 0;
        }

        .form-subtitle {
          font-size: 14px;
          color: #64748b;
          margin: 0 0 24px 0;
        }

        .form-nav {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid #e2e8f0;
        }

        .nav-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 14px 28px;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.3s;
        }

        .back-btn {
          background: #f1f5f9;
          color: #475569;
        }

        .back-btn:hover {
          background: #e2e8f0;
        }

        .next-btn, .submit-btn {
          background: linear-gradient(135deg, ${dollor.primary} 0%, ${dollor.secondary} 100%);
          color: white;
        }

        .next-btn:hover, .submit-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(76, 201, 240, 0.4);
        }

        .submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .back-home {
          text-align: center;
        }

        .back-home a {
          color: #64748b;
          text-decoration: none;
        }

        .back-home a:hover {
          color: ${dollor.primary};
        }

        /* Ant Design Overrides */
        .ant-input, .ant-input-affix-wrapper, .ant-select-selector {
          border-radius: 12px !important;
          border: 2px solid #e2e8f0 !important;
          min-height: 48px !important;
        }

        .ant-input:focus, .ant-input-affix-wrapper:focus, .ant-input-affix-wrapper-focused,
        .ant-select-focused .ant-select-selector {
          border-color: ${dollor.primary} !important;
          box-shadow: 0 0 0 4px rgba(76, 201, 240, 0.15) !important;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .hero-panel {
            display: none;
          }

          .form-panel {
            padding: 24px;
          }
        }
      `}</style>
    </div>
  );
};

export default DriverApplication;
