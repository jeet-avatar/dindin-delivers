#!/usr/bin/env node

/**
 * Populate Sample Data - Simple Version (No Admin Key Required)
 * Uses Firebase CLI authentication
 * 
 * SETUP:
 * 1. npm install -g firebase-tools
 * 2. firebase login
 * 3. node populate-sample-data-simple.js
 */

// This is a simpler version that generates the Firestore data as JavaScript objects
// You can copy-paste these into Firebase Console manually

const now = Date.now();
const hoursAgo = (hours) => now - (hours * 60 * 60 * 1000);

console.log('\n🚀 EatFair Sample Data Generator\n');
console.log('Copy and paste these commands into Firebase Console → Firestore → Query tab\n');
console.log('=' .repeat(80));

// 1. Restaurants
console.log('\n📍 RESTAURANTS (3)\n');
const restaurants = [
  {
    id: 'rest_golden_dragon',
    name: 'Golden Dragon',
    address: '456 Grant Ave, San Francisco, CA 94108',
    latitude: 37.7946,
    longitude: -122.4078,
    cuisine: 'Chinese',
    rating: 4.5,
    deliveryTime: '25-35',
    minimumOrder: 15.00,
    isOpen: true
  },
  {
    id: 'rest_la_taqueria',
    name: 'La Taqueria',
    address: '2889 Mission St, San Francisco, CA 94110',
    latitude: 37.7516,
    longitude: -122.4186,
    cuisine: 'Mexican',
    rating: 4.7,
    deliveryTime: '20-30',
    minimumOrder: 12.00,
    isOpen: true
  },
  {
    id: 'rest_prime_rib',
    name: 'House of Prime Rib',
    address: '1906 Van Ness Ave, San Francisco, CA 94109',
    latitude: 37.7938,
    longitude: -122.4217,
    cuisine: 'Steakhouse',
    rating: 4.8,
    deliveryTime: '35-45',
    minimumOrder: 25.00,
    isOpen: true
  }
];

restaurants.forEach((r, i) => {
  console.log(`// Restaurant ${i + 1}`);
  console.log(`db.collection('restaurants').doc('${r.id}').set(${JSON.stringify(r, null, 2)});\n`);
});

// 2. Orders
console.log('\n📦 AVAILABLE ORDERS (3)\n');
const orders = [
  {
    orderId: 'ORD' + Math.floor(Math.random() * 100000),
    customerId: 'cust_sarah',
    customerName: 'Sarah Johnson',
    customerPhone: '+1 415-555-0123',
    customerEmail: 'sarah.j@email.com',
    deliveryAddress: {
      fullAddress: '123 Market Street, San Francisco, CA 94102',
      street: '123 Market Street',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94102',
      latitude: 37.7749,
      longitude: -122.4194
    },
    deliveryInstructions: 'Ring doorbell twice. Leave at door.',
    restaurant: {
      id: 'rest_golden_dragon',
      name: 'Golden Dragon',
      address: '456 Grant Ave, San Francisco, CA 94108',
      latitude: 37.7946,
      longitude: -122.4078
    },
    items: [
      { id: 'i1', menuItemId: 'item1', name: 'Kung Pao Chicken', price: 14.99, quantity: 2, options: [] },
      { id: 'i2', menuItemId: 'item2', name: 'Fried Rice', price: 8.99, quantity: 1, options: [] },
      { id: 'i3', menuItemId: 'item3', name: 'Spring Rolls (6pc)', price: 6.99, quantity: 1, options: [] }
    ],
    itemsCount: 4,
    subtotal: 45.96,
    deliveryFee: 8.50,
    serviceFee: 2.30,
    priorityFee: 3.00,
    smallOrderFee: 0,
    tax: 4.14,
    total: 63.90,
    paymentMethod: 'card',
    status: 'Ready',
    placedAt: hoursAgo(0.5)
  },
  {
    orderId: 'ORD' + Math.floor(Math.random() * 100000),
    customerId: 'cust_michael',
    customerName: 'Michael Chen',
    customerPhone: '+1 415-555-0456',
    deliveryAddress: {
      fullAddress: '789 Valencia St, San Francisco, CA 94110',
      street: '789 Valencia St',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94110',
      latitude: 37.7599,
      longitude: -122.4209
    },
    restaurant: {
      id: 'rest_la_taqueria',
      name: 'La Taqueria',
      address: '2889 Mission St, San Francisco, CA 94110',
      latitude: 37.7516,
      longitude: -122.4186
    },
    items: [
      { id: 'i4', menuItemId: 'item4', name: 'Carne Asada Burrito', price: 12.99, quantity: 1, options: [] },
      { id: 'i5', menuItemId: 'item5', name: 'Chips & Guacamole', price: 7.99, quantity: 1, options: [] }
    ],
    itemsCount: 2,
    subtotal: 20.98,
    deliveryFee: 5.99,
    serviceFee: 1.50,
    tax: 2.52,
    total: 32.99,
    status: 'Ready',
    placedAt: hoursAgo(1)
  },
  {
    orderId: 'ORD' + Math.floor(Math.random() * 100000),
    customerId: 'cust_emily',
    customerName: 'Emily Rodriguez',
    deliveryAddress: {
      fullAddress: '2500 Powell St, San Francisco, CA 94133',
      street: '2500 Powell St',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94133',
      latitude: 37.8024,
      longitude: -122.4098
    },
    restaurant: {
      id: 'rest_prime_rib',
      name: 'House of Prime Rib',
      address: '1906 Van Ness Ave, San Francisco, CA 94109',
      latitude: 37.7938,
      longitude: -122.4217
    },
    items: [
      { id: 'i6', menuItemId: 'item6', name: 'Prime Rib Dinner', price: 52.00, quantity: 2, options: [] },
      { id: 'i7', menuItemId: 'item7', name: 'Caesar Salad', price: 12.00, quantity: 2, options: [] }
    ],
    itemsCount: 4,
    subtotal: 128.00,
    deliveryFee: 12.50,
    serviceFee: 6.40,
    priorityFee: 5.00,
    tax: 13.67,
    total: 165.57,
    status: 'Ready',
    placedAt: hoursAgo(0.25)
  }
];

