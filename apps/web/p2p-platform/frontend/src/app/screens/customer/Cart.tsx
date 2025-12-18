import React, { useEffect, useState, useCallback } from 'react';
import { Card, Row, Col, Button, Typography, Divider, Empty, message, Tag, Spin, Input } from 'antd';
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  PlusOutlined,
  MinusOutlined,
  ShopOutlined,
  DollarOutlined,
  InfoCircleOutlined,
  LoadingOutlined,
  GiftOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl } from '../../api/api';

const { Title, Text, Paragraph } = Typography;

interface CartItemData {
  id: number;
  menu_item_id: number;
  vendor_id: number;
  item_name: string;
  item_description: string;
  item_price: number;
  quantity: number;
  vendor_name: string;
  special_instructions?: string;
  customizations?: Record<string, any>;
}

interface CartSummary {
  subtotal: number;
  delivery_fee: number;
  platform_fee: number;
  tax: number;
  discount: number;
  total: number;
}

interface CartData {
  cart_id: number | null;
  items: CartItemData[];
  summary: CartSummary;
  promo_code?: string;
  promo_type?: string;
}

// Local storage cart item format (for fallback)
interface LocalCartItem {
  menuItem: {
    id: number;
    name: string;
    description: string;
    price: number;
    category: string;
  };
  quantity: number;
  specialInstructions?: string;
  restaurantId: number;
  restaurantName: string;
}

