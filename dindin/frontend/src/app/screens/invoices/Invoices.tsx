import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Tag, Space, Modal, Form, Input, DatePicker, InputNumber, Select, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface Invoice {
  id: number;
  invoice_number: string;
  client_name: string;
  issue_date: string;
  due_date: string;
  total_amount: number;
  status: string;
}

interface Client {
  id: number;
  name: string;
}

const Invoices: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchInvoices();
    fetchClients();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/invoices`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInvoices(response.data);
    } catch (error) {
      message.error('Failed to fetch invoices');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/clients`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClients(response.data);
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  };

  const handleCreate = () => {
    setEditingInvoice(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    form.setFieldsValue({
      ...invoice,
      issue_date: moment(invoice.issue_date),
      due_date: moment(invoice.due_date),
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    Modal.confirm({
      title: 'Delete Invoice',
      content: 'Are you sure you want to delete this invoice?',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          const token = localStorage.getItem('token');
          await axios.delete(`${API_URL}/api/invoices/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          message.success('Invoice deleted successfully');
          fetchInvoices();
        } catch (error) {
          message.error('Failed to delete invoice');
          console.error(error);
        }
      }
    });
  };

  const handleSubmit = async (values: any) => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      const data = {
        ...values,
        issue_date: values.issue_date.format('YYYY-MM-DD'),
        due_date: values.due_date.format('YYYY-MM-DD'),
      };

      if (editingInvoice) {
        await axios.put(`${API_URL}/api/invoices/${editingInvoice.id}`, data, config);
        message.success('Invoice updated successfully');
      } else {
        await axios.post(`${API_URL}/api/invoices`, data, config);
        message.success('Invoice created successfully');
      }
      
      setModalVisible(false);
      fetchInvoices();
    } catch (error) {
      message.error('Failed to save invoice');
      console.error(error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      paid: 'success',
      sent: 'processing',
      draft: 'default',
      overdue: 'error',
      cancelled: 'default'
    };
    return colors[status] || 'default';
  };

  const columns = [
    {
      title: 'Invoice #',
      dataIndex: 'invoice_number',
      key: 'invoice_number',
    },
    {
      title: 'Client',
      dataIndex: 'client_name',
      key: 'client_name',
    },
    {
      title: 'Issue Date',
      dataIndex: 'issue_date',
      key: 'issue_date',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Due Date',
      dataIndex: 'due_date',
      key: 'due_date',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Amount',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (amount: number) => `$${amount.toFixed(2)}`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{status.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Invoice) => (
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
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Invoices</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          New Invoice
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={invoices}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editingInvoice ? 'Edit Invoice' : 'Create Invoice'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="client_id"
            label="Client"
            rules={[{ required: true, message: 'Please select a client' }]}
          >
            <Select placeholder="Select a client">
              {clients.map(client => (
                <Select.Option key={client.id} value={client.id}>
                  {client.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="issue_date"
            label="Issue Date"
            rules={[{ required: true, message: 'Please select issue date' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="due_date"
            label="Due Date"
            rules={[{ required: true, message: 'Please select due date' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="total_amount"
            label="Amount"
            rules={[{ required: true, message: 'Please enter amount' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              prefix="$"
              min={0}
              precision={2}
            />
          </Form.Item>

          <Form.Item
            name="status"
            label="Status"
            rules={[{ required: true, message: 'Please select status' }]}
          >
            <Select>
              <Select.Option value="draft">Draft</Select.Option>
              <Select.Option value="sent">Sent</Select.Option>
              <Select.Option value="paid">Paid</Select.Option>
              <Select.Option value="overdue">Overdue</Select.Option>
              <Select.Option value="cancelled">Cancelled</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Invoices;
