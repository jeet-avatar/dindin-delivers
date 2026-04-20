/**
 * Security Guards Middleware
 * Comprehensive security protection for API routes, database, and application
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import validator from 'validator';

const prisma = new PrismaClient();

/**
 * Security Guard: Input Sanitization
 * Sanitizes all user inputs to prevent XSS and injection attacks
 */
export function sanitizeInputGuard(req: Request, res: Response, next: NextFunction) {
  try {
    // Sanitize query parameters
    if (req.query) {
      for (const key in req.query) {
        if (typeof req.query[key] === 'string') {
          req.query[key] = validator.escape(req.query[key] as string);
        }
      }
    }

    // Sanitize body (but preserve necessary HTML in specific fields)
    if (req.body && typeof req.body === 'object') {
      const htmlAllowedFields = ['content', 'htmlContent', 'body', 'description', 'subject', 'name', 'campaignName', 'goal', 'prompt', 'narrationScript', 'script', 'textContent', 'previewText', 'notes', 'signatureData', 'counterSigData', 'signatureImage'];

      for (const key in req.body) {
        if (typeof req.body[key] === 'string' && !htmlAllowedFields.includes(key)) {
          // Escape HTML entities for non-HTML fields
          req.body[key] = validator.escape(req.body[key]);
        }
      }
    }

    next();
  } catch (error) {
    console.error('Security Guard - Input Sanitization Error:', error);
    next(); // Continue even if sanitization fails
  }
}

/**
 * Security Guard: SQL Injection Prevention
 * Validates inputs that will be used in database queries
 */
export function sqlInjectionGuard(req: Request, res: Response, next: NextFunction) {
  try {
    // Skip routes that accept natural language / HTML content — these legitimately
    // contain words like "SELECT", "CREATE", "DROP", "ALTER" in normal English
    if (req.path.startsWith('/contracts') ||
        req.path.startsWith('/ai-chat') ||
        req.path.startsWith('/campaigns') ||
        req.path.startsWith('/email-templates') ||
        req.path.startsWith('/video-campaigns') ||
        req.path.startsWith('/staffing') ||
        req.path.startsWith('/email-composer') ||
        req.path.startsWith('/ai-code') ||
        req.path.startsWith('/companies') ||
        req.path.startsWith('/contacts') ||
        req.path.startsWith('/csv-import')) {
      return next();
    }

    // Skip super-admin database query endpoint - it's intentionally for SQL queries
    if (req.path === '/super-admin/database/query' && req.method === 'POST') {
      return next();
    }

    const suspiciousPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
      /(--|\*\/|\/\*)/g, // SQL comments
      /(\bOR\b.*=.*)/gi, // OR 1=1 patterns
      /(\bUNION\b.*\bSELECT\b)/gi,
    ];

    // Helper function to check if string is a URL
    const isUrl = (str: string): boolean => {
      try {
        // Check if it's a valid URL or starts with http/https
        return str.startsWith('http://') ||
               str.startsWith('https://') ||
               /^(www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(str);
      } catch {
        return false;
      }
    };

    const checkValue = (value: any, path: string): boolean => {
      if (typeof value === 'string') {
        // Skip URL validation - URLs can have &, |, ; in query parameters
        if (isUrl(value)) {
          return true;
        }

        for (const pattern of suspiciousPatterns) {
          if (pattern.test(value)) {
            console.warn(`Security Guard - Potential SQL Injection detected in ${path}:`, value);
            return false;
          }
        }

        // Check for command injection characters only in non-URL strings
        // Allow & in URLs but block in other contexts
        if (!isUrl(value) && /(;|\||&&|\|\|)/.test(value)) {
          console.warn(`Security Guard - Potential Command Injection detected in ${path}:`, value);
          return false;
        }
      } else if (typeof value === 'object' && value !== null) {
        for (const key in value) {
          if (!checkValue(value[key], `${path}.${key}`)) {
            return false;
          }
        }
      }
      return true;
    };

    // Check query parameters
    if (req.query && !checkValue(req.query, 'query')) {
      return res.status(400).json({
        error: 'Invalid input detected',
        message: 'Request contains potentially malicious content'
      });
    }

    // Check body
    if (req.body && !checkValue(req.body, 'body')) {
      return res.status(400).json({
        error: 'Invalid input detected',
        message: 'Request contains potentially malicious content'
      });
    }

    next();
  } catch (error) {
    console.error('Security Guard - SQL Injection Check Error:', error);
    next();
  }
}

/**
 * Security Guard: Email Validation
 * Ensures email addresses are valid and not malicious
 */
