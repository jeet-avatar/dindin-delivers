/**
 * Enhanced Security Headers Middleware
 * Adds comprehensive security headers to all responses
 */

import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';

/**
 * Content Security Policy Configuration
 * Prevents XSS, clickjacking, and other code injection attacks
 */
export function contentSecurityPolicy() {
  return helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Required for some inline scripts (consider removing in production)
        'https://cdn.jsdelivr.net',
        'https://js.stripe.com',
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Required for styled-components and CSS-in-JS
        'https://fonts.googleapis.com',
      ],
      fontSrc: [
        "'self'",
        'https://fonts.gstatic.com',
      ],
      imgSrc: [
        "'self'",
        'data:',
        'https:',
        'blob:',
      ],
      connectSrc: [
        "'self'",
        'https://api.stripe.com',
        'https://*.amazonaws.com', // AWS S3, SES, etc.
        process.env.FRONTEND_URL || 'https://sandbox.zietra.com',
      ],
      frameSrc: [
        "'self'",
        'https://js.stripe.com',
      ],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      manifestSrc: ["'self'"],
      workerSrc: ["'self'", 'blob:'],
      formAction: ["'self'"],
      frameAncestors: ["'none'"], // Prevent clickjacking
      baseUri: ["'self'"],
      upgradeInsecureRequests: [],
    },
  });
}

/**
 * Additional Security Headers
 */
export function additionalSecurityHeaders(req: Request, res: Response, next: NextFunction) {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Enable XSS filter in older browsers
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy (formerly Feature Policy)
  res.setHeader('Permissions-Policy', [
    'accelerometer=()',
    'camera=()',
    'geolocation=()',
    'gyroscope=()',
    'magnetometer=()',
    'microphone=()',
    'payment=(self)',
    'usb=()',
  ].join(', '));

  // Strict Transport Security (HSTS)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  // Expect-CT (Certificate Transparency)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Expect-CT', 'max-age=86400, enforce');
  }

  // Cross-Origin Policies
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

  // Cache Control for sensitive data
  if (req.path.includes('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  // Server header removal (hide Express/Node version)
  res.removeHeader('X-Powered-By');

  next();
}

/**
 * CORS Headers with Security
 */
export function secureCorsHeaders(req: Request, res: Response, next: NextFunction) {
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'https://sandbox.zietra.com',
    'http://localhost:3000',
    'http://localhost:5173',
  ];

  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-CSRF-Token, X-Session-ID'
    );
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
}

/**
 * Apply all security headers
 */
export function applyAllSecurityHeaders() {
  return [
    helmet(), // Basic helmet protection
    contentSecurityPolicy(),
    additionalSecurityHeaders,
    secureCorsHeaders,
  ];
}

export default {
  contentSecurityPolicy,
  additionalSecurityHeaders,
  secureCorsHeaders,
  applyAllSecurityHeaders,
};