orders.forEach((order, i) => {
  console.log(`// Order ${i + 1}`);
  console.log(`db.collection('orders').add(${JSON.stringify(order, null, 2)});\n`);
});

// 3. Promotions
console.log('\n🎁 PROMOTIONS (3)\n');
const promotions = [
  {
    restaurantId: 'rest_golden_dragon',
    code: 'SAVE20',
    title: '20% Off Your Order',
    description: 'Get 20% off orders over $25',
    discountType: 'percentage',
    discountValue: 20.0,
    maxDiscount: 10.0,
    minimumOrder: 25.0,
    applicableOn: 'subtotal',
    maxUsagePerUser: 3,
    totalUsageLimit: 100,
    startDate: now,
    endDate: now + (30 * 24 * 60 * 60 * 1000),
    isActive: true,
    usageCount: 15
  },
  {
    restaurantId: 'rest_la_taqueria',
    code: 'FREESHIP',
    title: 'Free Delivery',
    description: 'Free delivery on orders over $20',
    discountType: 'fixed',
    discountValue: 5.99,
    minimumOrder: 20.0,
    applicableOn: 'delivery',
    maxUsagePerUser: 1,
    totalUsageLimit: 50,
    startDate: now,
    endDate: now + (7 * 24 * 60 * 60 * 1000),
    isActive: true,
    usageCount: 8
  },
  {
    restaurantId: 'rest_prime_rib',
    code: 'LUXURY15',
    title: '$15 Off Premium Orders',
    description: 'Save $15 on orders over $100',
    discountType: 'fixed',
    discountValue: 15.0,
    minimumOrder: 100.0,
    applicableOn: 'subtotal',
    maxUsagePerUser: 2,
    startDate: now,
    endDate: now + (60 * 24 * 60 * 60 * 1000),
    isActive: true,
    usageCount: 23
  }
];

promotions.forEach((promo, i) => {
  console.log(`// Promotion ${i + 1}`);
  console.log(`db.collection('promotions').add(${JSON.stringify(promo, null, 2)});\n`);
});

console.log('\n' + '='.repeat(80));
console.log('\n📋 INSTRUCTIONS:');
console.log('1. Go to Firebase Console: https://console.firebase.google.com/project/eatfair-app/firestore');
console.log('2. Copy each db.collection() command above');
console.log('3. Paste into the Query tab and press Enter');
console.log('4. Refresh your iOS apps to see the data!\n');