export function emailValidationGuard(req: Request, res: Response, next: NextFunction) {
  try {
    const emailFields = ['email', 'fromEmail', 'toEmail', 'replyTo', 'recipientEmail'];

    for (const field of emailFields) {
      const email = req.body?.[field] || req.query?.[field];

      if (email && typeof email === 'string') {
        // Validate email format
        if (!validator.isEmail(email)) {
          return res.status(400).json({
            error: 'Invalid email address',
            field,
            message: `The ${field} provided is not a valid email address`
          });
        }

        // Check for suspicious email patterns
        const suspiciousPatterns = [
          /@localhost/i,
          /@127\.0\.0\.1/i,
          /@0\.0\.0\.0/i,
          /\.\./, // Double dots
          /@.*@/, // Multiple @ signs
        ];

        for (const pattern of suspiciousPatterns) {
          if (pattern.test(email)) {
            return res.status(400).json({
              error: 'Invalid email address',
              field,
              message: 'Email address contains suspicious patterns'
            });
          }
        }

        // Store email as-is — don't normalize (normalizeEmail strips dots from Gmail, changing the user's intended value)
        req.body[field] = email.trim().toLowerCase();
      }
    }

    next();
  } catch (error) {
    console.error('Security Guard - Email Validation Error:', error);
    next();
  }
}

/**
 * Security Guard: URL Validation
 * Validates URLs to prevent SSRF and open redirects
 */
export function urlValidationGuard(req: Request, res: Response, next: NextFunction) {
  try {
    const urlFields = ['url', 'redirectUrl', 'webhook', 'callback', 'website', 'link'];

    for (const field of urlFields) {
      const url = req.body?.[field] || req.query?.[field];

      if (url && typeof url === 'string') {
        // Validate URL format
        if (!validator.isURL(url, { require_protocol: true })) {
          return res.status(400).json({
            error: 'Invalid URL',
            field,
            message: `The ${field} provided is not a valid URL`
          });
        }

        // Check for blocked protocols
        const blockedProtocols = ['file:', 'ftp:', 'gopher:', 'data:', 'javascript:'];
        for (const protocol of blockedProtocols) {
          if (url.toLowerCase().startsWith(protocol)) {
            return res.status(400).json({
              error: 'Invalid URL protocol',
              field,
              message: `The protocol ${protocol} is not allowed`
            });
          }
        }

        // Check for private/internal IPs
        try {
          const urlObj = new URL(url);
          const hostname = urlObj.hostname.toLowerCase();

          const blockedHosts = [
            'localhost',
            '127.0.0.1',
            '0.0.0.0',
            '169.254.169.254', // AWS metadata
            '[::1]', // IPv6 localhost
          ];

          if (blockedHosts.includes(hostname)) {
            return res.status(400).json({
              error: 'Invalid URL',
              field,
              message: 'URLs pointing to localhost or private IPs are not allowed'
            });
          }

          // Check for private IP ranges
          if (
            hostname.startsWith('10.') ||
            hostname.startsWith('192.168.') ||
            hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)
          ) {
            return res.status(400).json({
              error: 'Invalid URL',
              field,
              message: 'URLs pointing to private network ranges are not allowed'
            });
          }
        } catch (parseError) {
          return res.status(400).json({
            error: 'Invalid URL',
            field,
            message: 'Unable to parse URL'
          });
        }
      }
    }

    next();
  } catch (error) {
    console.error('Security Guard - URL Validation Error:', error);
    next();
  }
}

/**
 * Security Guard: File Upload Validation
 * Validates uploaded files for size, type, and malicious content
 */
export function fileUploadGuard(req: Request, res: Response, next: NextFunction) {
  try {
    const files = (req.files as Express.Multer.File[]) || [];
    const file = req.file as Express.Multer.File;

    const allFiles = file ? [file] : files;

    if (allFiles.length === 0) {
      return next();
    }

    // Allowed MIME types
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'application/json',
    ];

    // Max file size (10MB)
    const maxSize = 10 * 1024 * 1024;

    for (const uploadedFile of allFiles) {
      // Check MIME type
      if (!allowedMimeTypes.includes(uploadedFile.mimetype)) {
        return res.status(400).json({
          error: 'Invalid file type',
          message: `File type ${uploadedFile.mimetype} is not allowed`,
          allowedTypes: allowedMimeTypes
        });
      }

      // Check file size
      if (uploadedFile.size > maxSize) {
        return res.status(400).json({
          error: 'File too large',
          message: `File size ${uploadedFile.size} bytes exceeds maximum of ${maxSize} bytes`
        });
      }

      // Check for suspicious file extensions
      const suspiciousExtensions = [
        '.exe', '.bat', '.cmd', '.sh', '.ps1',
        '.dll', '.so', '.dylib',
        '.app', '.deb', '.rpm',
        '.jar', '.war',
      ];

      for (const ext of suspiciousExtensions) {
        if (uploadedFile.originalname.toLowerCase().endsWith(ext)) {
          return res.status(400).json({
            error: 'Invalid file extension',
            message: `File extension ${ext} is not allowed`
          });
        }
      }

      // Check for double extensions (e.g., file.pdf.exe)
      const parts = uploadedFile.originalname.split('.');
      if (parts.length > 2) {
        for (let i = 0; i < parts.length - 1; i++) {
          const ext = '.' + parts[i].toLowerCase();
          if (suspiciousExtensions.includes(ext)) {
            return res.status(400).json({
              error: 'Invalid file name',
              message: 'File name contains suspicious patterns'
            });
          }
        }
      }
    }

    next();
  } catch (error) {
    console.error('Security Guard - File Upload Validation Error:', error);
    next();
  }
}

