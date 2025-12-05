import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Switch, Button, TimePicker, Select, message, Space, Spin } from 'antd';
import { SaveOutlined, BellOutlined, EnvironmentOutlined, ClockCircleOutlined, UserOutlined } from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';
import { useUser } from '../../context/UserContext';

const { Option } = Select;
const { TextArea } = Input;
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface VendorSettings {
  restaurant_name: string;
  cuisine_type: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  description?: string;
  seating_capacity: number;
  avg_prep_time: number;
  delivery_available: boolean;
  pickup_available: boolean;
  operating_hours: Record<string, { open: string; close: string; is_closed: boolean }>;
  notification_preferences: {
    email_new_orders: boolean;
    sms_new_orders: boolean;
    email_low_stock: boolean;
    email_daily_summary: boolean;
  };
}

const DAYS_OF_WEEK = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
];

const CUISINE_TYPES = [
  'American', 'Chinese', 'Italian', 'Mexican', 'Indian', 'Japanese', 
  'Thai', 'Mediterranean', 'French', 'Korean', 'Vietnamese', 'Greek', 'Other'
];

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

const VendorSettings: React.FC = () => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<VendorSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();

  // Get vendor_id from logged-in user context
  const vendorId = user?.vendor_id;

  useEffect(() => {
    if (vendorId) {
      fetchSettings();
    } else {
      setLoading(false);
    }
  }, [vendorId]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/vendors/${vendorId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const vendor = response.data;
      
      // Parse operating hours
      let operatingHours: Record<string, any> = {};
      if (vendor.operating_hours) {
        try {
          operatingHours = JSON.parse(vendor.operating_hours);
        } catch (e) {
          // Initialize default hours if parsing fails
          operatingHours = {};
        }
      }

      const settingsData: VendorSettings = {
        restaurant_name: vendor.restaurant_name || vendor.company_name,
        cuisine_type: vendor.cuisine_type,
        contact_name: vendor.contact_name,
        contact_email: vendor.contact_email,
        contact_phone: vendor.contact_phone,
        street_address: vendor.street || vendor.street_address,  // API returns 'street'
        city: vendor.city,
        state: vendor.state,
        zip_code: vendor.zip_code,
        description: vendor.description,
        seating_capacity: vendor.seating_capacity,
        avg_prep_time: vendor.average_prep_time || vendor.avg_prep_time,  // API returns 'average_prep_time'
        delivery_available: vendor.delivery_available ?? true,
        pickup_available: vendor.pickup_available ?? true,
        operating_hours: operatingHours,
        notification_preferences: vendor.notification_preferences || {
          email_new_orders: true,
          sms_new_orders: false,
          email_low_stock: false,
          email_daily_summary: true
        }
      };

      setSettings(settingsData);
      
      // Set form values
      const formValues: any = {
        ...settingsData
      };

      // Convert operating hours to moment objects for TimePicker
      DAYS_OF_WEEK.forEach(day => {
        if (operatingHours[day] && !operatingHours[day].is_closed) {
          formValues[`${day}_open`] = moment(operatingHours[day].open, 'HH:mm');
          formValues[`${day}_close`] = moment(operatingHours[day].close, 'HH:mm');
        }
        formValues[`${day}_closed`] = operatingHours[day]?.is_closed || false;
      });

      form.setFieldsValue(formValues);
    } catch (error) {
      message.error('Failed to load settings');
      console.error('Fetch settings error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      // Build operating hours object
      const operatingHours: Record<string, any> = {};
      DAYS_OF_WEEK.forEach(day => {
        operatingHours[day] = {
          is_closed: values[`${day}_closed`] || false,
          open: values[`${day}_open`] ? values[`${day}_open`].format('HH:mm') : '09:00',
          close: values[`${day}_close`] ? values[`${day}_close`].format('HH:mm') : '21:00'
        };
      });

      const updateData = {
        restaurant_name: values.restaurant_name,
        cuisine_type: values.cuisine_type,
        contact_name: values.contact_name,
        contact_email: values.contact_email,
        contact_phone: values.contact_phone,
        street_address: values.street_address,
        city: values.city,
        state: values.state,
        zip_code: values.zip_code,
        description: values.description,
        seating_capacity: values.seating_capacity,
        avg_prep_time: values.avg_prep_time,
        delivery_available: values.delivery_available,
        pickup_available: values.pickup_available,
        operating_hours: JSON.stringify(operatingHours),
        notification_preferences: values.notification_preferences
      };

      const token = localStorage.getItem('token');
      await axios.patch(`${API_URL}/api/vendors/${vendorId}`, updateData, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      message.success('Settings saved successfully');
      fetchSettings();
    } catch (error) {
      message.error('Failed to save settings');
      console.error('Save settings error:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="vendor-settings" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size="large" tip="Loading settings..." />
      </div>
    );
  }

  if (!vendorId) {
    return (
      <div className="vendor-settings" style={{ padding: '24px', textAlign: 'center' }}>
        <h2>No Vendor Account Found</h2>
        <p>Please log in with a vendor account to access settings.</p>
      </div>
    );
  }

  return (
    <div className="vendor-settings">
      <div className="page-header">
        <h1>Settings</h1>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          loading={saving}
          onClick={handleSave}
        >
          Save Changes
        </Button>
      </div>

      <Form
        form={form}
        layout="vertical"
        initialValues={settings || undefined}
      >
        {/* Restaurant Information */}
        <Card title={<Space><UserOutlined /> Restaurant Information</Space>} className="settings-card">
          <Form.Item
            name="restaurant_name"
            label="Restaurant Name"
            rules={[{ required: true, message: 'Please enter restaurant name' }]}
          >
            <Input placeholder="Enter restaurant name" />
          </Form.Item>

          <Form.Item
            name="cuisine_type"
            label="Cuisine Type"
            rules={[{ required: true, message: 'Please select cuisine type' }]}
          >
            <Select placeholder="Select cuisine type">
              {CUISINE_TYPES.map(cuisine => (
                <Option key={cuisine} value={cuisine}>{cuisine}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
          >
            <TextArea
              rows={4}
              placeholder="Describe your restaurant, specialties, unique features..."
            />
          </Form.Item>

          <Form.Item
            name="seating_capacity"
            label="Seating Capacity"
          >
            <Input type="number" placeholder="Number of seats" />
          </Form.Item>

          <Form.Item
            name="avg_prep_time"
            label="Average Prep Time (minutes)"
          >
            <Input type="number" placeholder="Average time to prepare an order" />
          </Form.Item>
        </Card>

        {/* Contact Information */}
        <Card title="Contact Information" className="settings-card">
          <Form.Item
            name="contact_name"
            label="Contact Name"
            rules={[{ required: true, message: 'Please enter contact name' }]}
          >
            <Input placeholder="Primary contact person" />
          </Form.Item>

          <Form.Item
            name="contact_email"
            label="Email"
            rules={[
              { required: true, message: 'Please enter email' },
              { type: 'email', message: 'Please enter valid email' }
            ]}
          >
            <Input placeholder="contact@restaurant.com" />
          </Form.Item>

          <Form.Item
            name="contact_phone"
            label="Phone"
            rules={[{ required: true, message: 'Please enter phone number' }]}
          >
            <Input placeholder="(555) 123-4567" />
          </Form.Item>
        </Card>

        {/* Location */}
        <Card title={<Space><EnvironmentOutlined /> Location</Space>} className="settings-card">
          <Form.Item
            name="street_address"
            label="Street Address"
            rules={[{ required: true, message: 'Please enter street address' }]}
          >
            <Input placeholder="123 Main Street" />
          </Form.Item>

          <div className="form-row">
            <Form.Item
              name="city"
              label="City"
              rules={[{ required: true, message: 'Please enter city' }]}
            >
              <Input placeholder="City" />
            </Form.Item>

            <Form.Item
              name="state"
              label="State"
              rules={[{ required: true, message: 'Please select state' }]}
            >
              <Select placeholder="State">
                {US_STATES.map(state => (
                  <Option key={state} value={state}>{state}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="zip_code"
              label="ZIP Code"
              rules={[{ required: true, message: 'Please enter ZIP code' }]}
            >
              <Input placeholder="12345" />
            </Form.Item>
          </div>
        </Card>

        {/* Service Options */}
        <Card title="Service Options" className="settings-card">
          <Form.Item
            name="delivery_available"
            label="Delivery Service"
            valuePropName="checked"
          >
            <Switch checkedChildren="Enabled" unCheckedChildren="Disabled" />
          </Form.Item>

          <Form.Item
            name="pickup_available"
            label="Pickup Service"
            valuePropName="checked"
          >
            <Switch checkedChildren="Enabled" unCheckedChildren="Disabled" />
          </Form.Item>
        </Card>

        {/* Operating Hours */}
        <Card title={<Space><ClockCircleOutlined /> Operating Hours</Space>} className="settings-card">
          {DAYS_OF_WEEK.map(day => (
            <div key={day} className="hours-row">
              <div className="day-label">{day.charAt(0).toUpperCase() + day.slice(1)}</div>
              
              <Form.Item
                name={`${day}_closed`}
                valuePropName="checked"
                className="closed-switch"
              >
                <Switch checkedChildren="Closed" unCheckedChildren="Open" />
              </Form.Item>

              <Form.Item
                noStyle
                shouldUpdate={(prev, curr) => prev[`${day}_closed`] !== curr[`${day}_closed`]}
              >
                {({ getFieldValue }) => 
                  !getFieldValue(`${day}_closed`) && (
                    <>
                      <Form.Item name={`${day}_open`} className="time-picker">
                        <TimePicker format="HH:mm" placeholder="Open" />
                      </Form.Item>
                      <span className="time-separator">to</span>
                      <Form.Item name={`${day}_close`} className="time-picker">
                        <TimePicker format="HH:mm" placeholder="Close" />
                      </Form.Item>
                    </>
                  )
                }
              </Form.Item>
            </div>
          ))}
        </Card>

        {/* Notifications */}
        <Card title={<Space><BellOutlined /> Notification Preferences</Space>} className="settings-card">
          <Form.Item
            name={['notification_preferences', 'email_new_orders']}
            label="Email notifications for new orders"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name={['notification_preferences', 'sms_new_orders']}
            label="SMS notifications for new orders"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name={['notification_preferences', 'email_low_stock']}
            label="Email alerts for low stock items"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name={['notification_preferences', 'email_daily_summary']}
            label="Daily summary email"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Card>
      </Form>

      <style>{`
        .vendor-settings {
          padding: 24px;
          max-width: 900px;
          margin: 0 auto;
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .page-header h1 {
          margin: 0;
          font-size: 28px;
        }
        .settings-card {
          margin-bottom: 16px;
        }
        .form-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          gap: 16px;
        }
        .hours-row {
          display: grid;
          grid-template-columns: 120px 100px 1fr;
          gap: 16px;
          align-items: center;
          margin-bottom: 16px;
          padding: 12px;
          background: #fafafa;
          border-radius: 4px;
        }
        .day-label {
          font-weight: 500;
          text-transform: capitalize;
        }
        .closed-switch {
          margin: 0;
        }
        .time-picker {
          margin: 0;
          display: inline-block;
        }
        .time-separator {
          margin: 0 8px;
          color: #999;
        }
      `}</style>
    </div>
  );
};

export default VendorSettings;