const Cart: React.FC = () => {
  const navigate = useNavigate();
  const API_URL = getApiUrl();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null); // Track which item is being updated
  const [cartData, setCartData] = useState<CartData>({
    cart_id: null,
    items: [],
    summary: {
      subtotal: 0,
      delivery_fee: 0,
      platform_fee: 1.00,
      tax: 0,
      discount: 0,
      total: 0
    }
  });
  const [promoCode, setPromoCode] = useState('');
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const getAuthToken = useCallback(() => {
    return localStorage.getItem('customer_token') || localStorage.getItem('access_token');
  }, []);

  // Convert local storage format to API format for display
  const convertLocalToApiFormat = useCallback((localItems: LocalCartItem[]): CartItemData[] => {
    return localItems.map((item, index) => ({
      id: index, // Use index as temporary ID for local items
      menu_item_id: item.menuItem.id,
      vendor_id: item.restaurantId,
      item_name: item.menuItem.name,
      item_description: item.menuItem.description,
      item_price: item.menuItem.price,
      quantity: item.quantity,
      vendor_name: item.restaurantName,
      special_instructions: item.specialInstructions
    }));
  }, []);

  // Calculate summary for local cart
  const calculateLocalSummary = useCallback((items: CartItemData[]): CartSummary => {
    const subtotal = items.reduce((sum, item) => sum + (item.item_price * item.quantity), 0);
    const uniqueVendors = new Set(items.map(item => item.vendor_id));
    const delivery_fee = uniqueVendors.size * 2.99;
    const platform_fee = 1.00;
    const tax = subtotal * 0.0875;

    return {
      subtotal,
      delivery_fee,
      platform_fee,
      tax,
      discount: 0,
      total: subtotal + delivery_fee + platform_fee + tax
    };
  }, []);

  // Load cart from API or localStorage
  const loadCart = useCallback(async () => {
    setLoading(true);
    const token = getAuthToken();

    if (token) {
      setIsAuthenticated(true);
      try {
        const response = await axios.get<CartData>(`${API_URL}/api/cart`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        setCartData(response.data);
        if (response.data.promo_code) {
          setPromoCode(response.data.promo_code);
        }
      } catch (error: any) {
        console.error('Failed to load cart from API:', error);
        if (error.response?.status === 401) {
          // Token expired, fall back to localStorage
          setIsAuthenticated(false);
          loadLocalCart();
        } else {
          // Other error, try localStorage as fallback
          loadLocalCart();
        }
      }
    } else {
      setIsAuthenticated(false);
      loadLocalCart();
    }
    setLoading(false);
  }, [API_URL, getAuthToken]);

  const loadLocalCart = useCallback(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        const localItems: LocalCartItem[] = JSON.parse(savedCart);
        const apiFormatItems = convertLocalToApiFormat(localItems);
        const summary = calculateLocalSummary(apiFormatItems);

        setCartData({
          cart_id: null,
          items: apiFormatItems,
          summary
        });
      } catch (e) {
        console.error('Failed to parse local cart:', e);
      }
    }
  }, [convertLocalToApiFormat, calculateLocalSummary]);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  // Update item quantity
  const updateQuantity = async (itemId: number, newQuantity: number) => {
    if (newQuantity < 1) {
      removeItem(itemId);
      return;
    }

    setUpdating(itemId);
    const token = getAuthToken();

    if (token && isAuthenticated) {
      try {
        const response = await axios.put<CartData>(
          `${API_URL}/api/cart/items/${itemId}`,
          { quantity: newQuantity },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setCartData(response.data);
      } catch (error: any) {
        console.error('Failed to update cart item:', error);
        message.error('Failed to update quantity');
        // Reload cart to get correct state
        loadCart();
      }
    } else {
      // Update localStorage
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        const localItems: LocalCartItem[] = JSON.parse(savedCart);
        localItems[itemId].quantity = newQuantity;
        localStorage.setItem('cart', JSON.stringify(localItems));

        const apiFormatItems = convertLocalToApiFormat(localItems);
        const summary = calculateLocalSummary(apiFormatItems);
        setCartData({
          cart_id: null,
          items: apiFormatItems,
          summary
        });
      }
    }
    setUpdating(null);
  };

  // Remove item from cart
  const removeItem = async (itemId: number) => {
    setUpdating(itemId);
    const token = getAuthToken();

    if (token && isAuthenticated) {
      try {
        const response = await axios.delete<CartData>(
          `${API_URL}/api/cart/items/${itemId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setCartData(response.data);
        message.success('Item removed from cart');
      } catch (error: any) {
        console.error('Failed to remove cart item:', error);
        message.error('Failed to remove item');
        loadCart();
      }
    } else {
      // Update localStorage
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        const localItems: LocalCartItem[] = JSON.parse(savedCart);
        localItems.splice(itemId, 1);
        localStorage.setItem('cart', JSON.stringify(localItems));

        const apiFormatItems = convertLocalToApiFormat(localItems);
        const summary = calculateLocalSummary(apiFormatItems);
        setCartData({
          cart_id: null,
          items: apiFormatItems,
          summary
        });
        message.success('Item removed from cart');
      }
    }
    setUpdating(null);
  };

  // Clear entire cart
  const clearCart = async () => {
    const token = getAuthToken();

    if (token && isAuthenticated) {
      try {
        await axios.delete(`${API_URL}/api/cart`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCartData({
          cart_id: null,
          items: [],
          summary: {
            subtotal: 0,
            delivery_fee: 0,
            platform_fee: 1.00,
            tax: 0,
            discount: 0,
            total: 0
          }
        });
        setPromoCode('');
        message.success('Cart cleared');
      } catch (error: any) {
        console.error('Failed to clear cart:', error);
        message.error('Failed to clear cart');
      }
    } else {
      localStorage.removeItem('cart');
      setCartData({
        cart_id: null,
        items: [],
        summary: {
          subtotal: 0,
          delivery_fee: 0,
          platform_fee: 1.00,
          tax: 0,
          discount: 0,
          total: 0
        }
      });
      message.success('Cart cleared');
    }
  };

  // Apply promo code
  const applyPromoCode = async () => {
    if (!promoCode.trim()) {
      message.warning('Please enter a promo code');
      return;
    }

    const token = getAuthToken();
    if (!token || !isAuthenticated) {
      message.info('Please log in to apply promo codes');
      return;
    }

    setApplyingPromo(true);
    try {
      const response = await axios.post<CartData>(
        `${API_URL}/api/cart/apply-promo`,
        { promo_code: promoCode.trim().toUpperCase() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCartData(response.data);
      message.success('Promo code applied!');
    } catch (error: any) {
      console.error('Failed to apply promo code:', error);
      const errorMessage = error.response?.data?.detail || 'Invalid promo code';
      message.error(errorMessage);
    }
    setApplyingPromo(false);
  };

  // Remove promo code
  const removePromoCode = async () => {
    const token = getAuthToken();
    if (!token || !isAuthenticated) return;

    try {
      const response = await axios.delete<CartData>(
        `${API_URL}/api/cart/promo`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCartData(response.data);
      setPromoCode('');
      message.success('Promo code removed');
    } catch (error: any) {
      console.error('Failed to remove promo code:', error);
    }
  };

  const proceedToCheckout = () => {
    if (cartData.items.length === 0) {
      message.warning('Your cart is empty');
      return;
    }

    if (cartData.summary.subtotal < 10) {
      message.warning('Minimum order is $10.00');
      return;
    }

    if (!isAuthenticated) {
      message.info('Please log in to proceed to checkout');
      navigate('/customer/login', { state: { from: '/customer/cart' } });
      return;
    }

    navigate('/customer/checkout');
  };

  // Group items by vendor
  const groupedItems = cartData.items.reduce((groups, item) => {
    const key = item.vendor_id;
    if (!groups[key]) {
      groups[key] = {
        vendorId: item.vendor_id,
        vendorName: item.vendor_name,
        items: []
      };
    }
    groups[key].items.push(item);
    return groups;
  }, {} as Record<number, { vendorId: number; vendorName: string; items: CartItemData[] }>);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
      </div>
    );
  }

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
        {cartData.items.length > 0 && (
          <Button danger onClick={clearCart}>
            Clear All
          </Button>
        )}
      </div>

      {cartData.items.length === 0 ? (
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
            {Object.values(groupedItems).map(group => (
              <Card key={group.vendorId} className="restaurant-group-card">
                <div className="restaurant-header">
                  <ShopOutlined className="shop-icon" />
                  <div>
                    <Title level={5} style={{ margin: 0 }}>{group.vendorName}</Title>
                    <Text type="secondary">{group.items.length} item(s)</Text>
                  </div>
                </div>

                <Divider />

                {group.items.map((item) => (
                  <div key={item.id} className="cart-item">
                    <div className="item-info">
                      <Title level={5} style={{ margin: 0 }}>{item.item_name}</Title>
                      <Paragraph type="secondary" ellipsis style={{ margin: '4px 0' }}>
                        {item.item_description}
                      </Paragraph>
                      {item.special_instructions && (
                        <Text type="secondary" italic>
                          Note: {item.special_instructions}
                        </Text>
                      )}
                    </div>

                    <div className="item-controls">
                      <div className="quantity-controls">
                        <Button
                          size="small"
                          icon={<MinusOutlined />}
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={updating === item.id}
                        />
                        <span className="quantity">
                          {updating === item.id ? <LoadingOutlined /> : item.quantity}
                        </span>
                        <Button
                          size="small"
                          icon={<PlusOutlined />}
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={updating === item.id}
                        />
                      </div>

                      <div className="item-price">
                        <Text strong>${(item.item_price * item.quantity).toFixed(2)}</Text>
                        {item.quantity > 1 && (
                          <Text type="secondary" className="unit-price">
                            ${item.item_price.toFixed(2)} each
                          </Text>
                        )}
                      </div>

                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => removeItem(item.id)}
                        disabled={updating === item.id}
                      />
                    </div>
                  </div>
                ))}
              </Card>
            ))}
          </Col>

          {/* Order Summary */}
          <Col xs={24} lg={8}>
            <Card className="summary-card">
              <Title level={4}>Order Summary</Title>

              <div className="summary-line">
                <Text>Subtotal</Text>
                <Text>${cartData.summary.subtotal.toFixed(2)}</Text>
              </div>

              <div className="summary-line">
                <Text>Delivery Fee</Text>
                <Text>${cartData.summary.delivery_fee.toFixed(2)}</Text>
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
                <Text strong style={{ color: '#10B981' }}>${cartData.summary.platform_fee.toFixed(2)}</Text>
              </div>

              <div className="summary-line">
                <Text>Tax (8.75%)</Text>
                <Text>${cartData.summary.tax.toFixed(2)}</Text>
              </div>

              {cartData.summary.discount > 0 && (
                <div className="summary-line discount">
                  <div className="discount-label">
                    <GiftOutlined style={{ color: '#10B981' }} />
                    <Text style={{ color: '#10B981' }}>Discount</Text>
                    {cartData.promo_code && (
                      <Tag color="green">{cartData.promo_code}</Tag>
                    )}
                  </div>
                  <Text strong style={{ color: '#10B981' }}>-${cartData.summary.discount.toFixed(2)}</Text>
                </div>
              )}

              <Divider />

              <div className="summary-line total">
                <Title level={4} style={{ margin: 0 }}>Total</Title>
                <Title level={3} style={{ margin: 0, color: '#10B981' }}>
                  ${cartData.summary.total.toFixed(2)}
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

              {cartData.summary.subtotal < 10 && (
                <div className="minimum-warning">
                  <InfoCircleOutlined />
                  <Text type="secondary">
                    Add ${(10 - cartData.summary.subtotal).toFixed(2)} more to meet $10 minimum
                  </Text>
                </div>
              )}
            </Card>

            {/* Promo Code Section */}
            <Card className="promo-card">
              <Title level={5}>
                <GiftOutlined /> Have a promo code?
              </Title>

              {cartData.promo_code ? (
                <div className="applied-promo">
                  <div className="promo-info">
                    <Tag color="green" icon={<GiftOutlined />}>
                      {cartData.promo_code}
                    </Tag>
                    <Text type="secondary">
                      {cartData.promo_type === 'percentage'
                        ? 'Percentage discount applied'
                        : cartData.promo_type === 'free_delivery'
                        ? 'Free delivery applied'
                        : 'Discount applied'}
                    </Text>
                  </div>
                  <Button
                    type="text"
                    danger
                    icon={<CloseCircleOutlined />}
                    onClick={removePromoCode}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="promo-input">
                  <Input
                    placeholder="Enter code"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    onPressEnter={applyPromoCode}
                    disabled={applyingPromo}
                  />
                  <Button
                    type="primary"
                    onClick={applyPromoCode}
                    loading={applyingPromo}
                  >
                    Apply
                  </Button>
                </div>
              )}

              {!isAuthenticated && (
                <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
                  Log in to apply promo codes
                </Text>
              )}
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

        .summary-line.discount {
          background: #f0fdf4;
          margin: 8px -24px;
          padding: 12px 24px;
        }

        .platform-fee-label {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .discount-label {
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

        .applied-promo {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: #f0fdf4;
          border-radius: 8px;
          border: 1px solid #10B981;
        }

        .promo-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
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
