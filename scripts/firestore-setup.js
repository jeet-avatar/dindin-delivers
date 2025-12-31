// Firestore Setup Script
// Run this in Firebase Console → Firestore Database → Query

// 1. Create ratings collection
db.collection('ratings').doc('test_rating_001').set({
  id: 'test_rating_001',
  orderId: 'test_order_001',
  customerId: 'customer_test_001',
  customerName: 'Test Customer',
  driverId: 'driver_test_001',
  driverName: 'Test Driver',
  restaurantId: 'restaurant_test_001',
  rating: 5,
  comment: 'Great service!',
  onTime: true,
  friendly: true,
  followedInstructions: true,
  foodQuality: true,
  createdAt: Date.now()
});

// 2. Create driver_sessions collection
db.collection('driver_sessions').doc('test_session_001').set({
  id: 'test_session_001',
  driverId: 'driver_test_001',
  startTime: Date.now() - 14400000, // 4 hours ago
  endTime: Date.now(),
  duration: 4.0,
  startLocation: {
    latitude: 37.7749,
    longitude: -122.4194
  },
  endLocation: {
    latitude: 37.7849,
    longitude: -122.4094
  },
  deliveriesCompleted: 8,
  deliveriesCancelled: 0,
  totalDistance: 25.5,
  totalEarnings: 125.50,
  deviceInfo: 'iPhone - iOS 17.0',
  appVersion: '1.0'
});

// 3. Create promotions collection
db.collection('promotions').doc('promo_save20').set({
  id: 'promo_save20',
  restaurantId: 'restaurant_test_001',
  code: 'SAVE20',
  title: '20% Off Your Order',
  description: 'Get 20% off orders over $25',
  discountType: 'percentage',
  discountValue: 20.0,
  maxDiscount: 10.0,
  minimumOrder: 25.0,
  applicableOn: 'subtotal',
  maxUsagePerUser: 3,
  totalUsageLimit: null,
  startDate: Date.now(),
  endDate: Date.now() + 2592000000, // 30 days
  isActive: true,
  usageCount: 0,
  createdAt: Date.now()
});

// 4. Create tips collection
db.collection('tips').doc('test_tip_001').set({
  id: 'test_tip_001',
  orderId: 'test_order_001',
  customerId: 'customer_test_001',
  driverId: 'driver_test_001',
  amount: 5.50,
  tipType: 'percentage',
  percentage: 15.0,
  driverThankYouMessage: null,
  driverThankedAt: null,
  createdAt: Date.now()
});

// 5. Create promotion_usage collection
db.collection('promotion_usage').doc('test_usage_001').set({
  id: 'test_usage_001',
  promotionId: 'promo_save20',
  customerId: 'customer_test_001',
  orderId: 'test_order_001',
  discountAmount: 5.00,
  usedAt: Date.now()
});

console.log('✅ All collections created successfully!');
