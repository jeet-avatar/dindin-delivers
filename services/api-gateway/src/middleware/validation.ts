/**
 * Request Validation Middleware
 *
 * Validates request bodies and parameters.
 */

import { Request, Response, NextFunction } from 'express';

interface ValidationSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: RegExp;
    enum?: any[];
  };
}

/**
 * Create validation middleware for request body
 */
export function validateBody(schema: ValidationSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field];

      // Check required
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`);
        continue;
      }

      // Skip validation if not required and not provided
      if (value === undefined || value === null) {
        continue;
      }

      // Check type
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== rules.type) {
        errors.push(`${field} must be a ${rules.type}`);
        continue;
      }

      // String validations
      if (rules.type === 'string') {
        if (rules.minLength && value.length < rules.minLength) {
          errors.push(`${field} must be at least ${rules.minLength} characters`);
        }
        if (rules.maxLength && value.length > rules.maxLength) {
          errors.push(`${field} must be at most ${rules.maxLength} characters`);
        }
        if (rules.pattern && !rules.pattern.test(value)) {
          errors.push(`${field} has invalid format`);
        }
        if (rules.enum && !rules.enum.includes(value)) {
          errors.push(`${field} must be one of: ${rules.enum.join(', ')}`);
        }
      }

      // Number validations
      if (rules.type === 'number') {
        if (rules.min !== undefined && value < rules.min) {
          errors.push(`${field} must be at least ${rules.min}`);
        }
        if (rules.max !== undefined && value > rules.max) {
          errors.push(`${field} must be at most ${rules.max}`);
        }
      }

      // Array validations
      if (rules.type === 'array') {
        if (rules.minLength && value.length < rules.minLength) {
          errors.push(`${field} must have at least ${rules.minLength} items`);
        }
        if (rules.maxLength && value.length > rules.maxLength) {
          errors.push(`${field} must have at most ${rules.maxLength} items`);
        }
      }
    }

    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: errors,
        },
      });
      return;
    }

    next();
  };
}

/**
 * Validate pagination parameters
 */
export function validatePagination(req: Request, res: Response, next: NextFunction): void {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  if (page < 1) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Page must be at least 1',
      },
    });
    return;
  }

  if (limit < 1 || limit > 100) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Limit must be between 1 and 100',
      },
    });
    return;
  }

  // Attach normalized pagination to request
  (req as any).pagination = { page, limit, offset: (page - 1) * limit };

  next();
}

/**
 * Common validation schemas
 */
export const schemas = {
  createOrder: {
    restaurantId: { type: 'string' as const, required: true },
    items: { type: 'array' as const, required: true, minLength: 1 },
    deliveryAddress: { type: 'object' as const, required: true },
    tip: { type: 'number' as const, min: 0 },
  },

  updateOrderStatus: {
    status: {
      type: 'string' as const,
      required: true,
      enum: ['Accepted', 'Preparing', 'Ready', 'PickedUp', 'Delivered', 'Cancelled'],
    },
  },

  updateDriverLocation: {
    latitude: { type: 'number' as const, required: true, min: -90, max: 90 },
    longitude: { type: 'number' as const, required: true, min: -180, max: 180 },
    heading: { type: 'number' as const, min: 0, max: 360 },
    speed: { type: 'number' as const, min: 0 },
  },

  createRestaurant: {
    name: { type: 'string' as const, required: true, minLength: 2, maxLength: 100 },
    email: { type: 'string' as const, required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    phone: { type: 'string' as const, pattern: /^\+?[1-9]\d{1,14}$/ },
    address: { type: 'object' as const, required: true },
  },
};
