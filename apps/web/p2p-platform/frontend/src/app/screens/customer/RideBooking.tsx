import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, Button, Input, message, Spin, Steps, Modal, Rate, Divider, Typography, Avatar, Tag, Alert } from 'antd';
import {
  EnvironmentOutlined,
  CarOutlined,
  DollarOutlined,
  UserOutlined,
  PhoneOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  ClockCircleOutlined,
  SafetyOutlined,
  StarOutlined,
  AimOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { getApiUrl } from '../../api/api';
import { pricing } from '../../config/brand';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

interface Location {
  address: string;
  lat: number;
  lng: number;
  city?: string;
  state?: string;
  zip?: string;
}

interface FareEstimate {
  total_fare: number;
  platform_fee: number;
  base_fare: number;
  distance_fee: number;
  time_fee: number;
  tax_amount: number;
  driver_earnings: number;
  distance_miles: number;
  duration_minutes: number;
  fee_tier?: string;  // Tier based on fare: "Tier 1 (up to $35)", "Tier 2 ($35-$70)", "Tier 3 (above $70)"
}

interface Driver {
  id: number;
  name: string;
  phone: string;
  rating: number;
  photo_url?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_color?: string;
  license_plate?: string;
  eta_minutes?: number;
}

interface Ride {
  ride_id: number;
  ride_number: string;
  status: string;
  pickup: Location;
  dropoff: Location;
  fare: FareEstimate;
  driver?: Driver;
  created_at: string;
}

const RideBooking: React.FC = () => {
  const navigate = useNavigate();
  const API_URL = getApiUrl();

  // State
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pickup, setPickup] = useState<Location | null>(null);
  const [dropoff, setDropoff] = useState<Location | null>(null);
  const [pickupInput, setPickupInput] = useState('');
  const [dropoffInput, setDropoffInput] = useState('');
  const [fareEstimate, setFareEstimate] = useState<FareEstimate | null>(null);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [tip, setTip] = useState(0);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [rating, setRating] = useState(5);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [geocodingPickup, setGeocodingPickup] = useState(false);
  const [geocodingDropoff, setGeocodingDropoff] = useState(false);

  // Debounce refs
  const pickupDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const dropoffDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Get customer info
  const customerId = localStorage.getItem('customer_id');
  const customerName = localStorage.getItem('customer_name');
  const customerEmail = localStorage.getItem('customer_email');
  const customerPhone = localStorage.getItem('customer_phone');

  // Check authentication
  useEffect(() => {
    if (!customerId) {
      message.warning('Please log in to book a ride');
      navigate('/customer/login');
    }
  }, [customerId, navigate]);

  // Geocode address using OpenStreetMap Nominatim API (free, no API key required)
  const geocodeAddress = async (address: string): Promise<Location | null> => {
    try {
      // Use Nominatim for real geocoding (limit to USA for rideshare)
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: address,
          format: 'json',
          addressdetails: 1,
          limit: 1,
          countrycodes: 'us'
        },
        headers: {
          'User-Agent': 'DollorAI-Rideshare/1.0'
        }
      });

      if (response.data && response.data.length > 0) {
        const result = response.data[0];
        const addressDetails = result.address || {};

        return {
          address: result.display_name || address,
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
          city: addressDetails.city || addressDetails.town || addressDetails.village || addressDetails.county || '',
          state: addressDetails.state || '',
          zip: addressDetails.postcode || ''
        };
      }

      message.warning('Address not found. Please try a more specific address.');
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      message.error('Failed to lookup address. Please try again.');
      return null;
    }
  };

  // Get current location using browser geolocation
  const getCurrentLocation = (): Promise<Location | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        message.warning('Geolocation is not supported by your browser');
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            // Reverse geocode to get address
            const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
              params: {
                lat: position.coords.latitude,
                lon: position.coords.longitude,
                format: 'json',
                addressdetails: 1
              },
              headers: {
                'User-Agent': 'DollorAI-Rideshare/1.0'
              }
            });

            if (response.data) {
              const addressDetails = response.data.address || {};
              resolve({
                address: response.data.display_name || 'Current Location',
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                city: addressDetails.city || addressDetails.town || addressDetails.village || '',
                state: addressDetails.state || '',
                zip: addressDetails.postcode || ''
              });
            } else {
              resolve({
                address: 'Current Location',
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                city: '',
                state: ''
              });
            }
          } catch {
            resolve({
              address: 'Current Location',
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              city: '',
              state: ''
            });
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          message.warning('Unable to get current location');
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );
    });
  };

  // Use current location for pickup
  const useCurrentLocationForPickup = async () => {
    setGettingLocation(true);
    try {
      const location = await getCurrentLocation();
      if (location) {
        setPickup(location);
        setPickupInput(location.address);
        message.success('Current location set as pickup');
      }
    } finally {
      setGettingLocation(false);
    }
  };

  // Get fare estimate
  const getFareEstimate = async () => {
    if (!pickup || !dropoff) {
      message.warning('Please enter both pickup and dropoff locations');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/erp/rides/estimate`, null, {
        params: {
          pickup_lat: pickup.lat,
          pickup_lng: pickup.lng,
          dropoff_lat: dropoff.lat,
          dropoff_lng: dropoff.lng,
          state_code: pickup.state || 'CA',
          tip: tip
        }
      });

      if (response.data.success) {
        setFareEstimate(response.data.fare_estimate);
        setStep(1);
      }
    } catch (error: any) {
      console.error('Error getting fare estimate:', error);
      message.error('Failed to get fare estimate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Request ride using bidding API - broadcasts to all drivers
  const requestRide = async () => {
    if (!pickup || !dropoff || !fareEstimate) return;

    // Ensure customer_id is available
    if (!customerId) {
      message.error('Please log in to request a ride');
      navigate('/customer/login');
      return;
    }

    setLoading(true);
    try {
      // Use bidding API that broadcasts to all nearby drivers
      const response = await axios.post(`${API_URL}/api/rides/request`, {
        customer_id: parseInt(customerId),
        pickup_address: pickup.address,
        pickup_latitude: pickup.lat,
        pickup_longitude: pickup.lng,
        pickup_place_name: pickup.city || '',
        dropoff_address: dropoff.address,
        dropoff_latitude: dropoff.lat,
        dropoff_longitude: dropoff.lng,
        dropoff_place_name: dropoff.city || '',
        ride_type: 'standard',
        customer_max_price: fareEstimate.total_fare + 10, // Allow up to $10 over estimate
        customer_preferred_price: fareEstimate.total_fare,
        special_requests: tip > 0 ? `Tip included: $${tip}` : '',
        bidding_duration_minutes: 5
      });

      if (response.data.success) {
        const rideRequest = response.data.ride_request;
        setActiveRide({
          ride_id: rideRequest.id,
          ride_number: rideRequest.request_id,
          status: rideRequest.status,
          pickup,
          dropoff,
          fare: fareEstimate,
          created_at: rideRequest.created_at || new Date().toISOString()
        });
        setStep(2);
        message.success('Ride request sent! Waiting for driver bids...');

        // Navigate to RideBids page to view incoming bids
        setTimeout(() => {
          navigate(`/customer/ride-bids/${rideRequest.id}`);
        }, 2000);
      }
    } catch (error: any) {
      console.error('Error requesting ride:', error);
      const errMsg = error.response?.data?.detail || 'Failed to request ride. Please try again.';
      message.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Poll ride status
  const pollRideStatus = useCallback(async (rideId: number) => {
    const checkStatus = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/erp/orders/${rideId}/full-tracking`);

        if (response.data.success) {
          const order = response.data.order;
          const driver = response.data.driver;

          if (driver?.id) {
            setActiveRide(prev => prev ? {
              ...prev,
              status: order.status,
              driver: {
                id: driver.id,
                name: driver.name,
                phone: driver.phone,
                rating: driver.rating || 4.8,
                photo_url: driver.photo_url,
                vehicle_make: driver.vehicle?.split(' ')[0],
                vehicle_model: driver.vehicle?.split(' ').slice(1).join(' '),
                license_plate: driver.license_plate
              }
            } : null);
            setStep(3);
          }

          if (order.status === 'delivered') {
            setStep(4);
            setRatingModalVisible(true);
          }
        }
      } catch (error) {
        console.error('Error checking ride status:', error);
      }
    };

    // Poll every 5 seconds
    const intervalId = setInterval(checkStatus, 5000);

    // Clean up on unmount
    return () => clearInterval(intervalId);
  }, [API_URL]);

  // Handle location input with debouncing
  const handlePickupChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPickupInput(value);
    setPickup(null); // Clear until geocoded

    // Clear previous debounce
    if (pickupDebounceRef.current) {
      clearTimeout(pickupDebounceRef.current);
    }

    if (value.length > 3) {
      setGeocodingPickup(true);
      pickupDebounceRef.current = setTimeout(async () => {
        const loc = await geocodeAddress(value);
        if (loc) {
          setPickup(loc);
          message.success(`Pickup: ${loc.city || ''}, ${loc.state || ''} ${loc.zip || ''}`);
        }
        setGeocodingPickup(false);
      }, 800); // Wait 800ms after user stops typing
    }
  };

  const handleDropoffChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDropoffInput(value);
    setDropoff(null); // Clear until geocoded

    // Clear previous debounce
    if (dropoffDebounceRef.current) {
      clearTimeout(dropoffDebounceRef.current);
    }

    if (value.length > 3) {
      setGeocodingDropoff(true);
      dropoffDebounceRef.current = setTimeout(async () => {
        const loc = await geocodeAddress(value);
        if (loc) {
          setDropoff(loc);
          message.success(`Dropoff: ${loc.city || ''}, ${loc.state || ''} ${loc.zip || ''}`);
        }
        setGeocodingDropoff(false);
      }, 800); // Wait 800ms after user stops typing
    }
  };

  // Manual geocode button for when user wants to search explicitly
  const geocodePickupManual = async () => {
    if (pickupInput.length < 3) {
      message.warning('Please enter a pickup address');
      return;
    }
    setGeocodingPickup(true);
    const loc = await geocodeAddress(pickupInput);
    if (loc) {
      setPickup(loc);
      message.success(`Found: ${loc.city || ''}, ${loc.state || ''} ${loc.zip || ''}`);
    }
    setGeocodingPickup(false);
  };

  const geocodeDropoffManual = async () => {
    if (dropoffInput.length < 3) {
      message.warning('Please enter a destination address');
      return;
    }
    setGeocodingDropoff(true);
    const loc = await geocodeAddress(dropoffInput);
    if (loc) {
      setDropoff(loc);
      message.success(`Found: ${loc.city || ''}, ${loc.state || ''} ${loc.zip || ''}`);
    }
    setGeocodingDropoff(false);
  };

  // Submit rating
  const submitRating = async () => {
    if (!activeRide) return;

    try {
      await axios.post(`${API_URL}/api/erp/rides/${activeRide.ride_id}/rate`, {
        rating,
        feedback: ''
      }, {
        params: { rated_by: 'customer' }
      });

      message.success('Thank you for your rating!');
      setRatingModalVisible(false);

      // Reset for new ride
      setStep(0);
      setActiveRide(null);
      setFareEstimate(null);
      setPickup(null);
      setDropoff(null);
      setPickupInput('');
      setDropoffInput('');
    } catch (error) {
      console.error('Error submitting rating:', error);
      message.error('Failed to submit rating');
    }
  };

  return (
    <div className="ride-booking-page">
      {/* Header */}
      <div className="booking-header">
        <div className="header-content">
          <div className="logo">
            <DollarOutlined className="logo-icon" />
            <span>Dollor.ai</span>
          </div>
          <div className="user-info">
            <Avatar icon={<UserOutlined />} />
            <span>{customerName}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="booking-content">
        <div className="booking-container">
          {/* Progress Steps */}
          <Steps current={step} className="booking-steps">
            <Step title="Location" icon={<EnvironmentOutlined />} />
            <Step title="Confirm" icon={<DollarOutlined />} />
            <Step title="Matching" icon={<LoadingOutlined />} />
            <Step title="Ride" icon={<CarOutlined />} />
            <Step title="Done" icon={<CheckCircleOutlined />} />
          </Steps>

          {/* Step 0: Enter Locations */}
          {step === 0 && (
            <Card className="booking-card">
              <Title level={3}>Where are you going?</Title>

              <div className="location-inputs">
                <div className="location-input-group">
                  <div className="location-input">
                    <EnvironmentOutlined className="input-icon pickup" />
                    <Input
                      placeholder="Enter pickup address, city, or zip code"
                      value={pickupInput}
                      onChange={handlePickupChange}
                      size="large"
                      suffix={geocodingPickup ? <LoadingOutlined /> : null}
                    />
                    <Button
                      type="link"
                      icon={<AimOutlined />}
                      onClick={useCurrentLocationForPickup}
                      loading={gettingLocation}
                      className="current-location-btn"
                    >
                      Use Current
                    </Button>
                  </div>
                  {pickup && (
                    <div className="resolved-location pickup">
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                      <span>{pickup.city || pickup.address.split(',')[0]}, {pickup.state} {pickup.zip}</span>
                    </div>
                  )}
                  {!pickup && pickupInput.length > 3 && !geocodingPickup && (
                    <Button size="small" onClick={geocodePickupManual} style={{ marginLeft: 36 }}>
                      Search Location
                    </Button>
                  )}
                </div>

                <div className="location-connector" />

                <div className="location-input-group">
                  <div className="location-input">
                    <EnvironmentOutlined className="input-icon dropoff" />
                    <Input
                      placeholder="Enter destination (city, address, or zip)"
                      value={dropoffInput}
                      onChange={handleDropoffChange}
                      size="large"
                      suffix={geocodingDropoff ? <LoadingOutlined /> : null}
                    />
                    <Button
                      type="default"
                      size="small"
                      onClick={geocodeDropoffManual}
                      loading={geocodingDropoff}
                      disabled={dropoffInput.length < 3}
                      style={{ marginLeft: 8 }}
                    >
                      Search
                    </Button>
                  </div>
                  {dropoff && (
                    <div className="resolved-location dropoff">
                      <CheckCircleOutlined style={{ color: '#f5222d' }} />
                      <span>{dropoff.city || dropoff.address.split(',')[0]}, {dropoff.state} {dropoff.zip}</span>
                      <span className="coords">({dropoff.lat.toFixed(4)}, {dropoff.lng.toFixed(4)})</span>
                    </div>
                  )}
                  {!dropoff && dropoffInput.length > 3 && !geocodingDropoff && (
                    <Alert
                      message="Click 'Search' to find this location"
                      type="info"
                      showIcon
                      style={{ marginTop: 8, marginLeft: 36 }}
                    />
                  )}
                </div>
              </div>

              {/* Distance Preview */}
              {pickup && dropoff && (
                <div className="distance-preview">
                  <div className="preview-item">
                    <Text type="secondary">From:</Text>
                    <Text strong>{pickup.city || 'Current Location'}, {pickup.state}</Text>
                  </div>
                  <div className="preview-arrow">→</div>
                  <div className="preview-item">
                    <Text type="secondary">To:</Text>
                    <Text strong>{dropoff.city || dropoff.address.split(',')[0]}, {dropoff.state}</Text>
                  </div>
                </div>
              )}

              <div className="tip-section">
                <Text strong>Add a tip for your driver (optional)</Text>
                <div className="tip-options">
                  {[0, 2, 5, 10].map(amount => (
                    <Button
                      key={amount}
                      type={tip === amount ? 'primary' : 'default'}
                      onClick={() => setTip(amount)}
                    >
                      {amount === 0 ? 'No tip' : `$${amount}`}
                    </Button>
                  ))}
                </div>
              </div>

              <Button
                type="primary"
                size="large"
                block
                onClick={getFareEstimate}
                loading={loading}
                disabled={!pickup || !dropoff}
                className="main-button"
              >
                Get Price Estimate
              </Button>

              <div className="pricing-info">
                <DollarOutlined />
                <Text>{pricing.display.rideshare.summary}</Text>
              </div>
            </Card>
          )}

          {/* Step 1: Confirm Price */}
          {step === 1 && fareEstimate && (
            <Card className="booking-card">
              <Title level={3}>Confirm Your Ride</Title>

              <div className="route-summary">
                <div className="route-point">
                  <EnvironmentOutlined className="pickup" />
                  <Text>{pickup?.address}</Text>
                </div>
                <div className="route-line" />
                <div className="route-point">
                  <EnvironmentOutlined className="dropoff" />
                  <Text>{dropoff?.address}</Text>
                </div>
              </div>

              <Divider />

              <div className="fare-breakdown">
                <Title level={4}>Price Breakdown</Title>

                <div className="fare-line">
                  <Text>Base fare</Text>
                  <Text>${fareEstimate.base_fare.toFixed(2)}</Text>
                </div>
                <div className="fare-line">
                  <Text>Distance ({fareEstimate.distance_miles.toFixed(1)} mi)</Text>
                  <Text>${fareEstimate.distance_fee.toFixed(2)}</Text>
                </div>
                <div className="fare-line">
                  <Text>Time ({Math.round(fareEstimate.duration_minutes)} min)</Text>
                  <Text>${fareEstimate.time_fee.toFixed(2)}</Text>
                </div>
                <div className="fare-line highlight">
                  <Text><DollarOutlined /> Platform Fee ({fareEstimate.fee_tier || pricing.rideshare.getTierName(fareEstimate.total_fare)})</Text>
                  <Text strong>${fareEstimate.platform_fee.toFixed(2)}</Text>
                </div>
                <div className="fare-line">
                  <Text>Tax</Text>
                  <Text>${fareEstimate.tax_amount.toFixed(2)}</Text>
                </div>
                {tip > 0 && (
                  <div className="fare-line">
                    <Text>Tip (100% to driver)</Text>
                    <Text>${tip.toFixed(2)}</Text>
                  </div>
                )}

                <Divider />

                <div className="fare-line total">
                  <Text strong>You Pay</Text>
                  <Text strong className="total-amount">
                    ${(fareEstimate.total_fare + tip).toFixed(2)}
                  </Text>
                </div>

                <div className="driver-earnings">
                  <SafetyOutlined />
                  <Text type="secondary">
                    Driver earns ${(fareEstimate.driver_earnings + tip).toFixed(2)} (ride fare - ${fareEstimate.platform_fee.toFixed(0)} platform fee + 100% tip)
                  </Text>
                </div>
                <div className="platform-message" style={{ marginTop: 12, padding: '12px', background: '#f0f9ff', borderRadius: 8, textAlign: 'center' }}>
                  <Text strong style={{ color: '#10B981', fontSize: 15 }}>
                    96% goes to your driver
                  </Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Only ${fareEstimate.platform_fee.toFixed(0)} platform fee per person
                  </Text>
                </div>
              </div>

              <div className="action-buttons">
                <Button size="large" onClick={() => setStep(0)}>
                  Back
                </Button>
                <Button
                  type="primary"
                  size="large"
                  onClick={requestRide}
                  loading={loading}
                  className="confirm-button"
                >
                  Confirm & Request Ride
                </Button>
              </div>
            </Card>
          )}

          {/* Step 2: Finding Driver */}
          {step === 2 && (
            <Card className="booking-card matching-card">
              <div className="matching-animation">
                <Spin size="large" />
                <Title level={3}>Finding your driver...</Title>
                <Paragraph>
                  We're matching you with the best driver nearby.
                  This usually takes less than 2 minutes.
                </Paragraph>
              </div>

              <div className="ride-info">
                <Tag color="green">{activeRide?.ride_number}</Tag>
                <Text type="secondary">
                  <ClockCircleOutlined /> Requested at {new Date(activeRide?.created_at || '').toLocaleTimeString()}
                </Text>
              </div>
            </Card>
          )}

          {/* Step 3: Driver Assigned / En Route */}
          {step === 3 && activeRide?.driver && (
            <Card className="booking-card driver-card">
              <Title level={3}>
                {activeRide.status === 'out_for_delivery' ? 'Your ride is on the way!' : 'Driver assigned!'}
              </Title>

              <div className="driver-info">
                <Avatar size={80} icon={<UserOutlined />} src={activeRide.driver.photo_url} />
                <div className="driver-details">
                  <Title level={4}>{activeRide.driver.name}</Title>
                  <div className="driver-rating">
                    <StarOutlined style={{ color: '#fadb14' }} />
                    <Text>{activeRide.driver.rating.toFixed(1)}</Text>
                  </div>
                  {activeRide.driver.vehicle_make && (
                    <Text type="secondary">
                      {activeRide.driver.vehicle_color} {activeRide.driver.vehicle_make} {activeRide.driver.vehicle_model}
                    </Text>
                  )}
                  {activeRide.driver.license_plate && (
                    <Tag>{activeRide.driver.license_plate}</Tag>
                  )}
                </div>
              </div>

              <Divider />

              <div className="contact-driver">
                <Button
                  type="primary"
                  icon={<PhoneOutlined />}
                  size="large"
                  href={`tel:${activeRide.driver.phone}`}
                >
                  Call Driver
                </Button>
              </div>

              <div className="route-summary compact">
                <div className="route-point">
                  <EnvironmentOutlined className="pickup" />
                  <Text ellipsis>{activeRide.pickup.address}</Text>
                </div>
                <div className="route-point">
                  <EnvironmentOutlined className="dropoff" />
                  <Text ellipsis>{activeRide.dropoff.address}</Text>
                </div>
              </div>

              <div className="fare-summary">
                <Text>Total fare</Text>
                <Text strong className="total-amount">
                  ${(activeRide.fare.total_fare + tip).toFixed(2)}
                </Text>
              </div>
            </Card>
          )}

          {/* Step 4: Completed */}
          {step === 4 && (
            <Card className="booking-card completed-card">
              <CheckCircleOutlined className="completed-icon" />
              <Title level={3}>Ride Completed!</Title>
              <Paragraph>Thank you for riding with Dollor.ai</Paragraph>

              <Button
                type="primary"
                size="large"
                block
                onClick={() => {
                  setStep(0);
                  setActiveRide(null);
                  setFareEstimate(null);
                }}
              >
                Book Another Ride
              </Button>
            </Card>
          )}
        </div>
      </div>

      {/* Rating Modal */}
      <Modal
        title="Rate your ride"
        open={ratingModalVisible}
        onOk={submitRating}
        onCancel={() => setRatingModalVisible(false)}
        okText="Submit Rating"
      >
        <div className="rating-modal-content">
          <Avatar size={64} icon={<UserOutlined />} />
          <Title level={4}>{activeRide?.driver?.name}</Title>
          <Rate value={rating} onChange={setRating} style={{ fontSize: 36 }} />
          <Paragraph type="secondary">
            Your feedback helps maintain quality service
          </Paragraph>
        </div>
      </Modal>

      <style>{`
        .ride-booking-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        }

        .booking-header {
          background: #1a1a2e;
          padding: 16px 24px;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .header-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 8px;
          color: white;
          font-size: 24px;
          font-weight: 700;
        }

        .logo-icon {
          color: #52c41a;
          font-size: 28px;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 12px;
          color: white;
        }

        .booking-content {
          padding: 40px 24px;
          max-width: 600px;
          margin: 0 auto;
        }

        .booking-steps {
          margin-bottom: 32px;
        }

        .booking-card {
          border-radius: 16px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.1);
        }

        .location-inputs {
          margin: 24px 0;
        }

        .location-input-group {
          margin-bottom: 8px;
        }

        .location-input {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .location-input .ant-input-affix-wrapper {
          flex: 1;
          min-width: 200px;
        }

        .current-location-btn {
          padding: 0;
          height: auto;
          font-size: 13px;
          color: #1890ff;
        }

        .current-location-btn:hover {
          color: #40a9ff;
        }

        .resolved-location {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-left: 36px;
          margin-top: 4px;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 13px;
        }

        .resolved-location.pickup {
          background: #f6ffed;
          border: 1px solid #b7eb8f;
        }

        .resolved-location.dropoff {
          background: #fff2f0;
          border: 1px solid #ffccc7;
        }

        .resolved-location .coords {
          font-size: 11px;
          color: #999;
          margin-left: 8px;
        }

        .distance-preview {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 16px;
          background: linear-gradient(135deg, #e6f7ff 0%, #f0f5ff 100%);
          border-radius: 12px;
          margin: 16px 0;
        }

        .preview-item {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .preview-arrow {
          font-size: 24px;
          color: #1890ff;
        }

        .input-icon {
          font-size: 24px;
        }

        .input-icon.pickup {
          color: #52c41a;
        }

        .input-icon.dropoff {
          color: #f5222d;
        }

        .location-connector {
          width: 2px;
          height: 24px;
          background: #d9d9d9;
          margin-left: 11px;
          margin-bottom: 12px;
        }

        .tip-section {
          margin: 24px 0;
        }

        .tip-options {
          display: flex;
          gap: 12px;
          margin-top: 12px;
        }

        .main-button {
          height: 56px;
          font-size: 18px;
          font-weight: 600;
          background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%);
          border: none;
          margin-top: 24px;
        }

        .main-button:hover {
          background: linear-gradient(135deg, #73d13d 0%, #52c41a 100%);
        }

        .pricing-info {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 16px;
          color: #52c41a;
        }

        .route-summary {
          padding: 16px;
          background: #fafafa;
          border-radius: 8px;
        }

        .route-point {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 0;
        }

        .route-line {
          width: 2px;
          height: 24px;
          background: #d9d9d9;
          margin-left: 11px;
        }

        .fare-breakdown {
          margin: 16px 0;
        }

        .fare-line {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
        }

        .fare-line.highlight {
          background: #f6ffed;
          padding: 12px;
          border-radius: 8px;
          margin: 8px 0;
        }

        .fare-line.total {
          font-size: 18px;
        }

        .total-amount {
          color: #52c41a;
          font-size: 24px;
        }

        .driver-earnings {
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: center;
          margin-top: 16px;
          padding: 12px;
          background: #e6f7ff;
          border-radius: 8px;
        }

        .action-buttons {
          display: flex;
          gap: 16px;
          margin-top: 24px;
        }

        .confirm-button {
          flex: 1;
          height: 48px;
          background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%);
          border: none;
        }

        .matching-card {
          text-align: center;
          padding: 48px 24px;
        }

        .matching-animation {
          margin-bottom: 24px;
        }

        .matching-animation h3 {
          margin-top: 24px;
        }

        .ride-info {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
        }

        .driver-card .driver-info {
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .driver-details {
          flex: 1;
        }

        .driver-details h4 {
          margin: 0 0 8px 0;
        }

        .driver-rating {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-bottom: 8px;
        }

        .contact-driver {
          text-align: center;
        }

        .route-summary.compact .route-point {
          padding: 4px 0;
        }

        .fare-summary {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 16px;
          padding: 16px;
          background: #fafafa;
          border-radius: 8px;
        }

        .completed-card {
          text-align: center;
          padding: 48px;
        }

        .completed-icon {
          font-size: 64px;
          color: #52c41a;
          margin-bottom: 24px;
        }

        .rating-modal-content {
          text-align: center;
          padding: 24px 0;
        }

        .rating-modal-content h4 {
          margin: 16px 0 24px 0;
        }

        @media (max-width: 768px) {
          .booking-content {
            padding: 24px 16px;
          }

          .tip-options {
            flex-wrap: wrap;
          }

          .tip-options button {
            flex: 1;
            min-width: 70px;
          }

          .driver-card .driver-info {
            flex-direction: column;
            text-align: center;
          }

          .action-buttons {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default RideBooking;
