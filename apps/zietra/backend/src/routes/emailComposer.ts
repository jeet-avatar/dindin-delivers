// @ts-nocheck
import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../app';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all email drafts
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as any).id;

    const emails = await prisma.emailComposer.findMany({
      where: { userId },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ emails });
  } catch (error) {
    next(error);
  }
});

// Get email by ID
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req.user as any).id;

    const email = await prisma.emailComposer.findFirst({
      where: { id, userId },
      include: {
        contact: true,
      },
    });

    if (!email) {
      throw new AppError('Email not found', 404);
    }

    res.json({ email });
  } catch (error) {
    next(error);
  }
});

// Create or save draft
router.post('/', [
  body('subject').notEmpty().withMessage('Subject is required'),
  body('htmlBody').notEmpty().withMessage('Email body is required'),
  body('toEmails').isArray().notEmpty().withMessage('At least one recipient is required'),
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('Validation failed', 400);
    }

    const userId = (req.user as any).id;
    const {
      subject,
      htmlBody,
      textBody,
      toEmails,
      ccEmails = [],
      bccEmails = [],
      attachments,
      contactId,
      scheduledAt,
    } = req.body;

    const email = await prisma.emailComposer.create({
      data: {
        userId,
        contactId,
        subject,
        htmlBody,
        textBody,
        toEmails,
        ccEmails,
        bccEmails,
        attachments,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        isDraft: true,
        isSent: false,
      },
      include: {
        contact: true,
      },
    });

    logger.info(`Email draft created: ${email.id}`);

    res.status(201).json({
      message: 'Email draft saved',
      email,
    });
  } catch (error) {
    next(error);
  }
});

// Update email draft
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req.user as any).id;

    const existingEmail = await prisma.emailComposer.findFirst({
      where: { id, userId },
    });

    if (!existingEmail) {
      throw new AppError('Email not found', 404);
    }

    if (existingEmail.isSent) {
      throw new AppError('Cannot edit sent email', 400);
    }

    const {
      subject,
      htmlBody,
      textBody,
      toEmails,
      ccEmails,
      bccEmails,
      attachments,
      scheduledAt,
    } = req.body;

    const email = await prisma.emailComposer.update({
      where: { id },
      data: {
        subject,
        htmlBody,
        textBody,
        toEmails,
        ccEmails,
        bccEmails,
        attachments,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      },
      include: {
        contact: true,
      },
    });

    logger.info(`Email draft updated: ${email.id}`);

    res.json({
      message: 'Email draft updated',
      email,
    });
  } catch (error) {
    next(error);
  }
});

// Send email
router.post('/:id/send', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req.user as any).id;

    const email = await prisma.emailComposer.findFirst({
      where: { id, userId },
    });

    if (!email) {
      throw new AppError('Email not found', 404);
    }

    if (email.isSent) {
      throw new AppError('Email already sent', 400);
    }

    // TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
    // For now, we'll just mark it as sent

    const sentEmail = await prisma.emailComposer.update({
      where: { id },
      data: {
        isDraft: false,
        isSent: true,
        sentAt: new Date(),
      },
      include: {
        contact: true,
      },
    });

    logger.info(`Email sent: ${sentEmail.id} to ${sentEmail.toEmails.join(', ')}`);

    res.json({
      message: 'Email sent successfully',
      email: sentEmail,
    });
  } catch (error) {
    next(error);
  }
});

// Delete email
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req.user as any).id;

    const email = await prisma.emailComposer.findFirst({
      where: { id, userId },
    });

    if (!email) {
      throw new AppError('Email not found', 404);
    }

    await prisma.emailComposer.delete({
      where: { id },
    });

    logger.info(`Email deleted: ${id}`);

    res.json({ message: 'Email deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
