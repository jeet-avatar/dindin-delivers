#!/usr/bin/env node
// Firebase Firestore Setup Script
// Simpler approach - just outputs the data you need to manually add

console.log('🚀 EatFair Firestore Setup Data\n');
console.log('Copy and paste these into Firebase Console:\n');
console.log('=' .repeat(60));

console.log('\n📝 Collection: ratings');
console.log('Document ID: test_rating_001');
console.log(JSON.stringify({
  id: 'test_rating_001',
  orderId: 'test_order_001',
  customerId: 'customer_test_001',
  driverId: 'driver_test_001',
  rating: 5,
  comment: 'Great service!',
  onTime: true,
  friendly: true,
  followedInstructions: true,
  foodQuality: true,
  createdAt: new Date().toISOString()
}, null, 2));

console.log('\n' + '='.repeat(60));
console.log('\n📝 Collection: driver_sessions');
console.log('Document ID: test_session_001');
const now = new Date();
const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
console.log(JSON.stringify({
  id: 'test_session_001',
  driverId: 'driver_test_001',
  startTime: fourHoursAgo.toISOString(),
  endTime: now.toISOString(),
  duration: 4.0,
  deliveriesCompleted: 8,
  totalDistance: 25.5,
  totalEarnings: 125.50
}, null, 2));

console.log('\n' + '='.repeat(60));
console.log('\n📝 Collection: promotions');
console.log('Document ID: promo_save20');
const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
console.log(JSON.stringify({
  id: 'promo_save20',
  restaurantId: 'YOUR_RESTAURANT_ID_HERE',
  code: 'SAVE20',
  title: '20% Off Your Order',
  description: 'Get 20% off on orders over $25',
  discountType: 'percentage',
  discountValue: 20.0,
  maxDiscount: 10.0,
  minimumOrder: 25.0,
  isActive: true,
  startDate: now.toISOString(),
  endDate: thirtyDays.toISOString(),
  usageCount: 0,
  maxUsagePerCustomer: 1
}, null, 2));

console.log('\n' + '='.repeat(60));
console.log('\n📝 Collection: tips');
console.log('Document ID: test_tip_001');
console.log(JSON.stringify({
  id: 'test_tip_001',
  orderId: 'test_order_001',
  customerId: 'customer_test_001',
  driverId: 'driver_test_001',
  amount: 5.50,
  tipType: 'percentage',
  percentage: 15.0,
  driverThankYouMessage: null,
  createdAt: now.toISOString()
}, null, 2));

console.log('\n' + '='.repeat(60));
console.log('\n📝 Collection: promotion_usage');
console.log('Document ID: test_usage_001');
console.log(JSON.stringify({
  id: 'test_usage_001',
  promotionId: 'promo_save20',
  customerId: 'customer_test_001',
  orderId: 'test_order_001',
  discountAmount: 5.00,
  usedAt: now.toISOString()
}, null, 2));

console.log('\n' + '='.repeat(60));
console.log('\n✅ Copy each JSON above and paste into Firebase Console');
console.log('📍 Go to: https://console.firebase.google.com');
console.log('   → Your Project → Firestore Database → Start collection\n');
