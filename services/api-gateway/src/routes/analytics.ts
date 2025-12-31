/**
 * Analytics API Routes
 *
 * Platform-wide analytics and reporting.
 */

import { Router, Response } from 'express';
import * as admin from 'firebase-admin';
import { AuthenticatedRequest, requireRole } from '../middleware/auth';

const router = Router();
const db = admin.firestore();

// GET /analytics/platform - Platform-wide stats (admin only)
router.get('/platform',
  requireRole('admin'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [
        todayOrders,
        weeklyOrders,
        activeDrivers,
        activeRestaurants,
      ] = await Promise.all([
        db.collection('orders').where('createdAt', '>=', todayStart).count().get(),
        db.collection('orders').where('createdAt', '>=', weekStart).count().get(),
        db.collection('drivers').where('isOnline', '==', true).count().get(),
        db.collection('restaurants').where('status', '==', 'active').count().get(),
      ]);

      res.json({
        success: true,
        data: {
          todayOrders: todayOrders.data().count,
          weeklyOrders: weeklyOrders.data().count,
          activeDrivers: activeDrivers.data().count,
          activeRestaurants: activeRestaurants.data().count,
        },
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: 'Failed to fetch analytics' },
      });
    }
  }
);

// GET /analytics/journal-entries - Journal entries for P2P platform
router.get('/journal-entries',
  requireRole('admin'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { from, to, limit = 50 } = req.query;

      let query: admin.firestore.Query = db.collection('journal_entries')
        .orderBy('createdAt', 'desc')
        .limit(parseInt(limit as string));

      if (from) {
        query = query.where('createdAt', '>=', new Date(from as string));
      }
      if (to) {
        query = query.where('createdAt', '<=', new Date(to as string));
      }

      const snapshot = await query.get();

      const entries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
      }));

      res.json({
        success: true,
        data: entries,
      });
    } catch (error) {
      console.error('Error fetching journal entries:', error);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: 'Failed to fetch journal entries' },
      });
    }
  }
);

// GET /analytics/payouts - Payout analytics
router.get('/payouts',
  requireRole('admin'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { status = 'pending' } = req.query;

      const snapshot = await db.collection('payouts')
        .where('status', '==', status)
        .orderBy('createdAt', 'desc')
        .limit(100)
        .get();

      const payouts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Group by recipient type
      const restaurantPayouts = payouts.filter(p => p.type === 'restaurant');
      const driverPayouts = payouts.filter(p => p.type === 'driver');

      res.json({
        success: true,
        data: {
          total: payouts.length,
          totalAmount: payouts.reduce((sum, p) => sum + (p.amount || 0), 0),
          restaurants: {
            count: restaurantPayouts.length,
            amount: restaurantPayouts.reduce((sum, p) => sum + (p.amount || 0), 0),
          },
          drivers: {
            count: driverPayouts.length,
            amount: driverPayouts.reduce((sum, p) => sum + (p.amount || 0), 0),
          },
          payouts,
        },
      });
    } catch (error) {
      console.error('Error fetching payouts:', error);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: 'Failed to fetch payouts' },
      });
    }
  }
);

export default router;
