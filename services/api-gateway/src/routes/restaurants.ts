/**
 * Restaurants API Routes
 */

import { Router, Response } from 'express';
import * as admin from 'firebase-admin';
import { AuthenticatedRequest, requireRole } from '../middleware/auth';
import { validatePagination } from '../middleware/validation';

const router = Router();
const db = admin.firestore();

// GET /restaurants - List restaurants (public)
router.get('/',
  validatePagination,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { page, limit, offset } = (req as any).pagination;
      const { cuisine, minRating, isOpen } = req.query;

      let query: admin.firestore.Query = db.collection('restaurants')
        .where('status', '==', 'active');

      if (cuisine) {
        query = query.where('cuisineTypes', 'array-contains', cuisine);
      }

      if (minRating) {
        query = query.where('rating', '>=', parseFloat(minRating as string));
      }

      const snapshot = await query.orderBy('rating', 'desc').offset(offset).limit(limit).get();

      const restaurants = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      res.json({
        success: true,
        data: restaurants,
        pagination: { page, limit, hasMore: restaurants.length === limit },
      });
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: 'Failed to fetch restaurants' },
      });
    }
  }
);

// GET /restaurants/:id - Get restaurant details
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const restaurantDoc = await db.collection('restaurants').doc(req.params.id).get();

    if (!restaurantDoc.exists) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Restaurant not found' },
      });
      return;
    }

    res.json({
      success: true,
      data: { id: restaurantDoc.id, ...restaurantDoc.data() },
    });
  } catch (error) {
    console.error('Error fetching restaurant:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Failed to fetch restaurant' },
    });
  }
});

// GET /restaurants/:id/menu - Get restaurant menu
router.get('/:id/menu', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const menuSnapshot = await db.collection('restaurants')
      .doc(req.params.id)
      .collection('menu')
      .where('isAvailable', '==', true)
      .get();

    const items = menuSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Group by category
    const menuByCategory: Record<string, any[]> = {};
    items.forEach(item => {
      const category = item.category || 'Other';
      if (!menuByCategory[category]) {
        menuByCategory[category] = [];
      }
      menuByCategory[category].push(item);
    });

    res.json({
      success: true,
      data: {
        items,
        categories: menuByCategory,
      },
    });
  } catch (error) {
    console.error('Error fetching menu:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Failed to fetch menu' },
    });
  }
});

// GET /restaurants/me/dashboard - Restaurant dashboard stats
router.get('/me/dashboard',
  requireRole('restaurant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const restaurantId = req.user!.restaurantId!;
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const [todayOrders, pendingOrders, allOrders] = await Promise.all([
        db.collection('orders')
          .where('restaurantId', '==', restaurantId)
          .where('createdAt', '>=', todayStart)
          .get(),
        db.collection('orders')
          .where('restaurantId', '==', restaurantId)
          .where('status', 'in', ['Placed', 'Accepted', 'Preparing'])
          .get(),
        db.collection('orders')
          .where('restaurantId', '==', restaurantId)
          .where('status', '==', 'Delivered')
          .get(),
      ]);

      const todayRevenue = todayOrders.docs.reduce((sum, doc) =>
        sum + ((doc.data().subtotal || 0) - 1), 0); // Subtract $1 platform fee

      res.json({
        success: true,
        data: {
          todayOrders: todayOrders.size,
          todayRevenue,
          pendingOrders: pendingOrders.size,
          totalOrders: allOrders.size,
          pendingOrdersList: pendingOrders.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          })),
        },
      });
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: 'Failed to fetch dashboard' },
      });
    }
  }
);

export default router;
