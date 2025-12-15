/**
 * Authentication Middleware
 *
 * Verifies Firebase ID tokens and extracts user information.
 * Supports multiple user types: customer, restaurant, driver, admin
 */

import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    role?: 'customer' | 'restaurant' | 'driver' | 'admin';
    restaurantId?: string;
    driverId?: string;
  };
}

/**
 * Verify Firebase ID token and attach user info to request
 */
export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or invalid authorization header',
      },
    });
    return;
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    // Verify the ID token
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Get user role from Firestore
    const userRole = await getUserRole(decodedToken.uid);

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      ...userRole,
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);

    if ((error as any).code === 'auth/id-token-expired') {
      res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Authentication token has expired',
        },
      });
      return;
    }

    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid authentication token',
      },
    });
  }
}

/**
 * Get user role from Firestore
 */
async function getUserRole(uid: string): Promise<{
  role: 'customer' | 'restaurant' | 'driver' | 'admin';
  restaurantId?: string;
  driverId?: string;
}> {
  const db = admin.firestore();

  // Check if user is a restaurant owner
  const restaurantDoc = await db.collection('restaurants').doc(uid).get();
  if (restaurantDoc.exists) {
    return { role: 'restaurant', restaurantId: uid };
  }

  // Check if user is a driver
  const driverDoc = await db.collection('drivers').doc(uid).get();
  if (driverDoc.exists) {
    return { role: 'driver', driverId: uid };
  }

  // Check if user is an admin
  const adminDoc = await db.collection('admins').doc(uid).get();
  if (adminDoc.exists) {
    return { role: 'admin' };
  }

  // Default to customer
  return { role: 'customer' };
}

/**
 * Require specific role(s) for access
 */
export function requireRole(...roles: ('customer' | 'restaurant' | 'driver' | 'admin')[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    if (!roles.includes(req.user.role!)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `This action requires one of the following roles: ${roles.join(', ')}`,
        },
      });
      return;
    }

    next();
  };
}

/**
 * Require ownership of a resource
 */
export function requireOwnership(resourceType: 'order' | 'restaurant' | 'driver') {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    // Admins can access anything
    if (req.user.role === 'admin') {
      next();
      return;
    }

    const resourceId = req.params.id;
    const db = admin.firestore();

    try {
      switch (resourceType) {
        case 'order':
          const order = await db.collection('orders').doc(resourceId).get();
          if (!order.exists) {
            res.status(404).json({
              success: false,
              error: { code: 'NOT_FOUND', message: 'Order not found' },
            });
            return;
          }
          const orderData = order.data();
          const isOwner =
            orderData?.customerId === req.user.uid ||
            orderData?.restaurantId === req.user.restaurantId ||
            orderData?.driverId === req.user.driverId;
          if (!isOwner) {
            res.status(403).json({
              success: false,
              error: { code: 'FORBIDDEN', message: 'Access denied' },
            });
            return;
          }
          break;

        case 'restaurant':
          if (req.user.restaurantId !== resourceId) {
            res.status(403).json({
              success: false,
              error: { code: 'FORBIDDEN', message: 'Access denied' },
            });
            return;
          }
          break;

        case 'driver':
          if (req.user.driverId !== resourceId) {
            res.status(403).json({
              success: false,
              error: { code: 'FORBIDDEN', message: 'Access denied' },
            });
            return;
          }
          break;
      }

      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to verify ownership' },
      });
    }
  };
}
