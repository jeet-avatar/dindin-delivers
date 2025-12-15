/**
 * Drivers API Routes
 *
 * Handles driver management, location updates, and metrics.
 */

import { Router, Response } from 'express';
import * as admin from 'firebase-admin';
import { AuthenticatedRequest, requireRole } from '../middleware/auth';
import { validateBody, validatePagination, schemas } from '../middleware/validation';
import { rateLimiters } from '../middleware/rateLimit';

const router = Router();
const db = admin.firestore();

// =============================================================================
// GET /drivers/me - Get current driver profile
// =============================================================================

router.get('/me',
  requireRole('driver'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const driverDoc = await db.collection('drivers').doc(req.user!.driverId!).get();

      if (!driverDoc.exists) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Driver profile not found' },
        });
        return;
      }

      const driver = driverDoc.data();

      // Get cached metrics or calculate if stale
      let metrics = driver?.cachedMetrics;
      const metricsAge = driver?.metricsUpdatedAt?.toDate?.();
      const isStale = !metricsAge || (Date.now() - metricsAge.getTime()) > 5 * 60 * 1000;

      if (isStale) {
        metrics = await calculateDriverMetrics(req.user!.driverId!);
        // Update cache in background
        driverDoc.ref.update({
          cachedMetrics: metrics,
          metricsUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }).catch(console.error);
      }

      res.json({
        success: true,
        data: {
          id: driverDoc.id,
          ...driver,
          metrics,
        },
      });
    } catch (error) {
      console.error('Error fetching driver:', error);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: 'Failed to fetch driver profile' },
      });
    }
  }
);

// =============================================================================
// GET /drivers/me/orders - Get driver's orders
// =============================================================================

router.get('/me/orders',
  requireRole('driver'),
  validatePagination,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { page, limit, offset } = (req as any).pagination;
      const { status } = req.query;

      let query: admin.firestore.Query = db.collection('orders')
        .where('driverId', '==', req.user!.driverId);

      if (status) {
        query = query.where('status', '==', status);
      }

      query = query.orderBy('createdAt', 'desc');

      const countSnapshot = await query.count().get();
      const total = countSnapshot.data().count;

      const snapshot = await query.offset(offset).limit(limit).get();

      const orders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      res.json({
        success: true,
        data: orders,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: offset + orders.length < total,
        },
      });
    } catch (error) {
      console.error('Error fetching driver orders:', error);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: 'Failed to fetch orders' },
      });
    }
  }
);

// =============================================================================
// GET /drivers/me/earnings - Get driver earnings
// =============================================================================

router.get('/me/earnings',
  requireRole('driver'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { period = 'week' } = req.query;

      const now = new Date();
      let startDate: Date;

      switch (period) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      const ordersSnapshot = await db.collection('orders')
        .where('driverId', '==', req.user!.driverId)
        .where('status', '==', 'Delivered')
        .where('deliveredAt', '>=', startDate)
        .get();

      let totalDeliveryFees = 0;
      let totalTips = 0;
      const dailyEarnings: Record<string, { deliveryFees: number; tips: number }> = {};

      ordersSnapshot.docs.forEach(doc => {
        const order = doc.data();
        const deliveredAt = order.deliveredAt?.toDate?.() || new Date();
        const dateKey = deliveredAt.toISOString().split('T')[0];

        totalDeliveryFees += order.deliveryFee || 0;
        totalTips += order.tip || 0;

        if (!dailyEarnings[dateKey]) {
          dailyEarnings[dateKey] = { deliveryFees: 0, tips: 0 };
        }
        dailyEarnings[dateKey].deliveryFees += order.deliveryFee || 0;
        dailyEarnings[dateKey].tips += order.tip || 0;
      });

      res.json({
        success: true,
        data: {
          period,
          totalEarnings: totalDeliveryFees + totalTips,
          deliveryFees: totalDeliveryFees,
          tips: totalTips,
          deliveryCount: ordersSnapshot.size,
          dailyBreakdown: dailyEarnings,
        },
      });
    } catch (error) {
      console.error('Error fetching earnings:', error);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: 'Failed to fetch earnings' },
      });
    }
  }
);

// =============================================================================
// PUT /drivers/me/location - Update driver location
// =============================================================================

router.put('/me/location',
  rateLimiters.location,
  requireRole('driver'),
  validateBody(schemas.updateDriverLocation),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { latitude, longitude, heading, speed } = req.body;
      const driverId = req.user!.driverId!;

      // Get current order if any
      const driverDoc = await db.collection('drivers').doc(driverId).get();
      const currentOrderId = driverDoc.data()?.currentOrderId;

      // Update driver location
      await db.collection('driver_locations').doc(driverId).set({
        latitude,
        longitude,
        heading: heading || 0,
        speed: speed || 0,
        currentOrderId: currentOrderId || null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.json({
        success: true,
        data: { latitude, longitude, heading, speed },
      });
    } catch (error) {
      console.error('Error updating location:', error);
      res.status(500).json({
        success: false,
        error: { code: 'UPDATE_ERROR', message: 'Failed to update location' },
      });
    }
  }
);

// =============================================================================
// PUT /drivers/me/status - Update driver status (online/offline)
// =============================================================================

