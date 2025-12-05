import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, message, Steps, Space, Checkbox, Select } from 'antd';
import {
  CarOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  LockOutlined,
  IdcardOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { getApiUrl } from '../../api/api';
import { Logo } from '../../components/brand/Logo';
import brand from '../../config/brand';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

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
    { title: 'Personal Info', icon: <UserOutlined /> },
    { title: 'Account Setup', icon: <MailOutlined /> },
    { title: 'Vehicle Details', icon: <CarOutlined /> },
    { title: 'Confirmation', icon: <CheckCircleOutlined /> }
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

      // Auto-login after registration
      localStorage.setItem('driver_token', response.data.access_token);
      localStorage.setItem('driver_id', response.data.driver_id);
      localStorage.setItem('driver_code', response.data.driver_code);

      setCurrentStep(3); // Show confirmation step
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

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <>
            <Title level={4} className="step-title">Personal Information</Title>
            <Paragraph type="secondary">Tell us about yourself</Paragraph>
            <Form.Item
              name="first_name"
              rules={[{ required: true, message: 'First name is required' }]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="First Name"
                size="large"
              />
            </Form.Item>
            <Form.Item
              name="last_name"
              rules={[{ required: true, message: 'Last name is required' }]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Last Name"
                size="large"
              />
            </Form.Item>
            <Form.Item
              name="phone"
              rules={[{ required: true, message: 'Phone number is required' }]}
            >
              <Input
                prefix={<PhoneOutlined />}
                placeholder="Phone Number"
                size="large"
              />
            </Form.Item>
          </>
        );

      case 1:
        return (
          <>
            <Title level={4} className="step-title">Account Setup</Title>
            <Paragraph type="secondary">Create your driver account</Paragraph>
            <Form.Item
              name="email"
              rules={[
                { required: true, message: 'Email is required' },
                { type: 'email', message: 'Please enter a valid email' }
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder="Email Address"
                size="large"
              />
            </Form.Item>
            <Form.Item
              name="password"
              rules={[
                { required: true, message: 'Password is required' },
                { min: 6, message: 'Password must be at least 6 characters' }
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Create Password"
                size="large"
              />
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
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Confirm Password"
                size="large"
              />
            </Form.Item>
          </>
        );

      case 2:
        return (
          <>
            <Title level={4} className="step-title">Vehicle Information</Title>
            <Paragraph type="secondary">Tell us about your vehicle</Paragraph>
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
              <Input
                prefix={<IdcardOutlined />}
                placeholder="Driver's License Number"
                size="large"
              />
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
                I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>
              </Checkbox>
            </Form.Item>
          </>
        );

      case 3:
        return (
          <div className="success-content">
            <div className="success-icon">
              <CheckCircleOutlined />
            </div>
            <Title level={3}>Application Submitted!</Title>
            <Paragraph className="success-description">
              Thank you for applying to become a {brand.name} delivery partner. Your account is pending approval.
            </Paragraph>
            <Card className="next-steps-card">
              <Title level={5}>What's Next?</Title>
              <ol className="next-steps-list">
                <li>We'll review your application (usually within 24-48 hours)</li>
                <li>Complete your background check</li>
                <li>Upload required documents in the driver portal</li>
                <li>Start accepting deliveries and earning!</li>
              </ol>
            </Card>
            <Space>
              <Button
                type="primary"
                size="large"
                onClick={() => navigate('/driver/login')}
                className="primary-button"
              >
                Go to Driver Login
              </Button>
              <Button size="large" onClick={() => navigate('/')}>
                Back to Home
              </Button>
            </Space>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="driver-application">
      <div className="application-container">
        {/* Header */}
        <div className="application-header">
          <Logo variant="icon" size="lg" theme="dark" />
          <Title level={2} className="header-title">
            Become a Delivery Partner
          </Title>
          <Text className="header-subtitle">
            Join {brand.name} and start earning today
          </Text>
        </div>

        {/* Progress Steps */}
        {currentStep < 3 && (
          <Steps
            current={currentStep}
            items={steps}
            className="driver-steps"
            size="small"
          />
        )}

        {/* Form Card */}
        <Card className="form-card">
          <Form
            form={form}
            layout="vertical"
            initialValues={formData}
          >
            {renderStepContent()}

            {currentStep < 3 && (
              <div className="form-actions">
                {currentStep > 0 && (
                  <Button size="large" onClick={() => setCurrentStep(currentStep - 1)} className="back-button">
                    Back
                  </Button>
                )}
                {currentStep < 2 ? (
                  <Button type="primary" size="large" onClick={handleNext} className="continue-button">
                    Continue
                  </Button>
                ) : (
                  <Button
                    type="primary"
                    size="large"
                    loading={loading}
                    onClick={handleSubmit}
                    className="submit-button"
                  >
                    Submit Application
                  </Button>
                )}
              </div>
            )}
          </Form>
        </Card>

        {/* Back Link */}
        {currentStep < 3 && (
          <div className="back-home">
            <Button type="link" onClick={() => navigate('/')}>
              Back to Home
            </Button>
          </div>
        )}
      </div>

      <style>{`
        .driver-application {
          min-height: 100vh;
          background: ${brand.gradients.secondary};
          padding: 40px 20px;
        }

        .application-container {
          max-width: 500px;
          margin: 0 auto;
        }

        .application-header {
          text-align: center;
          margin-bottom: 30px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .header-title {
          color: white !important;
          margin: 16px 0 4px 0 !important;
        }

        .header-subtitle {
          color: rgba(255,255,255,0.8) !important;
        }

        .driver-steps {
          margin-bottom: 30px;
        }

        .driver-steps .ant-steps-item-title {
          color: rgba(255,255,255,0.8) !important;
        }

        .driver-steps .ant-steps-item-active .ant-steps-item-title {
          color: white !important;
        }

        .form-card {
          border-radius: 16px !important;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3) !important;
        }

        .step-title {
          color: ${brand.colors.secondary} !important;
          margin-bottom: 4px !important;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          margin-top: 24px;
        }

        .back-button,
        .continue-button,
        .submit-button {
          flex: 1;
        }

        .continue-button,
        .submit-button {
          background: ${brand.gradients.secondary} !important;
          border: none !important;
        }

        .back-home {
          text-align: center;
          margin-top: 20px;
        }

        .back-home .ant-btn-link {
          color: white !important;
        }

        .success-content {
          text-align: center;
          padding: 40px 0;
        }

        .success-icon {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: ${brand.colors.success};
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
        }

        .success-icon .anticon {
          font-size: 40px;
          color: white;
        }

        .success-description {
          font-size: 16px !important;
          max-width: 400px;
          margin: 0 auto 24px !important;
        }

        .next-steps-card {
          background: #f6ffed !important;
          border: 1px solid #b7eb8f !important;
          margin-bottom: 24px !important;
        }

        .next-steps-list {
          text-align: left;
          padding-left: 20px;
        }

        .primary-button {
          background: ${brand.gradients.secondary} !important;
          border: none !important;
        }
      `}</style>
    </div>
  );
};

export default DriverApplication;
