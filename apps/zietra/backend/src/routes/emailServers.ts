import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { authenticate } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// ✅ Enable authentication for all email server routes
router.use(authenticate);

// Temporary storage for verification codes (in production, use Redis)
const verificationCodes = new Map<string, { code: string; expiresAt: Date }>();

// GET /api/email-servers - Get all email server configurations
router.get('/', async (req, res, next) => {
  try {
    // ✅ Use authenticated user instead of query param
    const servers = await prisma.emailServerConfig.findMany({
      where: { userId: req.user?.id },
      orderBy: { createdAt: 'desc' },
    });

    // Don't expose passwords
    const sanitizedServers = servers.map(s => ({
      ...s,
      password: '********',
    }));

    return res.json({ servers: sanitizedServers });
  } catch (error) {
    return next(error);
  }
});

// POST /api/email-servers - Create new email server configuration
router.post('/', async (req, res, next) => {
  try {
    const {
      name,
      provider,
      host,
      port,
      secure,
      username,
      password,
      fromEmail,
      fromName,
      maxPerDay,
      maxPerHour,
    } = req.body;

    if (!name || !provider || !host || !port || !username || !password || !fromEmail) {
      return res.status(400).json({
        error: 'name, provider, host, port, username, password, and fromEmail are required',
      });
    }

    // Encrypt password (in production, use proper encryption)
    const encryptedPassword = Buffer.from(password).toString('base64');

    const server = await prisma.emailServerConfig.create({
      data: {
        userId: req.user!.id, // ✅ Use authenticated user

        name,
        provider,
        host,
        port: Number.parseInt(port),
        secure: secure !== false,
        username,
        password: encryptedPassword,
        fromEmail,
        fromName,
        maxPerDay: maxPerDay ? Number.parseInt(maxPerDay) : null,
        maxPerHour: maxPerHour ? Number.parseInt(maxPerHour) : null,
        isActive: false, // Inactive until verified
        isVerified: false,
      },
    });

    return res.status(201).json({
      ...server,
      password: '********',
    });
  } catch (error) {
    return next(error);
  }
});

// POST /api/email-servers/:id/test - Test SMTP connection
router.post('/:id/test', async (req, res, next) => {
  try {
    const { id } = req.params;

    // ✅ Verify ownership
    const server = await prisma.emailServerConfig.findFirst({
      where: {
        id,
        userId: req.user?.id,
      },
    });

    if (!server) {
      return res.status(404).json({ error: 'Email server not found' });
    }

    // Decrypt password
    const decryptedPassword = Buffer.from(server.password, 'base64').toString();

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: server.host,
      port: server.port,
      secure: server.secure,
      auth: {
        user: server.username,
        pass: decryptedPassword,
      },
    });

    // Verify connection
    try {
      await transporter.verify();

      // Update last tested timestamp
      await prisma.emailServerConfig.update({
        where: { id },
        data: { lastTested: new Date() },
      });

      return res.json({
        success: true,
        message: 'SMTP connection successful',
      });
    } catch (smtpError: any) {
      return res.status(400).json({
        success: false,
        error: 'SMTP connection failed',
        details: smtpError.message,
      });
    }
  } catch (error) {
    return next(error);
  }
});

// POST /api/email-servers/:id/send-verification - Send verification email
router.post('/:id/send-verification', async (req, res, next) => {
  try {
    const { id } = req.params;

    // ✅ Verify ownership
    const server = await prisma.emailServerConfig.findFirst({
      where: {
        id,
        userId: req.user?.id,
      },
    });

    if (!server) {
      return res.status(404).json({ error: 'Email server not found' });
    }

    // Generate 6-digit verification code
    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store verification code
    verificationCodes.set(id, { code, expiresAt });

    // Decrypt password
    const decryptedPassword = Buffer.from(server.password, 'base64').toString();

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: server.host,
      port: server.port,
      secure: server.secure,
      auth: {
        user: server.username,
        pass: decryptedPassword,
      },
    });

    // Send verification email
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .code { font-size: 32px; font-weight: bold; color: #667eea; background: white; padding: 20px; text-align: center; border-radius: 8px; letter-spacing: 8px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Email Verification</h1>
          </div>
          <div class="content">
            <h2>Verify Your Email Address</h2>
            <p>You're setting up <strong>${server.fromEmail}</strong> as a sending email for campaigns in your CRM.</p>
            <p>Please enter this verification code to confirm:</p>
            <div class="code">${code}</div>
            <p><strong>This code expires in 15 minutes.</strong></p>
            <p>If you didn't request this verification, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>CRM Email Verification System</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await transporter.sendMail({
        from: `"${server.fromName || 'CRM System'}" <${server.fromEmail}>`,
        to: server.fromEmail,
        subject: '🔐 Verify Your Email Address - CRM System',
        html: htmlContent,
      });

      return res.json({
        success: true,
        message: `Verification code sent to ${server.fromEmail}`,
        expiresAt,
      });
    } catch (emailError: any) {
      return res.status(500).json({
        success: false,
        error: 'Failed to send verification email',
        details: emailError.message,
      });
    }
  } catch (error) {
    return next(error);
  }
});

// POST /api/email-servers/:id/verify - Verify email with code
router.post('/:id/verify', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Verification code is required' });
    }

    const stored = verificationCodes.get(id);

    if (!stored) {
      return res.status(400).json({
        success: false,
        error: 'No verification code found. Please request a new code.',
      });
    }

    if (new Date() > stored.expiresAt) {
      verificationCodes.delete(id);
      return res.status(400).json({
        success: false,
        error: 'Verification code expired. Please request a new code.',
      });
    }

    if (stored.code !== code) {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification code. Please try again.',
      });
    }

    // Verification successful - update server
    await prisma.emailServerConfig.update({
      where: { id },
      data: {
        isVerified: true,
        isActive: true,
      },
    });

    // Clear verification code
    verificationCodes.delete(id);

    return res.json({
      success: true,
      message: 'Email verified successfully! You can now use this email to send campaigns.',
    });
  } catch (error) {
    return next(error);
  }
});

// GET /api/email-servers/verified - Get only verified email servers
router.get('/verified', async (req, res, next) => {
  try {
    // ✅ Use authenticated user instead of query param
    const servers = await prisma.emailServerConfig.findMany({
      where: {
        userId: req.user?.id,
        isVerified: true,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        fromEmail: true,
        fromName: true,
        provider: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ servers });
  } catch (error) {
    return next(error);
  }
});

// DELETE /api/email-servers/:id - Delete email server
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // ✅ Verify ownership before delete
    const existing = await prisma.emailServerConfig.findFirst({
      where: {
        id,
        userId: req.user?.id,
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Email server not found' });
    }

    await prisma.emailServerConfig.delete({
      where: { id },
    });

    return res.json({ success: true, message: 'Email server deleted' });
  } catch (error) {
    return next(error);
  }
});

export default router;
