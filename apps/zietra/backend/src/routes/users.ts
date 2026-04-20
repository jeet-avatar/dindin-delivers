import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { prisma } from '../app';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all users (admin only)
router.get('/', authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    // TODO: Implement user listing with pagination
    res.json({ message: 'Users endpoint - to be implemented' });
  } catch (error) {
    next(error);
  }
});

// Get current user
router.get('/me', async (req, res, next) => {
  try {
    res.json({
      user: req.user,
    });
  } catch (error) {
    next(error);
  }
});

// Update current user profile
router.put('/me', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const { firstName, lastName, phone, timezone, avatar } = req.body;

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(phone !== undefined && { phone }),
        ...(timezone && { timezone }),
        ...(avatar !== undefined && { avatar }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        timezone: true,
        avatar: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        // Note: notification/display preference fields not yet in User schema
        // emailNotifications, dealUpdates, newContacts, weeklyReport, marketingEmails, language, dateFormat, timeFormat, theme, compactView
      },
    });

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
});

// Update notification preferences
router.put('/me/preferences', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const { emailNotifications, dealUpdates, newContacts, weeklyReport, marketingEmails } = req.body;

    // Note: Notification preference fields not yet in User schema
    // Return the requested values as-is (stored client-side until migration)
    res.json({
      message: 'Notification preferences updated successfully',
      preferences: {
        emailNotifications: emailNotifications ?? true,
        dealUpdates: dealUpdates ?? true,
        newContacts: newContacts ?? true,
        weeklyReport: weeklyReport ?? false,
        marketingEmails: marketingEmails ?? false,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Update user display/app preferences
router.put('/me/display-preferences', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const { language, dateFormat, timeFormat, theme, compactView, timezone } = req.body;

    // Only update timezone (exists on User model), rest are not yet migrated
    if (timezone !== undefined) {
      await prisma.user.update({
        where: { id: userId },
        data: { timezone },
      });
    }

    // Return requested values as-is (stored client-side until migration)
    res.json({
      message: 'Display preferences updated successfully',
      preferences: {
        language: language ?? 'en',
        dateFormat: dateFormat ?? 'MM/DD/YYYY',
        timeFormat: timeFormat ?? '12h',
        theme: theme ?? 'dark',
        compactView: compactView ?? false,
        timezone: timezone ?? 'America/New_York',
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;