import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Input, Tag, Typography, Spin, Button, Badge, Select } from 'antd';
import {
  SearchOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  StarOutlined,
  StarFilled,
  BellOutlined,
  UserOutlined,
  CarOutlined,
  ShoppingOutlined,
  RightOutlined,
  GiftOutlined,
  FireOutlined,
  ThunderboltOutlined,
  DownOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl } from '../../api/api';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

// Interfaces matching iOS models
interface Restaurant {
  id: number;
  name: string;
  cuisine_type: string;
  rating: number;
  delivery_time: string;
  delivery_fee: number;
  image_url?: string;
  is_open: boolean;
}

interface FeaturedDeal {
  id: number;
  headline: string;
  vendor_name: string;
  description?: string;
  promotion_code: string;
  type: string;
  min_order_amount?: number;
}

interface Category {
  id: string;
  name: string;
  emoji: string;
}

// Categories matching iOS
const categories: Category[] = [
  { id: 'all', name: 'All', emoji: '🍽️' },
  { id: 'american', name: 'American', emoji: '🍔' },
  { id: 'italian', name: 'Italian', emoji: '🍕' },
  { id: 'chinese', name: 'Chinese', emoji: '🥡' },
  { id: 'mexican', name: 'Mexican', emoji: '🌮' },
  { id: 'japanese', name: 'Japanese', emoji: '🍣' },
  { id: 'indian', name: 'Indian', emoji: '🍛' },
  { id: 'thai', name: 'Thai', emoji: '🍜' },
];

// Sort options matching iOS
type SortOption = 'recommended' | 'topRated' | 'fastest' | 'nearest';

