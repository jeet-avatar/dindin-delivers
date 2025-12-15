import React, { useState } from 'react';
import { Modal, Descriptions, Tag, Table, Button, Space, Steps, Timeline, message, Select } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, CarOutlined, ShoppingOutlined } from '@ant-design/icons';
import moment from 'moment';
import axios from 'axios';

const { Option } = Select;

interface OrderItem {
  menu_item_id: number;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Order {
  id: number;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  vendor_id: number;
  vendor_name?: string;
  items: OrderItem[];
  subtotal: number;
  tax_amount: number;
  delivery_fee: number;
  platform_fee: number;
  total_amount: number;
  status: string;
  payment_status: string;
  stripe_payment_intent_id?: string;
  stripe_charge_id?: string;
  payment_method?: string;
  invoice_number?: string;
  invoice_pdf_url?: string;
  delivery_address?: string;
  delivery_instructions?: string;
  created_at: string;
  confirmed_at?: string;
  preparing_at?: string;
  delivered_at?: string;
}

interface OrderDetailModalProps {
  visible: boolean;
  order: Order;
  onClose: () => void;
  onUpdate: () => void;
}

const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  visible,
  order,
  onClose,
  onUpdate
}) => {
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState<string>(order.status);

  const getStatusStep = (status: string) => {
    const steps = ['pending_payment', 'confirmed', 'preparing', 'out_for_delivery', 'delivered'];
    return steps.indexOf(status);
  };

  const handleUpdateStatus = async () => {
    if (newStatus === order.status) {
      message.info('Status is already set to ' + newStatus);
      return;
    }

    setUpdating(true);
    try {
      await axios.patch(`http://localhost:3000/api/orders/${order.id}/status`, {
        status: newStatus
      });
      message.success('Order status updated successfully');
      onUpdate();
      onClose();
    } catch (error) {
      message.error('Failed to update order status');
      console.error(error);
    } finally {
      setUpdating(false);
    }
  };

  const itemColumns = [
    {
      title: 'Item',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity'
    },
    {
      title: 'Unit Price',
      dataIndex: 'unit_price',
      key: 'unit_price',
      render: (price: number) => `$${price.toFixed(2)}`
    },
    {
      title: 'Total',
      dataIndex: 'total_price',
      key: 'total_price',
      render: (price: number) => `$${price.toFixed(2)}`
    }
  ];

  const deliveryAddress = order.delivery_address ? JSON.parse(order.delivery_address) : null;

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      'pending_payment': 'orange',
      'confirmed': 'blue',
      'preparing': 'cyan',
      'out_for_delivery': 'purple',
      'delivered': 'green',
      'cancelled': 'red'
    };
    return statusColors[status] || 'default';
  };

  const getPaymentStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      'pending': 'orange',
      'processing': 'blue',
      'succeeded': 'green',
      'failed': 'red',
      'refunded': 'purple'
    };
    return statusColors[status] || 'default';
  };

  const getStatusText = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <Modal
      title={`Order Details - ${order.order_number}`}
      open={visible}
      onCancel={onClose}
      width={900}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
        order.payment_status === 'succeeded' && order.status !== 'delivered' && order.status !== 'cancelled' && (
          <Button
            key="update"
            type="primary"
            loading={updating}
            onClick={handleUpdateStatus}
          >
            Update Status
          </Button>
        )
      ]}
    >
      {/* Order Status Timeline */}
      <div className="order-status-section">
        <h3>Order Progress</h3>
        <Steps
          current={getStatusStep(order.status)}
          items={[
            {
              title: 'Payment Pending',
              icon: <ClockCircleOutlined />
            },
            {
              title: 'Confirmed',
              icon: <CheckCircleOutlined />
            },
            {
              title: 'Preparing',
              icon: <ShoppingOutlined />
            },
            {
              title: 'Out for Delivery',
              icon: <CarOutlined />
            },
            {
              title: 'Delivered',
              icon: <CheckCircleOutlined />
            }
          ]}
        />
      </div>

      {/* Update Status Dropdown */}
      {order.payment_status === 'succeeded' && order.status !== 'delivered' && order.status !== 'cancelled' && (
        <div className="status-update-section">
          <Space>
            <span>Update Status:</span>
            <Select value={newStatus} onChange={setNewStatus} className="status-select">
              <Option value="confirmed">Confirmed</Option>
              <Option value="preparing">Preparing</Option>
              <Option value="out_for_delivery">Out for Delivery</Option>
              <Option value="delivered">Delivered</Option>
              <Option value="cancelled">Cancelled</Option>
            </Select>
          </Space>
        </div>
      )}

      {/* Customer Info */}
      <div className="order-section">
        <h3>Customer Information</h3>
        <Descriptions bordered size="small" column={2}>
          <Descriptions.Item label="Name">{order.customer_name}</Descriptions.Item>
          <Descriptions.Item label="Email">{order.customer_email}</Descriptions.Item>
          <Descriptions.Item label="Phone">{order.customer_phone || 'N/A'}</Descriptions.Item>
          <Descriptions.Item label="Vendor">{order.vendor_name || 'N/A'}</Descriptions.Item>
        </Descriptions>
      </div>

      {/* Delivery Info */}
      {deliveryAddress && (
        <div className="order-section">
          <h3>Delivery Information</h3>
          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label="Address">
              {deliveryAddress.street}, {deliveryAddress.city}, {deliveryAddress.state} {deliveryAddress.zip}
            </Descriptions.Item>
            {order.delivery_instructions && (
              <Descriptions.Item label="Instructions">
                {order.delivery_instructions}
              </Descriptions.Item>
            )}
          </Descriptions>
        </div>
      )}

      {/* Order Items */}
      <div className="order-section">
        <h3>Order Items</h3>
        <Table
          columns={itemColumns}
          dataSource={order.items}
          rowKey="menu_item_id"
          pagination={false}
          size="small"
        />
      </div>

      {/* Financial Breakdown */}
      <div className="order-section">
        <h3>Financial Details</h3>
        <Descriptions bordered size="small" column={1}>
          <Descriptions.Item label="Subtotal">${order.subtotal.toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="Tax">${order.tax_amount.toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="Delivery Fee">${order.delivery_fee.toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="Platform Fee">${order.platform_fee.toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="Total" className="total-amount">
            <strong>${order.total_amount.toFixed(2)}</strong>
          </Descriptions.Item>
        </Descriptions>
      </div>

      {/* Payment Info */}
      <div className="order-section">
        <h3>Payment Information</h3>
        <Descriptions bordered size="small" column={2}>
          <Descriptions.Item label="Payment Status">
            <Tag color={getPaymentStatusColor(order.payment_status)}>
              {getStatusText(order.payment_status)}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Payment Method">
            {order.payment_method || 'N/A'}
          </Descriptions.Item>
          {order.stripe_payment_intent_id && (
            <Descriptions.Item label="Stripe Payment ID" span={2}>
              {order.stripe_payment_intent_id}
            </Descriptions.Item>
          )}
          {order.invoice_number && (
            <Descriptions.Item label="Invoice Number">
              {order.invoice_number}
            </Descriptions.Item>
          )}
          {order.invoice_pdf_url && (
            <Descriptions.Item label="Invoice">
              <a href={order.invoice_pdf_url} target="_blank" rel="noopener noreferrer">
                Download PDF
              </a>
            </Descriptions.Item>
          )}
        </Descriptions>
      </div>

      {/* Timeline */}
      <div className="order-section">
        <h3>Order Timeline</h3>
        <Timeline
          items={[
            {
              color: 'blue',
              children: (
                <>
                  <strong>Order Created</strong>
                  <br />
                  {moment(order.created_at).format('MMM DD, YYYY HH:mm:ss')}
                </>
              )
            },
            order.confirmed_at && {
              color: 'green',
              children: (
                <>
                  <strong>Order Confirmed</strong>
                  <br />
                  {moment(order.confirmed_at).format('MMM DD, YYYY HH:mm:ss')}
                </>
              )
            },
            order.preparing_at && {
              color: 'cyan',
              children: (
                <>
                  <strong>Preparing Started</strong>
                  <br />
                  {moment(order.preparing_at).format('MMM DD, YYYY HH:mm:ss')}
                </>
              )
            },
            order.delivered_at && {
              color: 'green',
              children: (
                <>
                  <strong>Delivered</strong>
                  <br />
                  {moment(order.delivered_at).format('MMM DD, YYYY HH:mm:ss')}
                </>
              )
            }
          ].filter(Boolean)}
        />
      </div>

      <style>{`
        .order-status-section,
        .status-update-section,
        .order-section {
          margin-bottom: 24px;
        }
        .status-update-section {
          padding: 16px;
          background: #f0f2f5;
          border-radius: 4px;
        }
        .status-select {
          width: 200px;
        }
        .total-amount {
          font-size: 16px;
        }
      `}</style>
    </Modal>
  );
};

export default OrderDetailModal;
