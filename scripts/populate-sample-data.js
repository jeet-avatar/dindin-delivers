#!/usr/bin/env node

/**
 * Populate Sample Data for EatFair iOS Apps
 * Creates realistic test data in Firebase Firestore for visualization
 * 
 * SETUP:
 * 1. Download service account key from Firebase Console:
 *    - Go to Project Settings > Service Accounts
 *    - Click "Generate New Private Key"
 *    - Save as firebase-admin-key.json in this folder
 * 
 * 2. Run: node populate-sample-data.js
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Try to find service account key
const keyPath = path.join(__dirname, 'firebase-admin-key.json');

if (!fs.existsSync(keyPath)) {
  console.error('❌ ERROR: firebase-admin-key.json not found!\n');
  console.error('Please download your Firebase Admin SDK key:');
  console.error('1. Go to https://console.firebase.google.com/project/eatfair-app/settings/serviceaccounts/adminsdk');
  console.error('2. Click "Generate New Private Key"');
  console.error('3. Save the file as "firebase-admin-key.json" in this folder:\n   ' + __dirname);
  console.error('\nThen run: node populate-sample-data.js\n');
  process.exit(1);
}

const serviceAccount = require(keyPath);

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'eatfair-app'
});

const db = admin.firestore();

// Helper to generate timestamps
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
        id: 'rest_golden_dragon',
        name: 'Golden Dragon',
        address: '456 Grant Ave, San Francisco, CA 94108',
        latitude: 37.7946,
        longitude: -122.4078,
        imageUrl: 'https://images.unsplash.com/photo-1552566626-52f8b828add9',
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
        imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47',
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
        imageUrl: 'https://images.unsplash.com/photo-1588168333986-5078d3ae3976',
        cuisine: 'Steakhouse',
        rating: 4.8,
        deliveryTime: '35-45',
        minimumOrder: 25.00,
        isOpen: true
      }
    ];

    for (const restaurant of restaurants) {
      await db.collection('restaurants').doc(restaurant.id).set(restaurant);
    }
    console.log(`✅ Created ${restaurants.length} restaurants\n`);

    // 2. Create Menu Items
    console.log('🍽️  Creating menu items...');
    const menuItems = [
      // Golden Dragon menu
      { restaurantId: 'rest_golden_dragon', name: 'Kung Pao Chicken', price: 14.99, category: 'Main', isAvailable: true },
      { restaurantId: 'rest_golden_dragon', name: 'Fried Rice', price: 8.99, category: 'Sides', isAvailable: true },
      { restaurantId: 'rest_golden_dragon', name: 'Spring Rolls (6pc)', price: 6.99, category: 'Appetizers', isAvailable: true },
      { restaurantId: 'rest_golden_dragon', name: 'Hot & Sour Soup', price: 5.99, category: 'Soup', isAvailable: true },
      
      // La Taqueria menu
      { restaurantId: 'rest_la_taqueria', name: 'Carne Asada Burrito', price: 12.99, category: 'Main', isAvailable: true },
      { restaurantId: 'rest_la_taqueria', name: 'Chips & Guacamole', price: 7.99, category: 'Sides', isAvailable: true },
      { restaurantId: 'rest_la_taqueria', name: 'Tacos (3pc)', price: 9.99, category: 'Main', isAvailable: true },
      
      // Prime Rib menu
      { restaurantId: 'rest_prime_rib', name: 'Prime Rib Dinner', price: 52.00, category: 'Main', isAvailable: true },
      { restaurantId: 'rest_prime_rib', name: 'Caesar Salad', price: 12.00, category: 'Salads', isAvailable: true }
    ];

    for (const item of menuItems) {
      const docRef = await db.collection('menu_items').add(item);
      console.log(`  Added: ${item.name} (${docRef.id})`);
    }
    console.log(`✅ Created ${menuItems.length} menu items\n`);

    // 3. Create Available Orders (for drivers)
    console.log('📦 Creating available orders...');
    const availableOrders = [
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

    for (const order of availableOrders) {
      const docRef = await db.collection('orders').add(order);
      console.log(`  Created order: ${order.orderId} - $${order.total}`);
    }
    console.log(`✅ Created ${availableOrders.length} available orders\n`);

    // 4. Create Promotions
    console.log('🎁 Creating promotions...');
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
        maxDiscount: null,
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
        maxDiscount: null,
        minimumOrder: 100.0,
        applicableOn: 'subtotal',
        maxUsagePerUser: 2,
        totalUsageLimit: null,
        startDate: now,
        endDate: now + (60 * 24 * 60 * 60 * 1000),
        isActive: true,
        usageCount: 23
      }
    ];

    for (const promo of promotions) {
      const docRef = await db.collection('promotions').add(promo);
      console.log(`  Created promo: ${promo.code} - ${promo.title}`);
    }
    console.log(`✅ Created ${promotions.length} promotions\n`);

    // 5. Create Driver Sessions
    console.log('🚗 Creating driver sessions...');
    const sessions = [
      {
        driverId: 'driver_active',
        startTime: hoursAgo(4),
        endTime: now,
        duration: 4.0,
        startLocation: { latitude: 37.7749, longitude: -122.4194 },
        endLocation: { latitude: 37.7849, longitude: -122.4094 },
        deliveriesCompleted: 8,
        deliveriesCancelled: 0,
        totalDistance: 25.5,
        totalEarnings: 125.50,
        deviceInfo: 'iPhone - iOS 17.0',
        appVersion: '1.0'
      },
      {
        driverId: 'driver_active',
        startTime: daysAgo(1),
        endTime: daysAgo(1) - (3 * 60 * 60 * 1000),
        duration: 3.0,
        startLocation: { latitude: 37.7749, longitude: -122.4194 },
        endLocation: { latitude: 37.7949, longitude: -122.4294 },
        deliveriesCompleted: 5,
        deliveriesCancelled: 1,
        totalDistance: 18.2,
        totalEarnings: 87.25,
        deviceInfo: 'iPhone - iOS 17.0',
        appVersion: '1.0'
      }
    ];

    for (const session of sessions) {
      const docRef = await db.collection('driver_sessions').add(session);
      console.log(`  Created session: ${session.deliveriesCompleted} deliveries, $${session.totalEarnings}`);
    }
    console.log(`✅ Created ${sessions.length} driver sessions\n`);

    // 6. Create Tips
    console.log('💰 Creating tips...');
    const tips = [
      {
        orderId: 'order_001',
        customerId: 'cust_sarah',
        driverId: 'driver_active',
        amount: 5.50,
        tipType: 'percentage',
        percentage: 15.0,
        driverThankYouMessage: null,
        driverThankedAt: null,
        createdAt: hoursAgo(2)
      },
      {
        orderId: 'order_002',
        customerId: 'cust_michael',
        driverId: 'driver_active',
        amount: 8.00,
        tipType: 'fixed',
        percentage: null,
        driverThankYouMessage: 'Thank you!',
        driverThankedAt: hoursAgo(1.5),
        createdAt: hoursAgo(3)
      },
      {
        orderId: 'order_003',
        customerId: 'cust_emily',
        driverId: 'driver_active',
        amount: 12.00,
        tipType: 'percentage',
        percentage: 20.0,
        driverThankYouMessage: null,
        driverThankedAt: null,
        createdAt: hoursAgo(0.5)
      }
    ];

    for (const tip of tips) {
      const docRef = await db.collection('tips').add(tip);
      console.log(`  Created tip: $${tip.amount}`);
    }
    console.log(`✅ Created ${tips.length} tips\n`);

    // 7. Create Ratings
    console.log('⭐ Creating ratings...');
    const ratings = [
      {
        orderId: 'order_001',
        customerId: 'cust_sarah',
        customerName: 'Sarah Johnson',
        driverId: 'driver_active',
        driverName: 'John Driver',
        restaurantId: 'rest_golden_dragon',
        rating: 5,
        comment: 'Great service! Food arrived hot and driver was very friendly.',
        onTime: true,
        friendly: true,
        followedInstructions: true,
        foodQuality: true,
        createdAt: hoursAgo(2)
      },
      {
        orderId: 'order_002',
        customerId: 'cust_michael',
        customerName: 'Michael Chen',
        driverId: 'driver_active',
        driverName: 'John Driver',
        restaurantId: 'rest_la_taqueria',
        rating: 4,
        comment: 'Good delivery, slight delay but food was great.',
        onTime: false,
        friendly: true,
        followedInstructions: true,
        foodQuality: true,
        createdAt: hoursAgo(3)
      }
    ];

    for (const rating of ratings) {
      const docRef = await db.collection('ratings').add(rating);
      console.log(`  Created rating: ${rating.rating} stars - ${rating.comment.substring(0, 30)}...`);
    }
    console.log(`✅ Created ${ratings.length} ratings\n`);

    console.log('✨ Sample data population complete!\n');
    console.log('📱 Your iOS apps should now display:');
    console.log('   - 3 restaurants with menu items');
    console.log('   - 3 available orders ready for pickup');
    console.log('   - 3 active promotions');
    console.log('   - 2 driver sessions with earnings');
    console.log('   - 3 tips from customers');
    console.log('   - 2 customer ratings\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error populating data:', error);
    process.exit(1);
  }
}

// Run the script
populateData();
