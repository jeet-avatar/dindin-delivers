import React, { useState } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined, ShopOutlined } from '@ant-design/icons';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const VendorLogin: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append('username', values.email);
      formData.append('password', values.password);

      const response = await axios.post(
        'http://localhost:3000/api/auth/vendor/login',
        formData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      // Store token and user info
      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      message.success('Login successful!');
      
      // Redirect to vendor dashboard
      navigate('/vendor/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.response?.status === 403) {
        message.error(error.response.data.detail || 'Your vendor account is pending approval');
      } else {
        message.error(error.response?.data?.detail || 'Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="vendor-login-container">
      <Card className="vendor-login-card">
        <div className="login-header">
          <ShopOutlined className="login-icon" />
          <h1>Vendor Portal</h1>
          <p>Sign in to manage your restaurant</p>
        </div>

        <Form
          name="vendor_login"
          onFinish={onFinish}
          autoComplete="off"
          layout="vertical"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Please enter a valid email' }
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Email"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password"
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
            >
              Sign In
            </Button>
          </Form.Item>
        </Form>

        <div className="login-footer">
          <p>Don't have an account?</p>
          <Button type="link" onClick={() => navigate('/restaurant/apply')}>
            Apply to become a vendor
          </Button>
        </div>
      </Card>

      <style>{`
        .vendor-login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
        }
        .vendor-login-card {
          width: 100%;
          max-width: 450px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
          border-radius: 12px;
        }
        .login-header {
          text-align: center;
          margin-bottom: 32px;
        }
        .login-icon {
          font-size: 64px;
          color: #667eea;
          margin-bottom: 16px;
        }
        .login-header h1 {
          font-size: 28px;
          margin: 0 0 8px 0;
          color: #1a1a1a;
        }
        .login-header p {
          font-size: 14px;
          color: #666;
          margin: 0;
        }
        .login-footer {
          text-align: center;
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid #f0f0f0;
        }
        .login-footer p {
          margin: 0 0 8px 0;
          color: #666;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
};

export default VendorLogin;
