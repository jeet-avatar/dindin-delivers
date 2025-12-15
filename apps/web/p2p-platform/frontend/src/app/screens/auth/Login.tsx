import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useUser } from '../../context/UserContext';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const Login: React.FC = () => {
  const { user, login } = useUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    if (user && !hasRedirected) {
      setHasRedirected(true);
      navigate('/', { replace: true });
    }
  }, [user, navigate, hasRedirected]);

  const handleSubmit = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('username', values.email);
      formData.append('password', values.password);

      const response = await axios.post(`${API_URL}/api/auth/login`, formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      const { access_token, user: userData } = response.data;
      
      localStorage.setItem('token', access_token);
      login(userData);
      
      message.success('Login successful!');
      navigate('/');
    } catch (error: any) {
      console.error('Login error:', error);
      let errorMsg = 'Invalid email or password';
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
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <Card 
        style={{ 
          width: 400, 
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          borderRadius: '8px'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>
            Invoice Management
          </h1>
          <p style={{ color: '#666', marginTop: '8px' }}>
            Sign in to continue
          </p>
        </div>

        <Form
          name="login"
          onFinish={handleSubmit}
          autoComplete="off"
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
              prefix={<UserOutlined />} 
              placeholder="Email" 
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password"
            />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              block 
              loading={loading}
              style={{ height: '40px', fontSize: '16px' }}
            >
              Sign In
            </Button>
          </Form.Item>
        </Form>

        <div style={{ 
          marginTop: '16px', 
          padding: '12px', 
          background: '#f0f2f5', 
          borderRadius: '4px',
          fontSize: '12px'
        }}>
          <strong>Demo Credentials:</strong>
          <div>Email: admin@invoice.com</div>
          <div>Password: admin123</div>
        </div>
      </Card>
    </div>
  );
};

export default Login;
