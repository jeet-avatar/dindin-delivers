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
          is_open: true
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
                  <Text strong className="green">{pricing.display.foodDelivery.customerFee}</Text>
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
      <Row gutter={[20, 20]}>
        {filteredMenu.map(item => (
          <Col xs={24} sm={12} md={8} lg={6} xl={6} xxl={4} key={item.id}>
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
        /* ============================================
           RESTAURANT DETAIL - International-Level Design
           Responsive breakpoints: 480, 640, 768, 1024, 1280px
           ============================================ */

        .restaurant-detail-page {
          max-width: 1440px;
          margin: 0 auto;
          padding: 24px 16px 120px;
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
          margin-bottom: 28px;
        }

        .back-btn {
          margin-bottom: 16px;
          border-radius: 12px;
          height: 40px;
        }

        .header-image {
          height: 240px;
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          border-radius: 20px;
          position: relative;
          display: flex;
          align-items: flex-end;
          padding: 24px;
          overflow: hidden;
        }

        .image-overlay {
          background: linear-gradient(transparent 0%, rgba(0,0,0,0.7) 100%);
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 28px;
          border-radius: 0 0 20px 20px;
        }

        .restaurant-info-header {
          color: white;
        }

        .restaurant-info-header h2 {
          text-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }

        .rating-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 10px;
          color: white;
          font-size: 15px;
        }

        .favorite-btn {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 48px;
          height: 48px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.2);
        }

        .info-card {
          margin-top: -48px;
          margin-left: 20px;
          margin-right: 20px;
          border-radius: 20px;
          position: relative;
          z-index: 1;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }

        .meta-row {
          display: flex;
          flex-wrap: wrap;
          gap: 12px 20px;
          margin-top: 14px;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #6b7280;
          font-size: 14px;
        }

        .fee-info {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 20px;
        }

        .fee-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 8px 12px;
        }

        .fee-item.platform-fee {
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          border-radius: 12px;
        }

        .fee-item.platform-fee .green {
          color: #10B981;
          font-weight: 700;
        }

        .category-tabs {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          padding: 24px 0;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .category-tabs::-webkit-scrollbar {
          display: none;
        }

        .category-btn {
          border-radius: 24px;
          height: 40px;
          padding: 0 20px;
          font-weight: 500;
          flex-shrink: 0;
        }

        .menu-item-card {
          border-radius: 16px;
          height: 100%;
          transition: all 0.2s ease;
        }

        .menu-item-card:hover:not(.unavailable) {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        }

        .menu-item-card.unavailable {
          opacity: 0.5;
        }

        .menu-item-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
        }

        .menu-item-info {
          flex: 1;
          min-width: 0;
        }

        .menu-item-image-container {
          position: relative;
          flex-shrink: 0;
          width: 100px;
          height: 100px;
        }

        .menu-item-image {
          width: 100px;
          height: 100px;
          object-fit: cover;
          border-radius: 8px;
        }

        .menu-item-placeholder {
          width: 100px;
          height: 100px;
          background: #f5f5f5;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
        }

        .menu-item-placeholder.hidden {
          display: none;
        }

        .menu-item-image-container .add-btn {
          position: absolute;
          bottom: -8px;
          right: -8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }

        .item-header {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .item-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .price {
          font-size: 20px;
          color: #10B981;
          font-weight: 700;
        }

        .dietary-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }

        .unavailable-tag {
          margin-top: 10px;
        }

        .add-btn {
          flex-shrink: 0;
          width: 44px;
          height: 44px;
          font-size: 18px;
        }

        .floating-cart {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          background: white;
          padding: 14px 28px;
          border-radius: 50px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.18);
          display: flex;
          align-items: center;
          gap: 18px;
          cursor: pointer;
          z-index: 100;
          max-width: calc(100% - 32px);
          transition: all 0.2s ease;
        }

        .floating-cart:hover {
          transform: translateX(-50%) translateY(-2px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.22);
        }

        .cart-icon {
          font-size: 26px;
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

        /* Extra small devices (phones, 480px and down) */
        @media (max-width: 480px) {
          .restaurant-detail-page {
            padding: 12px 12px 120px;
          }

          .header-image {
            height: 180px;
            border-radius: 16px;
          }

          .image-overlay {
            padding: 20px;
          }

          .info-card {
            margin-left: 0;
            margin-right: 0;
            margin-top: -32px;
            border-radius: 16px;
          }

          .fee-info {
            justify-content: center;
            flex-wrap: wrap;
            gap: 12px;
          }

          .floating-cart {
            left: 12px;
            right: 12px;
            transform: none;
            padding: 12px 20px;
            gap: 12px;
          }

          .floating-cart:hover {
            transform: translateY(-2px);
          }

          .price {
            font-size: 18px;
          }

          .add-btn {
            width: 38px;
            height: 38px;
          }
        }

        /* Small devices (landscape phones, 481px to 640px) */
        @media (min-width: 481px) and (max-width: 640px) {
          .restaurant-detail-page {
            padding: 16px 16px 120px;
          }

          .header-image {
            height: 200px;
          }

          .info-card {
            margin-left: 8px;
            margin-right: 8px;
          }
        }

        /* Medium devices (tablets, 641px to 768px) */
        @media (min-width: 641px) and (max-width: 768px) {
          .restaurant-detail-page {
            padding: 20px 20px 120px;
          }

          .header-image {
            height: 220px;
          }

          .info-card {
            margin-left: 16px;
            margin-right: 16px;
          }
        }

        /* Large devices (desktops, 769px to 1024px) */
        @media (min-width: 769px) and (max-width: 1024px) {
          .restaurant-detail-page {
            padding: 24px 24px 120px;
          }
        }

        /* Extra large devices (1025px to 1280px) */
        @media (min-width: 1025px) and (max-width: 1280px) {
          .restaurant-detail-page {
            padding: 24px 32px 120px;
          }

          .header-image {
            height: 280px;
          }
        }

        /* XXL devices (1281px and up) */
        @media (min-width: 1281px) {
          .restaurant-detail-page {
            padding: 32px 40px 120px;
          }

          .header-image {
            height: 320px;
          }

          .info-card {
            margin-left: 40px;
            margin-right: 40px;
          }
        }
      `}</style>
    </div>
  );
};

export default RestaurantDetail;
