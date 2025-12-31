/**
 * Logging Middleware
 *
 * Request/response logging and error handling.
 */

import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';

/**
 * Request logger middleware
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] as string;

  // Log request
  console.log(JSON.stringify({
    level: 'info',
    type: 'request',
    requestId,
    method: req.method,
    path: req.path,
    query: req.query,
    userId: (req as AuthenticatedRequest).user?.uid,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString(),
  }));

  // Capture response
  const originalSend = res.send;
  res.send = function (body: any): Response {
    const duration = Date.now() - startTime;

    // Log response
    console.log(JSON.stringify({
      level: res.statusCode >= 400 ? 'error' : 'info',
      type: 'response',
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userId: (req as AuthenticatedRequest).user?.uid,
      timestamp: new Date().toISOString(),
    }));

    return originalSend.call(this, body);
  };

  next();
}

/**
 * Global error handler
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = req.headers['x-request-id'] as string;

  // Log error
  console.error(JSON.stringify({
    level: 'error',
    type: 'error',
    requestId,
    method: req.method,
    path: req.path,
    error: {
      name: err.name,
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    },
    userId: (req as AuthenticatedRequest).user?.uid,
    timestamp: new Date().toISOString(),
  }));

  // Determine status code
  let statusCode = 500;
  let errorCode = 'INTERNAL_ERROR';

  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    errorCode = 'UNAUTHORIZED';
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403;
    errorCode = 'FORBIDDEN';
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    errorCode = 'NOT_FOUND';
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message,
      requestId,
    },
  });
}
