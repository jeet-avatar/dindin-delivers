import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Input, Tag, Rate, Typography, Spin, Empty, Select, Button, Badge } from 'antd';
import {
  SearchOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  StarOutlined,
  HeartOutlined,
  HeartFilled,
  FilterOutlined,
  DollarOutlined,
  ShoppingCartOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl } from '../../api/api';
import { pricing } from '../../config/brand';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;

interface Restaurant {
  id: number;
  name: string;
  description: string;
  cuisine_type: string;
  address: string;
  rating: number;
  review_count: number;
  delivery_time_min: number;
  delivery_time_max: number;
  delivery_fee: number;
  minimum_order: number;
  image_url?: string;
  is_open: boolean;
  is_favorite?: boolean;
}

const cuisineCategories = [
  { key: 'all', label: 'All', emoji: '🍽️' },
  { key: 'american', label: 'American', emoji: '🍔' },
  { key: 'italian', label: 'Italian', emoji: '🍕' },
  { key: 'chinese', label: 'Chinese', emoji: '🥡' },
  { key: 'mexican', label: 'Mexican', emoji: '🌮' },
  { key: 'japanese', label: 'Japanese', emoji: '🍣' },
  { key: 'indian', label: 'Indian', emoji: '🍛' },
  { key: 'thai', label: 'Thai', emoji: '🍜' },
  { key: 'mediterranean', label: 'Mediterranean', emoji: '🥙' },
];

