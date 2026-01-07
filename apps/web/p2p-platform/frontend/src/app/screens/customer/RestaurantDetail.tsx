import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Button, Typography, Tag, Rate, Divider, Badge, Modal, InputNumber, Input, message, Spin } from 'antd';
import {
  ArrowLeftOutlined,
  StarOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  HeartOutlined,
  HeartFilled,
  PlusOutlined,
  MinusOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl } from '../../api/api';
import { pricing } from '../../config/brand';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url?: string;
  is_available: boolean;
  is_popular?: boolean;
  dietary_tags?: string[];
}

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
  is_open: boolean;
  image_url?: string;
}

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  specialInstructions?: string;
  restaurantId: number;
  restaurantName: string;
}

const RestaurantDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const API_URL = getApiUrl();

  const [loading, setLoading] = useState(true);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isFavorite, setIsFavorite] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customizeModal, setCustomizeModal] = useState<{
    visible: boolean;
    item: MenuItem | null;
    quantity: number;
    instructions: string;
  }>({ visible: false, item: null, quantity: 1, instructions: '' });

  useEffect(() => {
    fetchRestaurantDetails();
    loadCart();
    checkFavorite();
  }, [id]);

  const fetchRestaurantDetails = async () => {
    setLoading(true);
    try {
      // Use public/restaurants endpoint (works for all published vendors)
      const restaurantRes = await axios.get(`${API_URL}/api/public/restaurants/${id}`);

      if (restaurantRes.data.success) {
        // Map restaurant data to expected format
        const r = restaurantRes.data.restaurant;
        setRestaurant({
          id: r.id,
          name: r.name,
          description: r.description || '',
          cuisine_type: r.cuisine_type,
          address: r.address?.full_address || `${r.address?.street}, ${r.address?.city}, ${r.address?.state} ${r.address?.zip_code}`,
          rating: r.rating || 4.5,
          review_count: r.reviews_count || 0,
          delivery_time_min: r.average_prep_time || 25,
          delivery_time_max: (r.average_prep_time || 25) + 15,
          delivery_fee: 2.99,
          minimum_order: 0,
          is_open: true,
          image_url: r.image_url
        });

        // Menu is included in the response, flatten from categories
        const menuByCategory = restaurantRes.data.menu || {};
        const flatMenu: MenuItem[] = [];
        Object.entries(menuByCategory).forEach(([category, items]: [string, any]) => {
          items.forEach((item: any) => {
            flatMenu.push({
              id: item.id,
              name: item.name,
              description: item.description || '',
              price: item.price,
              category: category,
              image_url: item.image_url,
              is_available: item.in_stock !== false,
              is_popular: false,
              dietary_tags: item.dietary_tags || []
            });
          });
        });
        setMenuItems(flatMenu);
      } else {
        setRestaurant(null);
        setMenuItems([]);
      }
    } catch (error) {
      console.error('Error fetching restaurant:', error);
      setRestaurant(null);
      setMenuItems([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCart = () => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  };

  const saveCart = (newCart: CartItem[]) => {
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
  };

  const checkFavorite = () => {
    const favorites = JSON.parse(localStorage.getItem('favorite_restaurants') || '[]');
    setIsFavorite(favorites.includes(parseInt(id || '0')));
  };

  const toggleFavorite = () => {
    const favorites = JSON.parse(localStorage.getItem('favorite_restaurants') || '[]');
    const restaurantId = parseInt(id || '0');
    const newFavorites = isFavorite
      ? favorites.filter((fid: number) => fid !== restaurantId)
      : [...favorites, restaurantId];
    localStorage.setItem('favorite_restaurants', JSON.stringify(newFavorites));
    setIsFavorite(!isFavorite);
  };

  const openCustomizeModal = (item: MenuItem) => {
    if (!item.is_available) {
      message.warning('This item is currently unavailable');
      return;
    }
    setCustomizeModal({
      visible: true,
      item,
      quantity: 1,
      instructions: ''
    });
  };

  const addToCart = () => {
    if (!customizeModal.item || !restaurant) return;

    const existingIndex = cart.findIndex(
      c => c.menuItem.id === customizeModal.item!.id && c.restaurantId === restaurant.id
    );

    let newCart: CartItem[];
    if (existingIndex >= 0) {
      newCart = [...cart];
      newCart[existingIndex].quantity += customizeModal.quantity;
      if (customizeModal.instructions) {
        newCart[existingIndex].specialInstructions = customizeModal.instructions;
      }
    } else {
      newCart = [...cart, {
        menuItem: customizeModal.item,
        quantity: customizeModal.quantity,
        specialInstructions: customizeModal.instructions || undefined,
        restaurantId: restaurant.id,
        restaurantName: restaurant.name
      }];
    }

    saveCart(newCart);
    message.success(`Added ${customizeModal.item.name} to cart`);
    setCustomizeModal({ visible: false, item: null, quantity: 1, instructions: '' });
  };

  const getCategories = () => {
    const cats = Array.from(new Set(menuItems.map(m => m.category)));
    return ['all', ...cats];
  };

  const filteredMenu = selectedCategory === 'all'
    ? menuItems
    : menuItems.filter(m => m.category === selectedCategory);

  const cartTotal = cart.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" />
        <Text type="secondary">Loading restaurant...</Text>
      </div>
    );
  }

  if (!restaurant) {
    return <div>Restaurant not found</div>;
  }

  return (
    <div className="restaurant-detail-page">
      {/* Header */}
      <div className="restaurant-header">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/customer/restaurants')}
          className="back-btn"
        >
          Back
        </Button>

        <div className="header-image">
          {restaurant.image_url ? (
            <img
              src={restaurant.image_url}
              alt={restaurant.name}
              className="header-background-image"
            />
          ) : (
            <div className="header-gradient-fallback" />
          )}
          <div className="image-overlay">
            <div className="restaurant-info-header">
              <Title level={2} style={{ color: 'white', margin: 0 }}>{restaurant.name}</Title>
              <div className="rating-badge">
                <StarOutlined />
                <span>{restaurant.rating.toFixed(1)}</span>
                <span>({restaurant.review_count} reviews)</span>
              </div>
            </div>
          </div>
          <Button
            className="favorite-btn"
            shape="circle"
            icon={isFavorite ? <HeartFilled style={{ color: '#ff4d4f' }} /> : <HeartOutlined />}
            onClick={toggleFavorite}
          />
        </div>

        <div className="info-card">
          <Card>
            <Row gutter={[24, 16]}>
              <Col xs={24} md={16}>
              <Paragraph type="secondary">{restaurant.description}</Paragraph>
              <div className="meta-row">
                <Tag color="blue">{restaurant.cuisine_type}</Tag>
                <div className="meta-item">
                  <ClockCircleOutlined />
                  <span>{restaurant.delivery_time_min}-{restaurant.delivery_time_max} min</span>
                </div>
                <div className="meta-item">
                  <EnvironmentOutlined />
                  <span>{restaurant.address}</span>
                </div>
              </div>
            </Col>
            <Col xs={24} md={8}>
              <div className="fee-info">
                <div className="fee-item">
                  <Text type="secondary">Delivery Fee</Text>
                  <Text strong>${restaurant.delivery_fee.toFixed(2)}</Text>
                </div>
                <Divider type="vertical" />
                <div className="fee-item">
                  <Text type="secondary">Minimum</Text>
                  <Text strong>${restaurant.minimum_order.toFixed(2)}</Text>
                </div>
                <Divider type="vertical" />
                <div className="fee-item platform-fee">
                  <Text type="secondary">Platform Fee</Text>
                  <Text strong className="green">{pricing.display.foodDelivery.customerFee}</Text>
                </div>
              </div>
            </Col>
          </Row>
          </Card>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="category-tabs">
        {getCategories().map(cat => (
          <Button
            key={cat}
            type={selectedCategory === cat ? 'primary' : 'default'}
            onClick={() => setSelectedCategory(cat)}
            className="category-btn"
          >
            {cat === 'all' ? 'All Items' : cat}
          </Button>
        ))}
      </div>

      {/* Menu Grid - Horizontal Cards with Image on Right */}
      <div className="menu-grid">
        {filteredMenu.map(item => (
          <div
            key={item.id}
            className={`menu-item-card ${!item.is_available ? 'unavailable' : ''}`}
            onClick={() => openCustomizeModal(item)}
          >
            <div className="menu-item-info">
              <Text strong className="item-name">{item.name}</Text>
              <Text type="secondary" className="item-description">
                {item.description}
              </Text>
              <div className="item-footer">
                <Text strong className="price">${item.price.toFixed(2)}</Text>
                {item.dietary_tags && item.dietary_tags.length > 0 && (
                  <div className="dietary-tags">
                    {item.dietary_tags.slice(0, 2).map(tag => (
                      <Tag key={tag} color="green" className="diet-tag">{tag}</Tag>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="menu-item-image-container">
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="menu-item-image"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`menu-item-placeholder ${item.image_url ? 'hidden' : ''}`}>
                <span>🍽️</span>
              </div>
              <Button
                type="primary"
                shape="circle"
                icon={<PlusOutlined />}
                className="add-btn"
                disabled={!item.is_available}
              />
            </div>
            {!item.is_available && (
              <div className="unavailable-overlay">Unavailable</div>
            )}
          </div>
        ))}
      </div>

      {/* Floating Cart Button */}
      {cartItemCount > 0 && (
        <div className="floating-cart" onClick={() => navigate('/customer/cart')}>
          <Badge count={cartItemCount}>
            <ShoppingCartOutlined className="cart-icon" />
          </Badge>
          <div className="cart-info">
            <Text strong>View Cart</Text>
            <Text>${cartTotal.toFixed(2)}</Text>
          </div>
          <Button type="primary">Checkout</Button>
        </div>
      )}

      {/* Customize Modal */}
      <Modal
        title={customizeModal.item?.name}
        open={customizeModal.visible}
        onCancel={() => setCustomizeModal({ visible: false, item: null, quantity: 1, instructions: '' })}
        footer={[
          <Button key="cancel" onClick={() => setCustomizeModal({ visible: false, item: null, quantity: 1, instructions: '' })}>
            Cancel
          </Button>,
          <Button key="add" type="primary" onClick={addToCart}>
            Add to Cart - ${((customizeModal.item?.price || 0) * customizeModal.quantity).toFixed(2)}
          </Button>
        ]}
      >
        {customizeModal.item && (
          <div className="customize-content">
            <Paragraph>{customizeModal.item.description}</Paragraph>
            <Divider />

            <div className="quantity-section">
              <Text strong>Quantity</Text>
              <div className="quantity-controls">
                <Button
                  icon={<MinusOutlined />}
                  onClick={() => setCustomizeModal(prev => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }))}
                  disabled={customizeModal.quantity <= 1}
                />
                <span className="quantity">{customizeModal.quantity}</span>
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => setCustomizeModal(prev => ({ ...prev, quantity: prev.quantity + 1 }))}
                />
              </div>
            </div>

            <Divider />

            <div className="instructions-section">
              <Text strong>Special Instructions (optional)</Text>
              <TextArea
                placeholder="Any special requests? (e.g., no onions, extra sauce)"
                rows={3}
                value={customizeModal.instructions}
                onChange={(e) => setCustomizeModal(prev => ({ ...prev, instructions: e.target.value }))}
                style={{ marginTop: 8 }}
              />
            </div>
          </div>
        )}
      </Modal>

      <style>{`
        /* ============================================
           RESTAURANT DETAIL - Premium International Design
           Full-width layout with proper alignment
           ============================================ */

        .restaurant-detail-page {
          width: 100%;
          min-height: 100vh;
          background: #f8f9fa;
          padding: 0 0 120px;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 0;
          gap: 16px;
        }

        .restaurant-header {
          margin-bottom: 32px;
        }

        .back-btn {
          position: absolute;
          top: 20px;
          left: 20px;
          z-index: 10;
          background: rgba(255,255,255,0.95);
          border: none;
          border-radius: 12px;
          height: 44px;
          padding: 0 16px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.15);
        }

        .back-btn:hover {
          background: white;
        }

        /* Header with Restaurant Image */
        .header-image {
          width: 100%;
          height: 320px;
          position: relative;
          overflow: hidden;
        }

        .header-background-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .header-gradient-fallback {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #10B981 0%, #059669 50%, #047857 100%);
        }

        .image-overlay {
          background: linear-gradient(transparent 0%, rgba(0,0,0,0.75) 100%);
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 40px;
        }

        .restaurant-info-header {
          max-width: 1400px;
          margin: 0 auto;
        }

        .restaurant-info-header h2 {
          text-shadow: 0 2px 12px rgba(0,0,0,0.4);
          font-size: 36px;
          font-weight: 700;
        }

        .rating-badge {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 12px;
          color: white;
          font-size: 16px;
        }

        .rating-badge .anticon {
          color: #fbbf24;
        }

        .favorite-btn {
          position: absolute;
          top: 20px;
          right: 20px;
          width: 48px;
          height: 48px;
          background: rgba(255,255,255,0.95);
          border: none;
          box-shadow: 0 2px 12px rgba(0,0,0,0.2);
        }

        .favorite-btn:hover {
          background: white;
          transform: scale(1.05);
        }

        /* Info Card */
        .info-card {
          max-width: 1400px;
          margin: -60px auto 0;
          margin-left: auto;
          margin-right: auto;
          padding: 0 24px;
          position: relative;
          z-index: 1;
        }

        .info-card .ant-card {
          border-radius: 20px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
          border: none;
        }

        .meta-row {
          display: flex;
          flex-wrap: wrap;
          gap: 12px 24px;
          margin-top: 16px;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #6b7280;
          font-size: 14px;
        }

        .fee-info {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 24px;
        }

        .fee-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 10px 16px;
        }

        .fee-item.platform-fee {
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          border-radius: 12px;
        }

        .fee-item.platform-fee .green {
          color: #10B981;
          font-weight: 700;
        }

        /* Category Tabs */
        .category-tabs {
          max-width: 1400px;
          margin: 0 auto;
          padding: 28px 24px;
          display: flex;
          gap: 12px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }

        .category-tabs::-webkit-scrollbar {
          display: none;
        }

        .category-btn {
          border-radius: 24px;
          height: 44px;
          padding: 0 24px;
          font-weight: 500;
          flex-shrink: 0;
          border: 2px solid #e5e7eb;
          background: white;
        }

        .category-btn:hover {
          border-color: #10B981;
          color: #10B981;
        }

        .category-btn.ant-btn-primary {
          background: #10B981;
          border-color: #10B981;
        }

        /* Menu Grid - CSS Grid for uniform cards */
        .menu-grid {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 24px;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 16px;
        }

        /* Horizontal card layout with fixed height */
        .menu-item-card {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          display: flex;
          flex-direction: row;
          height: 140px;
          position: relative;
        }

        .menu-item-card:hover:not(.unavailable) {
          box-shadow: 0 4px 12px rgba(0,0,0,0.12);
          transform: translateY(-2px);
        }

        .menu-item-card.unavailable {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Menu Item Info - Left side */
        .menu-item-info {
          flex: 1;
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          min-width: 0;
          overflow: hidden;
        }

        .item-name {
          font-size: 15px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 6px;
          line-height: 1.3;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .item-description {
          font-size: 13px;
          line-height: 1.4;
          color: #6b7280;
          margin-bottom: 8px;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          flex: 1;
        }

        .item-footer {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: auto;
        }

        .price {
          font-size: 16px;
          color: #10B981;
          font-weight: 700;
          white-space: nowrap;
        }

        .dietary-tags {
          display: flex;
          gap: 4px;
          flex-wrap: nowrap;
          overflow: hidden;
        }

        .diet-tag {
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 4px;
          white-space: nowrap;
        }

        /* Menu Item Image - Right side, fixed size */
        .menu-item-image-container {
          position: relative;
          width: 120px;
          height: 140px;
          flex-shrink: 0;
          background: #f5f5f5;
        }

        .menu-item-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .menu-item-placeholder {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #f0fdf4 0%, #d1fae5 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 36px;
        }

        .menu-item-placeholder.hidden {
          display: none;
        }

        .menu-item-image-container .add-btn {
          position: absolute;
          bottom: 8px;
          right: 8px;
          width: 32px;
          height: 32px;
          font-size: 14px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }

        /* Unavailable overlay spans full card */
        .unavailable-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255,255,255,0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          color: #ef4444;
          font-size: 14px;
          z-index: 1;
        }

        /* Floating Cart */
        .floating-cart {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          background: white;
          padding: 14px 32px;
          border-radius: 50px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          display: flex;
          align-items: center;
          gap: 20px;
          cursor: pointer;
          z-index: 100;
          max-width: calc(100% - 48px);
          transition: all 0.2s ease;
        }

        .floating-cart:hover {
          transform: translateX(-50%) translateY(-3px);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
        }

        .cart-icon {
          font-size: 28px;
          color: #10B981;
        }

        .cart-info {
          display: flex;
          flex-direction: column;
        }

        /* Modal */
        .customize-content {
          padding: 16px 0;
        }

        .quantity-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .quantity-controls {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .quantity-controls button {
          width: 40px;
          height: 40px;
        }

        .quantity {
          font-size: 20px;
          font-weight: 600;
          min-width: 40px;
          text-align: center;
        }

        /* ============================================
           RESPONSIVE BREAKPOINTS
           ============================================ */

        @media (max-width: 480px) {
          .header-image {
            height: 200px;
          }

          .image-overlay {
            padding: 16px;
          }

          .restaurant-info-header h2 {
            font-size: 22px;
          }

          .back-btn {
            top: 12px;
            left: 12px;
            height: 36px;
            padding: 0 12px;
          }

          .favorite-btn {
            top: 12px;
            right: 12px;
            width: 36px;
            height: 36px;
          }

          .info-card {
            padding: 0 12px;
            margin-top: -40px;
          }

          .category-tabs {
            padding: 16px 12px;
          }

          .menu-grid {
            padding: 0 12px;
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .menu-item-card {
            height: 120px;
          }

          .menu-item-info {
            padding: 12px;
          }

          .menu-item-image-container {
            width: 100px;
            height: 120px;
          }

          .item-name {
            font-size: 14px;
          }

          .item-description {
            font-size: 12px;
          }

          .price {
            font-size: 14px;
          }

          .floating-cart {
            left: 12px;
            right: 12px;
            transform: none;
            padding: 10px 16px;
            gap: 12px;
          }

          .floating-cart:hover {
            transform: translateY(-2px);
          }
        }

        @media (min-width: 481px) and (max-width: 768px) {
          .header-image {
            height: 240px;
          }

          .restaurant-info-header h2 {
            font-size: 28px;
          }

          .info-card {
            padding: 0 16px;
            margin-top: -50px;
          }

          .menu-grid {
            padding: 0 16px;
            grid-template-columns: 1fr;
            gap: 12px;
          }
        }

        @media (min-width: 769px) and (max-width: 1024px) {
          .header-image {
            height: 280px;
          }

          .menu-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
          }
        }

        @media (min-width: 1025px) and (max-width: 1399px) {
          .header-image {
            height: 320px;
          }

          .restaurant-info-header h2 {
            font-size: 38px;
          }

          .menu-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
          }
        }

        @media (min-width: 1400px) {
          .header-image {
            height: 360px;
          }

          .restaurant-info-header h2 {
            font-size: 42px;
          }

          .menu-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
          }

          .menu-item-card {
            height: 150px;
          }

          .menu-item-image-container {
            width: 140px;
            height: 150px;
          }

          .item-name {
            font-size: 16px;
          }

          .price {
            font-size: 18px;
          }
        }
      `}</style>
    </div>
  );
};

export default RestaurantDetail;
