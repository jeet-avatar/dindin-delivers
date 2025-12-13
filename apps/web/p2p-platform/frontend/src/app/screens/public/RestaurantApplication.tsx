import React, { useState, useRef } from 'react';
import { Form, Input, Select, message, Spin, Progress, Upload, Modal } from 'antd';
import {
  CheckCircleOutlined,
  GlobalOutlined,
  RocketOutlined,
  RobotOutlined,
  ShopOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  ArrowRightOutlined,
  ArrowLeftOutlined,
  StarOutlined,
  ThunderboltOutlined,
  SafetyCertificateOutlined,
  DollarOutlined,
  UploadOutlined,
  CameraOutlined,
  EditOutlined,
  InfoCircleOutlined,
  WalletOutlined,
  CustomerServiceOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { getApiUrl } from '../../api/api';
import { Link } from 'react-router-dom';
import AIValidationStatus from '../../components/vendors/AIValidationStatus';

// Dollor.ai brand colors
const dollor = {
  primary: '#ffd700',
  secondary: '#ffed4a',
  dark: '#1a1a2e',
  darkAlt: '#16213e',
  accent: '#0f3460',
  success: '#10b981',
  text: '#334155',
  textLight: '#64748b'
};

const { TextArea } = Input;
const { Option } = Select;
const API_URL = getApiUrl();

interface ScrapedMenuItem {
  name: string;
  description: string;
  price: number;
  category: string;
  dietary_info?: string[];
  confidence?: number;
}

interface ScrapeResult {
  restaurant_name?: string;
  address?: string;
  phone?: string;
  menu_items: ScrapedMenuItem[];
  categories: string[];
}

const RestaurantApplicationForm: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [applicationSubmitted, setApplicationSubmitted] = useState(false);
  const [applicationId, setApplicationId] = useState('');

  // Auto-import state
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [scraping, setScraping] = useState(false);
  const [scrapedData, setScrapedData] = useState<ScrapeResult | null>(null);
  const [scrapeError, setScrapeError] = useState('');
  const [infoImported, setInfoImported] = useState(false); // True when restaurant info imported but no menu
  const [menuUploadUrl, setMenuUploadUrl] = useState(''); // URL to menu PDF/image
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cuisineTypes = [
    'American', 'Chinese', 'Indian', 'Italian', 'Japanese',
    'Mexican', 'Thai', 'Mediterranean', 'Fast Food', 'Vietnamese',
    'Korean', 'Greek', 'French', 'Spanish', 'Other'
  ];

  const steps = [
    { icon: <ShopOutlined />, title: 'Restaurant', subtitle: 'Basic Info' },
    { icon: <EnvironmentOutlined />, title: 'Location', subtitle: 'Address' },
    { icon: <ClockCircleOutlined />, title: 'Operations', subtitle: 'Hours & Services' },
    { icon: <FileTextOutlined />, title: 'Review', subtitle: 'Submit' },
  ];

  // Auto-import from website
  const handleAutoImport = async () => {
    if (!websiteUrl) {
      message.error('Please enter your restaurant website URL');
      return;
    }

    setScraping(true);
    setScrapeError('');
    setScrapedData(null);
    setInfoImported(false);

    try {
      const response = await axios.post(`${API_URL}/api/onboarding/scrape-menu`, {
        website_url: websiteUrl,
      });

      const items = response.data.items || response.data.menu_items || [];
      const normalizedData = {
        ...response.data,
        menu_items: items,
        categories: [...new Set(items.map((i: any) => i.category))],
      };

      if (items.length > 0) {
        setScrapedData(normalizedData);
        const restaurantInfo = response.data.restaurant_info || {};

        // ===== AUTO-FILL ALL FORM FIELDS =====
        // Nova AI Employee extracts and populates everything

        // Restaurant Name
        if (restaurantInfo.restaurant_name) {
          form.setFieldsValue({ restaurantName: restaurantInfo.restaurant_name });
          normalizedData.restaurant_name = restaurantInfo.restaurant_name;
        } else if (response.data.source_url) {
          try {
            const url = new URL(response.data.source_url);
            const hostname = url.hostname.replace('www.', '').split('.')[0];
            const suggestedName = hostname.charAt(0).toUpperCase() + hostname.slice(1);
            form.setFieldsValue({ restaurantName: suggestedName });
          } catch (e) {}
        }

        // Cuisine Type (auto-detected from menu items)
        if (restaurantInfo.cuisine_type) {
          form.setFieldsValue({ cuisineType: restaurantInfo.cuisine_type });
        }

        // Contact Info
        if (restaurantInfo.phone) form.setFieldsValue({ contactPhone: restaurantInfo.phone });
        if (restaurantInfo.email) form.setFieldsValue({ contactEmail: restaurantInfo.email });

        // Generate contact name from restaurant name
        if (restaurantInfo.restaurant_name) {
          form.setFieldsValue({ contactName: `Manager - ${restaurantInfo.restaurant_name}` });
        }

        // Address
        if (restaurantInfo.address) form.setFieldsValue({ streetAddress: restaurantInfo.address });
        if (restaurantInfo.city) form.setFieldsValue({ city: restaurantInfo.city });
        if (restaurantInfo.state) form.setFieldsValue({ state: restaurantInfo.state });
        if (restaurantInfo.zip_code) form.setFieldsValue({ zipCode: restaurantInfo.zip_code });

        // Description
        if (restaurantInfo.description) {
          form.setFieldsValue({ description: restaurantInfo.description });
        } else if (restaurantInfo.restaurant_name && restaurantInfo.cuisine_type) {
          // Generate description if not found
          form.setFieldsValue({
            description: `${restaurantInfo.restaurant_name} offers delicious ${restaurantInfo.cuisine_type} cuisine. We are committed to providing fresh, high-quality dishes made with care for our valued customers.`
          });
        }

        // Operating Hours - set default for all days
        const defaultHours = restaurantInfo.operating_hours || '9:00 AM - 9:00 PM';
        form.setFieldsValue({
          mondayHours: defaultHours,
          tuesdayHours: defaultHours,
          wednesdayHours: defaultHours,
          thursdayHours: defaultHours,
          fridayHours: defaultHours,
          saturdayHours: defaultHours,
          sundayHours: defaultHours,
        });

        // Operations defaults
        form.setFieldsValue({
          seatingCapacity: '50',
          avgPrepTime: '25',
          deliveryAvailable: 'yes',
          pickupAvailable: 'yes',
        });

        message.success({
          content: `Nova imported ${items.length} items & all restaurant details!`,
          icon: <RobotOutlined style={{ color: dollor.primary }} />,
          duration: 4,
        });
      } else {
        // No menu items found - but check if we got restaurant info
        const restaurantInfo = response.data.restaurant_info || {};

        if (restaurantInfo.restaurant_name || restaurantInfo.phone || restaurantInfo.address) {
          // We got restaurant info, just no menu - auto-fill what we can
          setInfoImported(true);

          if (restaurantInfo.restaurant_name) {
            form.setFieldsValue({ restaurantName: restaurantInfo.restaurant_name });
          }
          if (restaurantInfo.cuisine_type) {
            form.setFieldsValue({ cuisineType: restaurantInfo.cuisine_type });
          }
          if (restaurantInfo.phone) form.setFieldsValue({ contactPhone: restaurantInfo.phone });
          if (restaurantInfo.email) form.setFieldsValue({ contactEmail: restaurantInfo.email });
          if (restaurantInfo.restaurant_name) {
            form.setFieldsValue({ contactName: `Manager - ${restaurantInfo.restaurant_name}` });
          }
          if (restaurantInfo.address) form.setFieldsValue({ streetAddress: restaurantInfo.address });
          if (restaurantInfo.city) form.setFieldsValue({ city: restaurantInfo.city });
          if (restaurantInfo.state) form.setFieldsValue({ state: restaurantInfo.state });
          if (restaurantInfo.zip_code) form.setFieldsValue({ zipCode: restaurantInfo.zip_code });
          if (restaurantInfo.description) {
            form.setFieldsValue({ description: restaurantInfo.description });
          } else if (restaurantInfo.restaurant_name && restaurantInfo.cuisine_type) {
            form.setFieldsValue({
              description: `${restaurantInfo.restaurant_name} offers delicious ${restaurantInfo.cuisine_type} cuisine. We are committed to providing fresh, high-quality dishes made with care.`
            });
          }

          // Set default hours
          const defaultHours = restaurantInfo.operating_hours || '9:00 AM - 9:00 PM';
          form.setFieldsValue({
            mondayHours: defaultHours, tuesdayHours: defaultHours, wednesdayHours: defaultHours,
            thursdayHours: defaultHours, fridayHours: defaultHours, saturdayHours: defaultHours,
            sundayHours: defaultHours,
            seatingCapacity: '50', avgPrepTime: '25', deliveryAvailable: 'yes', pickupAvailable: 'yes',
          });

          message.info({
            content: 'Nova imported restaurant details! Menu uses a POS system - you can add items after approval.',
            icon: <RobotOutlined style={{ color: dollor.primary }} />,
            duration: 5,
          });
        } else {
          message.warning('No menu items found. Please fill in details manually.');
        }
      }
    } catch (error: any) {
      let errorMsg = 'Could not scrape menu. You can still apply manually.';
      const detail = error.response?.data?.detail;
      if (typeof detail === 'string') {
        errorMsg = detail;
      } else if (Array.isArray(detail) && detail.length > 0) {
        errorMsg = detail[0]?.msg || errorMsg;
      }
      setScrapeError(errorMsg);
    } finally {
      setScraping(false);
    }
  };

  const handleNext = async () => {
    try {
      await form.validateFields();
      setCurrentStep(currentStep + 1);
    } catch (error) {
      message.error('Please fill in all required fields');
    }
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();

      const operatingHours = JSON.stringify({
        monday: values.mondayHours || 'Closed',
        tuesday: values.tuesdayHours || 'Closed',
        wednesday: values.wednesdayHours || 'Closed',
        thursday: values.thursdayHours || 'Closed',
        friday: values.fridayHours || 'Closed',
        saturday: values.saturdayHours || 'Closed',
        sunday: values.sundayHours || 'Closed'
      });

      const response = await axios.post(`${API_URL}/api/vendors/public`, {
        company_name: values.restaurantName,
        restaurant_name: values.restaurantName,
        cuisine_type: values.cuisineType,
        contact_name: values.contactName,
        contact_email: values.contactEmail,
        contact_phone: values.contactPhone,
        street: values.streetAddress,
        city: values.city,
        state: values.state,
        zip_code: values.zipCode,
        operating_hours: operatingHours,
        seating_capacity: parseInt(values.seatingCapacity),
        delivery_available: values.deliveryAvailable === 'yes',
        pickup_available: values.pickupAvailable === 'yes',
        average_prep_time: parseInt(values.avgPrepTime),
        notes: values.description,
        website_url: websiteUrl,
        scraped_menu_count: scrapedData?.menu_items?.length || 0,
      });

      setApplicationId(response.data.vendor_id);
      setApplicationSubmitted(true);
      message.success('Application submitted successfully!');

    } catch (error: any) {
      let errorMsg = 'Failed to submit application. Please try again.';
      const detail = error.response?.data?.detail;
      const status = error.response?.status;

      if (typeof detail === 'string') {
        errorMsg = detail;
      } else if (Array.isArray(detail) && detail.length > 0) {
        errorMsg = detail[0]?.msg || errorMsg;
      }

      // Handle duplicate email (409 Conflict) with a helpful modal
      if (status === 409) {
        Modal.info({
          title: 'Account Already Exists',
          content: (
            <div>
              <p>{errorMsg}</p>
              <p style={{ marginTop: 16 }}>
                <a href="/vendor/login" style={{ color: '#1890ff', fontWeight: 'bold' }}>
                  Click here to login →
                </a>
              </p>
            </div>
          ),
          okText: 'Go to Login',
          onOk: () => {
            window.location.href = '/vendor/login';
          }
        });
      } else {
        message.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  // AI Validation Page (after submission with menu items)
  if (applicationSubmitted && scrapedData && scrapedData.menu_items.length > 0 && applicationId) {
    return (
      <div className="success-page">
        <div className="success-container">
          <div className="success-header">
            <Logo variant="full" size="lg" theme="dark" />
            <div className="success-badge">
              <RobotOutlined />
              <span>AI Validation</span>
            </div>
          </div>

          <h1 className="success-title">Aria is reviewing your menu</h1>
          <p className="success-subtitle">
            Our AI employee is validating {scrapedData.menu_items.length} menu items
          </p>

          <div className="validation-card">
            <AIValidationStatus
              vendorId={parseInt(applicationId)}
              onActivate={() => {
                message.success('Congratulations! Your restaurant is now live on ' + 'Dollor.ai');
              }}
            />
          </div>

          <button
            className="vendor-login-btn"
            onClick={() => window.location.href = '/vendor/login'}
          >
            Go to Vendor Dashboard
            <ArrowRightOutlined />
          </button>
        </div>

        <style>{`
          .success-page {
            min-height: 100vh;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px 20px;
          }
          .success-container {
            max-width: 900px;
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .success-header {
            display: flex;
            align-items: center;
            gap: 20px;
            margin-bottom: 40px;
          }
          .success-badge {
            display: flex;
            align-items: center;
            gap: 8px;
            background: rgba(99, 102, 241, 0.2);
            border: 1px solid rgba(99, 102, 241, 0.4);
            padding: 8px 16px;
            border-radius: 100px;
            color: #818cf8;
            font-size: 14px;
            font-weight: 500;
          }
          .success-title {
            color: white;
            font-size: 36px;
            font-weight: 700;
            margin: 0 0 12px 0;
            text-align: center;
          }
          .success-subtitle {
            color: rgba(255,255,255,0.7);
            font-size: 18px;
            margin: 0 0 40px 0;
            text-align: center;
          }
          .validation-card {
            width: 100%;
            background: rgba(255,255,255,0.05);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 24px;
            padding: 32px;
            margin-bottom: 32px;
          }
          .vendor-login-btn {
            display: flex;
            align-items: center;
            gap: 10px;
            background: linear-gradient(135deg, ${dollor.primary} 0%, ${dollor.dark} 100%);
            border: none;
            color: white;
            padding: 16px 32px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
          }
          .vendor-login-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 20px 40px rgba(16, 185, 129, 0.3);
          }
        `}</style>
      </div>
    );
  }

  // Standard Success Page (no menu items)
  if (applicationSubmitted) {
    return (
      <div className="success-page">
        <div className="success-container">
          <div className="success-icon-wrap">
            <CheckCircleOutlined className="success-check" />
          </div>

          <h1 className="success-title">Application Submitted!</h1>
          <p className="success-subtitle">Application ID: {applicationId}</p>

          <div className="success-card">
            <h3>What happens next?</h3>
            <div className="next-steps">
              {[
                { icon: <FileTextOutlined />, text: 'We\'ll verify your documents' },
                { icon: <RobotOutlined />, text: 'Aria (AI) will review your application' },
                { icon: <SafetyCertificateOutlined />, text: 'Receive your vendor credentials' },
                { icon: <RocketOutlined />, text: 'Start receiving orders!' },
              ].map((step, i) => (
                <div key={i} className="next-step">
                  <div className="step-icon">{step.icon}</div>
                  <span>{step.text}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="check-email-text">
            Check <strong>{form.getFieldValue('contactEmail')}</strong> for updates
          </p>
        </div>

        <style>{`
          .success-page {
            min-height: 100vh;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px 20px;
          }
          .success-container {
            max-width: 500px;
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
          .success-icon-wrap {
            width: 100px;
            height: 100px;
            background: linear-gradient(135deg, ${dollor.primary} 0%, ${dollor.dark} 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 32px;
            animation: pulse 2s infinite;
          }
          @keyframes pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
            50% { box-shadow: 0 0 0 20px rgba(16, 185, 129, 0); }
          }
          .success-check {
            font-size: 48px;
            color: white;
          }
          .success-title {
            color: white;
            font-size: 36px;
            font-weight: 700;
            margin: 0 0 8px 0;
          }
          .success-subtitle {
            color: rgba(255,255,255,0.6);
            font-size: 16px;
            margin: 0 0 40px 0;
          }
          .success-card {
            width: 100%;
            background: rgba(255,255,255,0.05);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 24px;
            padding: 32px;
            margin-bottom: 32px;
          }
          .success-card h3 {
            color: white;
            font-size: 18px;
            margin: 0 0 24px 0;
          }
          .next-steps {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .next-step {
            display: flex;
            align-items: center;
            gap: 16px;
            text-align: left;
            color: rgba(255,255,255,0.8);
          }
          .step-icon {
            width: 40px;
            height: 40px;
            background: rgba(16, 185, 129, 0.2);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: ${dollor.primary};
            font-size: 18px;
          }
          .check-email-text {
            color: rgba(255,255,255,0.5);
            font-size: 14px;
          }
        `}</style>
      </div>
    );
  }

  // Main Application Form
  return (
    <div className="app-container">
      {/* Left Panel - Hero Section */}
      <div className="hero-panel">
        <div className="hero-content">
          <Link to="/" className="logo-link">
            <DollarOutlined className="logo-icon" />
            <span className="logo-text">Dollor.ai</span>
          </Link>

          <h1 className="hero-title">
            Grow Your Restaurant with <span className="gradient-text">Dollor.ai</span>
          </h1>

          <p className="hero-subtitle">
            Join thousands of restaurants reaching new customers every day with AI-powered delivery
          </p>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">5,000+</div>
              <div className="stat-label">Restaurant Partners</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">+45%</div>
              <div className="stat-label">Avg Revenue Increase</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">24hr</div>
              <div className="stat-label">Go Live Time</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">$0</div>
              <div className="stat-label">Signup Fee</div>
            </div>
          </div>

          <div className="features-list">
            {[
              { icon: <ThunderboltOutlined />, text: 'AI-powered menu import in seconds' },
              { icon: <DollarOutlined />, text: 'Zero commission - transparent pricing' },
              { icon: <WalletOutlined />, text: 'Weekly payouts to your bank' },
              { icon: <CustomerServiceOutlined />, text: '24/7 dedicated partner support' },
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
            <Link to="/vendor/login">Login</Link>
          </div>
        </div>
      </div>

      {/* Right Panel - Form Section */}
      <div className="form-panel">
        <div className="form-container">
          {/* Progress Steps */}
          <div className="steps-container">
            {steps.map((step, i) => (
              <div
                key={i}
                className={`step-item ${i === currentStep ? 'active' : ''} ${i < currentStep ? 'completed' : ''}`}
              >
                <div className="step-icon-wrap">
                  {i < currentStep ? <CheckCircleOutlined /> : step.icon}
                </div>
                <div className="step-text">
                  <div className="step-title">{step.title}</div>
                  <div className="step-subtitle">{step.subtitle}</div>
                </div>
              </div>
            ))}
          </div>

          <Progress
            percent={(currentStep / 3) * 100}
            showInfo={false}
            strokeColor={{
              '0%': dollor.primary,
              '100%': dollor.dark,
            }}
            trailColor="rgba(0,0,0,0.06)"
            style={{ marginBottom: 32 }}
          />

          {/* AI Auto-Import Card */}
          {currentStep === 0 && (
            <div className="ai-import-card">
              <div className="ai-import-header">
                <div className="ai-badge">
                  <RobotOutlined />
                  <span>AI Powered</span>
                </div>
                <h3>Quick Setup</h3>
                <p>Enter your website URL and we'll import everything automatically</p>
              </div>

              <div className="ai-input-group">
                <div className="ai-input-wrap">
                  <GlobalOutlined className="input-prefix" />
                  <input
                    type="url"
                    placeholder="https://your-restaurant.com"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    disabled={scraping}
                    className="ai-input"
                  />
                </div>
                <button
                  className="ai-import-btn"
                  onClick={handleAutoImport}
                  disabled={scraping}
                >
                  {scraping ? (
                    <>
                      <Spin size="small" />
                      <span>Importing...</span>
                    </>
                  ) : (
                    <>
                      <RocketOutlined />
                      <span>Import</span>
                    </>
                  )}
                </button>
              </div>

              {scrapedData && (
                <div className="import-success">
                  <CheckCircleOutlined />
                  <span>
                    <strong>{scrapedData.menu_items.length}</strong> menu items imported
                    {scrapedData.restaurant_name && ` from ${scrapedData.restaurant_name}`}
                  </span>
                </div>
              )}

              {scrapeError && (
                <div className="import-error">
                  <span>{scrapeError}</span>
                </div>
              )}

              {/* Show when restaurant info was imported but no menu */}
              {infoImported && (
                <div className="info-imported-notice">
                  <div className="info-imported-header">
                    <CheckCircleOutlined style={{ color: dollor.primary }} />
                    <span><strong>Restaurant details imported!</strong></span>
                  </div>
                  <p className="info-imported-text">
                    Your restaurant uses a POS system (like Heartland, Toast, or Square) that protects menu data.
                    No worries - you can add your menu items after approval through our easy dashboard.
                  </p>
                  <div className="menu-options">
                    <div className="menu-option">
                      <div className="menu-option-icon">
                        <UploadOutlined />
                      </div>
                      <div className="menu-option-content">
                        <strong>Upload Menu PDF</strong>
                        <span>Have a PDF menu? We'll process it after you're approved.</span>
                      </div>
                    </div>
                    <div className="menu-option">
                      <div className="menu-option-icon">
                        <CameraOutlined />
                      </div>
                      <div className="menu-option-content">
                        <strong>Take Photos</strong>
                        <span>Snap photos of your menu - our AI will extract items.</span>
                      </div>
                    </div>
                    <div className="menu-option">
                      <div className="menu-option-icon">
                        <EditOutlined />
                      </div>
                      <div className="menu-option-content">
                        <strong>Add Manually</strong>
                        <span>Enter items one by one in our simple dashboard.</span>
                      </div>
                    </div>
                  </div>
                  <div className="proceed-notice">
                    <InfoCircleOutlined />
                    <span>Your form details are pre-filled. Review and submit to get started!</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Form */}
          <Form form={form} layout="vertical" className="application-form">

            {/* Step 0: Basic Info */}
            {currentStep === 0 && (
              <div className="form-section">
                <h2 className="section-title">Restaurant Details</h2>

                <Form.Item
                  name="restaurantName"
                  rules={[{ required: true, message: 'Restaurant name is required' }]}
                >
                  <Input
                    size="large"
                    placeholder="Restaurant Name"
                    className="styled-input"
                  />
                </Form.Item>

                <Form.Item
                  name="cuisineType"
                  rules={[{ required: true, message: 'Cuisine type is required' }]}
                >
                  <Select
                    size="large"
                    placeholder="Select Cuisine Type"
                    className="styled-select"
                  >
                    {cuisineTypes.map(type => (
                      <Option key={type} value={type}>{type}</Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  name="contactName"
                  rules={[{ required: true, message: 'Contact name is required' }]}
                >
                  <Input
                    size="large"
                    placeholder="Contact Person Name"
                    className="styled-input"
                  />
                </Form.Item>

                <div className="input-row">
                  <Form.Item
                    name="contactEmail"
                    rules={[
                      { required: true, message: 'Email is required' },
                      { type: 'email', message: 'Enter a valid email' }
                    ]}
                    style={{ flex: 1 }}
                  >
                    <Input
                      size="large"
                      placeholder="Email Address"
                      className="styled-input"
                    />
                  </Form.Item>
                  <Form.Item
                    name="contactPhone"
                    rules={[{ required: true, message: 'Phone is required' }]}
                    style={{ flex: 1 }}
                  >
                    <Input
                      size="large"
                      placeholder="Phone Number"
                      className="styled-input"
                    />
                  </Form.Item>
                </div>

                <Form.Item
                  name="description"
                  rules={[{ required: true, message: 'Description is required' }]}
                >
                  <TextArea
                    rows={3}
                    placeholder="Tell us about your restaurant, specialties, and what makes you unique..."
                    className="styled-textarea"
                  />
                </Form.Item>
              </div>
            )}

            {/* Step 1: Location */}
            {currentStep === 1 && (
              <div className="form-section">
                <h2 className="section-title">Verify Location</h2>

                {/* Show imported address notice if address was auto-filled */}
                {form.getFieldValue('streetAddress') && (
                  <div className="address-imported-notice">
                    <CheckCircleOutlined />
                    <span>Address imported from your website. Please verify it's correct.</span>
                  </div>
                )}

                <Form.Item
                  name="streetAddress"
                  label="Street Address"
                  rules={[{ required: true, message: 'Street address is required' }]}
                >
                  <Input
                    size="large"
                    placeholder="Street Address"
                    className="styled-input"
                  />
                </Form.Item>

                <div className="input-row">
                  <Form.Item
                    name="city"
                    label="City"
                    rules={[{ required: true, message: 'City is required' }]}
                    style={{ flex: 2 }}
                  >
                    <Input
                      size="large"
                      placeholder="City"
                      className="styled-input"
                    />
                  </Form.Item>
                  <Form.Item
                    name="state"
                    label="State"
                    rules={[{ required: true, message: 'Required' }]}
                    style={{ flex: 1 }}
                  >
                    <Input
                      size="large"
                      placeholder="State"
                      className="styled-input"
                    />
                  </Form.Item>
                  <Form.Item
                    name="zipCode"
                    label="ZIP Code"
                    rules={[{ required: true, message: 'Required' }]}
                    style={{ flex: 1 }}
                  >
                    <Input
                      size="large"
                      placeholder="ZIP"
                      className="styled-input"
                    />
                  </Form.Item>
                </div>
              </div>
            )}

            {/* Step 2: Operations */}
            {currentStep === 2 && (
              <div className="form-section">
                <h2 className="section-title">Operations</h2>

                <div className="input-row">
                  <Form.Item
                    name="seatingCapacity"
                    rules={[{ required: true, message: 'Required' }]}
                    style={{ flex: 1 }}
                  >
                    <Input
                      size="large"
                      type="number"
                      placeholder="Seating Capacity"
                      className="styled-input"
                    />
                  </Form.Item>
                  <Form.Item
                    name="avgPrepTime"
                    rules={[{ required: true, message: 'Required' }]}
                    style={{ flex: 1 }}
                  >
                    <Input
                      size="large"
                      type="number"
                      placeholder="Avg Prep Time (min)"
                      className="styled-input"
                    />
                  </Form.Item>
                </div>

                <div className="input-row">
                  <Form.Item
                    name="deliveryAvailable"
                    rules={[{ required: true, message: 'Required' }]}
                    style={{ flex: 1 }}
                  >
                    <Select size="large" placeholder="Offer Delivery?" className="styled-select">
                      <Option value="yes">Yes - Delivery Available</Option>
                      <Option value="no">No - No Delivery</Option>
                    </Select>
                  </Form.Item>
                  <Form.Item
                    name="pickupAvailable"
                    rules={[{ required: true, message: 'Required' }]}
                    style={{ flex: 1 }}
                  >
                    <Select size="large" placeholder="Offer Pickup?" className="styled-select">
                      <Option value="yes">Yes - Pickup Available</Option>
                      <Option value="no">No - No Pickup</Option>
                    </Select>
                  </Form.Item>
                </div>

                <h3 className="subsection-title">Operating Hours</h3>
                <p className="helper-text">Format: "9:00 AM - 10:00 PM" or "Closed"</p>

                <div className="hours-grid">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                    <Form.Item
                      key={day}
                      name={`${day.toLowerCase()}Hours`}
                      rules={[{ required: true, message: 'Required' }]}
                    >
                      <Input
                        placeholder={day}
                        className="styled-input hours-input"
                        prefix={<span className="day-label">{day.slice(0, 3)}</span>}
                      />
                    </Form.Item>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Review */}
            {currentStep === 3 && (
              <div className="form-section">
                <h2 className="section-title">Review & Submit</h2>

                {scrapedData && scrapedData.menu_items.length > 0 && (
                  <div className="menu-preview-card">
                    <div className="menu-preview-header">
                      <CheckCircleOutlined />
                      <span>{scrapedData.menu_items.length} Menu Items Ready</span>
                    </div>
                    <div className="menu-preview-items">
                      {scrapedData.menu_items.slice(0, 5).map((item, i) => (
                        <div key={i} className="menu-preview-item">
                          <span className="item-name">{item.name}</span>
                          <span className="item-price">${item.price?.toFixed(2)}</span>
                        </div>
                      ))}
                      {scrapedData.menu_items.length > 5 && (
                        <div className="more-items">
                          +{scrapedData.menu_items.length - 5} more items
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="documents-section">
                  <h3>Documents Needed</h3>
                  <p>Prepare these for upload after approval:</p>
                  <div className="doc-grid">
                    {[
                      'W-9 Tax Form',
                      'Business Insurance',
                      'Food Service License',
                      'Health Permit',
                    ].map((doc, i) => (
                      <div key={i} className="doc-item">
                        <FileTextOutlined />
                        <span>{doc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="terms-section">
                  <h3>Terms</h3>
                  <div className="terms-list">
                    <div className="term-item">
                      <span className="term-label">Platform Fee</span>
                      <span className="term-value">$0.00 per order*</span>
                    </div>
                    <div className="term-item">
                      <span className="term-label">Payment Processing</span>
                      <span className="term-value">2.9% + $0.30</span>
                    </div>
                    <div className="term-item">
                      <span className="term-label">Payouts</span>
                      <span className="term-value">Weekly</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="form-nav">
              {currentStep > 0 && (
                <button type="button" className="nav-btn back-btn" onClick={handleBack}>
                  <ArrowLeftOutlined />
                  <span>Back</span>
                </button>
              )}

              <div style={{ flex: 1 }} />

              {currentStep < 3 ? (
                <button type="button" className="nav-btn next-btn" onClick={handleNext}>
                  <span>Continue</span>
                  <ArrowRightOutlined />
                </button>
              ) : (
                <button
                  type="button"
                  className="nav-btn submit-btn"
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Spin size="small" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Application</span>
                      <RocketOutlined />
                    </>
                  )}
                </button>
              )}
            </div>
          </Form>
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
          background-clip: text;
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
          transition: all 0.3s ease;
        }

        .stat-card:hover {
          background: rgba(255,255,255,0.08);
          transform: translateY(-2px);
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
          letter-spacing: 0.5px;
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
          background: rgba(255, 215, 0, 0.15);
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
          transition: color 0.3s;
        }

        .footer-links a:hover {
          color: ${dollor.primary};
        }

        /* Form Panel */
        .form-panel {
          flex: 1;
          padding: 48px;
          overflow-y: auto;
        }

        .form-container {
          max-width: 600px;
          margin: 0 auto;
        }

        /* Steps */
        .steps-container {
          display: flex;
          justify-content: space-between;
          margin-bottom: 24px;
        }

        .step-item {
          display: flex;
          align-items: center;
          gap: 12px;
          opacity: 0.4;
          transition: all 0.3s ease;
        }

        .step-item.active, .step-item.completed {
          opacity: 1;
        }

        .step-icon-wrap {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          color: #94a3b8;
          transition: all 0.3s ease;
        }

        .step-item.active .step-icon-wrap {
          background: linear-gradient(135deg, ${dollor.primary} 0%, ${dollor.dark} 100%);
          color: white;
        }

        .step-item.completed .step-icon-wrap {
          background: ${dollor.primary};
          color: white;
        }

        .step-title {
          font-size: 14px;
          font-weight: 600;
          color: #1e293b;
        }

        .step-subtitle {
          font-size: 12px;
          color: #94a3b8;
        }

        /* AI Import Card */
        .ai-import-card {
          background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
          border: 2px solid ${dollor.primary}30;
          border-radius: 20px;
          padding: 24px;
          margin-bottom: 32px;
        }

        .ai-import-header {
          text-align: center;
          margin-bottom: 20px;
        }

        .ai-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: ${dollor.primary}15;
          color: ${dollor.primary};
          padding: 6px 14px;
          border-radius: 100px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
        }

        .ai-import-header h3 {
          font-size: 20px;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 8px 0;
        }

        .ai-import-header p {
          font-size: 14px;
          color: #64748b;
          margin: 0;
        }

        .ai-input-group {
          display: flex;
          gap: 12px;
        }

        .ai-input-wrap {
          flex: 1;
          position: relative;
        }

        .input-prefix {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          font-size: 18px;
        }

        .ai-input {
          width: 100%;
          height: 52px;
          padding: 0 16px 0 48px;
          border: 2px solid #e2e8f0;
          border-radius: 14px;
          font-size: 15px;
          transition: all 0.2s ease;
          outline: none;
        }

        .ai-input:focus {
          border-color: ${dollor.primary};
          box-shadow: 0 0 0 4px ${dollor.primary}15;
        }

        .ai-import-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, ${dollor.primary} 0%, ${dollor.dark} 100%);
          border: none;
          color: white;
          padding: 0 24px;
          border-radius: 14px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          white-space: nowrap;
        }

        .ai-import-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px ${dollor.primary}40;
        }

        .ai-import-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .import-success {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 16px;
          padding: 12px 16px;
          background: ${dollor.primary}15;
          border-radius: 10px;
          color: ${dollor.primary};
          font-size: 14px;
          font-weight: 500;
        }

        .import-error {
          margin-top: 16px;
          padding: 12px 16px;
          background: #fef2f2;
          border-radius: 10px;
          color: #dc2626;
          font-size: 14px;
        }

        .address-imported-notice {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
          padding: 14px 18px;
          background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
          border: 1px solid ${dollor.primary}30;
          border-radius: 12px;
          color: ${dollor.primary};
          font-size: 14px;
          font-weight: 500;
        }

        .address-imported-notice .anticon {
          font-size: 18px;
        }

        /* Info Imported Notice (when restaurant info found but no menu) */
        .info-imported-notice {
          margin-top: 20px;
          padding: 20px;
          background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
          border: 1px solid ${dollor.primary}30;
          border-radius: 16px;
        }

        .info-imported-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
          font-size: 16px;
          color: ${dollor.primary};
        }

        .info-imported-header .anticon {
          font-size: 20px;
        }

        .info-imported-text {
          font-size: 14px;
          color: #475569;
          margin: 0 0 16px 0;
          line-height: 1.5;
        }

        .menu-options {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 16px;
        }

        .menu-option {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 16px;
          background: white;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
        }

        .menu-option-icon {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: ${dollor.primary}15;
          border-radius: 8px;
          color: ${dollor.primary};
          font-size: 18px;
          flex-shrink: 0;
        }

        .menu-option-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .menu-option-content strong {
          font-size: 14px;
          color: #1e293b;
        }

        .menu-option-content span {
          font-size: 12px;
          color: #64748b;
        }

        .proceed-notice {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 14px;
          background: ${dollor.primary}10;
          border-radius: 8px;
          font-size: 13px;
          color: ${dollor.primary};
          font-weight: 500;
        }

        .proceed-notice .anticon {
          font-size: 16px;
        }

        /* Form Sections */
        .form-section {
          margin-bottom: 32px;
        }

        .section-title {
          font-size: 24px;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 24px 0;
        }

        .subsection-title {
          font-size: 16px;
          font-weight: 600;
          color: #475569;
          margin: 24px 0 8px 0;
        }

        .helper-text {
          font-size: 13px;
          color: #94a3b8;
          margin: 0 0 16px 0;
        }

        .input-row {
          display: flex;
          gap: 16px;
        }

        .styled-input, .styled-textarea, .styled-select {
          border-radius: 12px !important;
        }

        .styled-input input, .styled-textarea textarea {
          border: 2px solid #e2e8f0 !important;
          border-radius: 12px !important;
          transition: all 0.2s ease !important;
        }

        .styled-input input:focus, .styled-textarea textarea:focus {
          border-color: ${dollor.primary} !important;
          box-shadow: 0 0 0 4px ${dollor.primary}15 !important;
        }

        .hours-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .hours-input .day-label {
          font-size: 12px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
        }

        /* Review Step */
        .menu-preview-card {
          background: #f0fdf4;
          border: 1px solid ${dollor.primary}30;
          border-radius: 16px;
          overflow: hidden;
          margin-bottom: 24px;
        }

        .menu-preview-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 16px 20px;
          background: ${dollor.primary}15;
          color: ${dollor.primary};
          font-weight: 600;
        }

        .menu-preview-items {
          padding: 16px 20px;
        }

        .menu-preview-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #e2e8f0;
        }

        .menu-preview-item:last-child {
          border-bottom: none;
        }

        .item-name {
          color: #334155;
        }

        .item-price {
          font-weight: 600;
          color: #1e293b;
        }

        .more-items {
          text-align: center;
          padding-top: 8px;
          color: #64748b;
          font-size: 14px;
        }

        .documents-section {
          background: #f8fafc;
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 24px;
        }

        .documents-section h3 {
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 4px 0;
        }

        .documents-section p {
          font-size: 13px;
          color: #64748b;
          margin: 0 0 16px 0;
        }

        .doc-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }

        .doc-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px;
          background: white;
          border-radius: 10px;
          font-size: 13px;
          color: #475569;
        }

        .doc-item .anticon {
          color: ${dollor.primary};
        }

        .terms-section {
          background: #fffbeb;
          border: 1px solid #fcd34d;
          border-radius: 16px;
          padding: 20px;
        }

        .terms-section h3 {
          font-size: 16px;
          font-weight: 600;
          color: #92400e;
          margin: 0 0 16px 0;
        }

        .terms-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .term-item {
          display: flex;
          justify-content: space-between;
        }

        .term-label {
          color: #78716c;
          font-size: 14px;
        }

        .term-value {
          font-weight: 600;
          color: #1c1917;
          font-size: 14px;
        }

        /* Navigation */
        .form-nav {
          display: flex;
          align-items: center;
          padding-top: 24px;
          border-top: 1px solid #e2e8f0;
          margin-top: 32px;
        }

        .nav-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 28px;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          border: none;
        }

        .back-btn {
          background: #f1f5f9;
          color: #475569;
        }

        .back-btn:hover {
          background: #e2e8f0;
        }

        .next-btn, .submit-btn {
          background: linear-gradient(135deg, ${dollor.primary} 0%, ${dollor.dark} 100%);
          color: white;
        }

        .next-btn:hover, .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px ${dollor.primary}40;
        }

        .submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .hero-panel {
            display: none;
          }

          .form-panel {
            padding: 24px;
          }

          .steps-container {
            flex-wrap: wrap;
            gap: 12px;
          }

          .step-text {
            display: none;
          }

          .input-row {
            flex-direction: column;
            gap: 0;
          }

          .hours-grid {
            grid-template-columns: 1fr;
          }

          .doc-grid {
            grid-template-columns: 1fr;
          }

          .ai-input-group {
            flex-direction: column;
          }

          .ai-import-btn {
            justify-content: center;
            padding: 14px 24px;
          }
        }

        /* Ant Design Overrides */
        .ant-form-item {
          margin-bottom: 16px;
        }

        .ant-input, .ant-input-affix-wrapper, .ant-select-selector {
          border-radius: 12px !important;
          border: 2px solid #e2e8f0 !important;
          min-height: 48px !important;
        }

        .ant-input:focus, .ant-input-affix-wrapper:focus, .ant-input-affix-wrapper-focused,
        .ant-select-focused .ant-select-selector {
          border-color: ${dollor.primary} !important;
          box-shadow: 0 0 0 4px ${dollor.primary}15 !important;
        }

        .ant-select-selector {
          display: flex !important;
          align-items: center !important;
        }

        .ant-progress-inner {
          border-radius: 100px !important;
        }

        .ant-progress-bg {
          border-radius: 100px !important;
        }
      `}</style>
    </div>
  );
};

export default RestaurantApplicationForm;
