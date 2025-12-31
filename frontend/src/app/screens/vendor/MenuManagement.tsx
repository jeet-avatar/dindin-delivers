import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, InputNumber, Select, Upload, Switch, message, Space, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import axios from 'axios';

const { TextArea } = Input;
const { Option } = Select;

interface MenuItem {
  id: number;
  item_name: string;
  description: string;
  category: string;
  price: number;
  is_available: boolean;
  is_vegetarian: boolean;
  is_vegan: boolean;
  is_gluten_free: boolean;
  is_spicy: boolean;
  spice_level: number;
  prep_time: number;
  calories: number;
  image_url: string;
  in_stock: boolean;
}

const VendorMenuManagement: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [form] = Form.useForm();

  const vendorId = 1; // Get from auth context

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`https://api.dollor.ai/api/vendors/${vendorId}/menu`);
      setMenuItems(response.data);
    } catch (error) {
      message.error('Failed to fetch menu items');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingItem(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    form.setFieldsValue(item);
    setModalVisible(true);
  };

  const handleDelete = async (itemId: number) => {
    Modal.confirm({
      title: 'Delete Menu Item',
      content: 'Are you sure you want to delete this item?',
      onOk: async () => {
        try {
          await axios.delete(`https://api.dollor.ai/api/vendors/${vendorId}/menu/${itemId}`);
          message.success('Item deleted successfully');
          fetchMenuItems();
        } catch (error) {
          message.error('Failed to delete item');
        }
      }
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingItem) {
        // Update existing item
        await axios.put(`https://api.dollor.ai/api/vendors/${vendorId}/menu/${editingItem.id}`, values);
        message.success('Menu item updated successfully');
      } else {
        // Create new item
        await axios.post(`https://api.dollor.ai/api/vendors/${vendorId}/menu`, values);
        message.success('Menu item added successfully');
      }
      
      setModalVisible(false);
      fetchMenuItems();
    } catch (error) {
      message.error('Failed to save menu item');
      console.error(error);
    }
  };

  const columns = [
    {
      title: 'Image',
      dataIndex: 'image_url',
      key: 'image_url',
      width: 80,
      render: (url: string, record: MenuItem) => (
        <div className="menu-item-image">
          {url ? (
            <img src={url} alt={record.item_name} />
          ) : (
            <div className="no-image">No Image</div>
          )}
        </div>
      )
    },
    {
      title: 'Item Name',
      dataIndex: 'item_name',
      key: 'item_name',
      render: (text: string) => <strong>{text}</strong>
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category'
    },
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => `$${price.toFixed(2)}`
    },
    {
      title: 'Prep Time',
      dataIndex: 'prep_time',
      key: 'prep_time',
      render: (time: number) => `${time} min`
    },
    {
      title: 'Tags',
      key: 'tags',
      render: (_: any, record: MenuItem) => (
        <Space size="small" wrap>
          {record.is_vegetarian && <Tag color="green">Vegetarian</Tag>}
          {record.is_vegan && <Tag color="green">Vegan</Tag>}
          {record.is_gluten_free && <Tag color="blue">Gluten-Free</Tag>}
          {record.is_spicy && <Tag color="red">Spicy</Tag>}
        </Space>
      )
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, record: MenuItem) => (
        <Space direction="vertical" size="small">
          <Tag color={record.is_available ? 'green' : 'red'}>
            {record.is_available ? 'Available' : 'Unavailable'}
          </Tag>
          <Tag color={record.in_stock ? 'blue' : 'orange'}>
            {record.in_stock ? 'In Stock' : 'Out of Stock'}
          </Tag>
        </Space>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: MenuItem) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Edit
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            Delete
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div className="vendor-menu-management">
      <div className="page-header">
        <h1>Menu Management</h1>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAdd}
        >
          Add Menu Item
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={menuItems}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
        />
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        title={editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={700}
        okText="Save"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Item Name"
            name="item_name"
            rules={[{ required: true, message: 'Please enter item name' }]}
          >
            <Input placeholder="Margherita Pizza" />
          </Form.Item>

          <Form.Item
            label="Description"
            name="description"
            rules={[{ required: true, message: 'Please enter description' }]}
          >
            <TextArea rows={3} placeholder="Fresh tomatoes, mozzarella, basil..." />
          </Form.Item>

          <Form.Item
            label="Category"
            name="category"
            rules={[{ required: true, message: 'Please select category' }]}
          >
            <Select placeholder="Select category">
              <Option value="Appetizers">Appetizers</Option>
              <Option value="Main Course">Main Course</Option>
              <Option value="Desserts">Desserts</Option>
              <Option value="Beverages">Beverages</Option>
              <Option value="Sides">Sides</Option>
            </Select>
          </Form.Item>

          <Space size="large" className="form-row">
            <Form.Item
              label="Price"
              name="price"
              rules={[{ required: true, message: 'Please enter price' }]}
            >
              <InputNumber
                prefix="$"
                min={0}
                step={0.01}
                precision={2}
                placeholder="15.99"
              />
            </Form.Item>

            <Form.Item
              label="Prep Time (min)"
              name="prep_time"
              rules={[{ required: true, message: 'Please enter prep time' }]}
            >
              <InputNumber min={0} placeholder="30" />
            </Form.Item>

            <Form.Item
              label="Calories"
              name="calories"
            >
              <InputNumber min={0} placeholder="500" />
            </Form.Item>
          </Space>

          <Form.Item label="Dietary Tags">
            <Space direction="vertical" size="small">
              <Form.Item name="is_vegetarian" valuePropName="checked" noStyle>
                <Switch /> <span className="switch-label">Vegetarian</span>
              </Form.Item>
              <Form.Item name="is_vegan" valuePropName="checked" noStyle>
                <Switch /> <span className="switch-label">Vegan</span>
              </Form.Item>
              <Form.Item name="is_gluten_free" valuePropName="checked" noStyle>
                <Switch /> <span className="switch-label">Gluten-Free</span>
              </Form.Item>
            </Space>
          </Form.Item>

          <Form.Item label="Spicy">
            <Space>
              <Form.Item name="is_spicy" valuePropName="checked" noStyle>
                <Switch />
              </Form.Item>
              <Form.Item name="spice_level" noStyle>
                <Select placeholder="Level" className="spice-level">
                  <Option value={1}>Mild</Option>
                  <Option value={2}>Medium</Option>
                  <Option value={3}>Hot</Option>
                  <Option value={4}>Extra Hot</Option>
                  <Option value={5}>Extreme</Option>
                </Select>
              </Form.Item>
            </Space>
          </Form.Item>

          <Form.Item label="Availability">
            <Space direction="vertical" size="small">
              <Form.Item name="is_available" valuePropName="checked" noStyle initialValue={true}>
                <Switch /> <span className="switch-label">Available for ordering</span>
              </Form.Item>
              <Form.Item name="in_stock" valuePropName="checked" noStyle initialValue={true}>
                <Switch /> <span className="switch-label">In stock</span>
              </Form.Item>
            </Space>
          </Form.Item>

          <Form.Item
            label="Item Photo"
            name="image_url"
          >
            <Input placeholder="https://example.com/image.jpg" />
            <p className="field-note">Enter image URL or upload below</p>
          </Form.Item>

          <Form.Item label="Upload Photo">
            <Upload
              listType="picture-card"
              maxCount={1}
            >
              <div>
                <UploadOutlined />
                <div className="upload-text">Upload</div>
              </div>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      <style>{`
        .vendor-menu-management {
          padding: 24px;
          max-width: 1400px;
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
        .menu-item-image {
          width: 60px;
          height: 60px;
          border-radius: 4px;
          overflow: hidden;
        }
        .menu-item-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .no-image {
          width: 100%;
          height: 100%;
          background: #f0f0f0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          color: #999;
        }
        .form-row {
          width: 100%;
          display: flex;
          gap: 16px;
        }
        .form-row .ant-form-item {
          flex: 1;
        }
        .switch-label {
          margin-left: 8px;
        }
        .spice-level {
          width: 120px;
          margin-left: 8px;
        }
        .field-note {
          margin: 4px 0 0 0;
          font-size: 12px;
          color: #666;
        }
        .upload-text {
          margin-top: 8px;
          font-size: 12px;
        }
      `}</style>
    </div>
  );
};

export default VendorMenuManagement;
