import React, { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  DatePicker,
  InputNumber,
  Select,
  message,
  Row,
  Col,
  Statistic,
  Tabs,
  Tooltip,
  Popconfirm,
  Divider,
  List,
  Typography,
  Badge,
  Dropdown,
  Menu,
  Drawer
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SendOutlined,
  DollarOutlined,
  FileTextOutlined,
  CopyOutlined,
  StopOutlined,
  EyeOutlined,
  DownloadOutlined,
  MoreOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import { getApiUrl } from '../../api/api';

const { Text, Title } = Typography;
const { TabPane } = Tabs;
const { TextArea } = Input;

// Use centralized API config - supports local, staging, and production
const API_URL = getApiUrl();

interface InvoiceItem {
  id?: number;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

interface Payment {
  id: number;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number?: string;
  status: string;
  notes?: string;
}

interface Invoice {
  id: number;
  invoice_number: string;
  client_id: number;
  client_name: string;
  client_email?: string;
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount?: number;
  balance?: number;
  status: string;
  notes?: string;
  terms?: string;
  items?: InvoiceItem[];
  created_at: string;
  updated_at?: string;
}

interface Client {
  id: number;
  name: string;
  email: string;
  company?: string;
}

interface InvoiceStats {
  summary: {
    total_invoices: number;
    draft: number;
    sent: number;
    paid: number;
    overdue: number;
    cancelled: number;
  };
  financials: {
    total_invoiced: number;
    total_paid: number;
    total_outstanding: number;
    this_month_invoiced: number;
    this_month_paid: number;
  };
  recent_invoices: Array<{
    id: number;
    invoice_number: string;
    client_name: string;
    total_amount: number;
    status: string;
    due_date: string;
  }>;
  top_clients: Array<{
    id: number;
    name: string;
    total_revenue: number;
    invoice_count: number;
  }>;
}

const Invoices: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [form] = Form.useForm();
  const [paymentForm] = Form.useForm();
  const [lineItems, setLineItems] = useState<InvoiceItem[]>([{ description: '', quantity: 1, unit_price: 0, amount: 0 }]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token') || localStorage.getItem('id_token');
    return { Authorization: `Bearer ${token}` };
  };

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/invoices/stats`, {
        headers: getAuthHeaders()
      });
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchInvoices = useCallback(async (status?: string) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (status && status !== 'all') {
        params.status = status;
      }
      const response = await axios.get(`${API_URL}/api/invoices`, {
        headers: getAuthHeaders(),
        params
      });
      setInvoices(response.data.data || response.data);
    } catch (error) {
      message.error('Failed to fetch invoices');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchClients = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/clients`, {
        headers: getAuthHeaders()
      });
      setClients(response.data);
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  }, []);

  const fetchInvoiceDetails = async (invoiceId: number) => {
    try {
      const [invoiceRes, paymentsRes] = await Promise.all([
        axios.get(`${API_URL}/api/invoices/${invoiceId}`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/api/invoices/${invoiceId}/payments`, { headers: getAuthHeaders() })
      ]);
      setSelectedInvoice(invoiceRes.data);
      setPayments(paymentsRes.data);
    } catch (error) {
      message.error('Failed to fetch invoice details');
      console.error(error);
    }
  };

  useEffect(() => {
    fetchInvoices();
    fetchClients();
    fetchStats();
  }, [fetchInvoices, fetchClients, fetchStats]);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    fetchInvoices(key);
  };

  const handleCreate = () => {
    setEditingInvoice(null);
    setLineItems([{ description: '', quantity: 1, unit_price: 0, amount: 0 }]);
    form.resetFields();
    form.setFieldsValue({
      issue_date: dayjs(),
      due_date: dayjs().add(30, 'day'),
      tax_rate: 0,
      discount_amount: 0
    });
    setModalVisible(true);
  };

  const handleEdit = async (invoice: Invoice) => {
    setEditingInvoice(invoice);
    try {
      const response = await axios.get(`${API_URL}/api/invoices/${invoice.id}`, {
        headers: getAuthHeaders()
      });
      const fullInvoice = response.data;
      setLineItems(fullInvoice.items || [{ description: '', quantity: 1, unit_price: 0, amount: 0 }]);
      form.setFieldsValue({
        client_id: fullInvoice.client_id,
        issue_date: dayjs(fullInvoice.issue_date),
        due_date: dayjs(fullInvoice.due_date),
        tax_rate: fullInvoice.tax_rate,
        discount_amount: fullInvoice.discount_amount,
        notes: fullInvoice.notes,
        terms: fullInvoice.terms,
        status: fullInvoice.status
      });
      setModalVisible(true);
    } catch (error) {
      message.error('Failed to load invoice details');
    }
  };

  const handleView = (invoice: Invoice) => {
    fetchInvoiceDetails(invoice.id);
    setDetailDrawerVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`${API_URL}/api/invoices/${id}`, {
        headers: getAuthHeaders()
      });
      message.success('Invoice deleted successfully');
      fetchInvoices(activeTab);
      fetchStats();
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to delete invoice');
    }
  };

  const handleSend = async (invoice: Invoice) => {
    try {
      const response = await axios.post(`${API_URL}/api/invoices/${invoice.id}/send`, {}, {
        headers: getAuthHeaders()
      });
      message.success(response.data.message);
      fetchInvoices(activeTab);
      fetchStats();
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to send invoice');
    }
  };

  const handleMarkPaid = async (invoice: Invoice) => {
    try {
      const response = await axios.post(`${API_URL}/api/invoices/${invoice.id}/mark-paid`, {}, {
        headers: getAuthHeaders()
      });
      message.success(response.data.message);
      fetchInvoices(activeTab);
      fetchStats();
      if (selectedInvoice?.id === invoice.id) {
        fetchInvoiceDetails(invoice.id);
      }
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to mark invoice as paid');
    }
  };

  const handleDuplicate = async (invoice: Invoice) => {
    try {
      const response = await axios.post(`${API_URL}/api/invoices/${invoice.id}/duplicate`, {}, {
        headers: getAuthHeaders()
      });
      message.success(response.data.message);
      fetchInvoices(activeTab);
      fetchStats();
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to duplicate invoice');
    }
  };

  const handleVoid = async (invoice: Invoice) => {
    try {
      const response = await axios.post(`${API_URL}/api/invoices/${invoice.id}/void`, {}, {
        headers: getAuthHeaders()
      });
      message.success(response.data.message);
      fetchInvoices(activeTab);
      fetchStats();
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to void invoice');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      const items = lineItems.filter(item => item.description && item.quantity > 0);
      if (items.length === 0) {
        message.error('Please add at least one line item');
        return;
      }

      const data = {
        client_id: values.client_id,
        issue_date: values.issue_date.toISOString(),
        due_date: values.due_date.toISOString(),
        tax_rate: values.tax_rate || 0,
        discount_amount: values.discount_amount || 0,
        notes: values.notes,
        terms: values.terms,
        items: items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price
        }))
      };

      if (editingInvoice) {
        await axios.put(`${API_URL}/api/invoices/${editingInvoice.id}`, data, {
          headers: getAuthHeaders()
        });
        message.success('Invoice updated successfully');
      } else {
        await axios.post(`${API_URL}/api/invoices`, data, {
          headers: getAuthHeaders()
        });
        message.success('Invoice created successfully');
      }

      setModalVisible(false);
      fetchInvoices(activeTab);
      fetchStats();
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to save invoice');
    }
  };

  const handleRecordPayment = async (values: any) => {
    if (!selectedInvoice) return;
    try {
      await axios.post(`${API_URL}/api/invoices/${selectedInvoice.id}/payments`, {
        amount: values.amount,
        payment_date: values.payment_date.toISOString(),
        payment_method: values.payment_method,
        reference_number: values.reference_number,
        notes: values.notes,
        status: 'completed'
      }, {
        headers: getAuthHeaders()
      });
      message.success('Payment recorded successfully');
      setPaymentModalVisible(false);
      paymentForm.resetFields();
      fetchInvoiceDetails(selectedInvoice.id);
      fetchInvoices(activeTab);
      fetchStats();
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to record payment');
    }
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    const newItems = [...lineItems];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].amount = newItems[index].quantity * newItems[index].unit_price;
    }
    setLineItems(newItems);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: 1, unit_price: 0, amount: 0 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const taxRate = form.getFieldValue('tax_rate') || 0;
    const discount = form.getFieldValue('discount_amount') || 0;
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax - discount;
    return { subtotal, tax, total };
  };

  const getStatusTag = (status: string, dueDate?: string) => {
    const isOverdue = dueDate && new Date(dueDate) < new Date() && !['paid', 'cancelled'].includes(status);

    if (isOverdue && status !== 'paid') {
      return <Tag icon={<ExclamationCircleOutlined />} color="error">OVERDUE</Tag>;
    }

    const config: Record<string, { color: string; icon: React.ReactNode }> = {
      draft: { color: 'default', icon: <FileTextOutlined /> },
      sent: { color: 'processing', icon: <ClockCircleOutlined /> },
      paid: { color: 'success', icon: <CheckCircleOutlined /> },
      overdue: { color: 'error', icon: <ExclamationCircleOutlined /> },
      cancelled: { color: 'default', icon: <CloseCircleOutlined /> }
    };
    const { color, icon } = config[status] || { color: 'default', icon: null };
    return <Tag icon={icon} color={color}>{status.toUpperCase()}</Tag>;
  };

  const getActionMenu = (record: Invoice) => (
    <Menu>
      <Menu.Item key="view" icon={<EyeOutlined />} onClick={() => handleView(record)}>
        View Details
      </Menu.Item>
      {['draft', 'sent'].includes(record.status) && (
        <Menu.Item key="edit" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
          Edit
        </Menu.Item>
      )}
      {['draft', 'sent'].includes(record.status) && (
        <Menu.Item key="send" icon={<SendOutlined />} onClick={() => handleSend(record)}>
          Send to Client
        </Menu.Item>
      )}
      {record.status !== 'paid' && record.status !== 'cancelled' && (
        <Menu.Item key="paid" icon={<DollarOutlined />} onClick={() => handleMarkPaid(record)}>
          Mark as Paid
        </Menu.Item>
      )}
      <Menu.Item key="duplicate" icon={<CopyOutlined />} onClick={() => handleDuplicate(record)}>
        Duplicate
      </Menu.Item>
      <Menu.Divider />
      {record.status !== 'paid' && record.status !== 'cancelled' && (
        <Menu.Item key="void" icon={<StopOutlined />} danger onClick={() => handleVoid(record)}>
          Void Invoice
        </Menu.Item>
      )}
      {record.status === 'draft' && (
        <Menu.Item key="delete" icon={<DeleteOutlined />} danger onClick={() => handleDelete(record.id)}>
          Delete
        </Menu.Item>
      )}
    </Menu>
  );

  const columns = [
    {
      title: 'Invoice #',
      dataIndex: 'invoice_number',
      key: 'invoice_number',
      render: (text: string, record: Invoice) => (
        <a onClick={() => handleView(record)}>{text}</a>
      )
    },
    {
      title: 'Client',
      dataIndex: 'client_name',
      key: 'client_name'
    },
    {
      title: 'Issue Date',
      dataIndex: 'issue_date',
      key: 'issue_date',
      render: (date: string) => dayjs(date).format('MMM D, YYYY')
    },
    {
      title: 'Due Date',
      dataIndex: 'due_date',
      key: 'due_date',
      render: (date: string) => dayjs(date).format('MMM D, YYYY')
    },
    {
      title: 'Amount',
      dataIndex: 'total_amount',
      key: 'total_amount',
      align: 'right' as const,
      render: (amount: number) => `$${amount.toFixed(2)}`
    },
    {
      title: 'Balance',
      dataIndex: 'balance',
      key: 'balance',
      align: 'right' as const,
      render: (balance: number, record: Invoice) => {
        const bal = balance ?? record.total_amount;
        return bal > 0 ? <Text type="danger">${bal.toFixed(2)}</Text> : <Text type="success">$0.00</Text>;
      }
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: Invoice) => getStatusTag(status, record.due_date)
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: any, record: Invoice) => (
        <Dropdown overlay={getActionMenu(record)} trigger={['click']}>
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      )
    }
  ];

  const totals = calculateTotals();

  return (
    <div style={{ padding: '24px' }}>
      {/* Stats Dashboard */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card loading={statsLoading}>
            <Statistic
              title="Total Outstanding"
              value={stats?.financials.total_outstanding || 0}
              precision={2}
              prefix="$"
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={statsLoading}>
            <Statistic
              title="Total Invoiced"
              value={stats?.financials.total_invoiced || 0}
              precision={2}
              prefix="$"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={statsLoading}>
            <Statistic
              title="This Month"
              value={stats?.financials.this_month_invoiced || 0}
              precision={2}
              prefix="$"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={statsLoading}>
            <Statistic
              title="Overdue Invoices"
              value={stats?.summary.overdue || 0}
              valueStyle={{ color: stats?.summary.overdue ? '#cf1322' : '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>Invoices</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => { fetchInvoices(activeTab); fetchStats(); }}>
            Refresh
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            New Invoice
          </Button>
        </Space>
      </div>

      {/* Invoice Table with Tabs */}
      <Card>
        <Tabs activeKey={activeTab} onChange={handleTabChange}>
          <TabPane tab={<Badge count={stats?.summary.total_invoices || 0} offset={[10, 0]}>All</Badge>} key="all" />
          <TabPane tab={<Badge count={stats?.summary.draft || 0} offset={[10, 0]}>Draft</Badge>} key="draft" />
          <TabPane tab={<Badge count={stats?.summary.sent || 0} offset={[10, 0]}>Sent</Badge>} key="sent" />
          <TabPane tab={<Badge count={stats?.summary.paid || 0} offset={[10, 0]} style={{ backgroundColor: '#52c41a' }}>Paid</Badge>} key="paid" />
          <TabPane tab={<Badge count={stats?.summary.overdue || 0} offset={[10, 0]} style={{ backgroundColor: '#f5222d' }}>Overdue</Badge>} key="overdue" />
        </Tabs>
        <Table
          columns={columns}
          dataSource={invoices}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Total ${total} invoices` }}
        />
      </Card>

      {/* Create/Edit Invoice Modal */}
      <Modal
        title={editingInvoice ? 'Edit Invoice' : 'Create Invoice'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        width={900}
        footer={[
          <Button key="cancel" onClick={() => setModalVisible(false)}>Cancel</Button>,
          <Button key="submit" type="primary" onClick={() => form.submit()}>
            {editingInvoice ? 'Update Invoice' : 'Create Invoice'}
          </Button>
        ]}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="client_id"
                label="Client"
                rules={[{ required: true, message: 'Please select a client' }]}
              >
                <Select placeholder="Select a client" showSearch optionFilterProp="children">
                  {clients.map(client => (
                    <Select.Option key={client.id} value={client.id}>
                      {client.name} {client.company && `(${client.company})`}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="issue_date"
                label="Issue Date"
                rules={[{ required: true, message: 'Please select issue date' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="due_date"
                label="Due Date"
                rules={[{ required: true, message: 'Please select due date' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          {/* Line Items */}
          <Divider>Line Items</Divider>
          {lineItems.map((item, index) => (
            <Row gutter={8} key={index} style={{ marginBottom: 8 }}>
              <Col span={10}>
                <Input
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                />
              </Col>
              <Col span={4}>
                <InputNumber
                  placeholder="Qty"
                  min={1}
                  value={item.quantity}
                  onChange={(val) => updateLineItem(index, 'quantity', val || 1)}
                  style={{ width: '100%' }}
                />
              </Col>
              <Col span={5}>
                <InputNumber
                  placeholder="Unit Price"
                  min={0}
                  precision={2}
                  value={item.unit_price}
                  onChange={(val) => updateLineItem(index, 'unit_price', val || 0)}
                  prefix="$"
                  style={{ width: '100%' }}
                />
              </Col>
              <Col span={4}>
                <InputNumber
                  value={item.quantity * item.unit_price}
                  disabled
                  prefix="$"
                  precision={2}
                  style={{ width: '100%' }}
                />
              </Col>
              <Col span={1}>
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => removeLineItem(index)}
                  disabled={lineItems.length === 1}
                />
              </Col>
            </Row>
          ))}
          <Button type="dashed" onClick={addLineItem} icon={<PlusOutlined />} style={{ marginBottom: 16 }}>
            Add Line Item
          </Button>

          {/* Totals */}
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="tax_rate" label="Tax Rate (%)">
                <InputNumber min={0} max={100} precision={2} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="discount_amount" label="Discount Amount">
                <InputNumber min={0} precision={2} prefix="$" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>Subtotal:</Text>
                    <Text>${totals.subtotal.toFixed(2)}</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>Tax:</Text>
                    <Text>${totals.tax.toFixed(2)}</Text>
                  </div>
                  <Divider style={{ margin: '8px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text strong>Total:</Text>
                    <Text strong>${totals.total.toFixed(2)}</Text>
                  </div>
                </Space>
              </Card>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="notes" label="Notes">
                <TextArea rows={3} placeholder="Notes visible to client" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="terms" label="Terms & Conditions">
                <TextArea rows={3} placeholder="Payment terms" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Invoice Detail Drawer */}
      <Drawer
        title={`Invoice ${selectedInvoice?.invoice_number || ''}`}
        placement="right"
        width={600}
        onClose={() => setDetailDrawerVisible(false)}
        open={detailDrawerVisible}
        extra={
          <Space>
            {selectedInvoice && ['draft', 'sent'].includes(selectedInvoice.status) && (
              <Button icon={<SendOutlined />} onClick={() => handleSend(selectedInvoice)}>Send</Button>
            )}
            {selectedInvoice && selectedInvoice.status !== 'paid' && selectedInvoice.status !== 'cancelled' && (
              <Button type="primary" icon={<DollarOutlined />} onClick={() => {
                paymentForm.setFieldsValue({
                  amount: (selectedInvoice.balance ?? selectedInvoice.total_amount),
                  payment_date: dayjs(),
                  payment_method: 'bank_transfer'
                });
                setPaymentModalVisible(true);
              }}>Record Payment</Button>
            )}
          </Space>
        }
      >
        {selectedInvoice && (
          <div>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Text type="secondary">Client</Text>
                <div><Text strong>{selectedInvoice.client_name}</Text></div>
                {selectedInvoice.client_email && <div><Text type="secondary">{selectedInvoice.client_email}</Text></div>}
              </Col>
              <Col span={12}>
                <Text type="secondary">Status</Text>
                <div>{getStatusTag(selectedInvoice.status, selectedInvoice.due_date)}</div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Issue Date</Text>
                <div>{dayjs(selectedInvoice.issue_date).format('MMM D, YYYY')}</div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Due Date</Text>
                <div>{dayjs(selectedInvoice.due_date).format('MMM D, YYYY')}</div>
              </Col>
            </Row>

            <Divider>Line Items</Divider>
            <List
              dataSource={selectedInvoice.items || []}
              renderItem={(item: InvoiceItem) => (
                <List.Item>
                  <List.Item.Meta
                    title={item.description}
                    description={`${item.quantity} × $${item.unit_price.toFixed(2)}`}
                  />
                  <Text strong>${item.amount.toFixed(2)}</Text>
                </List.Item>
              )}
            />

            <Divider />
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>Subtotal:</Text>
                <Text>${selectedInvoice.subtotal.toFixed(2)}</Text>
              </div>
              {selectedInvoice.tax_amount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>Tax ({selectedInvoice.tax_rate}%):</Text>
                  <Text>${selectedInvoice.tax_amount.toFixed(2)}</Text>
                </div>
              )}
              {selectedInvoice.discount_amount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>Discount:</Text>
                  <Text>-${selectedInvoice.discount_amount.toFixed(2)}</Text>
                </div>
              )}
              <Divider style={{ margin: '8px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text strong>Total:</Text>
                <Text strong>${selectedInvoice.total_amount.toFixed(2)}</Text>
              </div>
              {(selectedInvoice.paid_amount ?? 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="success">Paid:</Text>
                  <Text type="success">-${(selectedInvoice.paid_amount ?? 0).toFixed(2)}</Text>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text strong type={(selectedInvoice.balance ?? selectedInvoice.total_amount) > 0 ? 'danger' : 'success'}>
                  Balance Due:
                </Text>
                <Text strong type={(selectedInvoice.balance ?? selectedInvoice.total_amount) > 0 ? 'danger' : 'success'}>
                  ${(selectedInvoice.balance ?? selectedInvoice.total_amount).toFixed(2)}
                </Text>
              </div>
            </Space>

            {payments.length > 0 && (
              <>
                <Divider>Payment History</Divider>
                <List
                  dataSource={payments}
                  renderItem={(payment: Payment) => (
                    <List.Item>
                      <List.Item.Meta
                        title={`${payment.payment_method} - ${payment.reference_number || 'N/A'}`}
                        description={dayjs(payment.payment_date).format('MMM D, YYYY')}
                      />
                      <Tag color={payment.status === 'completed' ? 'success' : 'processing'}>
                        ${payment.amount.toFixed(2)}
                      </Tag>
                    </List.Item>
                  )}
                />
              </>
            )}

            {selectedInvoice.notes && (
              <>
                <Divider>Notes</Divider>
                <Text>{selectedInvoice.notes}</Text>
              </>
            )}
          </div>
        )}
      </Drawer>

      {/* Record Payment Modal */}
      <Modal
        title="Record Payment"
        open={paymentModalVisible}
        onCancel={() => setPaymentModalVisible(false)}
        onOk={() => paymentForm.submit()}
      >
        <Form form={paymentForm} layout="vertical" onFinish={handleRecordPayment}>
          <Form.Item
            name="amount"
            label="Amount"
            rules={[{ required: true, message: 'Please enter amount' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              prefix="$"
              min={0.01}
              precision={2}
            />
          </Form.Item>
          <Form.Item
            name="payment_date"
            label="Payment Date"
            rules={[{ required: true, message: 'Please select date' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="payment_method"
            label="Payment Method"
            rules={[{ required: true, message: 'Please select method' }]}
          >
            <Select>
              <Select.Option value="bank_transfer">Bank Transfer</Select.Option>
              <Select.Option value="credit_card">Credit Card</Select.Option>
              <Select.Option value="check">Check</Select.Option>
              <Select.Option value="cash">Cash</Select.Option>
              <Select.Option value="paypal">PayPal</Select.Option>
              <Select.Option value="other">Other</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="reference_number" label="Reference Number">
            <Input placeholder="Transaction ID or check number" />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Invoices;