const Restaurants: React.FC = () => {
  const navigate = useNavigate();
  const API_URL = getApiUrl();

  const [loading, setLoading] = useState(true);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState<Restaurant[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState('all');
  const [sortBy, setSortBy] = useState('rating');
  const [favorites, setFavorites] = useState<number[]>([]);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    fetchRestaurants();
    loadFavorites();
    loadCartCount();
  }, []);

  useEffect(() => {
    filterAndSortRestaurants();
  }, [restaurants, searchQuery, selectedCuisine, sortBy, favorites]);

  const fetchRestaurants = async () => {
    setLoading(true);
    try {
      // Use vendors/published endpoint to get real published restaurants
      const response = await axios.get(`${API_URL}/api/vendors/published`);
      const data = response.data;

      // Map published vendors to restaurant format
      const restaurantList = (data.restaurants || data || []).map((r: any) => ({
        id: r.id,
        name: r.name || r.restaurant_name,
        description: r.description || '',
        cuisine_type: r.cuisine_type || 'Various',
        address: r.address || `${r.street || ''}, ${r.city || ''}, ${r.state || ''} ${r.zip_code || ''}`.trim(),
        rating: r.rating || 4.5,
        review_count: r.reviews_count || 0,
        delivery_time_min: r.average_prep_time || 25,
        delivery_time_max: (r.average_prep_time || 25) + 15,
        delivery_fee: r.delivery_fee || 2.99,
        minimum_order: r.minimum_order || 0,
        image_url: r.image_url,
        is_open: r.is_open !== false,
        is_favorite: false
      }));

      setRestaurants(restaurantList);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      setRestaurants([]);
    } finally {
      setLoading(false);
    }
  };

  const loadFavorites = () => {
    const saved = localStorage.getItem('favorite_restaurants');
    if (saved) {
      setFavorites(JSON.parse(saved));
    }
  };

  const loadCartCount = () => {
    const cart = localStorage.getItem('cart');
    if (cart) {
      const items = JSON.parse(cart);
      setCartCount(items.length);
    }
  };

  const toggleFavorite = (restaurantId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newFavorites = favorites.includes(restaurantId)
      ? favorites.filter(id => id !== restaurantId)
      : [...favorites, restaurantId];
    setFavorites(newFavorites);
    localStorage.setItem('favorite_restaurants', JSON.stringify(newFavorites));
  };

  const filterAndSortRestaurants = () => {
    let filtered = [...restaurants];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.name.toLowerCase().includes(query) ||
        r.cuisine_type.toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query)
      );
    }

    // Filter by cuisine
    if (selectedCuisine !== 'all') {
      filtered = filtered.filter(r => r.cuisine_type === selectedCuisine);
    }

    // Sort
    switch (sortBy) {
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'delivery_time':
        filtered.sort((a, b) => a.delivery_time_min - b.delivery_time_min);
        break;
      case 'delivery_fee':
        filtered.sort((a, b) => a.delivery_fee - b.delivery_fee);
        break;
      case 'minimum_order':
        filtered.sort((a, b) => a.minimum_order - b.minimum_order);
        break;
    }

    // Add favorite status
    filtered = filtered.map(r => ({
      ...r,
      is_favorite: favorites.includes(r.id)
    }));

    setFilteredRestaurants(filtered);
  };

  const handleRestaurantClick = (restaurant: Restaurant) => {
    if (!restaurant.is_open) return;
    navigate(`/customer/restaurant/${restaurant.id}`);
  };

  return (
    <div className="restaurants-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <div>
            <Title level={2} style={{ margin: 0 }}>Order Food</Title>
            <Text type="secondary">Find your favorite restaurants</Text>
          </div>
          <Badge count={cartCount} size="default">
            <Button
              type="primary"
              icon={<ShoppingCartOutlined />}
              onClick={() => navigate('/customer/cart')}
            >
              Cart
            </Button>
          </Badge>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="search-card">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={12}>
            <Search
              placeholder="Search restaurants or cuisines..."
              allowClear
              enterButton={<SearchOutlined />}
              size="large"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onSearch={setSearchQuery}
            />
          </Col>
          <Col xs={12} md={6}>
            <Select
              style={{ width: '100%' }}
              size="large"
              value={sortBy}
              onChange={setSortBy}
              prefix={<FilterOutlined />}
            >
              <Option value="rating">Top Rated</Option>
              <Option value="delivery_time">Fastest Delivery</Option>
              <Option value="delivery_fee">Lowest Fee</Option>
              <Option value="minimum_order">Low Minimum</Option>
            </Select>
          </Col>
          <Col xs={12} md={6}>
            <div className="platform-fee-badge">
              <DollarOutlined />
              <span>{`$${pricing.foodDelivery.customerFee} Platform Fee`}</span>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Cuisine Categories */}
      <div className="cuisine-categories">
        {cuisineCategories.map(cat => (
          <div
            key={cat.key}
            className={`cuisine-chip ${selectedCuisine === cat.key ? 'active' : ''}`}
            onClick={() => setSelectedCuisine(cat.key)}
          >
            <span className="cuisine-emoji">{cat.emoji}</span>
            <span className="cuisine-label">{cat.label}</span>
          </div>
        ))}
      </div>

      {/* Restaurant Grid */}
      {loading ? (
        <div className="loading-container">
          <Spin size="large" />
          <Text type="secondary">Finding restaurants near you...</Text>
        </div>
      ) : filteredRestaurants.length === 0 ? (
        <Empty
          description="No restaurants found"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button type="primary" onClick={() => { setSearchQuery(''); setSelectedCuisine('all'); }}>
            Clear Filters
          </Button>
        </Empty>
      ) : (
        <div className="restaurant-grid">
          {filteredRestaurants.map(restaurant => (
            <div
              key={restaurant.id}
              className={`restaurant-card ${!restaurant.is_open ? 'closed' : ''}`}
              onClick={() => handleRestaurantClick(restaurant)}
            >
              <div className="restaurant-info">
                <div className="restaurant-name">{restaurant.name}</div>
                <div className="restaurant-rating">
                  <StarOutlined style={{ color: '#fadb14' }} />
                  <span className="rating-value">{restaurant.rating.toFixed(1)}</span>
                  <span className="review-count">({restaurant.review_count})</span>
                </div>
                <div className="restaurant-description">{restaurant.description}</div>
                <div className="restaurant-meta">
                  <Tag color="blue">{restaurant.cuisine_type}</Tag>
                  <span className="meta-item">
                    <ClockCircleOutlined />
                    {restaurant.delivery_time_min}-{restaurant.delivery_time_max} min
                  </span>
                </div>
                <div className="restaurant-footer">
                  <span className="delivery-fee">${restaurant.delivery_fee.toFixed(2)} delivery</span>
                  <span className="separator">•</span>
                  <span className="min-order">${restaurant.minimum_order} min</span>
                </div>
              </div>
              <div className="restaurant-image-container">
                {restaurant.image_url ? (
                  <img
                    src={restaurant.image_url}
                    alt={restaurant.name}
                    className="restaurant-image"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`image-placeholder ${restaurant.image_url ? 'hidden' : ''}`}>
                  <span className="cuisine-emoji-large">
                    {cuisineCategories.find(c => c.key === restaurant.cuisine_type)?.emoji || '🍽️'}
                  </span>
                </div>
                <div
                  className="favorite-btn"
                  onClick={(e) => toggleFavorite(restaurant.id, e)}
                >
                  {restaurant.is_favorite ? (
                    <HeartFilled style={{ color: '#ff4d4f' }} />
                  ) : (
                    <HeartOutlined />
                  )}
                </div>
              </div>
              {!restaurant.is_open && (
                <div className="closed-overlay">
                  <Tag color="red">Closed</Tag>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <style>{`
        /* ============================================
           RESTAURANTS PAGE - Horizontal Card Layout
           Matching RestaurantDetail.tsx style
           ============================================ */

        .restaurants-page {
          max-width: 1440px;
          margin: 0 auto;
          padding: 24px 16px;
          min-height: 100vh;
        }

        .page-header {
          margin-bottom: 24px;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }

        .search-card {
          border-radius: 16px;
          margin-bottom: 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }

        .platform-fee-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 16px;
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          border-radius: 12px;
          color: #059669;
          font-weight: 600;
          white-space: nowrap;
        }

        .cuisine-categories {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          padding: 8px 4px 24px 4px;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .cuisine-categories::-webkit-scrollbar {
          display: none;
        }

        .cuisine-chip {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 16px 20px;
          border-radius: 16px;
          background: white;
          border: 2px solid #f0f0f0;
          cursor: pointer;
          transition: all 0.2s ease;
          min-width: 90px;
          flex-shrink: 0;
        }

        .cuisine-chip:hover {
          border-color: #10B981;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15);
        }

        .cuisine-chip.active {
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          border-color: transparent;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .cuisine-chip.active .cuisine-label {
          color: white;
        }

        .cuisine-emoji {
          font-size: 28px;
          line-height: 1;
        }

        .cuisine-label {
          font-size: 12px;
          font-weight: 600;
          color: #374151;
          text-align: center;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 0;
          gap: 16px;
        }

        /* ============================================
           HORIZONTAL CARD GRID - Like RestaurantDetail
           ============================================ */

        .restaurant-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
          gap: 20px;
        }

        .restaurant-card {
          display: flex;
          flex-direction: row;
          height: 160px;
          background: white;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid #e5e7eb;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
        }

        .restaurant-card:hover:not(.closed) {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
          border-color: #10B981;
        }

        .restaurant-card.closed {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .restaurant-info {
          flex: 1;
          padding: 16px;
          display: flex;
          flex-direction: column;
          min-width: 0;
          overflow: hidden;
        }

        .restaurant-name {
          font-size: 17px;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 6px 0;
          line-height: 1.3;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .restaurant-rating {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 8px;
        }

        .rating-value {
          font-weight: 700;
          font-size: 14px;
          color: #1f2937;
        }

        .review-count {
          color: #9ca3af;
          font-size: 13px;
        }

        .restaurant-description {
          font-size: 13px;
          color: #6b7280;
          line-height: 1.4;
          margin-bottom: 8px;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          flex: 1;
        }

        .restaurant-meta {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #6b7280;
          font-size: 12px;
        }

        .restaurant-footer {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: auto;
          padding-top: 8px;
          font-size: 12px;
          color: #6b7280;
        }

        .delivery-fee {
          color: #059669;
          font-weight: 600;
        }

        .separator {
          color: #d1d5db;
        }

        .min-order {
          color: #6b7280;
        }

        .restaurant-image-container {
          width: 160px;
          height: 160px;
          flex-shrink: 0;
          position: relative;
          background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
        }

        .restaurant-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .image-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
        }

        .image-placeholder.hidden {
          display: none;
        }

        .cuisine-emoji-large {
          font-size: 48px;
        }

        .favorite-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          font-size: 16px;
          z-index: 2;
        }

        .favorite-btn:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .closed-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1;
        }

        /* ============================================
           RESPONSIVE BREAKPOINTS
           ============================================ */

        /* Mobile (480px and down) */
        @media (max-width: 480px) {
          .restaurants-page {
            padding: 16px 12px;
          }

          .header-content {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }

          .cuisine-categories {
            margin: 0 -12px;
            padding-left: 12px;
            padding-right: 12px;
          }

          .cuisine-chip {
            padding: 12px 14px;
            min-width: 72px;
          }

          .cuisine-emoji {
            font-size: 24px;
          }

          .cuisine-label {
            font-size: 11px;
          }

          .platform-fee-badge {
            padding: 10px 12px;
            font-size: 13px;
          }

          .restaurant-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .restaurant-card {
            height: 140px;
          }

          .restaurant-image-container {
            width: 120px;
            height: 140px;
          }

          .restaurant-info {
            padding: 12px;
          }

          .restaurant-name {
            font-size: 15px;
          }

          .cuisine-emoji-large {
            font-size: 40px;
          }
        }

        /* Small tablets (481px to 768px) */
        @media (min-width: 481px) and (max-width: 768px) {
          .restaurant-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .restaurant-card {
            height: 150px;
          }

          .restaurant-image-container {
            width: 150px;
            height: 150px;
          }
        }

        /* Medium devices (769px to 1024px) */
        @media (min-width: 769px) and (max-width: 1024px) {
          .restaurant-grid {
            grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
            gap: 18px;
          }
        }

        /* Large devices (1025px and up) */
        @media (min-width: 1025px) {
          .restaurants-page {
            padding: 32px 40px;
          }

          .restaurant-grid {
            grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
            gap: 24px;
          }

          .restaurant-card {
            height: 170px;
          }

          .restaurant-image-container {
            width: 170px;
            height: 170px;
          }

          .restaurant-name {
            font-size: 18px;
          }

          .cuisine-emoji-large {
            font-size: 56px;
          }
        }
      `}</style>
    </div>
  );
};

export default Restaurants;
