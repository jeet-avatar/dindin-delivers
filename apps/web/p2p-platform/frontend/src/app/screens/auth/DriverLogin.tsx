import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, message, Divider, Space } from 'antd';
import { CarOutlined, MailOutlined, LockOutlined } from '@ant-design/icons';
import axios from 'axios';
import { getApiUrl } from '../../api/api';
import brand from '../../config/brand';

const { Title, Text } = Typography;

const DriverLogin: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const API_URL = getApiUrl();

  const onFinish = async (values: { email: string; password: string }) => {
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
      localStorage.setItem('driver_name', `${response.data.first_name} ${response.data.last_name}`);
      localStorage.setItem('driver_status', response.data.status);

      message.success('Login successful!');
      navigate('/driver/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      let errorMsg = 'Login failed. Please check your credentials.';
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

  return (
    <div className="driver-login">
      <Card className="login-card">
        <div className="login-header">
          <div className="icon-wrapper">
            <CarOutlined />
          </div>
          <Title level={3}>Driver Portal</Title>
          <Text type="secondary">Sign in to manage your deliveries</Text>
        </div>

        <Form
          name="driver_login"
          onFinish={onFinish}
          layout="vertical"
          size="large"
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
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password
              prefix={<LockOutlined className="input-icon" />}
              placeholder="Password"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              className="submit-button"
            >
              Sign In
            </Button>
          </Form.Item>
        </Form>

        <Divider>New to {brand.name}?</Divider>

        <Space direction="vertical" style={{ width: '100%' }}>
          <Button
            block
            size="large"
            onClick={() => navigate('/driver/apply')}
          >
            Apply as Delivery Partner
          </Button>
          <Button
            type="link"
            block
            onClick={() => navigate('/')}
          >
            Back to Home
          </Button>
        </Space>
      </Card>

      <style>{`
        .driver-login {
          min-height: 100vh;
          background: ${brand.gradients.secondary};
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .login-card {
          width: 100%;
          max-width: 420px;
          border-radius: 16px !important;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3) !important;
        }

        .login-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .icon-wrapper {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          background: ${brand.gradients.secondary};
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
        }

        .icon-wrapper .anticon {
          font-size: 32px;
          color: white;
        }

        .login-header h3 {
          margin: 0 0 4px 0 !important;
        }

        .input-icon {
          color: ${brand.colors.textLight} !important;
        }

        .submit-button {
          height: 48px !important;
          background: ${brand.gradients.secondary} !important;
          border: none !important;
          font-weight: 600 !important;
        }
      `}</style>
    </div>
  );
};

export default DriverLogin;
