import React, { useState, useEffect } from 'react';
import { Card, List, Button, Typography, Tag, Modal, Form, Input, Select, message, Spin, Empty } from 'antd';
import {
  ArrowLeftOutlined,
  HomeOutlined,
  ShopOutlined,
  EnvironmentOutlined,
  PlusOutlined,
  DeleteOutlined,
  StarOutlined,
  StarFilled,
  EditOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl } from '../../api/api';
import { DollorTheme } from '../../theme';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

/**
 * CustomerAddresses - Manage saved delivery addresses
 * Matches iOS AddressListView.swift for platform parity
 */

interface Address {
  id: number;
  user_id: number;
  location_name: string;
  street: string;
  unit?: string;
  city: string;
  state: string;
  zip_code: string;
  instructions?: string;
  address_type: string;
  latitude?: number;
  longitude?: number;
  phone_number?: string;
  is_default: boolean;
  label?: string;
}

const CustomerAddresses: React.FC = () => {
  const navigate = useNavigate();
  const API_URL = getApiUrl();

  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const customerId = localStorage.getItem('customer_id');

  useEffect(() => {
    if (customerId) {
      fetchAddresses();
    } else {
      message.error('Please log in to view addresses');
      navigate('/customer/login');
    }
  }, [customerId]);

  const fetchAddresses = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('customer_token');
      const response = await axios.get(`${API_URL}/api/addresses/${customerId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setAddresses(response.data || []);
    } catch (error) {
      console.error('Failed to fetch addresses:', error);
      // Try loading from localStorage as fallback
      const savedAddresses = localStorage.getItem('saved_addresses');
      if (savedAddresses) {
        setAddresses(JSON.parse(savedAddresses));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddress = async (values: any) => {
    setSaving(true);
    try {
      const token = localStorage.getItem('customer_token');
      const addressData = {
        location_name: values.location_name,
        street: values.street,
        unit: values.unit,
        city: values.city,
        state: values.state,
        zip_code: values.zip_code,
        instructions: values.instructions,
        address_type: values.address_type || 'Home',
        phone_number: values.phone_number,
        is_default: addresses.length === 0 // First address is default
      };

      if (editingAddress) {
        // Update existing address
        await axios.put(
          `${API_URL}/api/addresses/${customerId}/${editingAddress.id}`,
          addressData,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );
        message.success('Address updated');
      } else {
        // Add new address
        await axios.post(
          `${API_URL}/api/addresses/${customerId}`,
          addressData,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );
        message.success('Address added');
      }

      setShowAddModal(false);
      setEditingAddress(null);
      form.resetFields();
      fetchAddresses();
    } catch (error) {
      console.error('Failed to save address:', error);
      message.error('Failed to save address');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAddress = async (address: Address) => {
    Modal.confirm({
      title: 'Delete Address',
      content: `Are you sure you want to delete "${address.location_name}"?`,
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const token = localStorage.getItem('customer_token');
          await axios.delete(`${API_URL}/api/addresses/${customerId}/${address.id}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          message.success('Address deleted');
          fetchAddresses();
        } catch (error) {
          console.error('Failed to delete address:', error);
          message.error('Failed to delete address');
        }
      }
    });
  };

  const handleSetDefault = async (address: Address) => {
    try {
      const token = localStorage.getItem('customer_token');
      await axios.post(
        `${API_URL}/api/addresses/${customerId}/${address.id}/set-default`,
        {},
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      message.success('Default address updated');
      fetchAddresses();
    } catch (error) {
      console.error('Failed to set default address:', error);
      message.error('Failed to set default address');
    }
  };

  const openEditModal = (address: Address) => {
    setEditingAddress(address);
    form.setFieldsValue({
      location_name: address.location_name,
      address_type: address.address_type,
      street: address.street,
      unit: address.unit,
      city: address.city,
      state: address.state,
      zip_code: address.zip_code,
      instructions: address.instructions,
      phone_number: address.phone_number
    });
    setShowAddModal(true);
  };

  const getAddressIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'home': return <HomeOutlined />;
      case 'work': return <ShopOutlined />;
      default: return <EnvironmentOutlined />;
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
      </div>
    );
  }

  return (
    <div className="addresses-screen">
      {/* Header */}
      <div className="screen-header">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
          className="back-btn"
        />
        <Title level={4} style={{ margin: 0 }}>Saved Addresses</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingAddress(null);
            form.resetFields();
            setShowAddModal(true);
          }}
          style={{ background: DollorTheme.Brand.green }}
        >
          Add
        </Button>
      </div>

      {/* Address List */}
      {addresses.length === 0 ? (
        <Card className="empty-card">
          <Empty
            image={<EnvironmentOutlined style={{ fontSize: 64, color: DollorTheme.Text.tertiary }} />}
            description={
              <div>
                <Text strong style={{ fontSize: 16 }}>No saved addresses</Text>
                <br />
                <Text type="secondary">Add an address to get started</Text>
              </div>
            }
          >
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setShowAddModal(true)}
              style={{ background: DollorTheme.Brand.green }}
            >
              Add Address
            </Button>
          </Empty>
        </Card>
      ) : (
        <Card className="addresses-card">
          <List
            dataSource={addresses}
            renderItem={(address) => (
              <List.Item className="address-item">
                <div className="address-content">
                  <div className="address-icon" style={{ color: DollorTheme.Brand.orange }}>
                    {getAddressIcon(address.address_type)}
                  </div>
                  <div className="address-details">
                    <div className="address-header">
                      <Text strong>{address.location_name}</Text>
                      {address.is_default && (
                        <Tag color="green" style={{ marginLeft: 8 }}>Default</Tag>
                      )}
                    </div>
                    <Text type="secondary" className="address-text">
                      {address.street}
                      {address.unit && `, ${address.unit}`}
                      {address.city && `, ${address.city}`}
                      {address.state && `, ${address.state}`}
                      {address.zip_code && ` ${address.zip_code}`}
                    </Text>
                    {address.instructions && (
                      <Text type="secondary" className="address-instructions">
                        Note: {address.instructions}
                      </Text>
                    )}
                  </div>
                  <div className="address-actions">
                    {!address.is_default && (
                      <Button
                        type="text"
                        icon={<StarOutlined />}
                        onClick={() => handleSetDefault(address)}
                        title="Set as default"
                      />
                    )}
                    {address.is_default && (
                      <StarFilled style={{ color: DollorTheme.Brand.orange, padding: '8px' }} />
                    )}
                    <Button
                      type="text"
                      icon={<EditOutlined />}
                      onClick={() => openEditModal(address)}
                    />
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDeleteAddress(address)}
                    />
                  </div>
                </div>
              </List.Item>
            )}
          />
        </Card>
      )}

      {/* Add/Edit Address Modal */}
      <Modal
        title={editingAddress ? 'Edit Address' : 'Add Address'}
        open={showAddModal}
        onCancel={() => {
          setShowAddModal(false);
          setEditingAddress(null);
          form.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddAddress}
          initialValues={{ address_type: 'Home', location_name: 'Home' }}
        >
          <Form.Item
            name="location_name"
            label="Label"
            rules={[{ required: true, message: 'Please enter a label' }]}
          >
            <Input placeholder="e.g., Home, Office, Mom's House" />
          </Form.Item>

          <Form.Item
            name="address_type"
            label="Address Type"
          >
            <Select>
              <Option value="Home">Home</Option>
              <Option value="Work">Work</Option>
              <Option value="Other">Other</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="street"
            label="Street Address"
            rules={[{ required: true, message: 'Please enter street address' }]}
          >
            <Input placeholder="123 Main Street" />
          </Form.Item>

          <Form.Item
            name="unit"
            label="Apt/Suite/Unit (Optional)"
          >
            <Input placeholder="Apt 4B" />
          </Form.Item>

          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              name="city"
              label="City"
              rules={[{ required: true, message: 'Required' }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="City" />
            </Form.Item>

            <Form.Item
              name="state"
              label="State"
              rules={[{ required: true, message: 'Required' }]}
              style={{ width: 100 }}
            >
              <Input placeholder="CA" maxLength={2} />
            </Form.Item>

            <Form.Item
              name="zip_code"
              label="ZIP Code"
              rules={[{ required: true, message: 'Required' }]}
              style={{ width: 120 }}
            >
              <Input placeholder="12345" maxLength={10} />
            </Form.Item>
          </div>

          <Form.Item
            name="phone_number"
            label="Phone Number (Optional)"
          >
            <Input placeholder="(555) 123-4567" />
          </Form.Item>

          <Form.Item
            name="instructions"
            label="Delivery Instructions (Optional)"
          >
            <TextArea
              rows={2}
              placeholder="Gate code, leave at door, etc."
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={saving}
              block
              size="large"
              style={{ background: DollorTheme.Brand.green }}
            >
              {editingAddress ? 'Update Address' : 'Save Address'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <style>{`
        .addresses-screen {
          max-width: 800px;
          margin: 0 auto;
          padding: 0 16px 24px 16px;
          background: ${DollorTheme.Background.primary};
          min-height: 100vh;
        }

        .screen-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 0;
          position: sticky;
          top: 0;
          background: ${DollorTheme.Background.primary};
          z-index: 10;
        }

        .back-btn {
          font-size: 18px;
        }

        .loading-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 400px;
        }

        .empty-card {
          border-radius: 12px;
          box-shadow: ${DollorTheme.Shadow.card};
          text-align: center;
          padding: 40px 20px;
        }

        .addresses-card {
          border-radius: 12px;
          box-shadow: ${DollorTheme.Shadow.card};
        }

        .addresses-card .ant-card-body {
          padding: 0;
        }

        .address-item {
          padding: 16px 20px !important;
          border-bottom: 1px solid ${DollorTheme.Border.light};
          transition: background 0.2s;
        }

        .address-item:last-child {
          border-bottom: none;
        }

        .address-item:hover {
          background: ${DollorTheme.Background.tertiary};
        }

        .address-content {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          width: 100%;
        }

        .address-icon {
          font-size: 24px;
          padding-top: 4px;
        }

        .address-details {
          flex: 1;
          min-width: 0;
        }

        .address-header {
          display: flex;
          align-items: center;
          margin-bottom: 4px;
        }

        .address-text {
          display: block;
          font-size: 14px;
          line-height: 1.5;
        }

        .address-instructions {
          display: block;
          font-size: 12px;
          margin-top: 4px;
          font-style: italic;
        }

        .address-actions {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        @media (max-width: 576px) {
          .screen-header {
            padding: 12px 0;
          }

          .address-content {
            flex-wrap: wrap;
          }

          .address-actions {
            width: 100%;
            justify-content: flex-end;
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px dashed ${DollorTheme.Border.light};
          }
        }
      `}</style>
    </div>
  );
};

export default CustomerAddresses;
