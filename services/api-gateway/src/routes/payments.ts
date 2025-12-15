/**
 * Payments API Routes
 */

import { Router, Response } from 'express';
import * as admin from 'firebase-admin';
import { AuthenticatedRequest, requireRole } from '../middleware/auth';

const router = Router();
const db = admin.firestore();

// POST /payments/create-intent - Create payment intent
router.post('/create-intent',
  requireRole('customer'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { orderId } = req.body;

      // This would call the payment-service
      // For now, return mock response
      res.json({
        success: true,
        data: {
          clientSecret: 'mock_client_secret',
          paymentIntentId: 'pi_mock',
        },
      });
    } catch (error) {
      console.error('Error creating payment:', error);
      res.status(500).json({
        success: false,
        error: { code: 'PAYMENT_ERROR', message: 'Failed to create payment' },
      });
    }
  }
);

// GET /payments/methods - Get saved payment methods
router.get('/methods',
  requireRole('customer'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      res.json({
        success: true,
        data: { paymentMethods: [] },
      });
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: 'Failed to fetch payment methods' },
      });
    }
  }
);

export default router;
