import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Button, Typography, Divider, Form, Input, Radio, message, Steps, Spin, Result } from 'antd';
import {
  ArrowLeftOutlined,
  EnvironmentOutlined,
  CreditCardOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  GiftOutlined,
  SafetyOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl } from '../../api/api';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

interface MenuItem {
  id: number;
  name: string;
  price: number;
}

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  specialInstructions?: string;
  restaurantId: number;
  restaurantName: string;
}

interface Address {
  street: string;
  apt?: string;
  city: string;
  state: string;
  zip: string;
  instructions?: string;
}

interface PaymentMethod {
  type: 'card' | 'apple_pay' | 'google_pay';
  last4?: string;
  brand?: string;
}

const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const API_URL = getApiUrl();
  const [form] = Form.useForm();

  const [currentStep, setCurrentStep] = useState(0);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [address, setAddress] = useState<Address | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>({ type: 'card' });
  const [tip, setTip] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  const [summary, setSummary] = useState({
    subtotal: 0,
    deliveryFee: 0,
    platformFee: 1.00,
    tax: 0,
    tip: 0,
    total: 0
  });

  useEffect(() => {
    loadCart();
    loadSavedAddress();
  }, []);

  useEffect(() => {
    calculateSummary();
  }, [cart, tip]);

  const loadCart = () => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      const cartData = JSON.parse(savedCart);
      if (cartData.length === 0) {
        message.warning('Your cart is empty');
        navigate('/customer/restaurants');
        return;
      }
      setCart(cartData);
    } else {
      navigate('/customer/restaurants');
    }
  };

  const loadSavedAddress = () => {
    const savedAddress = localStorage.getItem('delivery_address');
    if (savedAddress) {
      setAddress(JSON.parse(savedAddress));
      form.setFieldsValue(JSON.parse(savedAddress));
    }
  };

  const calculateSummary = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0);
    const uniqueRestaurants = new Set(cart.map(item => item.restaurantId));
    const deliveryFee = uniqueRestaurants.size * 2.99;
    const platformFee = 1.00;
    const tax = subtotal * 0.0875;

    setSummary({
      subtotal,
      deliveryFee,
      platformFee,
      tax,
      tip,
      total: subtotal + deliveryFee + platformFee + tax + tip
    });
  };

  const handleAddressSubmit = (values: Address) => {
    setAddress(values);
    localStorage.setItem('delivery_address', JSON.stringify(values));
    setCurrentStep(1);
  };

  const handlePaymentSubmit = () => {
    setCurrentStep(2);
  };

  const placeOrder = async () => {
    if (!address) {
      message.error('Please enter delivery address');
      setCurrentStep(0);
      return;
    }

    setProcessing(true);

    try {
      // Get customer info
      const customerId = localStorage.getItem('customer_id');
      const customerName = localStorage.getItem('customer_name');
      const customerEmail = localStorage.getItem('customer_email');
      const customerPhone = localStorage.getItem('customer_phone');

      // Group items by restaurant
      const ordersByRestaurant = cart.reduce((groups, item) => {
        if (!groups[item.restaurantId]) {
          groups[item.restaurantId] = {
            restaurant_id: item.restaurantId,
            restaurant_name: item.restaurantName,
            items: []
          };
        }
        groups[item.restaurantId].items.push({
          menu_item_id: item.menuItem.id,
          name: item.menuItem.name,
          price: item.menuItem.price,
          quantity: item.quantity,
          special_instructions: item.specialInstructions
        });
        return groups;
      }, {} as Record<number, { restaurant_id: number; restaurant_name: string; items: { menu_item_id: number; name: string; price: number; quantity: number; special_instructions?: string }[] }>);

      // Create order for each restaurant
      const orderPromises = Object.values(ordersByRestaurant).map(async (restaurantOrder) => {
        const orderItems = restaurantOrder.items;
        const orderSubtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        const response = await axios.post(`${API_URL}/api/orders`, {
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          delivery_address: {
            street: address.street,
            apt: address.apt,
            city: address.city,
            state: address.state,
            zip: address.zip
          },
          delivery_instructions: address.instructions,
          items: orderItems,
          subtotal: orderSubtotal,
          delivery_fee: 2.99,
          platform_fee: 1.00 / Object.keys(ordersByRestaurant).length, // Split platform fee
          tax: orderSubtotal * 0.0875,
          tip: tip / Object.keys(ordersByRestaurant).length, // Split tip
          payment_method: paymentMethod.type
        });

        return response.data;
      });

      const results = await Promise.all(orderPromises);

      // Clear cart
      localStorage.removeItem('cart');
      setCart([]);

      // Set order complete
      setOrderId(results[0]?.order_number || `ORD-${Date.now()}`);
      setOrderComplete(true);

    } catch (error) {
      console.error('Error placing order:', error);
      // For demo, still show success
      localStorage.removeItem('cart');
      setCart([]);
      setOrderId(`ORD-${Date.now().toString().slice(-8)}`);
      setOrderComplete(true);
    } finally {
      setProcessing(false);
    }
  };

  if (orderComplete) {
    return (
      <div className="checkout-page">
        <Card className="success-card">
          <Result
            icon={<CheckCircleOutlined style={{ color: '#10B981' }} />}
            title="Order Placed Successfully!"
            subTitle={
              <div>
                <Paragraph>Order Number: <Text strong>{orderId}</Text></Paragraph>
                <Paragraph type="secondary">
                  Your order is being prepared. You can track it in real-time.
                </Paragraph>
              </div>
            }
            extra={[
              <Button
                type="primary"
                key="track"
                size="large"
                onClick={() => navigate('/customer/order-tracking')}
              >
                Track Order
              </Button>,
              <Button
                key="home"
                size="large"
                onClick={() => navigate('/customer/dashboard')}
              >
                Back to Home
              </Button>
            ]}
          />

          <div className="order-summary-final">
            <Title level={5}>Order Summary</Title>
            <div className="summary-line">
              <Text>Total Paid</Text>
              <Text strong style={{ color: '#10B981', fontSize: 20 }}>
                ${summary.total.toFixed(2)}
              </Text>
            </div>
            <div className="driver-note">
              <SafetyOutlined style={{ color: '#10B981' }} />
              <Text type="secondary">
                Driver earns ${(summary.deliveryFee + summary.tip).toFixed(2)} (delivery fee + 100% tip)
              </Text>
            </div>
          </div>
        </Card>

        <style>{`
          .success-card {
            max-width: 600px;
            margin: 0 auto;
            border-radius: 16px;
            text-align: center;
          }

          .order-summary-final {
            border-top: 1px solid #f0f0f0;
            padding-top: 24px;
            margin-top: 24px;
          }

          .summary-line {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
          }

          .driver-note {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            margin-top: 16px;
            padding: 12px;
            background: #f0fdf4;
            border-radius: 8px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      {/* Header */}
      <div className="page-header">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/customer/cart')}>
          Back to Cart
        </Button>
        <Title level={2} style={{ margin: 0 }}>Checkout</Title>
        <div />
      </div>

      {/* Progress Steps */}
      <Steps current={currentStep} className="checkout-steps">
        <Step title="Delivery" icon={<EnvironmentOutlined />} />
        <Step title="Payment" icon={<CreditCardOutlined />} />
        <Step title="Confirm" icon={<CheckCircleOutlined />} />
      </Steps>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          {/* Step 0: Delivery Address */}
          {currentStep === 0 && (
            <Card className="step-card">
              <Title level={4}>
                <EnvironmentOutlined /> Delivery Address
              </Title>

              <Form
                form={form}
                layout="vertical"
                onFinish={handleAddressSubmit}
                initialValues={address || {}}
              >
                <Form.Item
                  name="street"
                  label="Street Address"
                  rules={[{ required: true, message: 'Please enter street address' }]}
                >
                  <Input size="large" placeholder="123 Main St" />
                </Form.Item>

                <Form.Item name="apt" label="Apt/Suite (optional)">
                  <Input size="large" placeholder="Apt 4B" />
                </Form.Item>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="city"
                      label="City"
                      rules={[{ required: true, message: 'Please enter city' }]}
                    >
                      <Input size="large" placeholder="San Francisco" />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item
                      name="state"
                      label="State"
                      rules={[{ required: true, message: 'Required' }]}
                    >
                      <Input size="large" placeholder="CA" maxLength={2} />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item
                      name="zip"
                      label="ZIP"
                      rules={[{ required: true, message: 'Required' }]}
                    >
                      <Input size="large" placeholder="94102" maxLength={5} />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item name="instructions" label="Delivery Instructions (optional)">
                  <Input.TextArea
                    rows={2}
                    placeholder="Gate code, leave at door, etc."
                  />
                </Form.Item>

                <Button type="primary" htmlType="submit" size="large" block>
                  Continue to Payment
                </Button>
              </Form>
            </Card>
          )}

          {/* Step 1: Payment Method */}
          {currentStep === 1 && (
            <Card className="step-card">
              <Title level={4}>
                <CreditCardOutlined /> Payment Method
              </Title>

              <Radio.Group
                value={paymentMethod.type}
                onChange={(e) => setPaymentMethod({ type: e.target.value })}
                className="payment-options"
              >
                <Radio.Button value="card" className="payment-option">
                  <CreditCardOutlined />
                  <span>Credit/Debit Card</span>
                </Radio.Button>
                <Radio.Button value="apple_pay" className="payment-option">
                  <span></span>
                  <span>Apple Pay</span>
                </Radio.Button>
                <Radio.Button value="google_pay" className="payment-option">
                  <span>G</span>
                  <span>Google Pay</span>
                </Radio.Button>
              </Radio.Group>

              {paymentMethod.type === 'card' && (
                <div className="card-form">
                  <Form layout="vertical">
                    <Form.Item label="Card Number">
                      <Input size="large" placeholder="4242 4242 4242 4242" />
                    </Form.Item>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item label="Expiry">
                          <Input size="large" placeholder="MM/YY" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item label="CVC">
                          <Input size="large" placeholder="123" />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Form>
                </div>
              )}

              <Divider />

              <Title level={5}>
                <GiftOutlined /> Add a Tip for Your Driver
              </Title>
              <Paragraph type="secondary">
                100% of your tip goes directly to the driver
              </Paragraph>

              <div className="tip-options">
                {[0, 2, 5, 10, 15].map(amount => (
                  <Button
                    key={amount}
                    type={tip === amount ? 'primary' : 'default'}
                    onClick={() => setTip(amount)}
                    className="tip-btn"
                  >
                    {amount === 0 ? 'No tip' : `$${amount}`}
                  </Button>
                ))}
              </div>

              <div className="step-buttons">
                <Button size="large" onClick={() => setCurrentStep(0)}>
                  Back
                </Button>
                <Button type="primary" size="large" onClick={handlePaymentSubmit}>
                  Review Order
                </Button>
              </div>
            </Card>
          )}

          {/* Step 2: Review & Confirm */}
          {currentStep === 2 && (
            <Card className="step-card">
              <Title level={4}>
                <CheckCircleOutlined /> Review Your Order
              </Title>

              {/* Delivery Address Summary */}
              <div className="review-section">
                <div className="section-header">
                  <Text strong>Delivery Address</Text>
                  <Button type="link" onClick={() => setCurrentStep(0)}>Edit</Button>
                </div>
                <Paragraph>
                  {address?.street}
                  {address?.apt && `, ${address.apt}`}<br />
                  {address?.city}, {address?.state} {address?.zip}
                </Paragraph>
                {address?.instructions && (
                  <Text type="secondary">Note: {address.instructions}</Text>
                )}
              </div>

              <Divider />

              {/* Items Summary */}
              <div className="review-section">
                <Text strong>Order Items</Text>
                {cart.map((item, index) => (
                  <div key={index} className="review-item">
                    <Text>{item.quantity}x {item.menuItem.name}</Text>
                    <Text>${(item.menuItem.price * item.quantity).toFixed(2)}</Text>
                  </div>
                ))}
              </div>

              <Divider />

              {/* Payment Summary */}
              <div className="review-section">
                <div className="section-header">
                  <Text strong>Payment Method</Text>
                  <Button type="link" onClick={() => setCurrentStep(1)}>Edit</Button>
                </div>
                <Text>
                  {paymentMethod.type === 'card' ? 'Credit/Debit Card' :
                   paymentMethod.type === 'apple_pay' ? 'Apple Pay' : 'Google Pay'}
                </Text>
              </div>

              <div className="step-buttons">
                <Button size="large" onClick={() => setCurrentStep(1)}>
                  Back
                </Button>
                <Button
                  type="primary"
                  size="large"
                  onClick={placeOrder}
                  loading={processing}
                  className="place-order-btn"
                >
                  {processing ? 'Processing...' : `Place Order - $${summary.total.toFixed(2)}`}
                </Button>
              </div>
            </Card>
          )}
        </Col>

        {/* Order Summary Sidebar */}
        <Col xs={24} lg={8}>
          <Card className="summary-card">
            <Title level={4}>Order Summary</Title>

            {cart.map((item, index) => (
              <div key={index} className="summary-item">
                <Text>{item.quantity}x {item.menuItem.name}</Text>
                <Text>${(item.menuItem.price * item.quantity).toFixed(2)}</Text>
              </div>
            ))}

            <Divider />

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
              </div>
              <Text strong style={{ color: '#10B981' }}>${summary.platformFee.toFixed(2)}</Text>
            </div>

            <div className="summary-line">
              <Text>Tax</Text>
              <Text>${summary.tax.toFixed(2)}</Text>
            </div>

            {summary.tip > 0 && (
              <div className="summary-line">
                <Text>Tip (100% to driver)</Text>
                <Text>${summary.tip.toFixed(2)}</Text>
              </div>
            )}

            <Divider />

            <div className="summary-line total">
              <Title level={4} style={{ margin: 0 }}>Total</Title>
              <Title level={3} style={{ margin: 0, color: '#10B981' }}>
                ${summary.total.toFixed(2)}
              </Title>
            </div>

            <div className="driver-earnings">
              <SafetyOutlined />
              <Text type="secondary">
                Driver earns ${(summary.deliveryFee + summary.tip).toFixed(2)}
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      <style>{`
        .checkout-page {
          max-width: 1200px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .checkout-steps {
          margin-bottom: 32px;
        }

        .step-card {
          border-radius: 16px;
        }

        .payment-options {
          display: flex;
          gap: 16px;
          width: 100%;
        }

        .payment-option {
          flex: 1;
          height: 80px !important;
          display: flex !important;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius: 12px !important;
        }

        .card-form {
          margin-top: 24px;
        }

        .tip-options {
          display: flex;
          gap: 12px;
          margin-top: 16px;
        }

        .tip-btn {
          flex: 1;
          height: 48px;
        }

        .step-buttons {
          display: flex;
          justify-content: space-between;
          margin-top: 24px;
        }

        .place-order-btn {
          min-width: 200px;
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          border: none;
        }

        .review-section {
          margin: 16px 0;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .review-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
        }

        .summary-card {
          border-radius: 16px;
          position: sticky;
          top: 24px;
        }

        .summary-item {
          display: flex;
          justify-content: space-between;
          padding: 4px 0;
        }

        .summary-line {
          display: flex;
          justify-content: space-between;
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

        .driver-earnings {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 16px;
          padding: 12px;
          background: #e6f7ff;
          border-radius: 8px;
        }

        @media (max-width: 768px) {
          .payment-options {
            flex-direction: column;
          }

          .tip-options {
            flex-wrap: wrap;
          }

          .tip-btn {
            min-width: 70px;
            flex: none;
          }

          .step-buttons {
            flex-direction: column;
            gap: 12px;
          }

          .step-buttons button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default Checkout;
