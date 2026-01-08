import React, { useState, useEffect } from 'react';
import { Card, List, Button, Typography, Rate, message, Spin, Empty } from 'antd';
import {
  ArrowLeftOutlined,
  HeartFilled,
  HeartOutlined,
  LoadingOutlined,
  ShopOutlined,
  StarFilled
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl } from '../../api/api';
import { DollorTheme } from '../../theme';

const { Title, Text } = Typography;

/**
 * CustomerFavorites - View and manage favorite restaurants
 * Matches iOS FavoritesView.swift for platform parity
 */

interface FavoriteRestaurant {
  vendor_id: number;
  restaurant_name: string;
  cuisine?: string;
  rating?: number;
  image_url?: string;
  address?: string;
  delivery_available?: boolean;
  pickup_available?: boolean;
}

const CustomerFavorites: React.FC = () => {
  const navigate = useNavigate();
  const API_URL = getApiUrl();

  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<FavoriteRestaurant[]>([]);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const customerId = localStorage.getItem('customer_id') || localStorage.getItem('p2p_customer_id');

  useEffect(() => {
    if (customerId) {
      fetchFavorites();
    } else {
      message.error('Please log in to view favorites');
      navigate('/customer/login');
    }
  }, [customerId]);

  const fetchFavorites = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('customer_token') || localStorage.getItem('access_token');
      const response = await axios.get(`${API_URL}/api/customer/favorites/${customerId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setFavorites(response.data?.favorites || []);
    } catch (error) {
      console.error('Failed to fetch favorites:', error);
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (vendorId: number) => {
    setRemovingId(vendorId);
    try {
      const token = localStorage.getItem('customer_token') || localStorage.getItem('access_token');
      await axios.delete(`${API_URL}/api/customer/favorites/${customerId}/${vendorId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setFavorites(prev => prev.filter(f => f.vendor_id !== vendorId));
      message.success('Removed from favorites');
    } catch (error) {
      console.error('Failed to remove favorite:', error);
      message.error('Failed to remove from favorites');
    } finally {
      setRemovingId(null);
    }
  };

  const handleViewRestaurant = (vendorId: number) => {
    navigate(`/customer/restaurant/${vendorId}`);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
      </div>
    );
  }

  return (
    <div className="favorites-screen">
      {/* Header */}
      <div className="screen-header">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
          className="back-btn"
        />
        <Title level={4} style={{ margin: 0 }}>Favorites</Title>
        <div style={{ width: 40 }} /> {/* Spacer for centering */}
      </div>

      {/* Favorites List */}
      {favorites.length === 0 ? (
        <Card className="empty-card">
          <Empty
            image={<HeartOutlined style={{ fontSize: 64, color: DollorTheme.Text.tertiary }} />}
            description={
              <div>
                <Text strong style={{ fontSize: 16 }}>No Favorites Yet</Text>
                <br />
                <Text type="secondary">Mark restaurants as favorite to see them here</Text>
              </div>
            }
          >
            <Button
              type="primary"
              onClick={() => navigate('/customer/restaurants')}
              style={{ background: DollorTheme.Brand.green }}
            >
              Browse Restaurants
            </Button>
          </Empty>
        </Card>
      ) : (
        <Card className="favorites-card">
          <List
            dataSource={favorites}
            renderItem={(restaurant) => (
              <List.Item
                className="favorite-item"
                onClick={() => handleViewRestaurant(restaurant.vendor_id)}
              >
                <div className="favorite-content">
                  {/* Restaurant Image */}
                  <div className="restaurant-image">
                    {restaurant.image_url ? (
                      <img
                        src={restaurant.image_url}
                        alt={restaurant.restaurant_name}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`image-placeholder ${restaurant.image_url ? 'hidden' : ''}`}>
                      <ShopOutlined style={{ fontSize: 24, color: DollorTheme.Text.tertiary }} />
                    </div>
                  </div>

                  {/* Restaurant Details */}
                  <div className="restaurant-details">
                    <Text strong className="restaurant-name">{restaurant.restaurant_name}</Text>
                    {restaurant.cuisine && (
                      <Text type="secondary" className="restaurant-cuisine">
                        {restaurant.cuisine}
                      </Text>
                    )}
                    {restaurant.rating !== undefined && restaurant.rating > 0 && (
                      <div className="restaurant-rating">
                        <StarFilled style={{ color: '#FADB14', fontSize: 12 }} />
                        <Text style={{ fontSize: 12, marginLeft: 4 }}>
                          {restaurant.rating.toFixed(1)}
                        </Text>
                      </div>
                    )}
                  </div>

                  {/* Favorite Button */}
                  <Button
                    type="text"
                    icon={removingId === restaurant.vendor_id ? (
                      <LoadingOutlined />
                    ) : (
                      <HeartFilled style={{ color: '#ff4d4f', fontSize: 20 }} />
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFavorite(restaurant.vendor_id);
                    }}
                    disabled={removingId === restaurant.vendor_id}
                  />
                </div>
              </List.Item>
            )}
          />
        </Card>
      )}

      <style>{`
        .favorites-screen {
          max-width: 800px;
          margin: 0 auto;
          padding: 0 16px 24px 16px;
          background: ${DollorTheme.Background.primary};
          min-height: 100vh;
        }

        .screen-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 0;
          position: sticky;
          top: 0;
          background: ${DollorTheme.Background.primary};
          z-index: 10;
        }

        .back-btn {
          font-size: 18px;
        }

        .loading-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 400px;
        }

        .empty-card {
          border-radius: 12px;
          box-shadow: ${DollorTheme.Shadow.card};
          text-align: center;
          padding: 40px 20px;
        }

        .favorites-card {
          border-radius: 12px;
          box-shadow: ${DollorTheme.Shadow.card};
        }

        .favorites-card .ant-card-body {
          padding: 0;
        }

        .favorite-item {
          padding: 12px 16px !important;
          border-bottom: 1px solid ${DollorTheme.Border.light};
          cursor: pointer;
          transition: background 0.2s;
        }

        .favorite-item:last-child {
          border-bottom: none;
        }

        .favorite-item:hover {
          background: ${DollorTheme.Background.tertiary};
        }

        .favorite-content {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
        }

        .restaurant-image {
          width: 60px;
          height: 60px;
          border-radius: 8px;
          overflow: hidden;
          flex-shrink: 0;
          background: ${DollorTheme.Background.secondary};
        }

        .restaurant-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .image-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: ${DollorTheme.Background.secondary};
        }

        .image-placeholder.hidden {
          display: none;
        }

        .restaurant-details {
          flex: 1;
          min-width: 0;
        }

        .restaurant-name {
          display: block;
          font-size: 15px;
          margin-bottom: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .restaurant-cuisine {
          display: block;
          font-size: 13px;
          margin-bottom: 4px;
        }

        .restaurant-rating {
          display: flex;
          align-items: center;
        }

        @media (max-width: 576px) {
          .screen-header {
            padding: 12px 0;
          }

          .restaurant-image {
            width: 50px;
            height: 50px;
          }
        }
      `}</style>
    </div>
  );
};

export default CustomerFavorites;
