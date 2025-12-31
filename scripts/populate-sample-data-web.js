#!/usr/bin/env node

/**
 * Populate Sample Data - Using Firebase Web SDK (No Admin Key Required!)
 * This uses the same credentials as your iOS app
 * 
 * SETUP:
 * npm install firebase
 * node populate-sample-data-web.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, addDoc } = require('firebase/firestore');

// Firebase config from your iOS app's GoogleService-Info.plist
const firebaseConfig = {
  apiKey: "AIzaSyDuoM1JHPbHWCg-p8mLHjT3K2-TAR66boM",
  authDomain: "eatfair-app.firebaseapp.com",
  projectId: "eatfair-app",
  storageBucket: "eatfair-app.firebasestorage.app",
  messagingSenderId: "107524350806",
  appId: "1:107524350806:ios:9ee5ae197a17690b83ecf7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Helper functions
const now = Date.now();
const hoursAgo = (hours) => now - (hours * 60 * 60 * 1000);
const daysAgo = (days) => now - (days * 24 * 60 * 60 * 1000);

async function populateData() {
  console.log('🚀 Starting data population...\n');

  try {
    // 1. Create Restaurants
    console.log('📍 Creating restaurants...');
    const restaurants = [
      {
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

    const restaurantIds = ['rest_golden_dragon', 'rest_la_taqueria', 'rest_prime_rib'];
    for (let i = 0; i < restaurants.length; i++) {
      await setDoc(doc(db, 'restaurants', restaurantIds[i]), restaurants[i]);
      console.log(`  ✅ Created: ${restaurants[i].name}`);
    }

    // 2. Create Available Orders
    console.log('\n📦 Creating available orders...');
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
          longitude: -122.4078,
          imageUrl: ''
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
        placedAt: hoursAgo(0.5),
        driverId: null,
        driverName: null
      },
      {
        orderId: 'ORD' + Math.floor(Math.random() * 100000),
        customerId: 'cust_michael',
        customerName: 'Michael Chen',
        customerPhone: '+1 415-555-0456',
        customerEmail: 'm.chen@email.com',
        deliveryAddress: {
          fullAddress: '789 Valencia St, San Francisco, CA 94110',
          street: '789 Valencia St',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94110',
          latitude: 37.7599,
          longitude: -122.4209
        },
        deliveryInstructions: 'Apartment 3B, use intercom',
        restaurant: {
          id: 'rest_la_taqueria',
          name: 'La Taqueria',
          address: '2889 Mission St, San Francisco, CA 94110',
          latitude: 37.7516,
          longitude: -122.4186,
          imageUrl: ''
        },
        items: [
          { id: 'i4', menuItemId: 'item4', name: 'Carne Asada Burrito', price: 12.99, quantity: 1, options: [] },
          { id: 'i5', menuItemId: 'item5', name: 'Chips & Guacamole', price: 7.99, quantity: 1, options: [] }
        ],
        itemsCount: 2,
        subtotal: 20.98,
        deliveryFee: 5.99,
        serviceFee: 1.50,
        priorityFee: 0,
        smallOrderFee: 2.00,
        tax: 2.52,
        total: 32.99,
        paymentMethod: 'card',
        status: 'Ready',
        placedAt: hoursAgo(1),
        driverId: null,
        driverName: null
      },
      {
        orderId: 'ORD' + Math.floor(Math.random() * 100000),
        customerId: 'cust_emily',
        customerName: 'Emily Rodriguez',
        customerEmail: 'emily.r@email.com',
        deliveryAddress: {
          fullAddress: '2500 Powell St, San Francisco, CA 94133',
          street: '2500 Powell St',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94133',
          latitude: 37.8024,
          longitude: -122.4098
        },
        deliveryInstructions: 'Meet in lobby',
        restaurant: {
          id: 'rest_prime_rib',
          name: 'House of Prime Rib',
          address: '1906 Van Ness Ave, San Francisco, CA 94109',
          latitude: 37.7938,
          longitude: -122.4217,
          imageUrl: ''
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
        smallOrderFee: 0,
        tax: 13.67,
        total: 165.57,
        paymentMethod: 'card',
        status: 'Ready',
        placedAt: hoursAgo(0.25),
        driverId: null,
        driverName: null
      }
    ];

    for (const order of orders) {
      const docRef = await addDoc(collection(db, 'orders'), order);
      console.log(`  ✅ Created order: ${order.orderId} - $${order.total}`);
    }

    // 3. Create Promotions
    console.log('\n🎁 Creating promotions...');
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

    for (const promo of promotions) {
      await addDoc(collection(db, 'promotions'), promo);
      console.log(`  ✅ Created promo: ${promo.code}`);
    }

    // 4. Create Tips
    console.log('\n💰 Creating tips...');
    const tips = [
      {
        orderId: 'order_001',
        customerId: 'cust_sarah',
        driverId: 'driver_active',
        amount: 5.50,
        tipType: 'percentage',
        percentage: 15.0,
        createdAt: hoursAgo(2)
      },
      {
        orderId: 'order_002',
        customerId: 'cust_michael',
        driverId: 'driver_active',
        amount: 8.00,
        tipType: 'fixed',
        createdAt: hoursAgo(3)
      },
      {
        orderId: 'order_003',
        customerId: 'cust_emily',
        driverId: 'driver_active',
        amount: 12.00,
        tipType: 'percentage',
        percentage: 20.0,
        createdAt: hoursAgo(0.5)
      }
    ];

    for (const tip of tips) {
      await addDoc(collection(db, 'tips'), tip);
      console.log(`  ✅ Created tip: $${tip.amount}`);
    }

    console.log('\n✨ Sample data population complete!\n');
    console.log('📱 Your iOS apps should now display:');
    console.log('   - 3 restaurants');
    console.log('   - 3 available orders');
    console.log('   - 3 promotions');
    console.log('   - 3 tips\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nMake sure your Firestore security rules allow writes.');
    console.error('You may need to temporarily set: allow read, write: if true;');
    process.exit(1);
  }
}

populateData();
