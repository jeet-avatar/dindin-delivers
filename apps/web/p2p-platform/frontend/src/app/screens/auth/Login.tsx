import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, message, Spin } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import { useUser } from '../../context/UserContext';
import axios from 'axios';

// Production API only
const API_URL = import.meta.env.VITE_API_URL || 'https://api.dollor.ai';

const Login: React.FC = () => {
  const { user, login, loading: authLoading } = useUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Only redirect if user is authenticated AND is admin
  useEffect(() => {
    if (!authLoading && user && user.role === 'admin') {
      navigate('/admin', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/admin/login`, {
        email: values.email,
        password: values.password
      }, {
        headers: { 'Content-Type': 'application/json' }
      });

      const { access_token, user: userData } = response.data;

      // Verify user is admin
      if (userData.role !== 'admin') {
        message.error('Access denied. Admin privileges required.');
        return;
      }

      localStorage.setItem('token', access_token);
      login(userData);

      message.success('Welcome back!');
      navigate('/admin', { replace: true });
    } catch (error: any) {
      console.error('Login error:', error);
      const detail = error.response?.data?.detail;
      let errorMsg = 'Invalid email or password';
      if (typeof detail === 'string') {
        errorMsg = detail;
      }
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div style={styles.container}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.loginCard}>
        {/* Logo Section */}
        <div style={styles.logoSection}>
          <div style={styles.dollorLogo}>
            <span style={styles.dollarSign}>$</span>
          </div>
          <h1 style={styles.brandName}>Dollor.ai</h1>
          <p style={styles.tagline}>Admin Portal</p>
        </div>

        {/* Divider */}
        <div style={styles.divider} />

        {/* Welcome Message */}
        <div style={styles.welcomeSection}>
          <h2 style={styles.welcomeTitle}>Welcome Back</h2>
          <p style={styles.welcomeText}>
            Sign in to access your admin dashboard
          </p>
        </div>

        {/* Login Form */}
        <Form
          name="admin-login"
          onFinish={handleSubmit}
          autoComplete="off"
          layout="vertical"
          requiredMark={false}
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Email is required' },
              { type: 'email', message: 'Enter a valid email address' }
            ]}
          >
            <Input
              prefix={<MailOutlined style={{ color: '#999' }} />}
              placeholder="Email address"
              size="large"
              style={styles.input}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Password is required' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#999' }} />}
              placeholder="Password"
              size="large"
              style={styles.input}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: '24px' }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              size="large"
              style={styles.submitButton}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </Form.Item>
        </Form>

        {/* Footer */}
        <div style={styles.footer}>
          <p style={styles.footerText}>
            Secure admin access only
          </p>
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    padding: '20px',
  },
  loginCard: {
    width: '100%',
    maxWidth: '420px',
    background: '#ffffff',
    borderRadius: '16px',
    padding: '40px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
  },
  logoSection: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  dollorLogo: {
    width: '80px',
    height: '80px',
    background: 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
    boxShadow: '0 8px 24px rgba(76, 175, 80, 0.4)',
  },
  dollarSign: {
    fontSize: '42px',
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'Georgia, serif',
  },
  brandName: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1a1a2e',
    margin: '0 0 4px 0',
    letterSpacing: '-0.5px',
  },
  tagline: {
    fontSize: '14px',
    color: '#666',
    margin: 0,
    textTransform: 'uppercase',
    letterSpacing: '2px',
  },
  divider: {
    height: '1px',
    background: 'linear-gradient(90deg, transparent, #e0e0e0, transparent)',
    margin: '24px 0',
  },
  welcomeSection: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  welcomeTitle: {
    fontSize: '22px',
    fontWeight: '600',
    color: '#333',
    margin: '0 0 8px 0',
  },
  welcomeText: {
    fontSize: '14px',
    color: '#888',
    margin: 0,
  },
  input: {
    height: '48px',
    borderRadius: '8px',
    fontSize: '15px',
  },
  submitButton: {
    height: '50px',
    fontSize: '16px',
    fontWeight: '600',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)',
    border: 'none',
    boxShadow: '0 4px 16px rgba(76, 175, 80, 0.4)',
  },
  footer: {
    marginTop: '32px',
    textAlign: 'center',
  },
  footerText: {
    fontSize: '12px',
    color: '#999',
    margin: 0,
  },
};

export default Login;
