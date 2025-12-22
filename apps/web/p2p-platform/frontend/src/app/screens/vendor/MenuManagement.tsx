import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, InputNumber, Select, Upload, Switch, message, Space, Tag, Alert, Progress, Checkbox, Divider, Tabs, Badge, Tooltip, Steps, Row, Col, Statistic } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, GlobalOutlined, RobotOutlined, FileTextOutlined, CheckCircleOutlined, CloseCircleOutlined, SafetyOutlined, GiftOutlined, RocketOutlined, ExclamationCircleOutlined, DollarOutlined, PercentageOutlined, ThunderboltOutlined, PlayCircleOutlined, PauseCircleOutlined, MessageOutlined } from '@ant-design/icons';
import axios from 'axios';
import { getApiUrl, getCurrentVendorId } from '../../api/api';

const API_URL = getApiUrl();

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

interface ScrapedItem {
  id: number;
  name: string;
  description: string;
  category: string;
  price: number;
  is_vegetarian: boolean;
  is_vegan: boolean;
  is_gluten_free: boolean;
  is_spicy: boolean;
  image_url: string;
  confidence_score: number;
  needs_review: boolean;
  selected: boolean;
}

interface Discrepancy {
  item_id: number;
  item_name: string;
  current_price: number;
  source_price: number;
  difference: number;
  status: string;
  suggestion: string;
}

interface BundleSuggestion {
  id: string;
  name: string;
  description: string;
  type: string;
  items: { id: number; name: string; price: number }[];
  original_price: number;
  bundle_price: number;
  savings: number;
  discount_percentage: number;
  ai_reason: string;
  projected_orders_increase: string;
  availability?: string;
}

interface AIMessage {
  id: string;
  type: string;
  from: string;
  avatar: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  action?: { label: string; url: string };
}