const CustomerHome: React.FC = () => {
  const navigate = useNavigate();
  const API_URL = getApiUrl();

  // State
  const [loading, setLoading] = useState(true);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [featuredRestaurants, setFeaturedRestaurants] = useState<Restaurant[]>([]);
  const [featuredDeals, setFeaturedDeals] = useState<FeaturedDeal[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>('recommended');
  const [customerName, setCustomerName] = useState('');
  const [address, setAddress] = useState('Select Address');

  useEffect(() => {
    fetchData();
    loadUserData();
  }, []);

  const loadUserData = () => {
    const name = localStorage.getItem('customer_name') || 'there';
    setCustomerName(name);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch restaurants
      const restaurantsRes = await axios.get(`${API_URL}/api/erp/restaurants`);
      const restaurantData = restaurantsRes.data.restaurants || getMockRestaurants();
      setRestaurants(restaurantData);
      setFeaturedRestaurants(restaurantData.filter((r: Restaurant) => r.rating >= 4.5).slice(0, 5));

      // Fetch featured deals - matches iOS/Android endpoint
      try {
        const dealsRes = await axios.get(`${API_URL}/api/promotions/featured`);
        // Backend returns { deals: [...] } - map to our FeaturedDeal format
        const deals = dealsRes.data.deals || [];
        const mappedDeals: FeaturedDeal[] = deals.map((d: any) => ({
          id: d.id,
          headline: d.discount_text || d.title,
          vendor_name: d.restaurant_name || 'All Restaurants',
          description: d.description,
          promotion_code: d.discount_text?.replace(/\s+/g, '') || 'SAVE',
          type: d.discount_text?.includes('%') ? 'percentage' :
                d.discount_text?.includes('FREE') ? 'free_delivery' :
                d.discount_text?.includes('BOGO') ? 'bogo' : 'flat_amount',
          min_order_amount: d.min_order_amount
        }));
        setFeaturedDeals(mappedDeals.length > 0 ? mappedDeals : getMockDeals());
      } catch {
        setFeaturedDeals(getMockDeals());
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setRestaurants(getMockRestaurants());
      setFeaturedRestaurants(getMockRestaurants().slice(0, 3));
      setFeaturedDeals(getMockDeals());
    } finally {
      setLoading(false);
    }
  };

  const getMockRestaurants = (): Restaurant[] => [
    { id: 1, name: 'Burger Palace', cuisine_type: 'american', rating: 4.5, delivery_time: '20-35 min', delivery_fee: 1, is_open: true },
    { id: 2, name: 'Pizza Italia', cuisine_type: 'italian', rating: 4.7, delivery_time: '25-40 min', delivery_fee: 1, is_open: true },
    { id: 3, name: 'Dragon Wok', cuisine_type: 'chinese', rating: 4.3, delivery_time: '15-30 min', delivery_fee: 1, is_open: true },
    { id: 4, name: 'Taco Fiesta', cuisine_type: 'mexican', rating: 4.6, delivery_time: '20-35 min', delivery_fee: 1, is_open: true },
    { id: 5, name: 'Sushi Master', cuisine_type: 'japanese', rating: 4.8, delivery_time: '30-45 min', delivery_fee: 1, is_open: true },
    { id: 6, name: 'Curry House', cuisine_type: 'indian', rating: 4.4, delivery_time: '25-40 min', delivery_fee: 1, is_open: true },
  ];

  const getMockDeals = (): FeaturedDeal[] => [
    { id: 1, headline: '20% OFF', vendor_name: 'Burger Palace', description: 'First order discount', promotion_code: 'FIRST20', type: 'percentage', min_order_amount: 15 },
    { id: 2, headline: 'FREE DELIVERY', vendor_name: 'Pizza Italia', description: 'On orders $25+', promotion_code: 'FREEDELIVERY', type: 'free_delivery', min_order_amount: 25 },
    { id: 3, headline: 'BUY 1 GET 1', vendor_name: 'Sushi Master', description: 'On select rolls', promotion_code: 'BOGO', type: 'bogo' },
  ];

  const filteredRestaurants = restaurants.filter(r => {
    if (!selectedCategory || selectedCategory === 'all') return true;
    return r.cuisine_type.toLowerCase() === selectedCategory.toLowerCase();
  }).sort((a, b) => {
    switch (sortOption) {
      case 'topRated': return b.rating - a.rating;
      case 'fastest': return parseInt(a.delivery_time) - parseInt(b.delivery_time);
      default: return b.rating - a.rating;
    }
  });

  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" />
        <Text type="secondary">Loading restaurants...</Text>
      </div>
    );
  }

  return (
    <div className="customer-home">
      {/* Header Section - matches iOS */}
      <div className="header-section">
        <div className="header-top">
          <div className="address-picker" onClick={() => navigate('/customer/address')}>
            <Text type="secondary" className="deliver-to">Deliver to</Text>
            <div className="address-row">
              <Text strong>{address}</Text>
              <DownOutlined style={{ fontSize: 12 }} />
            </div>
          </div>
          <div className="header-actions">
            <Badge dot>
              <Button type="text" icon={<BellOutlined />} className="icon-btn" />
            </Badge>
            <Button
              type="text"
              icon={<UserOutlined />}
              className="profile-btn"
              onClick={() => navigate('/customer/profile')}
            />
          </div>
        </div>

        {/* Search Bar - matches iOS */}
        <div className="search-bar" onClick={() => navigate('/customer/search')}>
          <SearchOutlined className="search-icon" />
          <Text type="secondary">Search restaurants or dishes...</Text>
        </div>
      </div>

      {/* Service Selection - matches iOS */}
      <div className="service-selection">
        <div className="service-card food-card" onClick={() => {}}>
          <div className="service-icon food-icon">
            <ShoppingOutlined />
          </div>
          <div className="service-text">
            <Text strong>Food</Text>
            <Text type="secondary" className="service-subtitle">Order delivery</Text>
          </div>
        </div>
        <div className="service-card ride-card" onClick={() => navigate('/customer/ride')}>
          <div className="service-icon ride-icon">
            <CarOutlined />
          </div>
          <div className="service-text">
            <Text strong>Ride</Text>
            <Text type="secondary" className="service-subtitle">Get picked up</Text>
          </div>
        </div>
      </div>

      {/* Categories - matches iOS */}
      <div className="categories-section">
        <Title level={5}>Categories</Title>
        <div className="categories-scroll">
          {categories.map(cat => (
            <div
              key={cat.id}
              className={`category-item ${selectedCategory === cat.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
            >
              <div className="category-emoji">{cat.emoji}</div>
              <Text className="category-name">{cat.name}</Text>
            </div>
          ))}
        </div>
      </div>

      {/* AI Recommendation Banner - matches iOS */}
      <div className="ai-banner" onClick={() => navigate('/customer/search')}>
        <div className="ai-icon">
          <ThunderboltOutlined />
        </div>
        <div className="ai-text">
          <Text strong>AI Food Assistant</Text>
          <Text type="secondary">Tell me what you're craving!</Text>
        </div>
        <Button type="text" className="try-now-btn">Try Now</Button>
      </div>

      {/* Featured Deals - matches iOS */}
      {featuredDeals.length > 0 && (
        <div className="deals-section">
          <div className="section-header">
            <FireOutlined style={{ color: '#f97316' }} />
            <Title level={5} style={{ margin: 0 }}>Hot Deals</Title>
          </div>
          <div className="deals-scroll">
            {featuredDeals.map(deal => (
              <div key={deal.id} className={`deal-card ${deal.type}`}>
                <Text strong className="deal-headline">{deal.headline}</Text>
                <Text className="deal-vendor">{deal.vendor_name}</Text>
                {deal.description && (
                  <Text className="deal-desc">{deal.description}</Text>
                )}
                <div className="deal-footer">
                  <Tag className="promo-tag">{deal.promotion_code}</Tag>
                  {deal.min_order_amount && (
                    <Text className="min-order">Min ${deal.min_order_amount}</Text>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Multi-Restaurant Promo - matches iOS */}
      <div className="multi-restaurant-promo">
        <div className="promo-content">
          <div className="promo-header">
            <StarFilled style={{ color: '#fbbf24' }} />
            <Text strong className="promo-title">NEW: Multi-Restaurant Orders</Text>
          </div>
          <Text className="promo-desc">
            Order from up to 3 restaurants in one delivery! Just $1.00 per restaurant.
          </Text>
          <Text className="learn-more">Learn More →</Text>
        </div>
      </div>

      {/* Featured Restaurants - matches iOS */}
      <div className="featured-section">
        <div className="section-header">
          <Title level={5} style={{ margin: 0 }}>Featured Near You</Title>
          <Button type="link" onClick={() => navigate('/customer/restaurants')}>
            See All
          </Button>
        </div>
        <div className="featured-scroll">
          {featuredRestaurants.map(restaurant => (
            <div
              key={restaurant.id}
              className="featured-card"
              onClick={() => navigate(`/customer/restaurant/${restaurant.id}`)}
            >
              <div className="featured-image">
                <div className="image-placeholder">
                  {categories.find(c => c.id === restaurant.cuisine_type)?.emoji || '🍽️'}
                </div>
                {restaurant.rating >= 4.5 && (
                  <Tag color="orange" className="top-pick-tag">TOP PICK</Tag>
                )}
              </div>
              <div className="featured-info">
                <Text strong className="restaurant-name">{restaurant.name}</Text>
                <div className="restaurant-meta">
                  <StarOutlined style={{ color: '#f97316', fontSize: 12 }} />
                  <Text type="secondary">{restaurant.rating}</Text>
                  <Text type="secondary">•</Text>
                  <Text type="secondary">{restaurant.delivery_time}</Text>
                </div>
                <Text className="delivery-fee">$1 delivery</Text>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* All Restaurants - matches iOS */}
      <div className="all-restaurants-section">
        <div className="section-header">
          <Title level={5} style={{ margin: 0 }}>All Restaurants</Title>
          <Select
            value={sortOption}
            onChange={(val) => setSortOption(val as SortOption)}
            bordered={false}
            className="sort-select"
          >
            <Option value="recommended">Recommended</Option>
            <Option value="topRated">Top Rated</Option>
            <Option value="fastest">Fastest Delivery</Option>
            <Option value="nearest">Nearest</Option>
          </Select>
        </div>

        <div className="restaurants-list">
          {filteredRestaurants.map(restaurant => (
            <div
              key={restaurant.id}
              className="restaurant-card"
              onClick={() => navigate(`/customer/restaurant/${restaurant.id}`)}
            >
              <div className="restaurant-image">
                <div className="image-placeholder">
                  {categories.find(c => c.id === restaurant.cuisine_type)?.emoji || '🍽️'}
                </div>
              </div>
              <div className="restaurant-info">
                <Text strong>{restaurant.name}</Text>
                <Text type="secondary" className="cuisine">{restaurant.cuisine_type}</Text>
                <div className="restaurant-stats">
                  <span className="stat">
                    <StarOutlined style={{ color: '#f97316' }} />
                    {restaurant.rating}
                  </span>
                  <span className="stat">
                    <ClockCircleOutlined />
                    {restaurant.delivery_time}
                  </span>
                  <span className="fee">$1 fee</span>
                </div>
              </div>
              <RightOutlined className="chevron" />
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .customer-home {
          max-width: 800px;
          margin: 0 auto;
          padding-bottom: 100px;
          background: #f7f7f8;
          min-height: 100vh;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          gap: 16px;
        }

        /* Header */
        .header-section {
          background: white;
          padding: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .address-picker {
          cursor: pointer;
        }

        .deliver-to {
          font-size: 12px;
          display: block;
        }

        .address-row {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .header-actions {
          display: flex;
          gap: 8px;
        }

        .icon-btn, .profile-btn {
          font-size: 20px;
        }

        .profile-btn {
          background: #10B981;
          color: white;
          border-radius: 50%;
          width: 36px;
          height: 36px;
        }

        .search-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: #f5f5f5;
          border-radius: 12px;
          cursor: pointer;
        }

        .search-icon {
          color: #8e8ea0;
        }

        /* Service Selection - matches iOS */
        .service-selection {
          display: flex;
          gap: 12px;
          padding: 16px;
        }

        .service-card {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 16px;
          background: white;
          border-radius: 16px;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          transition: transform 0.2s;
        }

        .service-card:hover {
          transform: translateY(-2px);
        }

        .service-icon {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          margin-bottom: 8px;
        }

        .food-icon {
          background: rgba(16, 185, 129, 0.15);
          color: #10B981;
        }

        .ride-icon {
          background: rgba(59, 130, 246, 0.15);
          color: #3b82f6;
        }

        .service-text {
          text-align: center;
        }

        .service-subtitle {
          font-size: 12px;
          display: block;
        }

        /* Categories - matches iOS */
        .categories-section {
          padding: 0 16px 16px;
        }

        .categories-scroll {
          display: flex;
          gap: 16px;
          overflow-x: auto;
          padding: 8px 0;
          -webkit-overflow-scrolling: touch;
        }

        .category-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          min-width: 70px;
        }

        .category-emoji {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: #f5f5f5;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          transition: all 0.2s;
        }

        .category-item.active .category-emoji {
          background: #10B981;
        }

        .category-item.active .category-name {
          color: #10B981;
          font-weight: 600;
        }

        .category-name {
          font-size: 12px;
        }

        /* AI Banner - matches iOS */
        .ai-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 0 16px 16px;
          padding: 16px;
          background: white;
          border-radius: 16px;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        .ai-icon {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: linear-gradient(135deg, #a855f7, #ec4899);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 24px;
        }

        .ai-text {
          flex: 1;
        }

        .ai-text span {
          display: block;
        }

        .try-now-btn {
          color: #a855f7;
          font-weight: 600;
          background: rgba(168, 85, 247, 0.1);
          border-radius: 8px;
        }

        /* Deals Section - matches iOS */
        .deals-section {
          padding: 0 16px 16px;
        }

        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 12px;
        }

        .deals-scroll {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .deal-card {
          min-width: 200px;
          padding: 16px;
          border-radius: 16px;
          color: white;
        }

        .deal-card.percentage {
          background: linear-gradient(135deg, #f97316, #ef4444);
        }

        .deal-card.free_delivery {
          background: linear-gradient(135deg, #22c55e, #14b8a6);
        }

        .deal-card.bogo {
          background: linear-gradient(135deg, #3b82f6, #a855f7);
        }

        .deal-headline {
          font-size: 20px;
          display: block;
          color: white;
        }

        .deal-vendor {
          display: block;
          opacity: 0.9;
          color: white;
        }

        .deal-desc {
          display: block;
          font-size: 12px;
          opacity: 0.8;
          margin-top: 4px;
          color: white;
        }

        .deal-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 12px;
        }

        .promo-tag {
          background: rgba(255,255,255,0.3);
          border: none;
          color: white;
          font-weight: 600;
        }

        .min-order {
          font-size: 11px;
          opacity: 0.8;
          color: white;
        }

        /* Multi-Restaurant Promo - matches iOS */
        .multi-restaurant-promo {
          margin: 0 16px 16px;
          padding: 16px;
          background: linear-gradient(135deg, #f97316, #ef4444);
          border-radius: 16px;
          cursor: pointer;
        }

        .promo-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .promo-title {
          color: white;
        }

        .promo-desc {
          display: block;
          color: rgba(255,255,255,0.9);
          font-size: 13px;
          margin-bottom: 8px;
        }

        .learn-more {
          display: block;
          color: white;
          font-weight: 600;
          font-size: 13px;
          text-align: right;
        }

        /* Featured Section - matches iOS */
        .featured-section {
          padding: 0 16px 16px;
        }

        .featured-scroll {
          display: flex;
          gap: 16px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .featured-card {
          min-width: 180px;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        .featured-image {
          height: 110px;
          background: #f5f5f5;
          position: relative;
        }

        .image-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          font-size: 48px;
        }

        .top-pick-tag {
          position: absolute;
          top: 8px;
          right: 8px;
          font-size: 9px;
          font-weight: bold;
        }

        .featured-info {
          padding: 10px;
        }

        .restaurant-name {
          display: block;
          font-size: 14px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .restaurant-meta {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          margin: 4px 0;
        }

        .delivery-fee {
          color: #10B981;
          font-size: 11px;
          font-weight: 500;
        }

        /* All Restaurants - matches iOS */
        .all-restaurants-section {
          padding: 0 16px;
        }

        .sort-select {
          color: #10B981;
        }

        .restaurants-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .restaurant-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px;
          background: white;
          border-radius: 14px;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.06);
        }

        .restaurant-card .restaurant-image {
          width: 90px;
          height: 90px;
          border-radius: 12px;
          overflow: hidden;
          background: #f5f5f5;
          flex-shrink: 0;
        }

        .restaurant-card .image-placeholder {
          font-size: 36px;
        }

        .restaurant-card .restaurant-info {
          flex: 1;
        }

        .restaurant-card .cuisine {
          font-size: 14px;
          display: block;
        }

        .restaurant-stats {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 8px;
          font-size: 12px;
          color: #6b7280;
        }

        .stat {
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .fee {
          color: #10B981;
          font-weight: 500;
        }

        .chevron {
          color: #d1d5db;
          font-size: 14px;
        }

        /* Responsive */
        @media (max-width: 480px) {
          .service-card {
            padding: 12px;
          }

          .service-icon {
            width: 48px;
            height: 48px;
            font-size: 20px;
          }

          .category-emoji {
            width: 50px;
            height: 50px;
            font-size: 24px;
          }

          .featured-card {
            min-width: 160px;
          }

          .deal-card {
            min-width: 180px;
          }
        }
      `}</style>
    </div>
  );
};

export default CustomerHome;