router.put('/me/status',
  requireRole('driver'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { isOnline } = req.body;
      const driverId = req.user!.driverId!;

      const updates: any = {
        isOnline,
        status: isOnline ? 'available' : 'offline',
        statusUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Handle session tracking
      if (isOnline) {
        // Start new session
        await db.collection('driver_sessions').add({
          driverId,
          startTime: admin.firestore.FieldValue.serverTimestamp(),
          ordersCompleted: 0,
          distanceTraveled: 0,
          earnings: 0,
        });
      } else {
        // End current session
        const activeSessions = await db.collection('driver_sessions')
          .where('driverId', '==', driverId)
          .where('endTime', '==', null)
          .get();

        const batch = db.batch();
        activeSessions.docs.forEach(doc => {
          batch.update(doc.ref, {
            endTime: admin.firestore.FieldValue.serverTimestamp(),
          });
        });
        await batch.commit();
      }

      await db.collection('drivers').doc(driverId).update(updates);

      res.json({
        success: true,
        data: { isOnline, status: updates.status },
      });
    } catch (error) {
      console.error('Error updating status:', error);
      res.status(500).json({
        success: false,
        error: { code: 'UPDATE_ERROR', message: 'Failed to update status' },
      });
    }
  }
);

// =============================================================================
// GET /drivers/available - Get available drivers (for dispatch)
// =============================================================================

router.get('/available',
  requireRole('restaurant', 'admin'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { latitude, longitude, radius = 10 } = req.query;

      const driversSnapshot = await db.collection('drivers')
        .where('isOnline', '==', true)
        .where('status', '==', 'available')
        .get();

      const drivers = await Promise.all(
        driversSnapshot.docs.map(async (doc) => {
          const driver = doc.data();
          const locationDoc = await db.collection('driver_locations').doc(doc.id).get();
          const location = locationDoc.data();

          return {
            id: doc.id,
            name: driver.displayName,
            rating: driver.rating,
            vehicleType: driver.vehicleType,
            location: location ? {
              latitude: location.latitude,
              longitude: location.longitude,
            } : null,
          };
        })
      );

      // Filter by distance if coordinates provided
      let filteredDrivers = drivers;
      if (latitude && longitude) {
        const lat = parseFloat(latitude as string);
        const lng = parseFloat(longitude as string);
        const rad = parseFloat(radius as string);

        filteredDrivers = drivers.filter(driver => {
          if (!driver.location) return false;
          const distance = calculateDistance(
            lat, lng,
            driver.location.latitude,
            driver.location.longitude
          );
          return distance <= rad;
        });
      }

      res.json({
        success: true,
        data: filteredDrivers,
      });
    } catch (error) {
      console.error('Error fetching available drivers:', error);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: 'Failed to fetch drivers' },
      });
    }
  }
);

// =============================================================================
// HELPERS
// =============================================================================

async function calculateDriverMetrics(driverId: string) {
  const now = new Date();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Get orders
  const [weeklyOrders, monthlyOrders, allOrders] = await Promise.all([
    db.collection('orders')
      .where('driverId', '==', driverId)
      .where('status', '==', 'Delivered')
      .where('deliveredAt', '>=', weekStart)
      .get(),
    db.collection('orders')
      .where('driverId', '==', driverId)
      .where('status', '==', 'Delivered')
      .where('deliveredAt', '>=', monthStart)
      .get(),
    db.collection('orders')
      .where('driverId', '==', driverId)
      .where('status', '==', 'Delivered')
      .get(),
  ]);

  // Calculate earnings
  const calculateEarnings = (snapshot: admin.firestore.QuerySnapshot) =>
    snapshot.docs.reduce((sum, doc) => {
      const data = doc.data();
      return sum + (data.deliveryFee || 0) + (data.tip || 0);
    }, 0);

  // Get ratings
  const ratingsSnapshot = await db.collection('ratings')
    .where('driverId', '==', driverId)
    .get();

  const ratings = ratingsSnapshot.docs.map(doc => doc.data().rating);
  const averageRating = ratings.length > 0
    ? ratings.reduce((a, b) => a + b, 0) / ratings.length
    : 0;

  // Get sessions
  const sessionsSnapshot = await db.collection('driver_sessions')
    .where('driverId', '==', driverId)
    .where('endTime', '!=', null)
    .get();

  const totalHours = sessionsSnapshot.docs.reduce((sum, doc) => {
    const data = doc.data();
    const start = data.startTime?.toDate?.() || new Date();
    const end = data.endTime?.toDate?.() || new Date();
    return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  }, 0);

  return {
    totalDeliveries: allOrders.size,
    weeklyDeliveries: weeklyOrders.size,
    monthlyDeliveries: monthlyOrders.size,
    completionRate: 100, // TODO: Calculate from offered vs completed
    acceptanceRate: 100, // TODO: Calculate from offered vs accepted
    averageRating: Math.round(averageRating * 10) / 10,
    totalRatings: ratings.length,
    weeklyEarnings: calculateEarnings(weeklyOrders),
    monthlyEarnings: calculateEarnings(monthlyOrders),
    totalEarnings: calculateEarnings(allOrders),
    weeklyOnlineHours: 0, // TODO: Calculate from sessions
    monthlyOnlineHours: 0,
    totalOnlineHours: Math.round(totalHours * 10) / 10,
    weeklyDistance: 0, // TODO: Calculate from orders
    monthlyDistance: 0,
    totalDistance: 0,
  };
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default router;