const VendorMenuManagement: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [form] = Form.useForm();

  // Auto-import from website state
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [scrapedItems, setScrapedItems] = useState<ScrapedItem[]>([]);
  const [scraping, setScraping] = useState(false);
  const [scrapingProgress, setScrapingProgress] = useState(0);
  const [scrapingStatus, setScrapingStatus] = useState('');

  // Verification & Activation state
  const [activeTab, setActiveTab] = useState('menu');
  const [verificationStatus, setVerificationStatus] = useState<any>(null);
  const [discrepancies, setDiscrepancies] = useState<Discrepancy[]>([]);
  const [bundleSuggestions, setBundleSuggestions] = useState<BundleSuggestion[]>([]);
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
  const [menuStatus, setMenuStatus] = useState<'draft' | 'pending_verification' | 'verified' | 'active' | 'paused'>('draft');
  const [verificationModalVisible, setVerificationModalVisible] = useState(false);
  const [bundleModalVisible, setBundleModalVisible] = useState(false);
  const [acceptedBundles, setAcceptedBundles] = useState<string[]>([]);
  const [editingBundlePrice, setEditingBundlePrice] = useState<{ [key: string]: number }>({});

  const vendorId = getCurrentVendorId();

  useEffect(() => {
    if (vendorId) {
      fetchMenuItems();
    }
  }, [vendorId]);

  const fetchMenuItems = async () => {
    if (!vendorId) {
      message.error('Not authenticated. Please log in again.');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/vendors/${vendorId}/menu`);
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
          await axios.delete(`${API_URL}/api/vendors/${vendorId}/menu/${itemId}`);
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
        await axios.put(`${API_URL}/api/vendors/${vendorId}/menu/${editingItem.id}`, values);
        message.success('Menu item updated successfully');
      } else {
        // Create new item
        await axios.post(`${API_URL}/api/vendors/${vendorId}/menu`, values);
        message.success('Menu item added successfully');
      }

      setModalVisible(false);
      fetchMenuItems();
    } catch (error) {
      message.error('Failed to save menu item');
      console.error(error);
    }
  };

  // Auto-import from website functions
  const handleOpenImport = () => {
    setWebsiteUrl('');
    setScrapedItems([]);
    setScrapingProgress(0);
    setScrapingStatus('');
    setImportModalVisible(true);
  };

  const handleScrapeWebsite = async () => {
    if (!websiteUrl) {
      message.error('Please enter a website URL');
      return;
    }

    setScraping(true);
    setScrapingProgress(10);
    setScrapingStatus('Connecting to website...');

    try {
      // Simulate progress updates
      const progressSteps = [
        { progress: 30, status: 'Analyzing page structure...' },
        { progress: 50, status: 'Extracting menu items...' },
        { progress: 70, status: 'Processing prices and descriptions...' },
        { progress: 90, status: 'Categorizing items...' },
      ];

      for (const step of progressSteps) {
        await new Promise(resolve => setTimeout(resolve, 800));
        setScrapingProgress(step.progress);
        setScrapingStatus(step.status);
      }

      // Call the backend API
      const response = await axios.post(`${API_URL}/api/onboarding/scrape-menu`, {
        website_url: websiteUrl,
        vendor_id: vendorId
      });

      setScrapingProgress(100);

      if (response.data.success && response.data.items.length > 0) {
        setScrapingStatus('Menu items found!');

        // Add selected property to each item
        const itemsWithSelection = response.data.items.map((item: any, index: number) => ({
          ...item,
          id: index,
          selected: true,
          confidence_score: item.confidence || item.confidence_score || 0.75,
          needs_review: item.needs_review || (item.confidence || item.confidence_score || 0.75) < 0.7
        }));

        setScrapedItems(itemsWithSelection);
        message.success(`Found ${itemsWithSelection.length} menu items!`);
      } else {
        setScrapingStatus('No items found');
        setScrapedItems([]);
        message.warning(response.data.message || 'No menu items found on this page. The menu might use images or PDFs.');
      }
    } catch (error: any) {
      setScrapingProgress(100);
      setScrapingStatus('Scan failed');
      setScrapedItems([]);
      message.error(error.response?.data?.message || 'Failed to scan website. Please check the URL and try again.');
    } finally {
      setScraping(false);
    }
  };

  const handleToggleItem = (itemId: number) => {
    setScrapedItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, selected: !item.selected } : item
    ));
  };

  const handleSelectAll = (selected: boolean) => {
    setScrapedItems(prev => prev.map(item => ({ ...item, selected })));
  };

  const handleConfirmImport = async () => {
    const selectedItems = scrapedItems.filter(item => item.selected);

    if (selectedItems.length === 0) {
      message.error('Please select at least one item to import');
      return;
    }

    setLoading(true);
    try {
      // Add each selected item to the menu
      for (const item of selectedItems) {
        await axios.post(`${API_URL}/api/vendors/${vendorId}/menu`, {
          item_name: item.name,
          description: item.description,
          category: item.category,
          price: item.price,
          is_vegetarian: item.is_vegetarian,
          is_vegan: item.is_vegan,
          is_gluten_free: item.is_gluten_free,
          is_spicy: item.is_spicy,
          image_url: item.image_url,
          is_available: true,
          in_stock: true,
          prep_time: 20,
          calories: 0,
          spice_level: item.is_spicy ? 2 : 0
        });
      }

      message.success(`Successfully imported ${selectedItems.length} menu items!`);
      setImportModalVisible(false);
      fetchMenuItems();
    } catch (error) {
      message.error('Failed to import some items');
    } finally {
      setLoading(false);
    }
  };

  // Verification & Activation functions
  const fetchVerificationStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/menu-verification/status/${vendorId}`);
      setVerificationStatus(response.data);
      setDiscrepancies(response.data.discrepancies || []);
      if (response.data.can_activate) {
        setMenuStatus('verified');
      } else if (response.data.discrepancies_count > 0) {
        setMenuStatus('pending_verification');
      }
    } catch (error) {
      console.error('Failed to fetch verification status', error);
    }
  };

  const fetchBundleSuggestions = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/menu-verification/bundle-suggestions/${vendorId}`);
      setBundleSuggestions(response.data.suggestions || []);
    } catch (error) {
      console.error('Failed to fetch bundle suggestions', error);
    }
  };

  const fetchAiMessages = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/menu-verification/messages/${vendorId}`);
      setAiMessages(response.data.messages || []);
    } catch (error) {
      console.error('Failed to fetch AI messages', error);
    }
  };

  const handleUpdatePrice = async (itemId: number, newPrice: number) => {
    try {
      await axios.post('${API_URL}/api/menu-verification/update-price', {
        item_id: itemId,
        new_price: newPrice
      });
      message.success('Price updated successfully');
      fetchVerificationStatus();
      fetchMenuItems();
    } catch (error) {
      message.error('Failed to update price');
    }
  };

  const handleApproveAllPrices = async () => {
    try {
      const response = await axios.post(`${API_URL}/api/menu-verification/approve-all/${vendorId}`);
      if (response.data.success) {
        message.success(response.data.message || 'All prices approved by Aria!');
        setMenuStatus('verified');
        setDiscrepancies([]);  // Clear all discrepancies immediately
        setVerificationStatus({
          ...verificationStatus,
          can_activate: true,
          discrepancies_count: 0,
          status: 'verified'
        });
      }
    } catch (error) {
      message.error('Failed to approve prices');
    }
  };

  const handleAcceptBundle = async (bundleId: string, customPrice?: number) => {
    try {
      const bundle = bundleSuggestions.find(b => b.id === bundleId);
      await axios.post(`${API_URL}/api/menu-verification/accept-bundle?vendor_id=${vendorId}`, {
        bundle_id: bundleId,
        accepted: true,
        custom_price: customPrice || bundle?.bundle_price,
        custom_name: bundle?.name
      });
      setAcceptedBundles([...acceptedBundles, bundleId]);
      message.success(`Bundle "${bundle?.name}" created!`);
    } catch (error) {
      message.error('Failed to accept bundle');
    }
  };

  const handleRejectBundle = async (bundleId: string) => {
    try {
      await axios.post(`${API_URL}/api/menu-verification/accept-bundle?vendor_id=${vendorId}`, {
        bundle_id: bundleId,
        accepted: false
      });
      setBundleSuggestions(bundleSuggestions.filter(b => b.id !== bundleId));
      message.info('Bundle suggestion dismissed');
    } catch (error) {
      message.error('Failed to reject bundle');
    }
  };

  const handleActivateMenu = async () => {
    try {
      const response = await axios.post(`${API_URL}/api/menu-verification/activate/${vendorId}`);
      setMenuStatus('active');
      message.success(response.data.message || 'Menu is now LIVE!');
    } catch (error) {
      message.error('Failed to activate menu');
    }
  };

  const handlePauseMenu = async () => {
    try {
      await axios.post(`${API_URL}/api/menu-verification/pause/${vendorId}`);
      setMenuStatus('paused');
      message.info('Menu paused. Customers cannot order right now.');
    } catch (error) {
      message.error('Failed to pause menu');
    }
  };

  const openVerificationDashboard = () => {
    fetchVerificationStatus();
    fetchBundleSuggestions();
    fetchAiMessages();
    setVerificationModalVisible(true);
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
        <div className="page-header-left">
          <h1>Menu Management</h1>
          {menuItems.length > 0 && (
            <Tag color={
              menuStatus === 'active' ? 'green' :
              menuStatus === 'verified' ? 'blue' :
              menuStatus === 'paused' ? 'orange' :
              menuStatus === 'pending_verification' ? 'gold' : 'default'
            } style={{ marginLeft: 12, fontSize: 14, padding: '4px 12px' }}>
              {menuStatus === 'active' ? 'LIVE' :
               menuStatus === 'verified' ? 'Ready to Activate' :
               menuStatus === 'paused' ? 'Paused' :
               menuStatus === 'pending_verification' ? 'Needs Review' : 'Draft'}
            </Tag>
          )}
        </div>
        <Space>
          {menuItems.length > 0 && (
            <>
              <Badge count={discrepancies.length} offset={[-5, 5]}>
                <Button
                  icon={<SafetyOutlined />}
                  onClick={openVerificationDashboard}
                  className="verify-button"
                >
                  Verify & Activate
                </Button>
              </Badge>
              {menuStatus === 'active' ? (
                <Button
                  icon={<PauseCircleOutlined />}
                  onClick={handlePauseMenu}
                  danger
                >
                  Pause Menu
                </Button>
              ) : menuStatus === 'verified' ? (
                <Button
                  type="primary"
                  icon={<RocketOutlined />}
                  onClick={handleActivateMenu}
                  className="activate-button"
                >
                  Go Live!
                </Button>
              ) : null}
            </>
          )}
          <Button
            type="default"
            icon={<GlobalOutlined />}
            onClick={handleOpenImport}
            className="import-button"
          >
            Import from Website
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            Add Menu Item
          </Button>
        </Space>
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

      {/* Auto-Import from Website Modal */}
      <Modal
        title={
          <Space>
            <RobotOutlined style={{ color: '#1890ff' }} />
            <span>Auto-Import Menu from Website</span>
          </Space>
        }
        open={importModalVisible}
        onCancel={() => setImportModalVisible(false)}
        width={900}
        footer={
          scrapedItems.length > 0 ? [
            <Button key="cancel" onClick={() => setImportModalVisible(false)}>
              Cancel
            </Button>,
            <Button
              key="import"
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={handleConfirmImport}
              loading={loading}
            >
              Import {scrapedItems.filter(i => i.selected).length} Items
            </Button>
          ] : null
        }
      >
        <Alert
          message="AI-Powered Menu Import"
          description="Enter your restaurant's website URL and Nova (our AI) will automatically extract your menu items, prices, and descriptions."
          type="info"
          showIcon
          icon={<RobotOutlined />}
          style={{ marginBottom: 24 }}
        />

        <div className="import-url-section">
          <Input
            size="large"
            placeholder="https://your-restaurant-website.com/menu"
            prefix={<GlobalOutlined />}
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            disabled={scraping}
          />
          <Button
            type="primary"
            size="large"
            icon={<FileTextOutlined />}
            onClick={handleScrapeWebsite}
            loading={scraping}
            style={{ marginLeft: 12 }}
          >
            {scraping ? 'Scanning...' : 'Scan Menu'}
          </Button>
        </div>

        {scraping && (
          <div className="scraping-progress">
            <Progress percent={scrapingProgress} status="active" />
            <p className="scraping-status">{scrapingStatus}</p>
          </div>
        )}

        {scrapedItems.length > 0 && (
          <div className="scraped-items-section">
            <Divider />
            <div className="scraped-items-header">
              <h3>Found {scrapedItems.length} Menu Items</h3>
              <Space>
                <Checkbox
                  checked={scrapedItems.every(i => i.selected)}
                  indeterminate={scrapedItems.some(i => i.selected) && !scrapedItems.every(i => i.selected)}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                >
                  Select All
                </Checkbox>
              </Space>
            </div>

            <div className="scraped-items-list">
              {scrapedItems.map(item => (
                <div
                  key={item.id}
                  className={`scraped-item ${item.selected ? 'selected' : ''} ${item.needs_review ? 'needs-review' : ''}`}
                  onClick={() => handleToggleItem(item.id)}
                >
                  <Checkbox checked={item.selected} />
                  <div className="scraped-item-content">
                    <div className="scraped-item-header">
                      <span className="item-name">{item.name}</span>
                      <span className="item-price">${item.price.toFixed(2)}</span>
                    </div>
                    <p className="item-description">{item.description}</p>
                    <div className="item-tags">
                      <Tag color="blue">{item.category}</Tag>
                      {item.is_vegetarian && <Tag color="green">Vegetarian</Tag>}
                      {item.is_vegan && <Tag color="green">Vegan</Tag>}
                      {item.is_gluten_free && <Tag color="cyan">Gluten-Free</Tag>}
                      {item.is_spicy && <Tag color="red">Spicy</Tag>}
                      <Tag color={item.confidence_score > 0.8 ? 'green' : 'orange'}>
                        {Math.round(item.confidence_score * 100)}% confidence
                      </Tag>
                      {item.needs_review && (
                        <Tag color="warning" icon={<CloseCircleOutlined />}>
                          Needs Review
                        </Tag>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* Verification & Activation Dashboard Modal */}
      <Modal
        title={
          <Space>
            <SafetyOutlined style={{ color: '#52c41a' }} />
            <span>Menu Verification & Activation</span>
            <Tag color="purple">AI Employee: Aria</Tag>
          </Space>
        }
        open={verificationModalVisible}
        onCancel={() => setVerificationModalVisible(false)}
        width={1000}
        footer={null}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'verification',
              label: (
                <span>
                  <SafetyOutlined />
                  Price Verification
                  {discrepancies.length > 0 && <Badge count={discrepancies.length} style={{ marginLeft: 8 }} />}
                </span>
              ),
              children: (
                <div className="verification-tab">
                  {/* Status Overview */}
                  <Row gutter={16} style={{ marginBottom: 24 }}>
                    <Col span={6}>
                      <Card>
                        <Statistic
                          title="Total Items"
                          value={verificationStatus?.items_count || menuItems.length}
                          prefix={<FileTextOutlined />}
                        />
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card>
                        <Statistic
                          title="Verified"
                          value={verificationStatus?.verified_count || 0}
                          prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                          valueStyle={{ color: '#52c41a' }}
                        />
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card>
                        <Statistic
                          title="Needs Review"
                          value={discrepancies.length}
                          prefix={<ExclamationCircleOutlined style={{ color: '#faad14' }} />}
                          valueStyle={{ color: '#faad14' }}
                        />
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card>
                        <Statistic
                          title="Status"
                          value={verificationStatus?.can_activate ? 'Ready' : 'Review'}
                          valueStyle={{ color: verificationStatus?.can_activate ? '#52c41a' : '#faad14' }}
                        />
                      </Card>
                    </Col>
                  </Row>

                  {discrepancies.length > 0 ? (
                    <>
                      <Alert
                        message="Price Discrepancies Found"
                        description="Aria found some prices that may have changed on the source website. Please review and update if needed."
                        type="warning"
                        showIcon
                        style={{ marginBottom: 16 }}
                        action={
                          <Button size="small" onClick={handleApproveAllPrices}>
                            Approve All Current Prices
                          </Button>
                        }
                      />
                      <div className="discrepancy-list">
                        {discrepancies.map((item) => (
                          <div key={item.item_id} className="discrepancy-item">
                            <div className="discrepancy-info">
                              <span className="item-name">{item.item_name}</span>
                              <div className="price-comparison">
                                <span className="current-price">Current: ${item.current_price.toFixed(2)}</span>
                                <span className="arrow">→</span>
                                <span className="source-price">Source: ${item.source_price.toFixed(2)}</span>
                                <Tag color={item.difference > 0 ? 'red' : 'green'}>
                                  {item.difference > 0 ? '+' : ''}{item.difference.toFixed(2)}
                                </Tag>
                              </div>
                              <p className="suggestion">{item.suggestion}</p>
                            </div>
                            <Space>
                              <Tooltip title="Update to source price">
                                <Button
                                  size="small"
                                  type="primary"
                                  onClick={() => handleUpdatePrice(item.item_id, item.source_price)}
                                >
                                  Use ${item.source_price.toFixed(2)}
                                </Button>
                              </Tooltip>
                              <Tooltip title="Keep current price">
                                <Button
                                  size="small"
                                  onClick={() => {
                                    setDiscrepancies(discrepancies.filter(d => d.item_id !== item.item_id));
                                    message.success('Price kept as-is');
                                  }}
                                >
                                  Keep Current
                                </Button>
                              </Tooltip>
                            </Space>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <Alert
                      message="All Prices Verified!"
                      description="Aria has verified all menu item prices. Your menu is ready for bundle creation or activation."
                      type="success"
                      showIcon
                      icon={<CheckCircleOutlined />}
                    />
                  )}
                </div>
              ),
            },
            {
              key: 'bundles',
              label: (
                <span>
                  <GiftOutlined />
                  AI Bundle Suggestions
                </span>
              ),
              children: (
                <div className="bundles-tab">
                  <Alert
                    message="Smart Bundle Suggestions"
                    description="Aria analyzed your menu and created bundle suggestions to increase your orders. Accept, customize, or dismiss each suggestion."
                    type="info"
                    showIcon
                    icon={<ThunderboltOutlined />}
                    style={{ marginBottom: 24 }}
                  />

                  {bundleSuggestions.length > 0 ? (
                    <div className="bundle-list">
                      {bundleSuggestions.map((bundle) => (
                        <Card
                          key={bundle.id}
                          className={`bundle-card ${acceptedBundles.includes(bundle.id) ? 'accepted' : ''}`}
                          style={{ marginBottom: 16 }}
                        >
                          <div className="bundle-header">
                            <div>
                              <h3>{bundle.name}</h3>
                              <Tag color={
                                bundle.type === 'combo' ? 'blue' :
                                bundle.type === 'family' ? 'purple' :
                                bundle.type === 'lunch' ? 'orange' : 'cyan'
                              }>
                                {bundle.type.toUpperCase()}
                              </Tag>
                              {bundle.availability && <Tag color="gold">{bundle.availability}</Tag>}
                            </div>
                            <div className="bundle-stats">
                              <Statistic
                                title="Projected Increase"
                                value={bundle.projected_orders_increase}
                                valueStyle={{ color: '#52c41a', fontSize: 18 }}
                              />
                            </div>
                          </div>

                          <p className="bundle-description">{bundle.description}</p>

                          <div className="bundle-items">
                            {bundle.items.map((item) => (
                              <Tag key={item.id}>{item.name} (${item.price.toFixed(2)})</Tag>
                            ))}
                          </div>

                          <div className="bundle-pricing">
                            <div className="price-details">
                              <span className="original">Original: <s>${bundle.original_price.toFixed(2)}</s></span>
                              <span className="bundle-price">
                                Bundle:
                                <InputNumber
                                  size="small"
                                  min={0}
                                  value={editingBundlePrice[bundle.id] ?? bundle.bundle_price}
                                  onChange={(value) => setEditingBundlePrice({ ...editingBundlePrice, [bundle.id]: value || bundle.bundle_price })}
                                  prefix="$"
                                  style={{ width: 80, marginLeft: 8 }}
                                />
                              </span>
                              <Tag color="green" icon={<PercentageOutlined />}>
                                {bundle.discount_percentage}% OFF
                              </Tag>
                              <span className="savings">Save ${bundle.savings.toFixed(2)}</span>
                            </div>
                          </div>

                          <div className="ai-reason">
                            <RobotOutlined /> <em>{bundle.ai_reason}</em>
                          </div>

                          <div className="bundle-actions">
                            {acceptedBundles.includes(bundle.id) ? (
                              <Tag color="green" icon={<CheckCircleOutlined />}>
                                Bundle Created!
                              </Tag>
                            ) : (
                              <Space>
                                <Button
                                  type="primary"
                                  icon={<CheckCircleOutlined />}
                                  onClick={() => handleAcceptBundle(bundle.id, editingBundlePrice[bundle.id])}
                                >
                                  Accept Bundle
                                </Button>
                                <Button
                                  onClick={() => handleRejectBundle(bundle.id)}
                                >
                                  Dismiss
                                </Button>
                              </Space>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Alert
                      message="No Bundle Suggestions"
                      description="Add more menu items to get AI-powered bundle suggestions."
                      type="info"
                      showIcon
                    />
                  )}
                </div>
              ),
            },
            {
              key: 'activate',
              label: (
                <span>
                  <RocketOutlined />
                  Activate Menu
                </span>
              ),
              children: (
                <div className="activate-tab">
                  <Steps
                    current={
                      menuStatus === 'active' ? 3 :
                      menuStatus === 'verified' ? 2 :
                      menuStatus === 'pending_verification' ? 1 : 0
                    }
                    style={{ marginBottom: 32 }}
                    items={[
                      {
                        title: 'Import Menu',
                        description: 'Menu items imported',
                        icon: <GlobalOutlined />,
                      },
                      {
                        title: 'Verify Prices',
                        description: discrepancies.length > 0 ? `${discrepancies.length} items need review` : 'All prices verified',
                        icon: <SafetyOutlined />,
                      },
                      {
                        title: 'Create Bundles',
                        description: acceptedBundles.length > 0 ? `${acceptedBundles.length} bundles created` : 'Optional',
                        icon: <GiftOutlined />,
                      },
                      {
                        title: 'Go Live!',
                        description: menuStatus === 'active' ? 'Menu is LIVE' : 'Ready to activate',
                        icon: <RocketOutlined />,
                      },
                    ]}
                  />

                  <Card className="activation-card">
                    <div className="activation-content">
                      {menuStatus === 'active' ? (
                        <>
                          <div className="status-icon live">
                            <PlayCircleOutlined />
                          </div>
                          <h2>Your Menu is LIVE!</h2>
                          <p>Customers can now order from your menu. Monitor orders in your dashboard.</p>
                          <Button
                            danger
                            icon={<PauseCircleOutlined />}
                            onClick={handlePauseMenu}
                            size="large"
                          >
                            Pause Menu
                          </Button>
                        </>
                      ) : menuStatus === 'verified' || discrepancies.length === 0 ? (
                        <>
                          <div className="status-icon ready">
                            <CheckCircleOutlined />
                          </div>
                          <h2>Ready to Go Live!</h2>
                          <p>Your menu is verified and ready. Click the button below to start receiving orders!</p>
                          <Button
                            type="primary"
                            icon={<RocketOutlined />}
                            onClick={handleActivateMenu}
                            size="large"
                            className="go-live-button"
                          >
                            Activate Menu
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className="status-icon pending">
                            <ExclamationCircleOutlined />
                          </div>
                          <h2>Review Required</h2>
                          <p>Please review the {discrepancies.length} price discrepancies before activating your menu.</p>
                          <Button
                            onClick={() => setActiveTab('verification')}
                          >
                            Go to Verification
                          </Button>
                        </>
                      )}
                    </div>
                  </Card>

                  {/* AI Messages */}
                  {aiMessages.length > 0 && (
                    <Card title={<Space><MessageOutlined /> Messages from Aria</Space>} style={{ marginTop: 24 }}>
                      <div className="ai-messages">
                        {aiMessages.slice(0, 3).map((msg) => (
                          <div key={msg.id} className={`ai-message ${msg.type}`}>
                            <span className="avatar">{msg.avatar}</span>
                            <div className="message-content">
                              <strong>{msg.title}</strong>
                              <p>{msg.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                </div>
              ),
            },
          ]}
        />
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
        .import-button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          color: white;
        }
        .import-button:hover {
          background: linear-gradient(135deg, #5a6fd6 0%, #6a4190 100%);
          color: white;
        }
        .import-url-section {
          display: flex;
          align-items: center;
          margin-bottom: 16px;
        }
        .import-url-section .ant-input-affix-wrapper {
          flex: 1;
        }
        .scraping-progress {
          padding: 16px;
          background: #f6f8fa;
          border-radius: 8px;
          margin-bottom: 16px;
        }
        .scraping-status {
          margin: 8px 0 0 0;
          text-align: center;
          color: #666;
          font-size: 14px;
        }
        .scraped-items-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .scraped-items-header h3 {
          margin: 0;
        }
        .scraped-items-list {
          max-height: 400px;
          overflow-y: auto;
        }
        .scraped-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px;
          border: 1px solid #e8e8e8;
          border-radius: 8px;
          margin-bottom: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .scraped-item:hover {
          background: #fafafa;
        }
        .scraped-item.selected {
          border-color: #1890ff;
          background: #e6f7ff;
        }
        .scraped-item.needs-review {
          border-color: #faad14;
        }
        .scraped-item-content {
          flex: 1;
        }
        .scraped-item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }
        .item-name {
          font-weight: 600;
          font-size: 15px;
        }
        .item-price {
          font-weight: 600;
          color: #52c41a;
          font-size: 15px;
        }
        .item-description {
          margin: 4px 0 8px 0;
          color: #666;
          font-size: 13px;
        }
        .item-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }
        /* Header styles */
        .page-header-left {
          display: flex;
          align-items: center;
        }
        .verify-button {
          background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%);
          border: none;
          color: white;
        }
        .verify-button:hover {
          background: linear-gradient(135deg, #73d13d 0%, #52c41a 100%);
          color: white;
        }
        .activate-button {
          background: linear-gradient(135deg, #fa8c16 0%, #d46b08 100%);
          border: none;
        }
        .activate-button:hover {
          background: linear-gradient(135deg, #ffa940 0%, #fa8c16 100%);
        }
        /* Verification styles */
        .discrepancy-list {
          max-height: 400px;
          overflow-y: auto;
        }
        .discrepancy-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: #fffbe6;
          border: 1px solid #ffe58f;
          border-radius: 8px;
          margin-bottom: 8px;
        }
        .discrepancy-info .item-name {
          display: block;
          font-weight: 600;
          margin-bottom: 4px;
        }
        .price-comparison {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
        }
        .current-price {
          color: #666;
        }
        .arrow {
          color: #999;
        }
        .source-price {
          color: #1890ff;
          font-weight: 500;
        }
        .discrepancy-info .suggestion {
          margin: 4px 0 0 0;
          font-size: 12px;
          color: #666;
        }
        /* Bundle styles */
        .bundle-card {
          transition: all 0.2s;
        }
        .bundle-card.accepted {
          border-color: #52c41a;
          background: #f6ffed;
        }
        .bundle-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }
        .bundle-header h3 {
          margin: 0 0 8px 0;
        }
        .bundle-description {
          color: #666;
          margin-bottom: 12px;
        }
        .bundle-items {
          margin-bottom: 16px;
        }
        .bundle-pricing {
          background: #f5f5f5;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 12px;
        }
        .price-details {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }
        .price-details .original {
          color: #999;
        }
        .price-details .bundle-price {
          font-weight: 600;
          color: #1890ff;
        }
        .price-details .savings {
          color: #52c41a;
          font-weight: 500;
        }
        .ai-reason {
          font-size: 13px;
          color: #666;
          margin-bottom: 16px;
          padding: 8px 12px;
          background: #f0f5ff;
          border-radius: 4px;
        }
        .bundle-actions {
          text-align: right;
        }
        /* Activation styles */
        .activation-card {
          text-align: center;
          padding: 32px;
        }
        .activation-content h2 {
          margin: 16px 0 8px 0;
        }
        .activation-content p {
          color: #666;
          margin-bottom: 24px;
        }
        .status-icon {
          font-size: 64px;
          margin-bottom: 8px;
        }
        .status-icon.live {
          color: #52c41a;
        }
        .status-icon.ready {
          color: #1890ff;
        }
        .status-icon.pending {
          color: #faad14;
        }
        .go-live-button {
          background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%);
          border: none;
          font-size: 16px;
          height: 48px;
          padding: 0 32px;
        }
        .go-live-button:hover {
          background: linear-gradient(135deg, #73d13d 0%, #52c41a 100%);
        }
        /* AI Messages */
        .ai-messages {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .ai-message {
          display: flex;
          gap: 12px;
          padding: 12px;
          border-radius: 8px;
          background: #f5f5f5;
        }
        .ai-message.success {
          background: #f6ffed;
        }
        .ai-message.suggestion {
          background: #f0f5ff;
        }
        .ai-message.action {
          background: #fff7e6;
        }
        .ai-message .avatar {
          font-size: 24px;
        }
        .ai-message .message-content {
          flex: 1;
        }
        .ai-message .message-content strong {
          display: block;
          margin-bottom: 4px;
        }
        .ai-message .message-content p {
          margin: 0;
          color: #666;
          font-size: 13px;
        }
      `}</style>
    </div>
  );
};

export default VendorMenuManagement;
