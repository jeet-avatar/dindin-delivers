import React, { useState, useEffect } from 'react';
import { Table, Tag, Input, Select, Button, Space, Card, Statistic, Row, Col, message, Avatar, Badge, Modal, Descriptions, Popconfirm } from 'antd';
import { SearchOutlined, UserOutlined, CarOutlined, CheckCircleOutlined, ClockCircleOutlined, SyncOutlined, PhoneOutlined, MailOutlined, StarFilled, CheckOutlined, CloseOutlined, StopOutlined } from '@ant-design/icons';
import moment from 'moment';
import api from '../../api/api';

const { Option } = Select;

interface Driver {
  id: number;
  driver_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  vehicle_type: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  vehicle_color: string;
  license_plate: string;
  status: string;
  rating: number;
  total_deliveries: number;
  is_online: boolean;
  documents_verified: boolean;
  stripe_onboarded: boolean;
  created_at: string;
  photo_url?: string;
}

const DriversAdmin: React.FC = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const [stats, setStats] = useState({
    totalDrivers: 0,
    activeDrivers: 0,
    pendingApproval: 0,
    onlineNow: 0
  });

  useEffect(() => {
    fetchDrivers();
  }, [statusFilter]);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 100 };
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await api.get('/admin/drivers', { params });
      setDrivers(response.data.drivers || []);
      setStats(response.data.stats || stats);
    } catch (error) {
      console.error('Failed to fetch drivers:', error);
      // Try the ERP endpoint
      try {
        const response = await api.get('/erp/drivers', { params: { limit: 100 } });
        const driversList = response.data.drivers || response.data || [];
        setDrivers(driversList);
        // Calculate stats from data
        setStats({
          totalDrivers: driversList.length,
          activeDrivers: driversList.filter((d: Driver) => d.status === 'approved' || d.status === 'active').length,
          pendingApproval: driversList.filter((d: Driver) => d.status === 'pending').length,
          onlineNow: driversList.filter((d: Driver) => d.is_online).length
        });
      } catch (e) {
        console.error('Failed to fetch from ERP endpoint:', e);
        setDrivers([]);
        message.info('Drivers API endpoint not yet configured');
      }
    } finally {
      setLoading(false);
    }
  };

  const updateDriverStatus = async (driverId: number, newStatus: string) => {
    setUpdating(true);
    try {
      await api.patch(`/drivers/${driverId}/status`, null, { params: { status: newStatus } });
      const statusMessages: Record<string, string> = {
        'approved': 'Driver approved! Activation email has been sent.',
        'rejected': 'Driver has been rejected.',
        'suspended': 'Driver has been suspended.',
        'active': 'Driver is now active.'
      };
      message.success(statusMessages[newStatus] || `Driver status updated to ${newStatus}`);
      fetchDrivers();
      setDetailModalVisible(false);
      setSelectedDriver(null);
    } catch (error: any) {
      console.error('Failed to update driver status:', error);
      const detail = error.response?.data?.detail;
      if (typeof detail === 'object' && detail !== null) {
        // Handle structured error (e.g., missing documents)
        const errorMsg = detail.message || 'Failed to update driver status';
        const missingDocs = detail.missing_documents?.join(', ');
        if (missingDocs) {
          message.error(`${errorMsg}: ${missingDocs}`, 8);
        } else {
          message.error(errorMsg, 5);
        }
      } else {
        message.error(detail || 'Failed to update driver status');
      }
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      'pending': 'orange',
      'approved': 'green',
      'active': 'green',
      'suspended': 'red',
      'rejected': 'red',
      'inactive': 'default'
    };
    return statusColors[status] || 'default';
  };

  const columns = [
    {
      title: 'Driver',
      key: 'driver',
      width: 250,
      fixed: 'left' as const,
      render: (_: any, record: Driver) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Badge dot status={record.is_online ? 'success' : 'default'} offset={[-5, 35]}>
            <Avatar
              size={40}
              src={record.photo_url}
              icon={<UserOutlined />}
              style={{ backgroundColor: record.is_online ? '#52c41a' : '#d9d9d9' }}
            />
          </Badge>
          <div>
            <div style={{ fontWeight: 600 }}>{record.first_name} {record.last_name}</div>
            <div style={{ fontSize: 12, color: '#666' }}>{record.driver_id}</div>
          </div>
        </div>
      )
    },
    {
      title: 'Contact',
      key: 'contact',
      width: 200,
      render: (_: any, record: Driver) => (
        <div style={{ fontSize: 12 }}>
          <div><MailOutlined style={{ marginRight: 4 }} />{record.email}</div>
          <div><PhoneOutlined style={{ marginRight: 4 }} />{record.phone}</div>
        </div>
      )
    },
    {
      title: 'Vehicle',
      key: 'vehicle',
      width: 180,
      render: (_: any, record: Driver) => (
        <div>
          <div><CarOutlined style={{ marginRight: 4 }} />{record.vehicle_make} {record.vehicle_model}</div>
          <div style={{ fontSize: 12, color: '#666' }}>
            {record.vehicle_year} • {record.vehicle_color} • {record.license_plate}
          </div>
        </div>
      )
    },
    {
      title: 'Rating',
      dataIndex: 'rating',
      key: 'rating',
      width: 100,
      render: (rating: number) => (
        <span style={{ color: '#faad14' }}>
          <StarFilled style={{ marginRight: 4 }} />
          {rating?.toFixed(1) || '5.0'}
        </span>
      ),
      sorter: (a: Driver, b: Driver) => (a.rating || 5) - (b.rating || 5)
    },
    {
      title: 'Deliveries',
      dataIndex: 'total_deliveries',
      key: 'total_deliveries',
      width: 100,
      render: (count: number) => count || 0,
      sorter: (a: Driver, b: Driver) => (a.total_deliveries || 0) - (b.total_deliveries || 0)
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status?.toUpperCase() || 'UNKNOWN'}
        </Tag>
      )
    },
    {
      title: 'Verified',
      key: 'verified',
      width: 100,
      render: (_: any, record: Driver) => (
        <div>
          {record.documents_verified ? (
            <Tag color="green">Docs ✓</Tag>
          ) : (
            <Tag color="orange">Pending</Tag>
          )}
        </div>
      )
    },
    {
      title: 'Stripe',
      key: 'stripe',
      width: 100,
      render: (_: any, record: Driver) => (
        record.stripe_onboarded ? (
          <Tag color="green">Ready</Tag>
        ) : (
          <Tag color="orange">Setup</Tag>
        )
      )
    },
    {
      title: 'Joined',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (date: string) => date ? moment(date).format('MMM DD, YYYY') : '-',
      sorter: (a: Driver, b: Driver) => moment(a.created_at).unix() - moment(b.created_at).unix()
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      fixed: 'right' as const,
      render: (_: any, record: Driver) => (
        <Space size="small">
          <Button
            type="link"
            onClick={() => {
              setSelectedDriver(record);
              setDetailModalVisible(true);
            }}
          >
            View
          </Button>
          {record.status === 'pending' && (
            <>
              <Popconfirm
                title="Approve this driver?"
                description="An activation email will be sent to the driver."
                onConfirm={() => updateDriverStatus(record.id, 'approved')}
                okText="Approve"
                cancelText="Cancel"
              >
                <Button type="primary" size="small" icon={<CheckOutlined />} loading={updating}>
                  Approve
                </Button>
              </Popconfirm>
              <Popconfirm
                title="Reject this driver?"
                description="This action cannot be undone."
                onConfirm={() => updateDriverStatus(record.id, 'rejected')}
                okText="Reject"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
              >
                <Button danger size="small" icon={<CloseOutlined />} loading={updating}>
                  Reject
                </Button>
              </Popconfirm>
            </>
          )}
        </Space>
      )
    }
  ];

  const filteredDrivers = drivers.filter(driver => {
    if (searchText) {
      const search = searchText.toLowerCase();
      return (
        driver.first_name?.toLowerCase().includes(search) ||
        driver.last_name?.toLowerCase().includes(search) ||
        driver.email?.toLowerCase().includes(search) ||
        driver.phone?.includes(search) ||
        driver.driver_id?.toLowerCase().includes(search) ||
        driver.license_plate?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  return (
    <div style={{ padding: '24px' }}>
      <h2 style={{ marginBottom: 24 }}>
        <CarOutlined style={{ marginRight: 8 }} />
        Drivers Management
      </h2>

      {/* Stats Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Drivers"
              value={stats.totalDrivers || drivers.length}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Active Drivers"
              value={stats.activeDrivers}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Pending Approval"
              value={stats.pendingApproval}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Online Now"
              value={stats.onlineNow}
              prefix={<Badge status="success" />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Info Banner */}
      <Card style={{ marginBottom: 16, background: '#fff7e6', border: '1px solid #ffd591' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <CarOutlined style={{ fontSize: 24, color: '#fa8c16' }} />
          <div>
            <strong>Driver Onboarding:</strong>
            <div style={{ color: '#666', marginTop: 4 }}>
              Drivers must complete document verification and Stripe Connect setup before accepting rides.
              As a matchmaking platform, drivers negotiate fares directly with customers.
            </div>
          </div>
        </div>
      </Card>

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Space size="middle" wrap>
          <Input
            placeholder="Search drivers..."
            prefix={<SearchOutlined />}
            style={{ width: 250 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />

          <Select
            style={{ width: 180 }}
            placeholder="Status"
            value={statusFilter}
            onChange={setStatusFilter}
          >
            <Option value="all">All Statuses</Option>
            <Option value="pending">Pending</Option>
            <Option value="approved">Approved</Option>
            <Option value="active">Active</Option>
            <Option value="suspended">Suspended</Option>
            <Option value="rejected">Rejected</Option>
          </Select>

          <Button
            type="primary"
            icon={<SyncOutlined />}
            onClick={fetchDrivers}
          >
            Refresh
          </Button>
        </Space>
      </Card>

      {/* Drivers Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredDrivers}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1600 }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} drivers`
          }}
        />
      </Card>

      {/* Driver Detail Modal */}
      <Modal
        title="Driver Details"
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedDriver(null);
        }}
        footer={selectedDriver ? (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button onClick={() => { setDetailModalVisible(false); setSelectedDriver(null); }}>
              Close
            </Button>
            <Space>
              {selectedDriver.status === 'pending' && (
                <>
                  <Popconfirm
                    title="Approve this driver?"
                    description="An activation email will be sent to the driver."
                    onConfirm={() => updateDriverStatus(selectedDriver.id, 'approved')}
                    okText="Approve"
                    cancelText="Cancel"
                  >
                    <Button type="primary" icon={<CheckOutlined />} loading={updating}>
                      Approve Driver
                    </Button>
                  </Popconfirm>
                  <Popconfirm
                    title="Reject this driver?"
                    description="This action cannot be undone."
                    onConfirm={() => updateDriverStatus(selectedDriver.id, 'rejected')}
                    okText="Reject"
                    cancelText="Cancel"
                    okButtonProps={{ danger: true }}
                  >
                    <Button danger icon={<CloseOutlined />} loading={updating}>
                      Reject
                    </Button>
                  </Popconfirm>
                </>
              )}
              {(selectedDriver.status === 'approved' || selectedDriver.status === 'active') && (
                <Popconfirm
                  title="Suspend this driver?"
                  description="Driver will not be able to accept new requests."
                  onConfirm={() => updateDriverStatus(selectedDriver.id, 'suspended')}
                  okText="Suspend"
                  cancelText="Cancel"
                  okButtonProps={{ danger: true }}
                >
                  <Button danger icon={<StopOutlined />} loading={updating}>
                    Suspend Driver
                  </Button>
                </Popconfirm>
              )}
              {selectedDriver.status === 'suspended' && (
                <Popconfirm
                  title="Reactivate this driver?"
                  description="Driver will be able to accept requests again."
                  onConfirm={() => updateDriverStatus(selectedDriver.id, 'active')}
                  okText="Reactivate"
                  cancelText="Cancel"
                >
                  <Button type="primary" icon={<CheckOutlined />} loading={updating}>
                    Reactivate Driver
                  </Button>
                </Popconfirm>
              )}
            </Space>
          </div>
        ) : null}
        width={700}
      >
        {selectedDriver && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="Driver ID">{selectedDriver.driver_id}</Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={getStatusColor(selectedDriver.status)}>
                {selectedDriver.status?.toUpperCase()}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Name">
              {selectedDriver.first_name} {selectedDriver.last_name}
            </Descriptions.Item>
            <Descriptions.Item label="Online">
              <Badge status={selectedDriver.is_online ? 'success' : 'default'} text={selectedDriver.is_online ? 'Yes' : 'No'} />
            </Descriptions.Item>
            <Descriptions.Item label="Email">{selectedDriver.email}</Descriptions.Item>
            <Descriptions.Item label="Phone">{selectedDriver.phone}</Descriptions.Item>
            <Descriptions.Item label="Vehicle" span={2}>
              {selectedDriver.vehicle_year} {selectedDriver.vehicle_make} {selectedDriver.vehicle_model} ({selectedDriver.vehicle_color})
            </Descriptions.Item>
            <Descriptions.Item label="License Plate">{selectedDriver.license_plate}</Descriptions.Item>
            <Descriptions.Item label="Vehicle Type">{selectedDriver.vehicle_type}</Descriptions.Item>
            <Descriptions.Item label="Rating">
              <StarFilled style={{ color: '#faad14', marginRight: 4 }} />
              {selectedDriver.rating?.toFixed(1) || '5.0'}
            </Descriptions.Item>
            <Descriptions.Item label="Total Deliveries">{selectedDriver.total_deliveries || 0}</Descriptions.Item>
            <Descriptions.Item label="Documents Verified">
              {selectedDriver.documents_verified ? <Tag color="green">Yes</Tag> : <Tag color="orange">No</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="Stripe Onboarded">
              {selectedDriver.stripe_onboarded ? <Tag color="green">Yes</Tag> : <Tag color="orange">No</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="Joined" span={2}>
              {selectedDriver.created_at ? moment(selectedDriver.created_at).format('MMMM DD, YYYY HH:mm') : '-'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default DriversAdmin;
