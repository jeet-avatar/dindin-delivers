import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Row, Col, Typography, Button, Tag, Empty, Spin, Modal,
  InputNumber, Input, message, Badge, Divider, Avatar, Rate, Statistic
} from 'antd';
import {
  EnvironmentOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  CarOutlined,
  SendOutlined,
  ReloadOutlined,
  LoadingOutlined,
  AimOutlined,
  UserOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import {
  getAvailableRideRequests,
  submitBid,
  updateBid,
  withdrawBid,
  acceptCounterOffer,
  rejectCounterOffer,
  getDriverBids,
  getCurrentDriverId,
  RideRequest,
  RideBid,
  getWebSocketUrl
} from '../../api/api';

const { Title, Text } = Typography;
const { TextArea } = Input;

/**
 * Ride Bidding Screen for Drivers
 * Shows available ride requests and allows drivers to submit competitive bids
 */

const RideBidding: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [availableRequests, setAvailableRequests] = useState<RideRequest[]>([]);
  const [myBids, setMyBids] = useState<RideBid[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<RideRequest | null>(null);
  const [bidModalOpen, setBidModalOpen] = useState(false);
  const [bidPrice, setBidPrice] = useState<number>(0);
  const [bidMessage, setBidMessage] = useState('');
  const [bidEta, setBidEta] = useState<number>(5);
  const [submittingBid, setSubmittingBid] = useState(false);
  const [activeTab, setActiveTab] = useState<'available' | 'my_bids'>('available');

  // Driver info
  const driverId = getCurrentDriverId() || 1;
  const [driverLocation, setDriverLocation] = useState({ lat: 40.7128, lng: -74.006 }); // Default NYC

  // Get driver's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setDriverLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  }, []);

  // Fetch available ride requests
  const fetchAvailableRequests = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getAvailableRideRequests(
        driverId,
        driverLocation.lat,
        driverLocation.lng,
        20 // 20km radius
      );
      if (response.success) {
        setAvailableRequests(response.available_requests || []);
      }
    } catch (error) {
      console.error('Failed to fetch ride requests:', error);
      message.error('Failed to load ride requests');
    } finally {
      setLoading(false);
    }
  }, [driverId, driverLocation]);

  // Fetch my active bids
  const fetchMyBids = useCallback(async () => {
    try {
      const response = await getDriverBids(driverId);
      if (response.success) {
        setMyBids(response.bids || []);
      }
    } catch (error) {
      console.error('Failed to fetch bids:', error);
    }
  }, [driverId]);

  useEffect(() => {
    fetchAvailableRequests();
    fetchMyBids();

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchAvailableRequests();
      fetchMyBids();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchAvailableRequests, fetchMyBids]);

  // WebSocket for real-time updates
  useEffect(() => {
    const wsUrl = `${getWebSocketUrl()}/driver/${driverId}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('Bid WebSocket connected');
      // Subscribe to ride requests topic
      ws.send(JSON.stringify({ type: 'subscribe', topic: 'ride_requests' }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'new_ride_request') {
          // Add new request to list
          setAvailableRequests(prev => [data.ride_request, ...prev]);
          message.info('New ride request available!');
        } else if (data.type === 'bid_response') {
          // Refresh my bids when customer responds
          fetchMyBids();
          if (data.action === 'accepted') {
            message.success('Your bid was accepted!');
          } else if (data.action === 'countered') {
            message.info('Customer made a counter-offer');
          }
        } else if (data.type === 'ride_request_closed') {
          // Remove closed request
          setAvailableRequests(prev =>
            prev.filter(r => r.id !== data.ride_request_id)
          );
        }
      } catch (e) {
        console.error('Error parsing WebSocket message:', e);
      }
    };

    return () => ws.close();
  }, [driverId, fetchMyBids]);

  // Open bid modal
  const openBidModal = (request: RideRequest) => {
    setSelectedRequest(request);
    setBidPrice(request.suggested_price);
    setBidMessage('');
    setBidEta(5);
    setBidModalOpen(true);
  };

  // Submit bid
  const handleSubmitBid = async () => {
    if (!selectedRequest) return;

    setSubmittingBid(true);
    try {
      const response = await submitBid(
        selectedRequest.id,
        driverId,
        bidPrice,
        bidMessage || undefined,
        bidEta
      );

      if (response.success) {
        message.success('Bid submitted successfully!');
        setBidModalOpen(false);
        fetchAvailableRequests();
        fetchMyBids();
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      message.error(err.response?.data?.detail || 'Failed to submit bid');
    } finally {
      setSubmittingBid(false);
    }
  };

  // Handle counter-offer response
  const handleCounterResponse = async (bid: RideBid, accept: boolean) => {
    try {
      if (accept) {
        await acceptCounterOffer(bid.id);
        message.success('Counter-offer accepted! Ride matched.');
      } else {
        await rejectCounterOffer(bid.id);
        message.info('Counter-offer rejected, bid withdrawn');
      }
      fetchMyBids();
    } catch (error) {
      message.error('Failed to respond to counter-offer');
    }
  };

  // Withdraw bid
  const handleWithdrawBid = async (bidId: number) => {
    try {
      await withdrawBid(bidId);
      message.success('Bid withdrawn');
      fetchMyBids();
      fetchAvailableRequests();
    } catch (error) {
      message.error('Failed to withdraw bid');
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    return `${Math.floor(diffMins / 60)}h ago`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'processing';
      case 'accepted': return 'success';
      case 'rejected': return 'error';
      case 'countered': return 'warning';
      case 'withdrawn': return 'default';
      default: return 'default';
    }
  };

  if (loading && availableRequests.length === 0) {
    return (
      <div className="loading-container">
        <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
        <Text type="secondary">Finding ride requests near you...</Text>
      </div>
    );
  }

  return (
    <div className="ride-bidding">
      {/* Header */}
      <div className="page-header">
        <div>
          <Title level={3} style={{ margin: 0 }}>Ride Requests</Title>
          <Text type="secondary">Find rides and submit your best offer</Text>
        </div>
        <div className="header-actions">
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              fetchAvailableRequests();
              fetchMyBids();
            }}
            loading={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-nav">
        <Button
          type={activeTab === 'available' ? 'primary' : 'default'}
          onClick={() => setActiveTab('available')}
        >
          Available ({availableRequests.length})
        </Button>
        <Button
          type={activeTab === 'my_bids' ? 'primary' : 'default'}
          onClick={() => setActiveTab('my_bids')}
        >
          My Bids ({myBids.filter(b => b.status === 'pending' || b.status === 'countered').length})
        </Button>
      </div>

      {/* Available Requests Tab */}
      {activeTab === 'available' && (
        <div className="requests-list">
          {availableRequests.length === 0 ? (
            <Card className="empty-card">
              <Empty
                image={<CarOutlined style={{ fontSize: 64, color: '#10B981' }} />}
                description={
                  <div>
                    <Title level={4}>No Ride Requests Nearby</Title>
                    <Text type="secondary">New requests will appear here when customers need a ride</Text>
                  </div>
                }
              />
            </Card>
          ) : (
            <Row gutter={[16, 16]}>
              {availableRequests.map((request) => (
                <Col xs={24} lg={12} key={request.id}>
                  <Card className="request-card">
                    <div className="request-header">
                      <div className="request-id">
                        <Text type="secondary">{request.request_id}</Text>
                        <Text type="secondary" style={{ marginLeft: 8 }}>
                          {formatTimeAgo(request.created_at)}
                        </Text>
                      </div>
                      <Tag color="blue">{request.ride_type.toUpperCase()}</Tag>
                    </div>

                    {/* Pickup & Dropoff */}
                    <div className="location-section">
                      <div className="location-item">
                        <div className="location-dot pickup"></div>
                        <div className="location-info">
                          <Text type="secondary" style={{ fontSize: 11 }}>PICKUP</Text>
                          <Text strong>{request.pickup.place_name || request.pickup.address.substring(0, 40)}</Text>
                        </div>
                      </div>
                      <div className="location-line"></div>
                      <div className="location-item">
                        <div className="location-dot dropoff"></div>
                        <div className="location-info">
                          <Text type="secondary" style={{ fontSize: 11 }}>DROPOFF</Text>
                          <Text strong>{request.dropoff.place_name || request.dropoff.address.substring(0, 40)}</Text>
                        </div>
                      </div>
                    </div>

                    <Divider style={{ margin: '12px 0' }} />

                    {/* Stats Row */}
                    <Row gutter={16} className="stats-row">
                      <Col span={6}>
                        <Statistic
                          title="Distance"
                          value={request.estimated_distance_km}
                          suffix="km"
                          valueStyle={{ fontSize: 16 }}
                        />
                      </Col>
                      <Col span={6}>
                        <Statistic
                          title="Duration"
                          value={request.estimated_duration_minutes}
                          suffix="min"
                          valueStyle={{ fontSize: 16 }}
                        />
                      </Col>
                      <Col span={6}>
                        <Statistic
                          title="Suggested"
                          value={request.suggested_price}
                          prefix="$"
                          valueStyle={{ fontSize: 16, color: '#10B981' }}
                        />
                      </Col>
                      <Col span={6}>
                        <Statistic
                          title="To Pickup"
                          value={request.distance_to_pickup_km || 0}
                          suffix="km"
                          valueStyle={{ fontSize: 16, color: '#6366F1' }}
                        />
                      </Col>
                    </Row>

                    {/* Customer preferred price if set */}
                    {request.customer_preferred_price && (
                      <div className="customer-preference">
                        <Text type="secondary">Customer's preferred price: </Text>
                        <Text strong style={{ color: '#F59E0B' }}>
                          ${request.customer_preferred_price.toFixed(2)}
                        </Text>
                      </div>
                    )}

                    {/* Bid Count */}
                    <div className="bid-count">
                      <Badge count={request.bid_count} showZero>
                        <Tag>Bids</Tag>
                      </Badge>
                    </div>

                    {/* Action Button */}
                    <div className="action-section">
                      {request.already_bid ? (
                        <div className="already-bid">
                          <Tag color="green" icon={<CheckCircleOutlined />}>
                            You bid ${request.my_bid?.proposed_price.toFixed(2)}
                          </Tag>
                          <Button
                            size="small"
                            danger
                            onClick={() => request.my_bid && handleWithdrawBid(request.my_bid.id)}
                          >
                            Withdraw
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="primary"
                          icon={<SendOutlined />}
                          block
                          size="large"
                          onClick={() => openBidModal(request)}
                          className="bid-button"
                        >
                          Submit Bid
                        </Button>
                      )}
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </div>
      )}

      {/* My Bids Tab */}
      {activeTab === 'my_bids' && (
        <div className="bids-list">
          {myBids.length === 0 ? (
            <Card className="empty-card">
              <Empty
                description={
                  <div>
                    <Title level={4}>No Active Bids</Title>
                    <Text type="secondary">Submit bids on available ride requests</Text>
                  </div>
                }
              />
            </Card>
          ) : (
            <Row gutter={[16, 16]}>
              {myBids.map((bid) => (
                <Col xs={24} lg={12} key={bid.id}>
                  <Card className={`bid-card ${bid.status}`}>
                    <div className="bid-header">
                      <Text type="secondary">{bid.bid_id}</Text>
                      <Tag color={getStatusColor(bid.status)}>
                        {bid.status.toUpperCase()}
                      </Tag>
                    </div>

                    {bid.ride_request && (
                      <div className="bid-route">
                        <div className="route-item">
                          <EnvironmentOutlined style={{ color: '#F59E0B' }} />
                          <Text ellipsis>{bid.ride_request.pickup.address}</Text>
                        </div>
                        <div className="route-item">
                          <EnvironmentOutlined style={{ color: '#10B981' }} />
                          <Text ellipsis>{bid.ride_request.dropoff.address}</Text>
                        </div>
                      </div>
                    )}

                    <Divider style={{ margin: '12px 0' }} />

                    <div className="bid-price-section">
                      <div>
                        <Text type="secondary">Your Bid</Text>
                        <Title level={3} style={{ margin: 0, color: '#10B981' }}>
                          ${bid.proposed_price.toFixed(2)}
                        </Title>
                      </div>
                      {bid.estimated_arrival_minutes && (
                        <div>
                          <Text type="secondary">ETA to Pickup</Text>
                          <Text strong>{bid.estimated_arrival_minutes} min</Text>
                        </div>
                      )}
                    </div>

                    {/* Counter-offer section */}
                    {bid.status === 'countered' && bid.customer_counter_price && (
                      <div className="counter-offer-section">
                        <div className="counter-info">
                          <Text type="warning">Customer's Counter-Offer:</Text>
                          <Title level={4} style={{ margin: 0, color: '#F59E0B' }}>
                            ${bid.customer_counter_price.toFixed(2)}
                          </Title>
                          {bid.customer_response && (
                            <Text type="secondary">"{bid.customer_response}"</Text>
                          )}
                        </div>
                        <div className="counter-actions">
                          <Button
                            type="primary"
                            onClick={() => handleCounterResponse(bid, true)}
                          >
                            Accept ${bid.customer_counter_price.toFixed(2)}
                          </Button>
                          <Button
                            danger
                            onClick={() => handleCounterResponse(bid, false)}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Pending bid actions */}
                    {bid.status === 'pending' && (
                      <div className="bid-actions">
                        <Button
                          danger
                          onClick={() => handleWithdrawBid(bid.id)}
                        >
                          Withdraw Bid
                        </Button>
                      </div>
                    )}

                    {/* Accepted status */}
                    {bid.status === 'accepted' && (
                      <div className="accepted-section">
                        <Tag color="success" icon={<CheckCircleOutlined />}>
                          Ride Matched! Proceed to pickup.
                        </Tag>
                      </div>
                    )}
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </div>
      )}

      {/* Bid Modal */}
      <Modal
        title="Submit Your Bid"
        open={bidModalOpen}
        onCancel={() => setBidModalOpen(false)}
        footer={null}
        width={480}
      >
        {selectedRequest && (
          <div className="bid-modal-content">
            {/* Route Summary */}
            <div className="route-summary">
              <div className="route-point">
                <AimOutlined style={{ color: '#F59E0B' }} />
                <Text ellipsis>{selectedRequest.pickup.address}</Text>
              </div>
              <div className="route-point">
                <EnvironmentOutlined style={{ color: '#10B981' }} />
                <Text ellipsis>{selectedRequest.dropoff.address}</Text>
              </div>
            </div>

            <Divider />

            {/* Trip Info */}
            <Row gutter={16} className="trip-info">
              <Col span={8}>
                <Text type="secondary">Distance</Text>
                <br />
                <Text strong>{selectedRequest.estimated_distance_km} km</Text>
              </Col>
              <Col span={8}>
                <Text type="secondary">Duration</Text>
                <br />
                <Text strong>{selectedRequest.estimated_duration_minutes} min</Text>
              </Col>
              <Col span={8}>
                <Text type="secondary">Suggested</Text>
                <br />
                <Text strong style={{ color: '#10B981' }}>
                  ${selectedRequest.suggested_price.toFixed(2)}
                </Text>
              </Col>
            </Row>

            {selectedRequest.customer_preferred_price && (
              <div className="preferred-price-hint">
                <Text type="warning">
                  Customer prefers: ${selectedRequest.customer_preferred_price.toFixed(2)}
                </Text>
              </div>
            )}

            <Divider />

            {/* Bid Form */}
            <div className="bid-form">
              <div className="form-item">
                <Text strong>Your Price ($)</Text>
                <InputNumber
                  min={1}
                  max={1000}
                  value={bidPrice}
                  onChange={(v) => setBidPrice(v || 0)}
                  style={{ width: '100%' }}
                  size="large"
                  prefix={<DollarOutlined />}
                  precision={2}
                />
              </div>

              <div className="form-item">
                <Text strong>ETA to Pickup (minutes)</Text>
                <InputNumber
                  min={1}
                  max={60}
                  value={bidEta}
                  onChange={(v) => setBidEta(v || 5)}
                  style={{ width: '100%' }}
                  prefix={<ClockCircleOutlined />}
                />
              </div>

              <div className="form-item">
                <Text strong>Message (optional)</Text>
                <TextArea
                  value={bidMessage}
                  onChange={(e) => setBidMessage(e.target.value)}
                  placeholder="I'm nearby and can pick up quickly!"
                  rows={2}
                  maxLength={200}
                />
              </div>

              <Button
                type="primary"
                size="large"
                block
                icon={<SendOutlined />}
                onClick={handleSubmitBid}
                loading={submittingBid}
                className="submit-bid-btn"
              >
                Submit Bid - ${bidPrice.toFixed(2)}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <style>{`
        .ride-bidding {
          padding: 0;
        }
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          gap: 16px;
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 16px;
        }
        .tab-nav {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
        }
        .empty-card {
          border-radius: 16px;
          padding: 40px;
        }
        .request-card {
          border-radius: 16px;
          transition: all 0.3s;
        }
        .request-card:hover {
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        .request-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .location-section {
          position: relative;
          padding-left: 24px;
        }
        .location-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin: 8px 0;
        }
        .location-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          margin-top: 4px;
        }
        .location-dot.pickup {
          background: #F59E0B;
        }
        .location-dot.dropoff {
          background: #10B981;
        }
        .location-line {
          position: absolute;
          left: 5px;
          top: 20px;
          bottom: 20px;
          width: 2px;
          background: linear-gradient(#F59E0B, #10B981);
        }
        .location-info {
          display: flex;
          flex-direction: column;
        }
        .stats-row {
          margin: 12px 0;
        }
        .customer-preference {
          padding: 8px 12px;
          background: rgba(245, 158, 11, 0.1);
          border-radius: 8px;
          margin: 8px 0;
        }
        .bid-count {
          margin: 12px 0;
        }
        .action-section {
          margin-top: 16px;
        }
        .already-bid {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .bid-button {
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          border: none;
          height: 48px;
          font-weight: 600;
        }
        .bid-card {
          border-radius: 16px;
        }
        .bid-card.countered {
          border: 2px solid #F59E0B;
        }
        .bid-card.accepted {
          border: 2px solid #10B981;
        }
        .bid-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .bid-route {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .route-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .bid-price-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .counter-offer-section {
          padding: 16px;
          background: rgba(245, 158, 11, 0.1);
          border-radius: 12px;
          margin-top: 16px;
        }
        .counter-info {
          margin-bottom: 12px;
        }
        .counter-actions {
          display: flex;
          gap: 8px;
        }
        .bid-actions {
          margin-top: 16px;
        }
        .accepted-section {
          margin-top: 16px;
          text-align: center;
        }
        .bid-modal-content {
          padding: 16px 0;
        }
        .route-summary {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .route-point {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .trip-info {
          text-align: center;
        }
        .preferred-price-hint {
          text-align: center;
          padding: 8px;
          background: rgba(245, 158, 11, 0.1);
          border-radius: 8px;
          margin-top: 12px;
        }
        .bid-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .form-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .submit-bid-btn {
          margin-top: 8px;
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          border: none;
          height: 48px;
        }
      `}</style>
    </div>
  );
};

export default RideBidding;
