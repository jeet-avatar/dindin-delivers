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
      const response = await axios.get(`${API_URL}/api/erp/restaurants`);
      if (response.data.success) {
        setRestaurants(response.data.restaurants || []);
      } else {
        setRestaurants([]);
      }
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
              <span>$1 Platform Fee</span>
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
        <Row gutter={[24, 24]}>
          {filteredRestaurants.map(restaurant => (
            <Col xs={24} sm={12} lg={8} xl={6} key={restaurant.id}>
              <Card
                className={`restaurant-card ${!restaurant.is_open ? 'closed' : ''}`}
                hoverable={restaurant.is_open}
                onClick={() => handleRestaurantClick(restaurant)}
                cover={
                  <div className="restaurant-image">
                    <div className="image-placeholder">
                      <span className="cuisine-emoji-large">
                        {cuisineCategories.find(c => c.key === restaurant.cuisine_type)?.emoji || '🍽️'}
                      </span>
                    </div>
                    {!restaurant.is_open && (
                      <div className="closed-overlay">
                        <Tag color="red">Closed</Tag>
                      </div>
                    )}
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
                }
              >
                <div className="restaurant-info">
                  <div className="restaurant-header">
                    <Title level={5} ellipsis style={{ margin: 0 }}>
                      {restaurant.name}
                    </Title>
                    <div className="rating">
                      <StarOutlined style={{ color: '#fadb14' }} />
                      <span>{restaurant.rating.toFixed(1)}</span>
                      <Text type="secondary">({restaurant.review_count})</Text>
                    </div>
                  </div>

                  <Paragraph type="secondary" ellipsis={{ rows: 1 }} style={{ margin: '4px 0' }}>
                    {restaurant.description}
                  </Paragraph>

                  <div className="restaurant-meta">
                    <Tag color="blue">{restaurant.cuisine_type}</Tag>
                    <div className="meta-item">
                      <ClockCircleOutlined />
                      <span>{restaurant.delivery_time_min}-{restaurant.delivery_time_max} min</span>
                    </div>
                  </div>

                  <div className="restaurant-footer">
                    <div className="delivery-info">
                      <Text type="secondary">
                        ${restaurant.delivery_fee.toFixed(2)} delivery
                      </Text>
                      <Text type="secondary">•</Text>
                      <Text type="secondary">
                        ${restaurant.minimum_order} min
                      </Text>
                    </div>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <style>{`
        .restaurants-page {
          max-width: 1400px;
          margin: 0 auto;
        }

        .page-header {
          margin-bottom: 24px;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .search-card {
          border-radius: 16px;
          margin-bottom: 24px;
        }

        .platform-fee-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 16px;
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          border-radius: 8px;
          color: #059669;
          font-weight: 600;
        }

        .cuisine-categories {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          padding: 8px 0 24px 0;
          -webkit-overflow-scrolling: touch;
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
          transition: all 0.3s;
          min-width: 90px;
        }

        .cuisine-chip:hover {
          border-color: #10B981;
          transform: translateY(-2px);
        }

        .cuisine-chip.active {
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          border-color: transparent;
        }

        .cuisine-chip.active .cuisine-label {
          color: white;
        }

        .cuisine-emoji {
          font-size: 28px;
        }

        .cuisine-label {
          font-size: 12px;
          font-weight: 600;
          color: #374151;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 0;
          gap: 16px;
        }

        .restaurant-card {
          border-radius: 16px;
          overflow: hidden;
          transition: all 0.3s;
        }

        .restaurant-card:hover:not(.closed) {
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
        }

        .restaurant-card.closed {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .restaurant-image {
          height: 160px;
          position: relative;
          background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
        }

        .image-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
        }

        .cuisine-emoji-large {
          font-size: 64px;
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
        }

        .favorite-btn {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        .favorite-btn:hover {
          transform: scale(1.1);
        }

        .restaurant-info {
          padding: 4px 0;
        }

        .restaurant-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 4px;
        }

        .rating {
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: 600;
        }

        .restaurant-meta {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 8px 0;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #6b7280;
          font-size: 13px;
        }

        .restaurant-footer {
          padding-top: 8px;
          border-top: 1px solid #f0f0f0;
          margin-top: 8px;
        }

        .delivery-info {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
        }

        @media (max-width: 768px) {
          .cuisine-categories {
            padding-bottom: 16px;
          }

          .cuisine-chip {
            padding: 12px 16px;
            min-width: 80px;
          }

          .cuisine-emoji {
            font-size: 24px;
          }

          .header-content {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }
        }
      `}</style>
    </div>
  );
};

export default Restaurants;
