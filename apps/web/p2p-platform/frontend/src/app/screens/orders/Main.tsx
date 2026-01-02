import React, { useState, useEffect } from 'react';
import { Table, Tag, Input, Select, DatePicker, Button, Space, Card, Statistic, Row, Col, Modal, message } from 'antd';
import { SearchOutlined, FilterOutlined, DollarOutlined, ShoppingOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import moment from 'moment';
import OrderDetailModal from '../../components/orders/OrderDetailModal';
import { getOrders, getOrderStats } from '../../api/api';

const { RangePicker } = DatePicker;
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
  invoice_number?: string;
  created_at: string;
  confirmed_at?: string;
  delivered_at?: string;
}

const OrdersMain: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  
  // Filters
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<any>(null);

  // Stats
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    completedOrders: 0
  });

  useEffect(() => {
    fetchOrders();
    fetchStats();
  }, [statusFilter, paymentStatusFilter, dateRange]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (paymentStatusFilter !== 'all') params.payment_status = paymentStatusFilter;
      
      const response = await getOrders(params);
      setOrders(response);
    } catch (error) {
      message.error('Failed to fetch orders');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await getOrderStats();
      setStats(response);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      'pending_payment': 'orange',
      'confirmed': 'blue',
      'pending_restaurant': 'gold',
      'declined_by_restaurant': 'red',
      'restaurant_timeout': 'volcano',
      'preparing': 'cyan',
      'ready_for_pickup': 'geekblue',
      'pending_delivery_decision': 'magenta',
      'restaurant_will_deliver': 'lime',
      'delivery_decision_timeout': 'orange',
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

  const columns = [
    {
      title: 'Order #',
      dataIndex: 'order_number',
      key: 'order_number',
      fixed: 'left' as const,
      width: 180,
      render: (text: string) => (
        <span style={{ fontWeight: 600, color: '#1890ff' }}>{text}</span>
      )
    },
    {
      title: 'Customer',
      dataIndex: 'customer_name',
      key: 'customer_name',
      width: 150,
      filteredValue: searchText ? [searchText] : null,
      onFilter: (value: any, record: Order) =>
        record.customer_name.toLowerCase().includes(value.toLowerCase()) ||
        record.customer_email.toLowerCase().includes(value.toLowerCase()) ||
        record.order_number.toLowerCase().includes(value.toLowerCase())
    },
    {
      title: 'Vendor',
      dataIndex: 'vendor_name',
      key: 'vendor_name',
      width: 150,
      render: (text: string) => text || 'N/A'
    },
    {
      title: 'Items',
      dataIndex: 'items',
      key: 'items',
      width: 80,
      render: (items: OrderItem[]) => items.length
    },
    {
      title: 'Total',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 120,
      render: (amount: number) => (
        <span style={{ fontWeight: 600 }}>${amount.toFixed(2)}</span>
      ),
      sorter: (a: Order, b: Order) => a.total_amount - b.total_amount
    },
    {
      title: 'Order Status',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      )
    },
    {
      title: 'Payment',
      dataIndex: 'payment_status',
      key: 'payment_status',
      width: 120,
      render: (status: string) => (
        <Tag color={getPaymentStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      )
    },
    {
      title: 'Invoice',
      dataIndex: 'invoice_number',
      key: 'invoice_number',
      width: 140,
      render: (invoice: string) => invoice || '-'
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => moment(date).format('MMM DD, YYYY HH:mm'),
      sorter: (a: Order, b: Order) => moment(a.created_at).unix() - moment(b.created_at).unix()
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right' as const,
      width: 100,
      render: (_: any, record: Order) => (
        <Button 
          type="link" 
          onClick={() => {
            setSelectedOrder(record);
            setDetailModalVisible(true);
          }}
        >
          View Details
        </Button>
      )
    }
  ];

  const filteredOrders = orders.filter(order => {
    if (searchText) {
      const search = searchText.toLowerCase();
      return (
        order.order_number.toLowerCase().includes(search) ||
        order.customer_name.toLowerCase().includes(search) ||
        order.customer_email.toLowerCase().includes(search)
      );
    }
    return true;
  });

  return (
    <div style={{ padding: '24px' }}>
      {/* Stats Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Orders"
              value={stats.totalOrders}
              prefix={<ShoppingOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Revenue"
              value={stats.totalRevenue}
              precision={2}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Pending Orders"
              value={stats.pendingOrders}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Completed"
              value={stats.completedOrders}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Space size="middle" wrap>
          <Input
            placeholder="Search orders..."
            prefix={<SearchOutlined />}
            style={{ width: 250 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />

          <Select
            style={{ width: 220 }}
            placeholder="Order Status"
            value={statusFilter}
            onChange={setStatusFilter}
          >
            <Option value="all">All Statuses</Option>
            <Option value="pending_payment">Pending Payment</Option>
            <Option value="confirmed">Confirmed</Option>
            <Option value="pending_restaurant">Pending Restaurant</Option>
            <Option value="declined_by_restaurant">Declined by Restaurant</Option>
            <Option value="restaurant_timeout">Restaurant Timeout</Option>
            <Option value="preparing">Preparing</Option>
            <Option value="ready_for_pickup">Ready for Pickup</Option>
            <Option value="pending_delivery_decision">Pending Delivery Decision</Option>
            <Option value="restaurant_will_deliver">Restaurant Self-Delivers</Option>
            <Option value="out_for_delivery">Out for Delivery</Option>
            <Option value="delivered">Delivered</Option>
            <Option value="cancelled">Cancelled</Option>
          </Select>

          <Select
            style={{ width: 180 }}
            placeholder="Payment Status"
            value={paymentStatusFilter}
            onChange={setPaymentStatusFilter}
          >
            <Option value="all">All Payments</Option>
            <Option value="pending">Pending</Option>
            <Option value="processing">Processing</Option>
            <Option value="succeeded">Succeeded</Option>
            <Option value="failed">Failed</Option>
            <Option value="refunded">Refunded</Option>
          </Select>

          <RangePicker
            style={{ width: 280 }}
            onChange={setDateRange}
          />

          <Button
            icon={<FilterOutlined />}
            onClick={fetchOrders}
          >
            Apply Filters
          </Button>
        </Space>
      </Card>

      {/* Orders Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredOrders}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1500 }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} orders`
          }}
        />
      </Card>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          visible={detailModalVisible}
          order={selectedOrder}
          onClose={() => {
            setDetailModalVisible(false);
            setSelectedOrder(null);
          }}
          onUpdate={fetchOrders}
        />
      )}
    </div>
  );
};

export default OrdersMain;
