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
      const [restaurantRes, menuRes] = await Promise.all([
        axios.get(`${API_URL}/api/erp/restaurants/${id}`),
        axios.get(`${API_URL}/api/erp/restaurants/${id}/menu`)
      ]);

      if (restaurantRes.data.success) {
        setRestaurant(restaurantRes.data.restaurant);
      } else {
        setRestaurant(null);
      }

      if (menuRes.data.success) {
        setMenuItems(menuRes.data.menu || []);
      } else {
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

        <Card className="info-card">
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
                  <Text strong className="green">$1.00</Text>
                </div>
              </div>
            </Col>
          </Row>
        </Card>
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

      {/* Menu Grid */}
      <Row gutter={[24, 24]}>
        {filteredMenu.map(item => (
          <Col xs={24} sm={12} lg={8} key={item.id}>
            <Card
              className={`menu-item-card ${!item.is_available ? 'unavailable' : ''}`}
              hoverable={item.is_available}
              onClick={() => openCustomizeModal(item)}
            >
              <div className="menu-item-content">
                <div className="menu-item-info">
                  <div className="item-header">
                    <Title level={5} style={{ margin: 0 }}>{item.name}</Title>
                    {item.is_popular && <Tag color="gold">Popular</Tag>}
                  </div>
                  <Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ margin: '8px 0' }}>
                    {item.description}
                  </Paragraph>
                  <div className="item-footer">
                    <Text strong className="price">${item.price.toFixed(2)}</Text>
                    {item.dietary_tags && item.dietary_tags.length > 0 && (
                      <div className="dietary-tags">
                        {item.dietary_tags.map(tag => (
                          <Tag key={tag} color="green" size="small">{tag}</Tag>
                        ))}
                      </div>
                    )}
                  </div>
                  {!item.is_available && (
                    <Tag color="red" className="unavailable-tag">Unavailable</Tag>
                  )}
                </div>
                <Button
                  type="primary"
                  shape="circle"
                  icon={<PlusOutlined />}
                  className="add-btn"
                  disabled={!item.is_available}
                />
              </div>
            </Card>
          </Col>
        ))}
      </Row>

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
        .restaurant-detail-page {
          max-width: 1200px;
          margin: 0 auto;
          padding-bottom: 100px;
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
          margin-bottom: 24px;
        }

        .back-btn {
          margin-bottom: 16px;
        }

        .header-image {
          height: 200px;
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          border-radius: 16px;
          position: relative;
          display: flex;
          align-items: flex-end;
          padding: 24px;
        }

        .image-overlay {
          background: linear-gradient(transparent, rgba(0,0,0,0.7));
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 24px;
          border-radius: 0 0 16px 16px;
        }

        .restaurant-info-header {
          color: white;
        }

        .rating-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
          color: white;
        }

        .favorite-btn {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 44px;
          height: 44px;
        }

        .info-card {
          margin-top: -40px;
          margin-left: 24px;
          margin-right: 24px;
          border-radius: 16px;
          position: relative;
          z-index: 1;
        }

        .meta-row {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          margin-top: 12px;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #6b7280;
        }

        .fee-info {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 16px;
        }

        .fee-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .fee-item.platform-fee .green {
          color: #10B981;
        }

        .category-tabs {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          padding: 24px 0;
          -webkit-overflow-scrolling: touch;
        }

        .category-btn {
          border-radius: 20px;
        }

        .menu-item-card {
          border-radius: 16px;
          height: 100%;
        }

        .menu-item-card.unavailable {
          opacity: 0.6;
        }

        .menu-item-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .menu-item-info {
          flex: 1;
          padding-right: 16px;
        }

        .item-header {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .item-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .price {
          font-size: 18px;
          color: #10B981;
        }

        .dietary-tags {
          display: flex;
          gap: 4px;
        }

        .unavailable-tag {
          margin-top: 8px;
        }

        .add-btn {
          flex-shrink: 0;
        }

        .floating-cart {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          background: white;
          padding: 12px 24px;
          border-radius: 50px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
          display: flex;
          align-items: center;
          gap: 16px;
          cursor: pointer;
          z-index: 100;
        }

        .cart-icon {
          font-size: 24px;
          color: #10B981;
        }

        .cart-info {
          display: flex;
          flex-direction: column;
        }

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

        .quantity {
          font-size: 18px;
          font-weight: 600;
          min-width: 30px;
          text-align: center;
        }

        @media (max-width: 768px) {
          .header-image {
            height: 160px;
          }

          .info-card {
            margin-left: 0;
            margin-right: 0;
          }

          .fee-info {
            justify-content: center;
            flex-wrap: wrap;
          }

          .floating-cart {
            left: 16px;
            right: 16px;
            transform: none;
          }
        }
      `}</style>
    </div>
  );
};

export default RestaurantDetail;
