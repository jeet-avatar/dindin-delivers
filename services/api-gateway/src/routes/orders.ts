/**
 * Orders API Routes
 *
 * Handles all order-related operations with caching and pagination.
 */

import { Router, Response } from 'express';
import * as admin from 'firebase-admin';
import { AuthenticatedRequest, requireRole, requireOwnership } from '../middleware/auth';
import { validateBody, validatePagination, schemas } from '../middleware/validation';
import { rateLimiters } from '../middleware/rateLimit';

const router = Router();
const db = admin.firestore();

// =============================================================================
// GET /orders - List orders for current user
// =============================================================================

router.get('/',
  validatePagination,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { page, limit, offset } = (req as any).pagination;
      const { status, from, to } = req.query;

      let query: admin.firestore.Query = db.collection('orders');

      // Filter by user role
      switch (req.user?.role) {
        case 'customer':
          query = query.where('customerId', '==', req.user.uid);
          break;
        case 'restaurant':
          query = query.where('restaurantId', '==', req.user.restaurantId);
          break;
        case 'driver':
          query = query.where('driverId', '==', req.user.driverId);
          break;
        // Admin sees all
      }

      // Filter by status
      if (status) {
        query = query.where('status', '==', status);
      }

      // Filter by date range
      if (from) {
        query = query.where('createdAt', '>=', new Date(from as string));
      }
      if (to) {
        query = query.where('createdAt', '<=', new Date(to as string));
      }

      // Order by creation date
      query = query.orderBy('createdAt', 'desc');

      // Get total count (for pagination)
      const countSnapshot = await query.count().get();
      const total = countSnapshot.data().count;

      // Get paginated results
      const snapshot = await query.offset(offset).limit(limit).get();

      const orders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
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
      console.error('Error fetching orders:', error);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: 'Failed to fetch orders' },
      });
    }
  }
);

// =============================================================================
// GET /orders/:id - Get single order
// =============================================================================

router.get('/:id',
  requireOwnership('order'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const orderDoc = await db.collection('orders').doc(req.params.id).get();

      if (!orderDoc.exists) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Order not found' },
        });
        return;
      }

      const order = {
        id: orderDoc.id,
        ...orderDoc.data(),
        createdAt: orderDoc.data()?.createdAt?.toDate?.() || orderDoc.data()?.createdAt,
      };

      res.json({ success: true, data: order });
    } catch (error) {
      console.error('Error fetching order:', error);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: 'Failed to fetch order' },
      });
    }
  }
);

// =============================================================================
// POST /orders - Create new order
// =============================================================================

router.post('/',
  rateLimiters.orders,
  requireRole('customer'),
  validateBody(schemas.createOrder),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { restaurantId, items, deliveryAddress, tip = 0, scheduledFor } = req.body;

      // Get restaurant details
      const restaurantDoc = await db.collection('restaurants').doc(restaurantId).get();
      if (!restaurantDoc.exists) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Restaurant not found' },
        });
        return;
      }

      const restaurant = restaurantDoc.data();

      // Calculate totals
      const subtotal = items.reduce((sum: number, item: any) =>
        sum + (item.price * item.quantity), 0
      );
      const deliveryFee = 4.99;
      const tax = subtotal * 0.08; // 8% tax
      const platformFee = 1.00; // $1 flat fee
      const total = subtotal + deliveryFee + tip + tax;

      // Generate short ID
      const shortId = Math.random().toString(36).substring(2, 8).toUpperCase();

      // Create order document
      const orderData = {
        shortId,
        customerId: req.user!.uid,
        customerEmail: req.user!.email,
        restaurantId,
        restaurantName: restaurant?.name,
        items,
        deliveryAddress,
        subtotal,
        deliveryFee,
        tip,
        tax,
        total,
        platformFee,
        status: 'Placed',
        paymentStatus: 'pending',
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      const orderRef = await db.collection('orders').add(orderData);

      res.status(201).json({
        success: true,
        data: {
          id: orderRef.id,
          shortId,
          ...orderData,
          createdAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error creating order:', error);
      res.status(500).json({
        success: false,
        error: { code: 'CREATE_ERROR', message: 'Failed to create order' },
      });
    }
  }
);

// =============================================================================
// PATCH /orders/:id/status - Update order status
// =============================================================================

router.patch('/:id/status',
  requireOwnership('order'),
  validateBody(schemas.updateOrderStatus),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { status } = req.body;
      const orderId = req.params.id;

      // Validate status transition
      const orderDoc = await db.collection('orders').doc(orderId).get();
      if (!orderDoc.exists) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Order not found' },
        });
        return;
      }

      const currentStatus = orderDoc.data()?.status;
      if (!isValidStatusTransition(currentStatus, status, req.user?.role!)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TRANSITION',
            message: `Cannot transition from ${currentStatus} to ${status}`,
          },
        });
        return;
      }

      // Update status
      const updateData: any = {
        status,
        [`${status.toLowerCase()}At`]: admin.firestore.FieldValue.serverTimestamp(),
      };

      await orderDoc.ref.update(updateData);

      res.json({
        success: true,
        data: { id: orderId, status },
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      res.status(500).json({
        success: false,
        error: { code: 'UPDATE_ERROR', message: 'Failed to update order status' },
      });
    }
  }
);

// =============================================================================
// GET /orders/:id/tracking - Get real-time tracking info
// =============================================================================

router.get('/:id/tracking',
  requireOwnership('order'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const trackingDoc = await db.collection('order_tracking').doc(req.params.id).get();

      if (!trackingDoc.exists) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Tracking info not found' },
        });
        return;
      }

      res.json({
        success: true,
        data: {
          id: trackingDoc.id,
          ...trackingDoc.data(),
        },
      });
    } catch (error) {
      console.error('Error fetching tracking:', error);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: 'Failed to fetch tracking info' },
      });
    }
  }
);

// =============================================================================
// HELPERS
// =============================================================================

function isValidStatusTransition(
  from: string,
  to: string,
  role: string
): boolean {
  const transitions: Record<string, Record<string, string[]>> = {
    restaurant: {
      Placed: ['Accepted', 'Cancelled'],
      Accepted: ['Preparing', 'Cancelled'],
      Preparing: ['Ready'],
    },
    driver: {
      Ready: ['PickedUp'],
      DriverAssigned: ['PickedUp'],
      PickedUp: ['Delivered'],
    },
    customer: {
      Placed: ['Cancelled'],
      Accepted: ['Cancelled'],
    },
    admin: {
      // Admin can do any transition
      '*': ['Placed', 'Accepted', 'Preparing', 'Ready', 'PickedUp', 'Delivered', 'Cancelled'],
    },
  };

  if (role === 'admin') {
    return true;
  }

  const roleTransitions = transitions[role];
  if (!roleTransitions) return false;

  const allowedNextStates = roleTransitions[from];
  return allowedNextStates?.includes(to) || false;
}

export default router;
