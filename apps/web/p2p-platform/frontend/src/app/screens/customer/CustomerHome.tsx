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
import { pricing } from '../../config/brand';

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
      // Fetch published restaurants from database (same endpoint as Restaurants.tsx)
      const restaurantsRes = await axios.get(`${API_URL}/api/vendors/published?platform=web`);
      const data = restaurantsRes.data;

      // Map published vendors to restaurant format
      const restaurantData: Restaurant[] = (data.restaurants || []).map((r: any) => ({
        id: r.id,
        name: r.name || r.restaurant_name,
        cuisine_type: r.cuisine_type || 'Various',
        rating: r.rating || r.performance_score || 4.5,
        delivery_time: r.delivery_time || `${r.average_prep_time || 25}-${(r.average_prep_time || 25) + 15} min`,
        delivery_fee: r.delivery_fee || 2.99,
        image_url: r.image_url,
        is_open: r.is_open !== false
      }));

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
        setFeaturedDeals(mappedDeals);
      } catch {
        setFeaturedDeals([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setRestaurants([]);
      setFeaturedRestaurants([]);
      setFeaturedDeals([]);
    } finally {
      setLoading(false);
    }
  };

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
        <div className="service-card food-card" onClick={() => navigate('/customer/restaurants')}>
          <div className="service-icon food-icon">
            <ShoppingOutlined />
          </div>
          <div className="service-text">
            <Text strong>Food</Text>
            <Text type="secondary" className="service-subtitle">Order delivery</Text>
          </div>
        </div>
        <div className="service-card ride-card" onClick={() => navigate('/customer/rides')}>
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
      <div className="multi-restaurant-promo" onClick={() => navigate('/customer/restaurants')}>
        <div className="promo-content">
          <div className="promo-header">
            <StarFilled style={{ color: '#fbbf24' }} />
            <Text strong className="promo-title">NEW: Multi-Restaurant Orders</Text>
          </div>
          <Text className="promo-desc">
            Order from up to 3 restaurants in one delivery! Just {pricing.display.foodDelivery.customerFee}.
          </Text>
          <Text className="learn-more">Start Ordering →</Text>
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
                {restaurant.image_url ? (
                  <img
                    src={restaurant.image_url}
                    alt={restaurant.name}
                    className="restaurant-img"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`image-placeholder ${restaurant.image_url ? 'hidden' : ''}`}>
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
                <Text className="delivery-fee">${pricing.foodDelivery.customerFee} platform fee</Text>
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
                {restaurant.image_url ? (
                  <img
                    src={restaurant.image_url}
                    alt={restaurant.name}
                    className="restaurant-img"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`image-placeholder ${restaurant.image_url ? 'hidden' : ''}`}>
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
                  <span className="fee">${pricing.foodDelivery.customerFee} fee</span>
                </div>
              </div>
              <RightOutlined className="chevron" />
            </div>
          ))}
        </div>
      </div>

      <style>{`
        /* ============================================
           CUSTOMER HOME - International-Level Design
           Responsive breakpoints: 480, 640, 768, 1024, 1280px
           ============================================ */

        .customer-home {
          max-width: 1200px;
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
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .address-picker {
          cursor: pointer;
          transition: opacity 0.2s;
        }

        .address-picker:hover {
          opacity: 0.8;
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
          width: 40px;
          height: 40px;
        }

        .search-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 18px;
          background: #f5f5f5;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .search-bar:hover {
          background: #eeeeee;
        }

        .search-icon {
          color: #8e8ea0;
        }

        /* Service Selection - matches iOS */
        .service-selection {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          padding: 20px 16px;
        }

        .service-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px 16px;
          background: white;
          border-radius: 16px;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          transition: all 0.2s ease;
        }

        .service-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.1);
        }

        .service-icon {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          margin-bottom: 12px;
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
          margin-top: 2px;
        }

        /* Categories - matches iOS */
        .categories-section {
          padding: 0 16px 20px;
        }

        .categories-scroll {
          display: flex;
          gap: 16px;
          overflow-x: auto;
          padding: 8px 4px;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .categories-scroll::-webkit-scrollbar {
          display: none;
        }

        .category-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          min-width: 70px;
          flex-shrink: 0;
        }

        .category-emoji {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: white;
          border: 2px solid #f0f0f0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          transition: all 0.2s ease;
        }

        .category-item:hover .category-emoji {
          border-color: #10B981;
          transform: scale(1.05);
        }

        .category-item.active .category-emoji {
          background: #10B981;
          border-color: #10B981;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .category-item.active .category-name {
          color: #10B981;
          font-weight: 600;
        }

        .category-name {
          font-size: 12px;
          text-align: center;
        }

        /* AI Banner - matches iOS */
        .ai-banner {
          display: flex;
          align-items: center;
          gap: 14px;
          margin: 0 16px 20px;
          padding: 18px;
          background: white;
          border-radius: 16px;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          transition: all 0.2s ease;
        }

        .ai-banner:hover {
          box-shadow: 0 4px 16px rgba(0,0,0,0.1);
          transform: translateY(-2px);
        }

        .ai-icon {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: linear-gradient(135deg, #a855f7, #ec4899);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 24px;
          flex-shrink: 0;
        }

        .ai-text {
          flex: 1;
          min-width: 0;
        }

        .ai-text span {
          display: block;
        }

        .try-now-btn {
          color: #a855f7;
          font-weight: 600;
          background: rgba(168, 85, 247, 0.1);
          border-radius: 8px;
          flex-shrink: 0;
        }

        /* Deals Section - matches iOS */
        .deals-section {
          padding: 0 16px 20px;
        }

        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 14px;
        }

        .deals-scroll {
          display: flex;
          gap: 14px;
          overflow-x: auto;
          padding-bottom: 4px;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .deals-scroll::-webkit-scrollbar {
          display: none;
        }

        .deal-card {
          min-width: 220px;
          max-width: 280px;
          padding: 18px;
          border-radius: 16px;
          color: white;
          flex-shrink: 0;
          transition: transform 0.2s ease;
        }

        .deal-card:hover {
          transform: scale(1.02);
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

        .deal-card.flat_amount {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
        }

        .deal-headline {
          font-size: 22px;
          font-weight: 700;
          display: block;
          color: white;
        }

        .deal-vendor {
          display: block;
          opacity: 0.9;
          color: white;
          margin-top: 4px;
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
          margin-top: 14px;
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
          margin: 0 16px 20px;
          padding: 18px;
          background: linear-gradient(135deg, #f97316, #ef4444);
          border-radius: 16px;
          cursor: pointer;
          transition: transform 0.2s ease;
        }

        .multi-restaurant-promo:hover {
          transform: scale(1.01);
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
          font-size: 14px;
          margin-bottom: 10px;
          line-height: 1.4;
        }

        .learn-more {
          display: block;
          color: white;
          font-weight: 600;
          font-size: 14px;
          text-align: right;
        }

        /* Featured Section - matches iOS */
        .featured-section {
          padding: 0 16px 20px;
        }

        .featured-scroll {
          display: flex;
          gap: 16px;
          overflow-x: auto;
          padding-bottom: 4px;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .featured-scroll::-webkit-scrollbar {
          display: none;
        }

        .featured-card {
          min-width: 200px;
          max-width: 240px;
          background: white;
          border-radius: 14px;
          overflow: hidden;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          flex-shrink: 0;
          transition: all 0.2s ease;
        }

        .featured-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        }

        .featured-image {
          height: 120px;
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

        .image-placeholder.hidden {
          display: none;
        }

        .featured-image img.restaurant-img,
        .restaurant-image img.restaurant-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .top-pick-tag {
          position: absolute;
          top: 10px;
          right: 10px;
          font-size: 10px;
          font-weight: bold;
        }

        .featured-info {
          padding: 12px;
        }

        .restaurant-name {
          display: block;
          font-size: 15px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .restaurant-meta {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          margin: 6px 0;
        }

        .delivery-fee {
          color: #10B981;
          font-size: 12px;
          font-weight: 600;
        }

        /* All Restaurants - matches iOS */
        .all-restaurants-section {
          padding: 0 16px 24px;
        }

        .sort-select {
          color: #10B981;
        }

        .restaurants-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .restaurant-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 14px;
          background: white;
          border-radius: 16px;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.06);
          transition: all 0.2s ease;
        }

        .restaurant-card:hover {
          box-shadow: 0 4px 16px rgba(0,0,0,0.1);
          transform: translateX(4px);
        }

        .restaurant-card .restaurant-image {
          width: 100px;
          height: 100px;
          border-radius: 14px;
          overflow: hidden;
          background: #f5f5f5;
          flex-shrink: 0;
        }

        .restaurant-card .image-placeholder {
          font-size: 40px;
        }

        .restaurant-card .restaurant-info {
          flex: 1;
          min-width: 0;
        }

        .restaurant-card .cuisine {
          font-size: 14px;
          display: block;
          color: #6b7280;
        }

        .restaurant-stats {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 10px;
          font-size: 13px;
          color: #6b7280;
        }

        .stat {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .fee {
          color: #10B981;
          font-weight: 600;
        }

        .chevron {
          color: #d1d5db;
          font-size: 16px;
        }

        /* ============================================
           RESPONSIVE BREAKPOINTS
           ============================================ */

        /* Extra small devices (phones, 480px and down) */
        @media (max-width: 480px) {
          .header-section {
            padding: 12px;
          }

          .service-selection {
            padding: 16px 12px;
            gap: 12px;
          }

          .service-card {
            padding: 16px 12px;
          }

          .service-icon {
            width: 48px;
            height: 48px;
            font-size: 20px;
          }

          .category-emoji {
            width: 52px;
            height: 52px;
            font-size: 24px;
          }

          .categories-section,
          .deals-section,
          .featured-section,
          .all-restaurants-section {
            padding-left: 12px;
            padding-right: 12px;
          }

          .ai-banner,
          .multi-restaurant-promo {
            margin-left: 12px;
            margin-right: 12px;
          }

          .featured-card {
            min-width: 170px;
          }

          .deal-card {
            min-width: 190px;
            padding: 14px;
          }

          .deal-headline {
            font-size: 18px;
          }

          .restaurant-card {
            padding: 12px;
            gap: 12px;
          }

          .restaurant-card .restaurant-image {
            width: 80px;
            height: 80px;
          }

          .restaurant-card .image-placeholder {
            font-size: 32px;
          }
        }

        /* Small devices (landscape phones, 481px to 640px) */
        @media (min-width: 481px) and (max-width: 640px) {
          .service-selection {
            gap: 14px;
          }

          .featured-card {
            min-width: 190px;
          }
        }

        /* Medium devices (tablets, 641px to 768px) */
        @media (min-width: 641px) and (max-width: 768px) {
          .service-selection {
            padding: 20px;
          }

          .featured-card {
            min-width: 210px;
          }

          .categories-section,
          .deals-section,
          .featured-section,
          .all-restaurants-section {
            padding-left: 20px;
            padding-right: 20px;
          }

          .ai-banner,
          .multi-restaurant-promo {
            margin-left: 20px;
            margin-right: 20px;
          }
        }

        /* Large devices (desktops, 769px to 1024px) */
        @media (min-width: 769px) {
          .service-selection {
            max-width: 500px;
            margin: 0 auto;
            padding: 24px;
          }

          .categories-section,
          .deals-section,
          .featured-section,
          .all-restaurants-section {
            padding-left: 24px;
            padding-right: 24px;
          }

          .ai-banner,
          .multi-restaurant-promo {
            margin-left: 24px;
            margin-right: 24px;
          }

          .restaurants-list {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
          }

          .restaurant-card:hover {
            transform: translateY(-4px);
          }
        }

        /* Extra large devices (1025px and up) */
        @media (min-width: 1025px) {
          .customer-home {
            padding: 0 24px 100px;
          }

          .header-section {
            border-radius: 0 0 24px 24px;
          }

          .categories-section,
          .deals-section,
          .featured-section,
          .all-restaurants-section {
            padding-left: 32px;
            padding-right: 32px;
          }

          .ai-banner,
          .multi-restaurant-promo {
            margin-left: 32px;
            margin-right: 32px;
          }

          .featured-scroll {
            gap: 20px;
          }

          .featured-card {
            min-width: 240px;
          }

          .featured-image {
            height: 140px;
          }

          .restaurants-list {
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
          }
        }
      `}</style>
    </div>
  );
};

export default CustomerHome;
