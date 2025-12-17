import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Button, Typography, Divider, Empty, InputNumber, message, Tag } from 'antd';
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  PlusOutlined,
  MinusOutlined,
  ShopOutlined,
  DollarOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;

interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
}

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  specialInstructions?: string;
  restaurantId: number;
  restaurantName: string;
}

interface CartSummary {
  subtotal: number;
  deliveryFee: number;
  platformFee: number;
  tax: number;
  total: number;
}

const Cart: React.FC = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [summary, setSummary] = useState<CartSummary>({
    subtotal: 0,
    deliveryFee: 0,
    platformFee: 1.00, // $1 flat platform fee
    tax: 0,
    total: 0
  });

  useEffect(() => {
    loadCart();
  }, []);

  useEffect(() => {
    calculateSummary();
  }, [cart]);

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

  const calculateSummary = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0);

    // Get unique restaurants for delivery fee calculation
    const uniqueRestaurants = new Set(cart.map(item => item.restaurantId));
    const deliveryFee = uniqueRestaurants.size * 2.99; // $2.99 per restaurant

    const platformFee = 1.00; // $1 flat fee for matchmaking
    const tax = subtotal * 0.0875; // 8.75% tax

    setSummary({
      subtotal,
      deliveryFee,
      platformFee,
      tax,
      total: subtotal + deliveryFee + platformFee + tax
    });
  };

  const updateQuantity = (itemIndex: number, newQuantity: number) => {
    if (newQuantity < 1) {
      removeItem(itemIndex);
      return;
    }

    const newCart = [...cart];
    newCart[itemIndex].quantity = newQuantity;
    saveCart(newCart);
  };

  const removeItem = (itemIndex: number) => {
    const newCart = cart.filter((_, index) => index !== itemIndex);
    saveCart(newCart);
    message.success('Item removed from cart');
  };

  const clearCart = () => {
    saveCart([]);
    message.success('Cart cleared');
  };

  const proceedToCheckout = () => {
    if (cart.length === 0) {
      message.warning('Your cart is empty');
      return;
    }

    // Check minimum order
    if (summary.subtotal < 10) {
      message.warning('Minimum order is $10.00');
      return;
    }

    navigate('/customer/checkout');
  };

  // Group items by restaurant
  const groupedCart = cart.reduce((groups, item) => {
    const key = item.restaurantId;
    if (!groups[key]) {
      groups[key] = {
        restaurantId: item.restaurantId,
        restaurantName: item.restaurantName,
        items: []
      };
    }
    groups[key].items.push(item);
    return groups;
  }, {} as Record<number, { restaurantId: number; restaurantName: string; items: CartItem[] }>);

  return (
    <div className="cart-page">
      {/* Header */}
      <div className="page-header">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
        >
          Continue Shopping
        </Button>
        <Title level={2} style={{ margin: 0 }}>Your Cart</Title>
        {cart.length > 0 && (
          <Button danger onClick={clearCart}>
            Clear All
          </Button>
        )}
      </div>

      {cart.length === 0 ? (
        <Card className="empty-cart">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div>
                <Title level={4}>Your cart is empty</Title>
                <Paragraph type="secondary">
                  Add some delicious items from our restaurants!
                </Paragraph>
              </div>
            }
          >
            <Button type="primary" size="large" onClick={() => navigate('/customer/restaurants')}>
              Browse Restaurants
            </Button>
          </Empty>
        </Card>
      ) : (
        <Row gutter={[24, 24]}>
          {/* Cart Items */}
          <Col xs={24} lg={16}>
            {Object.values(groupedCart).map(group => (
              <Card key={group.restaurantId} className="restaurant-group-card">
                <div className="restaurant-header">
                  <ShopOutlined className="shop-icon" />
                  <div>
                    <Title level={5} style={{ margin: 0 }}>{group.restaurantName}</Title>
                    <Text type="secondary">{group.items.length} item(s)</Text>
                  </div>
                </div>

                <Divider />

                {group.items.map((item, index) => {
                  const globalIndex = cart.findIndex(
                    c => c.menuItem.id === item.menuItem.id && c.restaurantId === item.restaurantId
                  );

                  return (
                    <div key={`${item.menuItem.id}-${index}`} className="cart-item">
                      <div className="item-info">
                        <Title level={5} style={{ margin: 0 }}>{item.menuItem.name}</Title>
                        <Paragraph type="secondary" ellipsis style={{ margin: '4px 0' }}>
                          {item.menuItem.description}
                        </Paragraph>
                        {item.specialInstructions && (
                          <Text type="secondary" italic>
                            Note: {item.specialInstructions}
                          </Text>
                        )}
                      </div>

                      <div className="item-controls">
                        <div className="quantity-controls">
                          <Button
                            size="small"
                            icon={<MinusOutlined />}
                            onClick={() => updateQuantity(globalIndex, item.quantity - 1)}
                          />
                          <span className="quantity">{item.quantity}</span>
                          <Button
                            size="small"
                            icon={<PlusOutlined />}
                            onClick={() => updateQuantity(globalIndex, item.quantity + 1)}
                          />
                        </div>

                        <div className="item-price">
                          <Text strong>${(item.menuItem.price * item.quantity).toFixed(2)}</Text>
                          {item.quantity > 1 && (
                            <Text type="secondary" className="unit-price">
                              ${item.menuItem.price.toFixed(2)} each
                            </Text>
                          )}
                        </div>

                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => removeItem(globalIndex)}
                        />
                      </div>
                    </div>
                  );
                })}
              </Card>
            ))}
          </Col>

          {/* Order Summary */}
          <Col xs={24} lg={8}>
            <Card className="summary-card">
              <Title level={4}>Order Summary</Title>

              <div className="summary-line">
                <Text>Subtotal</Text>
                <Text>${summary.subtotal.toFixed(2)}</Text>
              </div>

              <div className="summary-line">
                <Text>Delivery Fee</Text>
                <Text>${summary.deliveryFee.toFixed(2)}</Text>
              </div>

              <div className="summary-line highlight">
                <div className="platform-fee-label">
                  <DollarOutlined style={{ color: '#10B981' }} />
                  <Text>Platform Fee</Text>
                  <InfoCircleOutlined
                    style={{ color: '#9ca3af', cursor: 'pointer' }}
                    title="$1 flat matchmaking fee - 100% of delivery fee goes to driver"
                  />
                </div>
                <Text strong style={{ color: '#10B981' }}>${summary.platformFee.toFixed(2)}</Text>
              </div>

              <div className="summary-line">
                <Text>Tax (8.75%)</Text>
                <Text>${summary.tax.toFixed(2)}</Text>
              </div>

              <Divider />

              <div className="summary-line total">
                <Title level={4} style={{ margin: 0 }}>Total</Title>
                <Title level={3} style={{ margin: 0, color: '#10B981' }}>
                  ${summary.total.toFixed(2)}
                </Title>
              </div>

              <div className="driver-earnings-note">
                <Tag color="green">100% of delivery fee goes to driver</Tag>
              </div>

              <Button
                type="primary"
                size="large"
                block
                onClick={proceedToCheckout}
                className="checkout-btn"
              >
                Proceed to Checkout
              </Button>

              {summary.subtotal < 10 && (
                <div className="minimum-warning">
                  <InfoCircleOutlined />
                  <Text type="secondary">
                    Add ${(10 - summary.subtotal).toFixed(2)} more to meet $10 minimum
                  </Text>
                </div>
              )}
            </Card>

            {/* Promo Code Section */}
            <Card className="promo-card">
              <Title level={5}>Have a promo code?</Title>
              <div className="promo-input">
                <input
                  type="text"
                  placeholder="Enter code"
                  className="promo-field"
                />
                <Button type="primary">Apply</Button>
              </div>
            </Card>
          </Col>
        </Row>
      )}

      <style>{`
        .cart-page {
          max-width: 1200px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .empty-cart {
          max-width: 500px;
          margin: 48px auto;
          text-align: center;
          border-radius: 16px;
        }

        .restaurant-group-card {
          border-radius: 16px;
          margin-bottom: 24px;
        }

        .restaurant-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .shop-icon {
          font-size: 24px;
          color: #10B981;
        }

        .cart-item {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 16px 0;
          border-bottom: 1px solid #f0f0f0;
        }

        .cart-item:last-child {
          border-bottom: none;
        }

        .item-info {
          flex: 1;
          padding-right: 16px;
        }

        .item-controls {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .quantity-controls {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #f5f5f5;
          padding: 4px;
          border-radius: 8px;
        }

        .quantity {
          min-width: 24px;
          text-align: center;
          font-weight: 600;
        }

        .item-price {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          min-width: 80px;
        }

        .unit-price {
          font-size: 12px;
        }

        .summary-card {
          border-radius: 16px;
          position: sticky;
          top: 24px;
        }

        .summary-line {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
        }

        .summary-line.highlight {
          background: #f0fdf4;
          margin: 8px -24px;
          padding: 12px 24px;
        }

        .platform-fee-label {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .summary-line.total {
          padding-top: 16px;
        }

        .driver-earnings-note {
          text-align: center;
          margin: 16px 0;
        }

        .checkout-btn {
          height: 56px;
          font-size: 18px;
          font-weight: 600;
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          border: none;
          margin-top: 16px;
        }

        .checkout-btn:hover {
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
        }

        .minimum-warning {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 16px;
          padding: 12px;
          background: #fef3c7;
          border-radius: 8px;
        }

        .promo-card {
          border-radius: 16px;
          margin-top: 16px;
        }

        .promo-input {
          display: flex;
          gap: 8px;
        }

        .promo-field {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #d9d9d9;
          border-radius: 6px;
          font-size: 14px;
        }

        .promo-field:focus {
          outline: none;
          border-color: #10B981;
        }

        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            align-items: stretch;
          }

          .item-controls {
            flex-direction: column;
            align-items: flex-end;
            gap: 8px;
          }

          .summary-card {
            position: static;
          }
        }
      `}</style>
    </div>
  );
};

export default Cart;
