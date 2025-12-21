import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Row, Col, Typography, Button, Tag, Empty, Spin, Modal,
  InputNumber, Input, message, Avatar, Rate, Divider, Progress, Badge
} from 'antd';
import {
  EnvironmentOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  CarOutlined,
  StarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SwapOutlined,
  UserOutlined,
  LoadingOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import {
  getBidsForRequest,
  respondToBid,
  cancelRideRequest,
  getCustomerRideRequests,
  RideRequest,
  RideBid,
  getWebSocketUrl
} from '../../api/api';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface RideBidsProps {
  rideRequestId?: number;
  customerId: number;
}

/**
 * Customer Bid Viewer
 * Shows incoming bids from drivers and allows accepting/rejecting/countering
 */

const RideBids: React.FC<RideBidsProps> = ({ rideRequestId, customerId }) => {
  const [loading, setLoading] = useState(true);
  const [rideRequest, setRideRequest] = useState<RideRequest | null>(null);
  const [bids, setBids] = useState<RideBid[]>([]);
  const [counterModalOpen, setCounterModalOpen] = useState(false);
  const [selectedBid, setSelectedBid] = useState<RideBid | null>(null);
  const [counterPrice, setCounterPrice] = useState<number>(0);
  const [counterMessage, setCounterMessage] = useState('');
  const [responding, setResponding] = useState(false);
  const [activeRequests, setActiveRequests] = useState<RideRequest[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<number | undefined>(rideRequestId);

  // Fetch active ride requests for customer
  const fetchActiveRequests = useCallback(async () => {
    try {
      const response = await getCustomerRideRequests(customerId);
      if (response.success) {
        const active = response.requests.filter(
          (r: RideRequest) => r.status === 'open' || r.status === 'bidding'
        );
        setActiveRequests(active);
        if (active.length > 0 && !selectedRequestId) {
          setSelectedRequestId(active[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch ride requests:', error);
    }
  }, [customerId, selectedRequestId]);

  // Fetch bids for selected request
  const fetchBids = useCallback(async () => {
    if (!selectedRequestId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await getBidsForRequest(selectedRequestId);
      if (response.success) {
        setRideRequest(response.ride_request);
        setBids(response.bids || []);
      }
    } catch (error) {
      console.error('Failed to fetch bids:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedRequestId]);

  useEffect(() => {
    fetchActiveRequests();
  }, [fetchActiveRequests]);

  useEffect(() => {
    fetchBids();

    // Refresh every 10 seconds
    const interval = setInterval(fetchBids, 10000);
    return () => clearInterval(interval);
  }, [fetchBids]);

  // WebSocket for real-time bid updates
  useEffect(() => {
    if (!selectedRequestId) return;

    const wsUrl = `${getWebSocketUrl()}/customer/${customerId}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('Customer bid WebSocket connected');
      // Subscribe to ride request topic
      ws.send(JSON.stringify({
        type: 'subscribe',
        topic: `ride_request:${selectedRequestId}`
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'new_bid') {
          // Add new bid to list
          setBids(prev => [...prev, data.bid]);
          message.info(`New bid from ${data.bid.driver_name}: $${data.bid.proposed_price.toFixed(2)}`);
        } else if (data.type === 'bid_updated') {
          // Update existing bid
          setBids(prev => prev.map(b =>
            b.id === data.bid.id ? data.bid : b
          ));
        } else if (data.type === 'bid_withdrawn') {
          // Remove withdrawn bid
          setBids(prev => prev.filter(b => b.id !== data.bid_id));
        } else if (data.type === 'ride_matched') {
          message.success('Ride matched! Driver is on the way.');
          fetchBids();
        }
      } catch (e) {
        console.error('Error parsing WebSocket message:', e);
      }
    };

    return () => ws.close();
  }, [selectedRequestId, customerId, fetchBids]);

  // Accept bid
  const handleAcceptBid = async (bid: RideBid) => {
    setResponding(true);
    try {
      const response = await respondToBid(bid.id, 'accept');
      if (response.success) {
        message.success(`Ride matched with ${bid.driver_name}!`);
        fetchBids();
        fetchActiveRequests();
      }
    } catch (error) {
      message.error('Failed to accept bid');
    } finally {
      setResponding(false);
    }
  };

  // Reject bid
  const handleRejectBid = async (bid: RideBid) => {
    setResponding(true);
    try {
      await respondToBid(bid.id, 'reject');
      message.info('Bid rejected');
      setBids(prev => prev.filter(b => b.id !== bid.id));
    } catch (error) {
      message.error('Failed to reject bid');
    } finally {
      setResponding(false);
    }
  };

  // Open counter-offer modal
  const openCounterModal = (bid: RideBid) => {
    setSelectedBid(bid);
    setCounterPrice(Math.floor(bid.proposed_price * 0.9)); // Suggest 10% less
    setCounterMessage('');
    setCounterModalOpen(true);
  };

  // Submit counter-offer
  const handleCounter = async () => {
    if (!selectedBid) return;

    setResponding(true);
    try {
      const response = await respondToBid(
        selectedBid.id,
        'counter',
        counterPrice,
        counterMessage
      );
      if (response.success) {
        message.success('Counter-offer sent to driver');
        setCounterModalOpen(false);
        fetchBids();
      }
    } catch (error) {
      message.error('Failed to send counter-offer');
    } finally {
      setResponding(false);
    }
  };

  // Cancel ride request
  const handleCancelRequest = async () => {
    if (!selectedRequestId) return;

    Modal.confirm({
      title: 'Cancel Ride Request?',
      content: 'All pending bids will be dismissed.',
      okText: 'Yes, Cancel',
      okType: 'danger',
      cancelText: 'No, Keep It',
      onOk: async () => {
        try {
          await cancelRideRequest(selectedRequestId);
          message.info('Ride request cancelled');
          fetchActiveRequests();
          setSelectedRequestId(undefined);
        } catch (error) {
          message.error('Failed to cancel request');
        }
      }
    });
  };

  const getTimeRemaining = (expiresAt: string) => {
    const expires = new Date(expiresAt);
    const now = new Date();
    const diffMs = expires.getTime() - now.getTime();
    if (diffMs <= 0) return 'Expired';
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Less than 1 min';
    return `${mins} min left`;
  };

  if (loading && !rideRequest) {
    return (
      <div className="loading-container">
        <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
        <Text type="secondary">Loading bids...</Text>
      </div>
    );
  }

  if (activeRequests.length === 0) {
    return (
      <Card className="no-requests-card">
        <Empty
          image={<CarOutlined style={{ fontSize: 64, color: '#6366F1' }} />}
          description={
            <div>
              <Title level={4}>No Active Ride Requests</Title>
              <Text type="secondary">
                Request a ride to start receiving bids from drivers
              </Text>
            </div>
          }
        >
          <Button type="primary" href="/customer/book-ride">
            Request a Ride
          </Button>
        </Empty>
      </Card>
    );
  }

  return (
    <div className="ride-bids">
      {/* Header */}
      <div className="page-header">
        <div>
          <Title level={3} style={{ margin: 0 }}>Driver Bids</Title>
          <Text type="secondary">Review and choose your driver</Text>
        </div>
        <div className="header-actions">
          <Button icon={<ReloadOutlined />} onClick={fetchBids}>
            Refresh
          </Button>
          <Button danger onClick={handleCancelRequest}>
            Cancel Request
          </Button>
        </div>
      </div>

      {/* Request Selector (if multiple) */}
      {activeRequests.length > 1 && (
        <div className="request-selector">
          {activeRequests.map(req => (
            <Button
              key={req.id}
              type={selectedRequestId === req.id ? 'primary' : 'default'}
              onClick={() => setSelectedRequestId(req.id)}
            >
              {req.request_id} ({req.bid_count} bids)
            </Button>
          ))}
        </div>
      )}

      {/* Current Request Summary */}
      {rideRequest && (
        <Card className="request-summary-card">
          <Row gutter={24} align="middle">
            <Col xs={24} md={16}>
              <div className="route-summary">
                <div className="route-point">
                  <div className="dot pickup"></div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 11 }}>PICKUP</Text>
                    <br />
                    <Text strong>{rideRequest.pickup.place_name || rideRequest.pickup.address}</Text>
                  </div>
                </div>
                <div className="route-line"></div>
                <div className="route-point">
                  <div className="dot dropoff"></div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 11 }}>DROPOFF</Text>
                    <br />
                    <Text strong>{rideRequest.dropoff.place_name || rideRequest.dropoff.address}</Text>
                  </div>
                </div>
              </div>
            </Col>
            <Col xs={24} md={8}>
              <div className="request-stats">
                <div className="stat">
                  <Text type="secondary">Distance</Text>
                  <Text strong>{rideRequest.estimated_distance_km} km</Text>
                </div>
                <div className="stat">
                  <Text type="secondary">Suggested</Text>
                  <Text strong style={{ color: '#10B981' }}>
                    ${rideRequest.suggested_price.toFixed(2)}
                  </Text>
                </div>
                {rideRequest.bidding_expires_at && (
                  <div className="stat">
                    <Text type="secondary">Bidding Ends</Text>
                    <Text strong style={{ color: '#F59E0B' }}>
                      {getTimeRemaining(rideRequest.bidding_expires_at)}
                    </Text>
                  </div>
                )}
              </div>
            </Col>
          </Row>
        </Card>
      )}

      {/* Bids List */}
      <div className="bids-section">
        <div className="bids-header">
          <Title level={4}>
            <Badge count={bids.length} showZero style={{ marginRight: 8 }}>
              <span style={{ marginRight: 16 }}>Incoming Bids</span>
            </Badge>
          </Title>
          <Text type="secondary">Sorted by price (lowest first)</Text>
        </div>

        {bids.length === 0 ? (
          <Card className="no-bids-card">
            <Empty
              description={
                <div>
                  <Title level={5}>Waiting for Driver Bids</Title>
                  <Text type="secondary">
                    Nearby drivers will submit their offers shortly
                  </Text>
                </div>
              }
            />
            <div className="waiting-indicator">
              <Spin size="small" />
              <Text type="secondary" style={{ marginLeft: 8 }}>
                Drivers are viewing your request...
              </Text>
            </div>
          </Card>
        ) : (
          <Row gutter={[16, 16]}>
            {bids
              .sort((a, b) => a.proposed_price - b.proposed_price)
              .map((bid, index) => (
                <Col xs={24} md={12} lg={8} key={bid.id}>
                  <Card
                    className={`bid-card ${index === 0 ? 'lowest-price' : ''}`}
                  >
                    {index === 0 && (
                      <div className="best-price-badge">
                        <Tag color="green">Lowest Price</Tag>
                      </div>
                    )}

                    {/* Driver Info */}
                    <div className="driver-info">
                      <Avatar
                        size={56}
                        src={bid.driver_photo_url}
                        icon={<UserOutlined />}
                        style={{ backgroundColor: '#6366F1' }}
                      />
                      <div className="driver-details">
                        <Text strong style={{ fontSize: 16 }}>{bid.driver_name}</Text>
                        <div className="driver-rating">
                          <Rate disabled defaultValue={bid.driver_rating} allowHalf style={{ fontSize: 12 }} />
                          <Text type="secondary" style={{ marginLeft: 4 }}>
                            {bid.driver_rating?.toFixed(1)}
                          </Text>
                        </div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          <CarOutlined /> {bid.driver_vehicle}
                        </Text>
                      </div>
                    </div>

                    <Divider style={{ margin: '16px 0' }} />

                    {/* Price */}
                    <div className="bid-price">
                      <div>
                        <Text type="secondary">Bid Price</Text>
                        <Title level={2} style={{ margin: 0, color: '#10B981' }}>
                          ${bid.proposed_price.toFixed(2)}
                        </Title>
                      </div>
                      {bid.estimated_arrival_minutes && (
                        <div className="eta">
                          <ClockCircleOutlined />
                          <Text>{bid.estimated_arrival_minutes} min away</Text>
                        </div>
                      )}
                    </div>

                    {/* Driver Message */}
                    {bid.message && (
                      <div className="driver-message">
                        <Text type="secondary">"{bid.message}"</Text>
                      </div>
                    )}

                    {/* Price Comparison */}
                    {rideRequest && (
                      <div className="price-comparison">
                        {bid.proposed_price < rideRequest.suggested_price ? (
                          <Tag color="green">
                            ${(rideRequest.suggested_price - bid.proposed_price).toFixed(2)} below suggested
                          </Tag>
                        ) : bid.proposed_price > rideRequest.suggested_price ? (
                          <Tag color="orange">
                            ${(bid.proposed_price - rideRequest.suggested_price).toFixed(2)} above suggested
                          </Tag>
                        ) : (
                          <Tag color="blue">At suggested price</Tag>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="bid-actions">
                      <Button
                        type="primary"
                        icon={<CheckCircleOutlined />}
                        onClick={() => handleAcceptBid(bid)}
                        loading={responding}
                        block
                        size="large"
                        className="accept-btn"
                      >
                        Accept
                      </Button>
                      <div className="secondary-actions">
                        <Button
                          icon={<SwapOutlined />}
                          onClick={() => openCounterModal(bid)}
                        >
                          Counter
                        </Button>
                        <Button
                          danger
                          icon={<CloseCircleOutlined />}
                          onClick={() => handleRejectBid(bid)}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  </Card>
                </Col>
              ))}
          </Row>
        )}
      </div>

      {/* Counter-Offer Modal */}
      <Modal
        title="Make Counter-Offer"
        open={counterModalOpen}
        onCancel={() => setCounterModalOpen(false)}
        footer={null}
        width={400}
      >
        {selectedBid && (
          <div className="counter-modal">
            <div className="original-bid">
              <Text type="secondary">Driver's bid:</Text>
              <Text strong style={{ marginLeft: 8 }}>
                ${selectedBid.proposed_price.toFixed(2)}
              </Text>
            </div>

            <Divider />

            <div className="counter-form">
              <div className="form-item">
                <Text strong>Your Counter Price ($)</Text>
                <InputNumber
                  min={1}
                  max={selectedBid.proposed_price}
                  value={counterPrice}
                  onChange={(v) => setCounterPrice(v || 0)}
                  style={{ width: '100%' }}
                  size="large"
                  prefix={<DollarOutlined />}
                  precision={2}
                />
              </div>

              <div className="form-item">
                <Text strong>Message (optional)</Text>
                <TextArea
                  value={counterMessage}
                  onChange={(e) => setCounterMessage(e.target.value)}
                  placeholder="Would you consider this price?"
                  rows={2}
                  maxLength={200}
                />
              </div>

              <Button
                type="primary"
                block
                size="large"
                icon={<SwapOutlined />}
                onClick={handleCounter}
                loading={responding}
              >
                Send Counter-Offer - ${counterPrice.toFixed(2)}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <style>{`
        .ride-bids {
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
        .header-actions {
          display: flex;
          gap: 8px;
        }
        .request-selector {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .request-summary-card {
          border-radius: 16px;
          margin-bottom: 20px;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        }
        .route-summary {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .route-point {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .dot {
          width: 14px;
          height: 14px;
          border-radius: 50%;
        }
        .dot.pickup {
          background: #F59E0B;
        }
        .dot.dropoff {
          background: #10B981;
        }
        .route-line {
          flex: 1;
          height: 2px;
          background: linear-gradient(90deg, #F59E0B, #10B981);
        }
        .request-stats {
          display: flex;
          gap: 24px;
          justify-content: flex-end;
        }
        .stat {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .bids-section {
          margin-top: 24px;
        }
        .bids-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .no-bids-card {
          border-radius: 16px;
          padding: 40px;
          text-align: center;
        }
        .waiting-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 16px;
        }
        .bid-card {
          border-radius: 16px;
          transition: all 0.3s;
          position: relative;
        }
        .bid-card:hover {
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        .bid-card.lowest-price {
          border: 2px solid #10B981;
        }
        .best-price-badge {
          position: absolute;
          top: -12px;
          right: 16px;
        }
        .driver-info {
          display: flex;
          gap: 16px;
          align-items: center;
        }
        .driver-details {
          display: flex;
          flex-direction: column;
        }
        .driver-rating {
          display: flex;
          align-items: center;
        }
        .bid-price {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .eta {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #6366F1;
        }
        .driver-message {
          padding: 8px 12px;
          background: #f8fafc;
          border-radius: 8px;
          margin: 12px 0;
          font-style: italic;
        }
        .price-comparison {
          margin: 12px 0;
        }
        .bid-actions {
          margin-top: 16px;
        }
        .accept-btn {
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          border: none;
          height: 48px;
          margin-bottom: 8px;
        }
        .secondary-actions {
          display: flex;
          gap: 8px;
        }
        .secondary-actions button {
          flex: 1;
        }
        .no-requests-card {
          border-radius: 16px;
          padding: 60px 40px;
        }
        .counter-modal .original-bid {
          text-align: center;
          padding: 12px;
          background: #f8fafc;
          border-radius: 8px;
        }
        .counter-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .form-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
      `}</style>
    </div>
  );
};

export default RideBids;
