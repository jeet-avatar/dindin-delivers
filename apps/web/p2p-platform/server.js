/**
 * EatFair P2P Platform Server
 *
 * Express server that connects to Firestore and serves the accounting dashboard.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  // Try to use service account from environment or default credentials
  try {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp();
    } else {
      // For local development, use project ID
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || 'eatfair-platform',
      });
    }
    console.log('Firebase Admin initialized');
  } catch (error) {
    console.error('Firebase init error:', error.message);
    console.log('Running in mock mode - no Firestore connection');
  }
}

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Get Firestore instance (or null if not initialized)
const getDb = () => {
  try {
    return admin.firestore();
  } catch {
    return null;
  }
};

// =============================================================================
// API ROUTES
// =============================================================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'p2p-platform',
    firestore: getDb() ? 'connected' : 'mock-mode',
    timestamp: new Date().toISOString(),
  });
});

// Get dashboard stats
app.get('/api/dashboard', async (req, res) => {
  try {
    const db = getDb();

    if (!db) {
      // Return mock data if no Firestore
      return res.json(getMockDashboard());
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [ordersToday, pendingPayouts, allOrders] = await Promise.all([
      db.collection('orders').where('createdAt', '>=', todayStart).get(),
      db.collection('payouts').where('status', '==', 'pending').get(),
      db.collection('orders').where('status', '==', 'Delivered').limit(100).get(),
    ]);

    // Calculate totals
    const todayRevenue = ordersToday.docs.reduce((sum, doc) => sum + (doc.data().total || 0), 0);
    const platformFees = ordersToday.docs.length * 1.00; // $1 per order
    const pendingPayoutTotal = pendingPayouts.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);

    res.json({
      success: true,
      data: {
        ordersToday: ordersToday.size,
        totalRevenue: todayRevenue,
        platformFees,
        pendingPayouts: pendingPayoutTotal,
        pendingPayoutCount: pendingPayouts.size,
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.json(getMockDashboard());
  }
});

// Get recent orders
app.get('/api/orders', async (req, res) => {
  try {
    const db = getDb();
    const limit = parseInt(req.query.limit) || 20;

    if (!db) {
      return res.json(getMockOrders());
    }

    const snapshot = await db.collection('orders')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    }));

    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Orders error:', error);
    res.json(getMockOrders());
  }
});

// Get journal entries
app.get('/api/journal-entries', async (req, res) => {
  try {
    const db = getDb();
    const limit = parseInt(req.query.limit) || 50;

    if (!db) {
      return res.json(getMockJournalEntries());
    }

    const snapshot = await db.collection('journal_entries')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const entries = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    }));

    res.json({ success: true, data: entries });
  } catch (error) {
    console.error('Journal entries error:', error);
    res.json(getMockJournalEntries());
  }
});

// Get pending payouts
app.get('/api/payouts', async (req, res) => {
  try {
    const db = getDb();
    const status = req.query.status || 'pending';

    if (!db) {
      return res.json(getMockPayouts());
    }

    const snapshot = await db.collection('payouts')
      .where('status', '==', status)
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    const payouts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    }));

    // Group by type
    const restaurantPayouts = payouts.filter(p => p.type === 'restaurant');
    const driverPayouts = payouts.filter(p => p.type === 'driver');

    res.json({
      success: true,
      data: {
        restaurants: {
          payouts: restaurantPayouts,
          total: restaurantPayouts.reduce((sum, p) => sum + (p.amount || 0), 0),
        },
        drivers: {
          payouts: driverPayouts,
          total: driverPayouts.reduce((sum, p) => sum + (p.amount || 0), 0),
        },
      },
    });
  } catch (error) {
    console.error('Payouts error:', error);
    res.json(getMockPayouts());
  }
});

// Get restaurants
app.get('/api/restaurants', async (req, res) => {
  try {
    const db = getDb();

    if (!db) {
      return res.json(getMockRestaurants());
    }

    const snapshot = await db.collection('restaurants').limit(50).get();

    const restaurants = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({ success: true, data: restaurants });
  } catch (error) {
    console.error('Restaurants error:', error);
    res.json(getMockRestaurants());
  }
});

// Get drivers
app.get('/api/drivers', async (req, res) => {
  try {
    const db = getDb();

    if (!db) {
      return res.json(getMockDrivers());
    }

    const snapshot = await db.collection('drivers').limit(50).get();

    const drivers = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({ success: true, data: drivers });
  } catch (error) {
    console.error('Drivers error:', error);
    res.json(getMockDrivers());
  }
});

// Process payout (mark as completed)
app.post('/api/payouts/:id/process', async (req, res) => {
  try {
    const db = getDb();

    if (!db) {
      return res.json({ success: true, message: 'Payout processed (mock)' });
    }

    await db.collection('payouts').doc(req.params.id).update({
      status: 'completed',
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ success: true, message: 'Payout processed' });
  } catch (error) {
    console.error('Process payout error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============================================================================
// MOCK DATA (when Firestore is not available)
// =============================================================================

function getMockDashboard() {
  return {
    success: true,
    data: {
      ordersToday: 5,
      totalRevenue: 248.15,
      platformFees: 5.00,
      pendingPayouts: 227.24,
      pendingPayoutCount: 7,
    },
    mock: true,
  };
}

function getMockOrders() {
  const mockData = require('./src/data/mockData');
  return {
    success: true,
    data: mockData.orders,
    mock: true,
  };
}

function getMockJournalEntries() {
  const mockData = require('./src/data/mockData');
  return {
    success: true,
    data: mockData.journalEntries,
    mock: true,
  };
}

function getMockPayouts() {
  const mockData = require('./src/data/mockData');
  const restaurantPayouts = mockData.pendingPayouts.filter(p => p.type === 'Restaurant');
  const driverPayouts = mockData.pendingPayouts.filter(p => p.type === 'Driver');

  return {
    success: true,
    data: {
      restaurants: {
        payouts: restaurantPayouts,
        total: restaurantPayouts.reduce((sum, p) => sum + p.amount, 0),
      },
      drivers: {
        payouts: driverPayouts,
        total: driverPayouts.reduce((sum, p) => sum + p.amount, 0),
      },
    },
    mock: true,
  };
}

function getMockRestaurants() {
  const mockData = require('./src/data/mockData');
  return {
    success: true,
    data: mockData.restaurants,
    mock: true,
  };
}

function getMockDrivers() {
  const mockData = require('./src/data/mockData');
  return {
    success: true,
    data: mockData.drivers,
    mock: true,
  };
}

// =============================================================================
// SERVE FRONTEND
// =============================================================================

// Serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 EatFair P2P Platform running on http://localhost:${PORT}`);
  console.log(`   Firestore: ${getDb() ? 'Connected' : 'Mock Mode'}`);
  console.log(`\n   Open in browser to view dashboard\n`);
});
