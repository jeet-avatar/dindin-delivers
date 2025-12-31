import React, { useState } from 'react';
import { Form, Input, Select, Upload, Button, Steps, Card, message, Row, Col } from 'antd';
import { UploadOutlined, CheckCircleOutlined } from '@ant-design/icons';
import axios from 'axios';

const { TextArea } = Input;
const { Option } = Select;

const RestaurantApplicationForm: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [applicationSubmitted, setApplicationSubmitted] = useState(false);
  const [applicationId, setApplicationId] = useState('');

  const cuisineTypes = [
    'American', 'Chinese', 'Indian', 'Italian', 'Japanese', 
    'Mexican', 'Thai', 'Mediterranean', 'Fast Food', 'Other'
  ];

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
      
      // Prepare operating hours
      const operatingHours = JSON.stringify({
        monday: values.mondayHours || 'Closed',
        tuesday: values.tuesdayHours || 'Closed',
        wednesday: values.wednesdayHours || 'Closed',
        thursday: values.thursdayHours || 'Closed',
        friday: values.fridayHours || 'Closed',
        saturday: values.saturdayHours || 'Closed',
        sunday: values.sundayHours || 'Closed'
      });

      // Submit to backend - use PUBLIC endpoint (no auth required)
      const response = await axios.post('https://api.dollor.ai/api/vendors/public', {
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
        notes: values.description
      });

      setApplicationId(response.data.vendor_id);
      setApplicationSubmitted(true);
      message.success('Application submitted successfully!');
      
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || 'Failed to submit application. Please try again.';
      message.error(errorMsg);
      console.error('Application error:', error.response?.data || error);
    } finally {
      setLoading(false);
    }
  };

  if (applicationSubmitted) {
    return (
      <div className="application-success">
        <Card className="success-card">
          <div className="success-content">
            <CheckCircleOutlined className="success-icon" />
            <h1>Application Submitted Successfully!</h1>
            <p>Application ID: <strong>{applicationId}</strong></p>
            <p>
              Thank you for applying to join DoorDash P2P! Our team will review your application
              and get back to you within 2-3 business days.
            </p>
            <p>
              Next steps:
            </p>
            <ul>
              <li>We'll verify your documents</li>
              <li>Our team will conduct a brief phone interview</li>
              <li>You'll receive login credentials for the vendor app</li>
              <li>Complete your menu setup</li>
              <li>Start receiving orders!</li>
            </ul>
            <p className="check-email">
              Check your email at <strong>{form.getFieldValue('contactEmail')}</strong> for updates.
            </p>
          </div>
        </Card>

        <style>{`
          .application-success {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 24px;
          }
          .success-card {
            max-width: 600px;
            border-radius: 8px;
          }
          .success-content {
            text-align: center;
            padding: 24px;
          }
          .success-icon {
            font-size: 72px;
            color: #52c41a;
            margin-bottom: 24px;
          }
          .success-content h1 {
            color: #1890ff;
            margin-bottom: 16px;
          }
          .success-content ul {
            text-align: left;
            margin: 16px 0;
          }
          .check-email {
            margin-top: 24px;
            padding: 16px;
            background: #f0f2f5;
            border-radius: 4px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="restaurant-application">
      <div className="header">
        <img 
          src="https://th.bing.com/th/id/OIP.U6BcwosycN9N7WOesvICDQAAAA?cb=iwp2&rs=1&pid=ImgDetMain" 
          alt="DoorDash Logo" 
          className="logo"
        />
        <h1>Restaurant Partner Application</h1>
        <p>Join the DoorDash P2P platform and start receiving orders today!</p>
      </div>

      <Card className="application-card">
        <Steps current={currentStep} className="steps">
          <Steps.Step title="Basic Info" />
          <Steps.Step title="Location" />
          <Steps.Step title="Operations" />
          <Steps.Step title="Documents" />
        </Steps>

        <Form
          form={form}
          layout="vertical"
          className="application-form"
        >
          {/* Step 0: Basic Information */}
          {currentStep === 0 && (
            <div className="form-step">
              <h2>Basic Information</h2>
              
              <Form.Item
                label="Restaurant Name"
                name="restaurantName"
                rules={[{ required: true, message: 'Please enter restaurant name' }]}
              >
                <Input size="large" placeholder="Joe's Pizza" />
              </Form.Item>

              <Form.Item
                label="Cuisine Type"
                name="cuisineType"
                rules={[{ required: true, message: 'Please select cuisine type' }]}
              >
                <Select size="large" placeholder="Select cuisine type">
                  {cuisineTypes.map(type => (
                    <Option key={type} value={type}>{type}</Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                label="Contact Person Name"
                name="contactName"
                rules={[{ required: true, message: 'Please enter contact name' }]}
              >
                <Input size="large" placeholder="John Doe" />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="Contact Email"
                    name="contactEmail"
                    rules={[
                      { required: true, message: 'Please enter email' },
                      { type: 'email', message: 'Please enter valid email' }
                    ]}
                  >
                    <Input size="large" placeholder="john@restaurant.com" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="Contact Phone"
                    name="contactPhone"
                    rules={[{ required: true, message: 'Please enter phone' }]}
                  >
                    <Input size="large" placeholder="+1 (555) 123-4567" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                label="Restaurant Description"
                name="description"
                rules={[{ required: true, message: 'Please enter description' }]}
              >
                <TextArea 
                  rows={4} 
                  placeholder="Tell us about your restaurant, specialties, and what makes you unique..."
                />
              </Form.Item>
            </div>
          )}

          {/* Step 1: Location */}
          {currentStep === 1 && (
            <div className="form-step">
              <h2>Location Details</h2>

              <Form.Item
                label="Street Address"
                name="streetAddress"
                rules={[{ required: true, message: 'Please enter street address' }]}
              >
                <Input size="large" placeholder="123 Main Street" />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="City"
                    name="city"
                    rules={[{ required: true, message: 'Please enter city' }]}
                  >
                    <Input size="large" placeholder="San Francisco" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item
                    label="State"
                    name="state"
                    rules={[{ required: true, message: 'Required' }]}
                  >
                    <Input size="large" placeholder="CA" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item
                    label="ZIP Code"
                    name="zipCode"
                    rules={[{ required: true, message: 'Required' }]}
                  >
                    <Input size="large" placeholder="94102" />
                  </Form.Item>
                </Col>
              </Row>
            </div>
          )}

          {/* Step 2: Operations */}
          {currentStep === 2 && (
            <div className="form-step">
              <h2>Operational Details</h2>

              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    label="Seating Capacity"
                    name="seatingCapacity"
                    rules={[{ required: true, message: 'Required' }]}
                  >
                    <Input size="large" type="number" placeholder="50" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="Avg Prep Time (min)"
                    name="avgPrepTime"
                    rules={[{ required: true, message: 'Required' }]}
                  >
                    <Input size="large" type="number" placeholder="30" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="Offer Delivery?"
                    name="deliveryAvailable"
                    rules={[{ required: true, message: 'Required' }]}
                  >
                    <Select size="large">
                      <Option value="yes">Yes</Option>
                      <Option value="no">No</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="Offer Pickup?"
                    name="pickupAvailable"
                    rules={[{ required: true, message: 'Required' }]}
                  >
                    <Select size="large">
                      <Option value="yes">Yes</Option>
                      <Option value="no">No</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <h3>Operating Hours</h3>
              <p className="hours-note">Enter hours in format: "9:00 AM - 10:00 PM" or "Closed"</p>
              
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                <Form.Item
                  key={day}
                  label={day}
                  name={`${day.toLowerCase()}Hours`}
                  rules={[{ required: true, message: 'Required' }]}
                >
                  <Input placeholder="9:00 AM - 10:00 PM or Closed" />
                </Form.Item>
              ))}
            </div>
          )}

          {/* Step 3: Documents */}
          {currentStep === 3 && (
            <div className="form-step">
              <h2>Required Documents</h2>
              <p>Please prepare the following documents. You'll be able to upload them after your application is approved:</p>

              <div className="document-checklist">
                <div className="document-item">
                  <h3>✓ W-9 Tax Form</h3>
                  <p>IRS Form W-9 for tax reporting purposes</p>
                </div>

                <div className="document-item">
                  <h3>✓ Business Insurance</h3>
                  <p>General liability insurance certificate</p>
                </div>

                <div className="document-item">
                  <h3>✓ Food Service License</h3>
                  <p>Valid food service/restaurant license from your local authority</p>
                </div>

                <div className="document-item">
                  <h3>✓ Health Permit</h3>
                  <p>Current health department inspection certificate</p>
                </div>
              </div>

              <div className="terms">
                <h3>Terms & Conditions</h3>
                <ul>
                  <li>Platform commission: 15% per order</li>
                  <li>Stripe processing fees: 2.9% + $0.30 per transaction</li>
                  <li>Weekly payout schedule</li>
                  <li>Minimum order value: $10</li>
                  <li>You're responsible for food quality and preparation</li>
                </ul>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="form-actions">
            {currentStep > 0 && (
              <Button size="large" onClick={handleBack}>
                Back
              </Button>
            )}
            
            {currentStep < 3 && (
              <Button type="primary" size="large" onClick={handleNext}>
                Next
              </Button>
            )}
            
            {currentStep === 3 && (
              <Button 
                type="primary" 
                size="large" 
                onClick={handleSubmit}
                loading={loading}
              >
                Submit Application
              </Button>
            )}
          </div>
        </Form>
      </Card>

      <style>{`
        .restaurant-application {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 24px;
        }
        .header {
          text-align: center;
          color: white;
          margin-bottom: 32px;
        }
        .header .logo {
          height: 60px;
          margin-bottom: 16px;
        }
        .header h1 {
          font-size: 32px;
          margin-bottom: 8px;
          color: white;
        }
        .application-card {
          max-width: 800px;
          margin: 0 auto;
          border-radius: 8px;
        }
        .steps {
          margin-bottom: 32px;
        }
        .form-step h2 {
          margin-bottom: 24px;
          color: #1890ff;
        }
        .hours-note {
          color: #666;
          margin-bottom: 16px;
          font-size: 14px;
        }
        .document-checklist {
          margin: 24px 0;
        }
        .document-item {
          padding: 16px;
          background: #f0f2f5;
          border-radius: 4px;
          margin-bottom: 12px;
        }
        .document-item h3 {
          margin: 0 0 8px 0;
          color: #52c41a;
        }
        .document-item p {
          margin: 0;
          color: #666;
        }
        .terms {
          margin-top: 24px;
          padding: 16px;
          background: #fff7e6;
          border: 1px solid #ffd591;
          border-radius: 4px;
        }
        .terms h3 {
          margin-top: 0;
          color: #fa8c16;
        }
        .form-actions {
          display: flex;
          justify-content: space-between;
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid #f0f0f0;
        }
      `}</style>
    </div>
  );
};

export default RestaurantApplicationForm;