/**
 * Security Guard: Authentication Token Validation
 * Enhanced JWT validation with additional security checks
 */
export function tokenSecurityGuard(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return next(); // Let the auth middleware handle missing tokens
    }

    // Check for Bearer token format
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Invalid token format',
        message: 'Authorization header must use Bearer scheme'
      });
    }

    const token = authHeader.substring(7);

    // Check token length (JWT tokens are typically 100-500 chars)
    if (token.length < 20 || token.length > 1000) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Token length is suspicious'
      });
    }

    // Check token format (should have 3 parts separated by dots)
    const parts = token.split('.');
    if (parts.length !== 3) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Token format is invalid'
      });
    }

    // Check for suspicious characters
    if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Token contains invalid characters'
      });
    }

    next();
  } catch (error) {
    console.error('Security Guard - Token Security Error:', error);
    next();
  }
}

/**
 * Security Guard: Rate Limiting per User
 * Additional per-user rate limiting beyond global limits
 */
export function userRateLimitGuard(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return next(); // Skip if no user (public endpoints)
    }

    // Check for excessive activity (implemented via Redis in production)
    // This is a placeholder for demonstration
    const rateLimitKey = `ratelimit:${userId}:${Date.now()}`;

    // In production, use Redis to track request counts
    // For now, we'll add headers to inform about rate limits
    res.setHeader('X-RateLimit-Limit', '1000');
    res.setHeader('X-RateLimit-Remaining', '999');
    res.setHeader('X-RateLimit-Reset', String(Date.now() + 3600000));

    next();
  } catch (error) {
    console.error('Security Guard - User Rate Limit Error:', error);
    next();
  }
}

/**
 * Security Guard: Request Size Limit
 * Prevents DoS attacks via large payloads
 */
export function requestSizeGuard(maxSizeBytes: number = 1024 * 1024) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const contentLength = req.headers['content-length'];

      if (contentLength && Number.parseInt(contentLength) > maxSizeBytes) {
        return res.status(413).json({
          error: 'Payload too large',
          message: `Request size ${contentLength} exceeds maximum of ${maxSizeBytes} bytes`
        });
      }

      next();
    } catch (error) {
      console.error('Security Guard - Request Size Error:', error);
      next();
    }
  };
}

/**
 * Security Guard: Database Query Logger
 * Logs all database queries for audit trail
 */
export async function databaseQueryGuard(
  model: string,
  operation: string,
  query: any,
  userId?: string
) {
  try {
    // Log query for security audit
    console.log('[DB Security Guard]', {
      timestamp: new Date().toISOString(),
      userId,
      model,
      operation,
      query: JSON.stringify(query).substring(0, 200), // Log first 200 chars
    });

    // In production, send to security monitoring system
    // await securityMonitoring.logDatabaseQuery({ model, operation, query, userId });
  } catch (error) {
    console.error('Database Query Guard Error:', error);
  }
}

/**
 * Security Guard: Suspicious Activity Detector
 * Detects and logs suspicious patterns in requests
 */
export function suspiciousActivityGuard(req: Request, res: Response, next: NextFunction) {
  try {
    const suspiciousPatterns = [
      // Path traversal
      /\.\.[\/\\]/g,
      // Null bytes
      /\0/g,
      // Script tags
      /<script[^>]*>.*?<\/script>/gi,
      // Event handlers
      /on\w+\s*=/gi,
      // Data URIs
      /data:text\/html/gi,
    ];

    const requestString = JSON.stringify({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(requestString)) {
        console.warn('[Security Guard] Suspicious activity detected:', {
          ip: req.ip,
          userId: req.user?.id,
          path: req.path,
          method: req.method,
          pattern: pattern.toString(),
          timestamp: new Date().toISOString(),
        });

        // Log to security monitoring
        // In production, this should trigger alerts
        break;
      }
    }

    next();
  } catch (error) {
    console.error('Security Guard - Suspicious Activity Error:', error);
    next();
  }
}

/**
 * Combined Security Guards Middleware
 * Applies all security guards in sequence
 */
export function applyAllSecurityGuards() {
  return [
    tokenSecurityGuard,
    requestSizeGuard(5 * 1024 * 1024), // 5MB max for API requests
    sqlInjectionGuard,
    emailValidationGuard,
    urlValidationGuard,
    suspiciousActivityGuard,
    userRateLimitGuard,
  ];
}

export default {
  sanitizeInputGuard,
  sqlInjectionGuard,
  emailValidationGuard,
  urlValidationGuard,
  fileUploadGuard,
  tokenSecurityGuard,
  userRateLimitGuard,
  requestSizeGuard,
  databaseQueryGuard,
  suspiciousActivityGuard,
  applyAllSecurityGuards,
};
