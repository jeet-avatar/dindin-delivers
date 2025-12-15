/**
 * EatFair API Gateway
 *
 * Central entry point for all platform services.
 * Handles authentication, rate limiting, request routing, and caching.
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { v4 as uuidv4 } from 'uuid';
import * as admin from 'firebase-admin';

import { authenticate } from './middleware/auth';
import { rateLimit } from './middleware/rateLimit';
import { requestLogger, errorHandler } from './middleware/logging';
import { validateRequest } from './middleware/validation';

import ordersRouter from './routes/orders';
import driversRouter from './routes/drivers';
import restaurantsRouter from './routes/restaurants';
import paymentsRouter from './routes/payments';
import analyticsRouter from './routes/analytics';

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const app = express();
const PORT = process.env.PORT || 8080;

// =============================================================================
// MIDDLEWARE
// =============================================================================

// Security headers
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));

// Compression
app.use(compression());

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));

// Add request ID for tracing
app.use((req: Request, res: Response, next: NextFunction) => {
  req.headers['x-request-id'] = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.headers['x-request-id'] as string);
  next();
});

// Request logging
app.use(requestLogger);

// =============================================================================
// HEALTH CHECK (No auth required)
// =============================================================================

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'api-gateway',
    version: process.env.VERSION || '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check Firestore connection
    await admin.firestore().collection('health').limit(1).get();

    res.json({
      status: 'ready',
      firestore: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      error: 'Firestore connection failed',
    });
  }
});

// =============================================================================
// API ROUTES (Auth required)
// =============================================================================

// Apply global rate limiting
app.use('/api', rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
}));

// API v1 routes
app.use('/api/v1/orders', authenticate, ordersRouter);
app.use('/api/v1/drivers', authenticate, driversRouter);
app.use('/api/v1/restaurants', authenticate, restaurantsRouter);
app.use('/api/v1/payments', authenticate, paymentsRouter);
app.use('/api/v1/analytics', authenticate, analyticsRouter);

// =============================================================================
// ERROR HANDLING
// =============================================================================

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
});

// Global error handler
app.use(errorHandler);

// =============================================================================
// SERVER START
// =============================================================================

app.listen(PORT, () => {
  console.log(`🚀 EatFair API Gateway running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
});

export default app;
