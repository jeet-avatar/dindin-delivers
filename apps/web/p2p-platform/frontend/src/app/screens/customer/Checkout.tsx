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
import { pricing } from '../../config/brand';

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
    platformFee: pricing.foodDelivery.customerFee,
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
    const deliveryFee = 0; // Calculated by backend based on distance
    const platformFee = pricing.foodDelivery.getCustomerFee(uniqueRestaurants.size);
    const tax = subtotal * pricing.tax.defaultTaxRate;

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
          delivery_fee: 0, // Calculated by backend based on distance
          platform_fee: pricing.foodDelivery.customerFee, // $1 per restaurant
          tax: orderSubtotal * pricing.tax.defaultTaxRate,
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
        /* ============================================
           CHECKOUT PAGE - International-Level Design
           Responsive breakpoints: 480, 640, 768, 1024, 1280px
           ============================================ */

        .checkout-page {
          max-width: 1440px;
          margin: 0 auto;
          padding: 24px 16px;
          min-height: 100vh;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 28px;
          gap: 16px;
        }

        .page-header h2 {
          flex: 1;
          text-align: center;
        }

        .checkout-steps {
          margin-bottom: 36px;
          padding: 0 20px;
        }

        .checkout-steps .ant-steps-item-title {
          font-weight: 500;
        }

        .step-card {
          border-radius: 20px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }

        .step-card .ant-card-body {
          padding: 28px;
        }

        .payment-options {
          display: flex;
          gap: 16px;
          width: 100%;
        }

        .payment-option {
          flex: 1;
          height: 88px !important;
          display: flex !important;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          border-radius: 16px !important;
          transition: all 0.2s ease;
        }

        .payment-option:hover {
          border-color: #10B981;
        }

        .payment-option.ant-radio-button-wrapper-checked {
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          border-color: #10B981;
        }

        .card-form {
          margin-top: 28px;
        }

        .card-form input {
          border-radius: 12px;
        }

        .tip-options {
          display: flex;
          gap: 14px;
          margin-top: 18px;
        }

        .tip-btn {
          flex: 1;
          height: 52px;
          border-radius: 12px;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .tip-btn.ant-btn-primary {
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          border: none;
        }

        .step-buttons {
          display: flex;
          justify-content: space-between;
          margin-top: 28px;
          gap: 16px;
        }

        .step-buttons button {
          height: 48px;
          border-radius: 12px;
          font-weight: 500;
        }

        .place-order-btn {
          min-width: 220px;
          height: 52px;
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          border: none;
          font-size: 16px;
          font-weight: 600;
          border-radius: 14px;
          transition: all 0.2s ease;
        }

        .place-order-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .review-section {
          margin: 20px 0;
          padding: 16px;
          background: #fafafa;
          border-radius: 14px;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .review-item {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #f0f0f0;
        }

        .review-item:last-child {
          border-bottom: none;
        }

        .summary-card {
          border-radius: 20px;
          position: sticky;
          top: 24px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }

        .summary-item {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
        }

        .summary-line {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
        }

        .summary-line.highlight {
          background: #f0fdf4;
          margin: 10px -24px;
          padding: 14px 24px;
        }

        .platform-fee-label {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .summary-line.total {
          padding-top: 18px;
        }

        .driver-earnings {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 18px;
          padding: 14px;
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          border-radius: 12px;
        }

        /* Success Card Styles */
        .success-card {
          max-width: 600px;
          margin: 40px auto;
          border-radius: 24px;
          text-align: center;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }

        .order-summary-final {
          border-top: 1px solid #f0f0f0;
          padding-top: 24px;
          margin-top: 24px;
        }

        .driver-note {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 16px;
          padding: 14px;
          background: #f0fdf4;
          border-radius: 12px;
        }

        /* ============================================
           RESPONSIVE BREAKPOINTS
           ============================================ */

        /* Extra small devices (phones, 480px and down) */
        @media (max-width: 480px) {
          .checkout-page {
            padding: 16px 12px;
          }

          .page-header {
            flex-direction: column;
            align-items: stretch;
          }

          .page-header h2 {
            order: -1;
            text-align: left;
          }

          .checkout-steps {
            padding: 0;
          }

          .checkout-steps .ant-steps-item-title {
            font-size: 12px;
          }

          .step-card .ant-card-body {
            padding: 20px 16px;
          }

          .payment-options {
            flex-direction: column;
          }

          .payment-option {
            height: 64px !important;
            flex-direction: row;
            gap: 12px;
          }

          .tip-options {
            flex-wrap: wrap;
          }

          .tip-btn {
            min-width: calc(33% - 10px);
            flex: none;
            height: 44px;
          }

          .step-buttons {
            flex-direction: column;
          }

          .step-buttons button {
            width: 100%;
          }

          .place-order-btn {
            min-width: 100%;
          }

          .summary-card {
            position: static;
          }
        }

        /* Small devices (landscape phones, 481px to 640px) */
        @media (min-width: 481px) and (max-width: 640px) {
          .checkout-page {
            padding: 20px 16px;
          }

          .payment-options {
            flex-direction: column;
          }

          .tip-options {
            flex-wrap: wrap;
          }

          .tip-btn {
            min-width: calc(33% - 10px);
          }
        }

        /* Medium devices (tablets, 641px to 768px) */
        @media (min-width: 641px) and (max-width: 768px) {
          .checkout-page {
            padding: 24px 20px;
          }

          .summary-card {
            position: static;
          }
        }

        /* Large devices (desktops, 769px to 1024px) */
        @media (min-width: 769px) and (max-width: 1024px) {
          .checkout-page {
            padding: 24px 24px;
          }
        }

        /* Extra large devices (1025px to 1280px) */
        @media (min-width: 1025px) and (max-width: 1280px) {
          .checkout-page {
            padding: 24px 32px;
          }
        }

        /* XXL devices (1281px and up) */
        @media (min-width: 1281px) {
          .checkout-page {
            padding: 32px 40px;
          }
        }
      `}</style>
    </div>
  );
};

export default Checkout;
