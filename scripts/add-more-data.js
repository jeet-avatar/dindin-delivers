#!/usr/bin/env node

/**
 * Add More Complete Sample Data
 * Adds driver sessions, delivered orders, menu items, and more
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, addDoc, updateDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyDuoM1JHPbHWCg-p8mLHjT3K2-TAR66boM",
  authDomain: "eatfair-app.firebaseapp.com",
  projectId: "eatfair-app",
  storageBucket: "eatfair-app.firebasestorage.app",
  messagingSenderId: "107524350806",
  appId: "1:107524350806:ios:9ee5ae197a17690b83ecf7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const now = Date.now();
const hoursAgo = (hours) => now - (hours * 60 * 60 * 1000);
const daysAgo = (days) => now - (days * 24 * 60 * 60 * 1000);

async function addMoreData() {
  console.log('🚀 Adding more comprehensive data...\n');

  try {
    // Driver: test@testing.com - Password: test123456
    const driverId = 'SIckAbp6GBQo8yPbxYZnqZNfKN62';

    // 1. Add Menu Items
    console.log('🍽️  Creating menu items...');
    const menuItems = [
      { restaurantId: 'rest_golden_dragon', name: 'Kung Pao Chicken', price: 14.99, category: 'Entrees', description: 'Spicy stir-fried chicken', isAvailable: true },
      { restaurantId: 'rest_golden_dragon', name: 'Fried Rice', price: 8.99, category: 'Sides', description: 'Classic fried rice', isAvailable: true },
      { restaurantId: 'rest_golden_dragon', name: 'Spring Rolls (6pc)', price: 6.99, category: 'Appetizers', description: 'Crispy spring rolls', isAvailable: true },
      { restaurantId: 'rest_golden_dragon', name: 'Hot & Sour Soup', price: 5.99, category: 'Soups', description: 'Tangy and spicy', isAvailable: true },
      { restaurantId: 'rest_golden_dragon', name: 'Sweet & Sour Pork', price: 13.99, category: 'Entrees', description: 'Classic sweet and sour', isAvailable: true },
      
      { restaurantId: 'rest_la_taqueria', name: 'Carne Asada Burrito', price: 12.99, category: 'Burritos', description: 'Grilled steak burrito', isAvailable: true },
      { restaurantId: 'rest_la_taqueria', name: 'Chips & Guacamole', price: 7.99, category: 'Sides', description: 'Fresh guacamole', isAvailable: true },
      { restaurantId: 'rest_la_taqueria', name: 'Tacos (3pc)', price: 9.99, category: 'Tacos', description: 'Choice of meat', isAvailable: true },
      { restaurantId: 'rest_la_taqueria', name: 'Quesadilla', price: 8.99, category: 'Quesadillas', description: 'Cheese quesadilla', isAvailable: true },
      
      { restaurantId: 'rest_prime_rib', name: 'Prime Rib Dinner', price: 52.00, category: 'Entrees', description: 'Slow roasted prime rib', isAvailable: true },
      { restaurantId: 'rest_prime_rib', name: 'Caesar Salad', price: 12.00, category: 'Salads', description: 'Classic Caesar', isAvailable: true },
      { restaurantId: 'rest_prime_rib', name: 'Baked Potato', price: 6.00, category: 'Sides', description: 'With butter and sour cream', isAvailable: true }
    ];

    for (const item of menuItems) {
      await addDoc(collection(db, 'menu_items'), item);
    }
    console.log(`  ✅ Created ${menuItems.length} menu items\n`);

    // 2. Add Delivered Orders (for earnings history)
    console.log('📦 Creating delivered orders (earnings history)...');
    const deliveredOrders = [];
    
    // Today's deliveries
    for (let i = 0; i < 5; i++) {
      deliveredOrders.push({
        orderId: 'ORD' + Math.floor(Math.random() * 100000),
        customerId: 'cust_' + i,
        customerName: `Customer ${i + 1}`,
        restaurant: {
          id: 'rest_golden_dragon',
          name: 'Golden Dragon',
          address: '456 Grant Ave, San Francisco, CA 94108'
        },
        items: [{ id: 'i1', name: 'Sample Item', price: 15.99, quantity: 1 }],
        itemsCount: 1,
        subtotal: 15.99 + (i * 5),
        deliveryFee: 5.99 + (i * 0.5),
        serviceFee: 1.50,
        priorityFee: i > 2 ? 3.00 : 0,
        tax: 2.14,
        total: 25.62 + (i * 5.5),
        status: 'Delivered',
        placedAt: hoursAgo(8 - i),
        pickedUpAt: hoursAgo(7.5 - i),
        deliveredAt: hoursAgo(7 - i),
        driverId: driverId,
        driverName: 'Test Driver'
      });
    }

    // This week's deliveries
    for (let day = 1; day < 7; day++) {
      for (let i = 0; i < 3; i++) {
        deliveredOrders.push({
          orderId: 'ORD' + Math.floor(Math.random() * 100000),
          customerId: 'cust_week_' + day + '_' + i,
          customerName: `Customer ${day}-${i}`,
          restaurant: {
            id: ['rest_golden_dragon', 'rest_la_taqueria', 'rest_prime_rib'][i % 3],
            name: ['Golden Dragon', 'La Taqueria', 'House of Prime Rib'][i % 3],
            address: '123 Main St'
          },
          items: [{ id: 'i' + i, name: 'Item', price: 20.00, quantity: 1 }],
          itemsCount: 1,
          subtotal: 20.00 + (i * 10),
          deliveryFee: 6.99,
          serviceFee: 2.00,
          priorityFee: i === 2 ? 5.00 : 0,
          tax: 2.50,
          total: 31.49 + (i * 10) + (i === 2 ? 5.00 : 0),
          status: 'Delivered',
          placedAt: daysAgo(day),
          pickedUpAt: daysAgo(day) + 900000,
          deliveredAt: daysAgo(day) + 1800000,
          driverId: driverId,
          driverName: 'Test Driver'
        });
      }
    }

    for (const order of deliveredOrders) {
      await addDoc(collection(db, 'orders'), order);
    }
    console.log(`  ✅ Created ${deliveredOrders.length} delivered orders\n`);

    // 3. Add Driver Sessions
    console.log('🚗 Creating driver sessions...');
    const sessions = [];
    
    // Today's session
    sessions.push({
      driverId: driverId,
      startTime: hoursAgo(6),
      endTime: hoursAgo(0.5),
      duration: 5.5,
      startLocation: { latitude: 37.7749, longitude: -122.4194 },
      endLocation: { latitude: 37.7849, longitude: -122.4094 },
      deliveriesCompleted: 5,
      deliveriesCancelled: 0,
      totalDistance: 22.5,
      totalEarnings: 87.50,
      deviceInfo: 'iPhone - iOS 17.0',
      appVersion: '1.0'
    });

    // Previous days
    for (let day = 1; day < 7; day++) {
      sessions.push({
        driverId: driverId,
        startTime: daysAgo(day),
        endTime: daysAgo(day) - (3 * 60 * 60 * 1000),
        duration: 3.0 + (day * 0.5),
        startLocation: { latitude: 37.7749, longitude: -122.4194 },
        endLocation: { latitude: 37.7849 + (day * 0.01), longitude: -122.4094 },
        deliveriesCompleted: 3 + day,
        deliveriesCancelled: day % 3 === 0 ? 1 : 0,
        totalDistance: 15.0 + (day * 3),
        totalEarnings: 65.00 + (day * 15),
        deviceInfo: 'iPhone - iOS 17.0',
        appVersion: '1.0'
      });
    }

    for (const session of sessions) {
      await addDoc(collection(db, 'driver_sessions'), session);
    }
    console.log(`  ✅ Created ${sessions.length} driver sessions\n`);

    // 4. Add More Tips
    console.log('💰 Creating additional tips...');
    const moreTips = [];
    
    for (let i = 0; i < 10; i++) {
      moreTips.push({
        orderId: 'order_tip_' + i,
        customerId: 'cust_' + i,
        driverId: driverId,
        amount: 3.00 + (i * 1.5),
        tipType: i % 2 === 0 ? 'percentage' : 'fixed',
        percentage: i % 2 === 0 ? 15.0 : null,
        driverThankYouMessage: null,
        driverThankedAt: null,
        createdAt: hoursAgo(i * 2)
      });
    }

    for (const tip of moreTips) {
      await addDoc(collection(db, 'tips'), tip);
    }
    console.log(`  ✅ Created ${moreTips.length} additional tips\n`);

    // 5. Add Ratings
    console.log('⭐ Creating ratings...');
    const ratings = [
      {
        orderId: 'order_rating_1',
        customerId: 'cust_sarah',
        customerName: 'Sarah Johnson',
        driverId: driverId,
        driverName: 'Test Driver',
        restaurantId: 'rest_golden_dragon',
        rating: 5,
        comment: 'Amazing service! Very professional.',
        onTime: true,
        friendly: true,
        followedInstructions: true,
        foodQuality: true,
        createdAt: hoursAgo(3)
      },
      {
        orderId: 'order_rating_2',
        customerId: 'cust_michael',
        customerName: 'Michael Chen',
        driverId: driverId,
        driverName: 'Test Driver',
        restaurantId: 'rest_la_taqueria',
        rating: 5,
        comment: 'Fast delivery, food was perfect!',
        onTime: true,
        friendly: true,
        followedInstructions: true,
        foodQuality: true,
        createdAt: daysAgo(1)
      },
      {
        orderId: 'order_rating_3',
        customerId: 'cust_emily',
        customerName: 'Emily Rodriguez',
        driverId: driverId,
        driverName: 'Test Driver',
        restaurantId: 'rest_prime_rib',
        rating: 4,
        comment: 'Good service, slight delay but food was great.',
        onTime: false,
        friendly: true,
        followedInstructions: true,
        foodQuality: true,
        createdAt: daysAgo(2)
      }
    ];

    for (const rating of ratings) {
      await addDoc(collection(db, 'ratings'), rating);
    }
    console.log(`  ✅ Created ${ratings.length} ratings\n`);

    // 6. Create Driver Profile
    console.log('👤 Creating driver profile...');
    await setDoc(doc(db, 'drivers', driverId), {
      name: 'Test Driver',
      email: 'driver@eatfair.com',
      phone: '+1 415-555-9999',
      vehicleType: 'Car',
      licensePlate: 'ABC123',
      isOnline: false,
      currentSessionId: null,
      lastActive: now,
      stats: {
        totalDeliveries: 150,
        totalEarnings: 2850.00,
        totalDistance: 450.5,
        totalOnlineTime: 120.5,
        averageRating: 4.8,
        completionRate: 98.5
      }
    });
    console.log('  ✅ Created driver profile\n');

    console.log('✨ Complete dataset added!\n');
    console.log('📊 Summary:');
    console.log(`   - ${menuItems.length} menu items`);
    console.log(`   - ${deliveredOrders.length} delivered orders (for earnings)`);
    console.log(`   - ${sessions.length} driver sessions`);
    console.log(`   - ${moreTips.length} additional tips`);
    console.log(`   - ${ratings.length} customer ratings`);
    console.log('   - 1 driver profile\n');
    console.log('📱 Now clean build your iOS apps to see all data!');
    console.log('   Product → Clean Build Folder (Shift + Cmd + K)');
    console.log('   Product → Run (Cmd + R)\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addMoreData();
