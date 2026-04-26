import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthUtils } from '../utils/auth';
import { AppError } from '../middleware/errorHandler';
import { prisma } from '../app';
import { logger } from '../utils/logger';
import passport from '../config/passport';
import { DefaultTemplateService } from '../services/default-template.service';

const router = Router();

// Validation middleware
// NOTE: normalizeEmail() defaults strip "+alias" and "." from gmail addresses,
// which mangles legitimate user emails. Lowercase only — preserve the rest.
const emailNormalizeOpts = {
  gmail_remove_dots: false,
  gmail_remove_subaddress: false,
  gmail_convert_googlemaildotcom: false,
  outlookdotcom_remove_subaddress: false,
  yahoo_remove_subaddress: false,
  icloud_remove_subaddress: false,
};

const validateRegistration = [
  body('email').isEmail().normalizeEmail(emailNormalizeOpts),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('firstName').trim().isLength({ min: 1 }).withMessage('First name is required'),
  body('lastName').trim().isLength({ min: 1 }).withMessage('Last name is required'),
];

const validateLogin = [
  body('email').isEmail().normalizeEmail(emailNormalizeOpts),
  body('password').isLength({ min: 1 }).withMessage('Password is required'),
];

// Register
router.post('/register', validateRegistration, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    const { email, password, firstName, lastName, role = 'USER' } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new AppError('User already exists with this email', 409);
    }

    // Hash password
    const passwordHash = await AuthUtils.hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        role,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Generate token
    const token = AuthUtils.generateToken(user as any);

    // Create default email template for new user (async, don't wait)
    DefaultTemplateService.ensureDefaultTemplate(user.id).catch((err) => {
      logger.error('Failed to create default template on registration:', err);
    });

    logger.info(`New user registered: ${email}`);

    res.status(201).json({
      message: 'User registered successfully',
      user,
      token,
    });
  } catch (error) {
    next(error);
  }
});

// Login
router.post('/login', validateLogin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    if (!user.isActive) {
      throw new AppError('Account is deactivated', 401);
    }

    // Verify password
    const isValidPassword = await AuthUtils.comparePassword(password, user.passwordHash);
    if (!isValidPassword) {
      throw new AppError('Invalid credentials', 401);
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate token
    const token = AuthUtils.generateToken(user);

    // Ensure user has default email template (async, don't wait)
    DefaultTemplateService.ensureDefaultTemplate(user.id).catch((err) => {
      logger.error('Failed to ensure default template on login:', err);
    });

    logger.info(`User logged in: ${email}`);

    // Check if user needs to change password
    const requirePasswordChange = user.requirePasswordChange || false;

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        teamRole: user.teamRole,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
      },
      token,
      requirePasswordChange, // Signal to frontend that password change is required
    });
  } catch (error) {
    next(error);
  }
});

// Forgot password
router.post('/forgot-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists
      res.json({
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
      return;
    }

    // Generate reset token (64 character random hex string)
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Save token to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpiry: resetExpiry,
      },
    });

    // Send reset email via Google Workspace SMTP
    const { EmailService } = await import('../services/google-smtp.service');
    const emailService = new EmailService();

    const resetUrl = `${process.env.FRONTEND_URL || 'https://zietra.com'}/reset-password?token=${resetToken}`;

    await emailService.sendPasswordResetEmail(user.email, user.firstName, resetUrl, resetToken);

    logger.info(`Password reset email sent to: ${email}`);

    res.json({
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (error) {
    next(error);
  }
});

// Reset password
router.post('/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      throw new AppError('Token and password are required', 400);
    }

    if (password.length < 8) {
      throw new AppError('Password must be at least 8 characters long', 400);
    }

    // Find user with valid reset token
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpiry: {
          gt: new Date(), // Token not expired
        },
      },
    });

    if (!user) {
      throw new AppError('Invalid or expired reset token', 400);
    }

    // Hash new password
    const passwordHash = await AuthUtils.hashPassword(password);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
    });

    logger.info(`Password reset successful for: ${user.email}`);

    res.json({
      message: 'Password reset successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Refresh token
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = AuthUtils.extractTokenFromHeader(authHeader);

    if (!token) {
      throw new AppError('Token is required', 401);
    }

    const payload = AuthUtils.verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || !user.isActive) {
      throw new AppError('Invalid token', 401);
    }

    const newToken = AuthUtils.generateToken(user);

    res.json({
      message: 'Token refreshed successfully',
      token: newToken,
    });
  } catch (error) {
    next(error);
  }
});

// Change password (requires authentication)
router.post('/change-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = AuthUtils.extractTokenFromHeader(authHeader);

    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    const payload = AuthUtils.verifyToken(token);
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      throw new AppError('Current password and new password are required', 400);
    }

    if (newPassword.length < 8) {
      throw new AppError('New password must be at least 8 characters long', 400);
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || !user.isActive) {
      throw new AppError('User not found', 404);
    }

    // Verify current password
    const isValidPassword = await AuthUtils.comparePassword(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      throw new AppError('Current password is incorrect', 401);
    }

    // Hash new password
    const newPasswordHash = await AuthUtils.hashPassword(newPassword);

    // Update password and clear requirePasswordChange flag
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        requirePasswordChange: false,
      },
    });

    logger.info(`Password changed for user: ${user.email}`);

    res.json({
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// EMAIL VERIFICATION ENDPOINTS
// ============================================

// Verify email with OTP
router.post('/verify-email', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, token } = req.body;

    if (!email || !token) {
      throw new AppError('Email and verification code are required', 400);
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.emailVerified) {
      throw new AppError('Email already verified', 400);
    }

    // Check token
    if (user.verificationToken !== token) {
      throw new AppError('Invalid verification code', 400);
    }

    // Check expiry
    if (user.verificationTokenExpiry && new Date() > user.verificationTokenExpiry) {
      throw new AppError('Verification code expired. Please request a new one.', 400);
    }

    // Update user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null,
      },
    });

    // Generate JWT token
    const jwtToken = AuthUtils.generateToken(user);

    logger.info(`Email verified for user: ${email}`);

    res.json({
      success: true,
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        emailVerified: true,
      },
      message: 'Email verified successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Resend verification code
router.post('/resend-verification', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new AppError('Email is required', 400);
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.emailVerified) {
      throw new AppError('Email already verified', 400);
    }

    // Generate new OTP
    const { EmailService } = await import('../services/google-smtp.service');
    const emailService = new EmailService();
    const otp = EmailService.generateOTP();
    const otpExpiry = EmailService.getOTPExpiry();

    // Update user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken: otp,
        verificationTokenExpiry: otpExpiry,
      },
    });

    // Send email
    await emailService.sendVerificationEmail(email, user.firstName, otp);

    logger.info(`Verification code resent to: ${email}`);

    res.json({
      success: true,
      message: 'New verification code sent',
    });
  } catch (error) {
    next(error);
  }
});

// Google OAuth Routes
router.get('/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false
  })
);

router.get('/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth_failed`
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as any;

      if (!user) {
        throw new AppError('Authentication failed', 401);
      }

      // Generate JWT token
      const token = AuthUtils.generateToken(user);

      // Redirect to frontend with token - FRONTEND_URL is required
      if (!process.env.FRONTEND_URL) {
        throw new AppError('FRONTEND_URL environment variable is required', 500);
      }

      const frontendUrl = process.env.FRONTEND_URL;
      res.redirect(`${frontendUrl}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      }))}`);
    } catch (error) {
      next(error);
    }
  }
);

export default router;