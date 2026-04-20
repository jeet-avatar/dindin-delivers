/**
 * CSRF Protection Middleware
 * Protects against Cross-Site Request Forgery attacks
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Store CSRF tokens in memory (use Redis in production)
const csrfTokenStore = new Map<string, { token: string; expiresAt: number }>();

// Clean up expired tokens every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of csrfTokenStore.entries()) {
    if (value.expiresAt < now) {
      csrfTokenStore.delete(key);
    }
  }
}, 3600000);

/**
 * Generate CSRF token for a session
 */
export function generateCsrfToken(sessionId: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 3600000; // 1 hour

  csrfTokenStore.set(sessionId, { token, expiresAt });

  return token;
}

/**
 * Validate CSRF token
 */
export function validateCsrfToken(sessionId: string, token: string): boolean {
  const stored = csrfTokenStore.get(sessionId);

  if (!stored) {
    return false;
  }

  if (stored.expiresAt < Date.now()) {
    csrfTokenStore.delete(sessionId);
    return false;
  }

  return stored.token === token;
}

/**
 * CSRF Protection Middleware
 * Validates CSRF tokens for state-changing operations
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Skip CSRF check for safe HTTP methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip CSRF check for API endpoints with JWT authentication
  // (CSRF is primarily needed for cookie-based auth)
  if (req.headers.authorization) {
    return next();
  }

  // Get session ID (from cookie or custom header)
  const sessionId = req.cookies?.sessionId || req.headers['x-session-id'] as string;

  if (!sessionId) {
    return res.status(403).json({
      error: 'CSRF protection',
      message: 'Session ID required for CSRF protection'
    });
  }

  // Get CSRF token from header or body
  const csrfToken = req.headers['x-csrf-token'] as string || req.body?._csrf;

  if (!csrfToken) {
    return res.status(403).json({
      error: 'CSRF protection',
      message: 'CSRF token missing'
    });
  }

  // Validate token
  if (!validateCsrfToken(sessionId, csrfToken)) {
    console.warn('[CSRF Protection] Invalid token attempt:', {
      sessionId,
      ip: req.ip,
      path: req.path,
      method: req.method,
    });

    return res.status(403).json({
      error: 'CSRF protection',
      message: 'Invalid or expired CSRF token'
    });
  }

  next();
}

/**
 * Endpoint to get CSRF token
 */
export function getCsrfToken(req: Request, res: Response) {
  const sessionId = req.cookies?.sessionId || crypto.randomBytes(16).toString('hex');
  const token = generateCsrfToken(sessionId);

  // Set session cookie if not exists
  if (!req.cookies?.sessionId) {
    res.cookie('sessionId', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000, // 1 hour
    });
  }

  res.json({ csrfToken: token });
}

export default {
  csrfProtection,
  generateCsrfToken,
  validateCsrfToken,
  getCsrfToken,
};
