import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, getAccountOwnerId } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { TwilioService } from '../services/twilio.service';
import { EmailService } from '../services/email.service';
import { GoogleCalendarService } from '../services/google-calendar.service';
import { ZoomService } from '../services/zoom.service';
import { ZoomUserService } from '../services/zoom-user.service';

const router = Router();
const prisma = new PrismaClient();

// Enable authentication for all activity routes
router.use(authenticate);

// GET /api/activities - Get all activities
router.get('/', async (req, res, next) => {
  try {
    const { 
      contactId,
      type,
      page = '1', 
      limit = '20' 
    } = req.query as {
      contactId?: string;
      type?: string;
      page?: string;
      limit?: string;
    };

    const pageNum = Number.parseInt(page);
    const limitNum = Number.parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause with team collaboration support
    const accountOwnerId = getAccountOwnerId(req);
    const userId = req.user?.id;

    const teamAccessConditions = [
      { userId: userId },
      ...(req.user?.teamRole === 'OWNER' ? [{
        user: {
          OR: [
            { id: accountOwnerId },
            { accountOwnerId: accountOwnerId }
          ]
        }
      }] : []),
      { shares: { some: { userId: userId } } }
    ];

    const where: any = {
      OR: teamAccessConditions
    };

    if (contactId) {
      where.contactId = contactId;
    }

    if (type && type !== '') {
      where.type = type;
    }

    // Get activities with relations
    const activities = await prisma.activity.findMany({
      where,
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        deal: {
          select: {
            id: true,
            title: true,
          },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limitNum,
    });

    // Get total count
    const total = await prisma.activity.count({ where });

    res.json({
      activities,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/activities/contacts/:contactId - Get activities for specific contact
router.get('/contacts/:contactId', async (req, res, next) => {
  try {
    const { contactId } = req.params;
    const userId = req.user!.id;

    // CRITICAL: Verify contact belongs to this user (data isolation)
    const contact = await prisma.contact.findFirst({
      where: {
        id: contactId,
        userId, // ✅ Data isolation maintained
      },
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Get activities for this contact with userId filter
    const activities = await prisma.activity.findMany({
      where: {
        contactId,
        userId, // ✅ Data isolation maintained
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        deal: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Return empty array if no activities (NOT 404)
    res.json({ activities });
  } catch (error) {
    next(error);
  }
});

// POST /api/activities - Create new activity
router.post('/', async (req, res, next) => {
  try {
    const {
      type = 'NOTE',
      subject,
      description,
      contactId,
      dealId,
      dueDate,
      priority = 'MEDIUM',
    } = req.body;

    const activity = await prisma.activity.create({
      data: {
        type,
        subject,
        description,
        contactId: contactId || null,
        dealId: dealId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority,
        userId: req.user!.id,
      },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        deal: {
          select: {
            id: true,
            title: true,
          },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    res.status(201).json({ activity });
  } catch (error) {
    next(error);
  }
});

// POST /api/activities/:id/send-sms - Send SMS via Twilio
router.post('/:id/send-sms', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { phoneNumber, message } = req.body;
    const userId = req.user!.id;

    // Validate inputs
    if (!phoneNumber || !message) {
      throw new AppError('Phone number and message are required', 400);
    }

    // Verify activity belongs to user
    const activity = await prisma.activity.findFirst({
      where: { id, userId },
    });

    if (!activity) {
      throw new AppError('Activity not found', 404);
    }

    // Send SMS via Twilio
    const twilioService = new TwilioService();
    const smsResult = await twilioService.sendSMS(phoneNumber, message);

    // Update activity with SMS metadata
    const updatedActivity = await prisma.activity.update({
      where: { id },
      data: {
        type: 'SMS',
        smsTo: phoneNumber,
        smsFrom: smsResult.from || process.env.TWILIO_PHONE_NUMBER,
        smsSid: smsResult.sid,
        smsStatus: smsResult.status,
        smsSentAt: new Date(),
        subject: `SMS to ${phoneNumber}`,
        description: message,
      },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: 'SMS sent successfully',
      activity: updatedActivity,
      sms: smsResult,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/activities/:id/send-email - Send email via SMTP
router.post('/:id/send-email', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { to, cc, bcc, subject, htmlContent, textContent } = req.body;
    const userId = req.user!.id;

    // Validate inputs
    if (!to || !Array.isArray(to) || to.length === 0) {
      throw new AppError('At least one recipient email is required', 400);
    }

    if (!subject || !htmlContent) {
      throw new AppError('Subject and email content are required', 400);
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Verify activity belongs to user
    const activity = await prisma.activity.findFirst({
      where: { id, userId },
    });

    if (!activity) {
      throw new AppError('Activity not found', 404);
    }

    // Send email
    const emailService = new EmailService();
    const emailResult = await emailService.sendEmail({
      from: `${user.firstName} ${user.lastName} <${user.email}>`,
      to,
      cc,
      bcc,
      subject,
      html: htmlContent,
      text: textContent,
    });

    // Update activity with email metadata
    const updatedActivity = await prisma.activity.update({
      where: { id },
      data: {
        type: 'EMAIL',
        emailTo: to,
        emailFrom: user.email,
        emailCc: cc || [],
        emailBcc: bcc || [],
        emailMessageId: emailResult.messageId,
        emailStatus: 'sent',
        emailSentAt: new Date(),
        subject: subject,
        description: textContent || htmlContent,
      },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: 'Email sent successfully',
      activity: updatedActivity,
      email: emailResult,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/activities/:id/create-meeting - Create calendar meeting (Google/Zoom/Teams)
router.post('/:id/create-meeting', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      startTime,
      endTime,
      attendees,
      location,
      timezone,
      calendarPlatform = 'google',
      sendInvitation = false
    } = req.body;
    const userId = req.user!.id;

    // Validate inputs
    if (!title || !startTime || !endTime) {
      throw new AppError('Title, start time, and end time are required', 400);
    }

    if (!attendees || !Array.isArray(attendees) || attendees.length === 0) {
      throw new AppError('At least one attendee email is required', 400);
    }

    // Verify activity belongs to user
    const activity = await prisma.activity.findFirst({
      where: { id, userId },
    });

    if (!activity) {
      throw new AppError('Activity not found', 404);
    }

    // Get user with calendar OAuth tokens
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        googleCalendarAccessToken: true,
        googleCalendarRefreshToken: true,
        googleCalendarConnected: true,
        zoomAccessToken: true,
        zoomRefreshToken: true,
        zoomConnected: true,
        zoomUserId: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    let meetingLink = '';
    let meetingPassword = '';
    let calendarEventId = '';
    let meetingPlatform = calendarPlatform;

    // Calculate duration in minutes
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));

    // Create meeting based on selected platform - ENTERPRISE OAUTH VERSION
    if (calendarPlatform === 'zoom') {
      // Check if user has connected Zoom
      if (!user.zoomConnected || !user.zoomRefreshToken || !user.zoomUserId) {
        throw new AppError(
          'Please connect your Zoom account in Settings to create Zoom meetings. Go to Settings → Calendar Connections.',
          400
        );
      }

      try {
        // Use USER's Zoom account (not app's account)
        const zoomService = new ZoomUserService(
          user.zoomAccessToken!,
          user.zoomRefreshToken!,
          user.zoomUserId!
        );

        const zoomMeeting = await zoomService.createMeeting({
          topic: title,
          agenda: description || '',
          startTime: start,
          duration: durationMinutes,
          timezone: timezone || 'America/New_York',
          settings: {
            hostVideo: true,
            participantVideo: true,
            joinBeforeHost: true,
            muteUponEntry: false,
            waitingRoom: false,
            autoRecording: 'none',
          },
        });

        meetingLink = zoomMeeting.joinUrl;
        meetingPassword = zoomMeeting.password;
        calendarEventId = zoomMeeting.id.toString();

        // Update user's tokens if they were refreshed
        const newAccessToken = zoomService.getAccessToken();
        if (newAccessToken !== user.zoomAccessToken) {
          await prisma.user.update({
            where: { id: userId },
            data: {
              zoomAccessToken: newAccessToken,
              zoomRefreshToken: zoomService.getRefreshToken(),
            },
          });
        }

        console.log(`[Zoom Meeting Created in USER's Account] User: ${userId}, ID: ${zoomMeeting.id}, Link: ${meetingLink}`);
      } catch (error: any) {
        console.error('[Zoom User Meeting Creation Failed]:', error.message);
        throw new AppError(`Failed to create Zoom meeting: ${error.message}`, 500);
      }
    } else if (calendarPlatform === 'google') {
      // Check if user has connected Google Calendar
      if (!user.googleCalendarConnected || !user.googleCalendarRefreshToken) {
        throw new AppError(
          'Please connect your Google Calendar in Settings to create Google Meet meetings. Go to Settings → Calendar Connections.',
          400
        );
      }

      try {
        // Use USER's Google Calendar (not app's account)
        const calendarService = new GoogleCalendarService(
          user.googleCalendarAccessToken!,
          user.googleCalendarRefreshToken!
        );

        const event = await calendarService.createMeeting({
          summary: title,
          description: description || '',
          startTime: start,
          endTime: end,
          attendees,
          location: location || 'Online',
          timezone: timezone || 'America/New_York',
        });

        meetingLink = event.meetLink;
        calendarEventId = event.id || '';
        meetingPassword = ''; // Google Meet doesn't use passwords

        console.log(`[Google Meet Created in USER's Calendar] User: ${userId}, Link: ${meetingLink}`);
      } catch (error: any) {
        console.error('[Google Calendar Meeting Creation Failed]:', error.message);
        throw new AppError(`Failed to create Google Calendar meeting: ${error.message}`, 500);
      }
    } else if (calendarPlatform === 'teams') {
      // Microsoft Teams - not yet implemented
      throw new AppError(
        'Microsoft Teams integration is not yet available. Please use Google Calendar or Zoom.',
        501
      );
    } else {
      throw new AppError('Invalid calendar platform. Must be: google, zoom, or teams', 400);
    }

    // Update activity with meeting metadata
    const updatedActivity = await prisma.activity.update({
      where: { id },
      data: {
        type: 'MEETING',
        meetingLink: meetingLink,
        meetingStartTime: start,
        meetingEndTime: end,
        meetingAttendees: attendees,
        meetingLocation: location || 'Online',
        meetingTimezone: timezone || 'America/New_York',
        subject: title,
        description: `${description || ''}\n\n🔗 Meeting Link: ${meetingLink}${meetingPassword ? `\n🔐 Password: ${meetingPassword}` : ''}`,
      },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // TODO: Send calendar invitations via email if sendInvitation is true
    // This would involve generating .ics files and sending via EmailService

    res.json({
      success: true,
      message: `${meetingPlatform.charAt(0).toUpperCase() + meetingPlatform.slice(1)} meeting created successfully`,
      activity: updatedActivity,
      meetingLink: meetingLink,
      meetingPassword: meetingPassword,
      platform: meetingPlatform,
      calendarEventId: calendarEventId,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/activities/:id/complete - Mark task as complete
router.put('/:id/complete', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Verify activity belongs to user
    const activity = await prisma.activity.findFirst({
      where: { id, userId },
    });

    if (!activity) {
      throw new AppError('Activity not found', 404);
    }

    // Update activity as completed
    const updatedActivity = await prisma.activity.update({
      where: { id },
      data: {
        isCompleted: true,
        completedAt: new Date(),
        taskStatus: 'done',
      },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        deal: {
          select: {
            id: true,
            title: true,
          },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: 'Activity marked as complete',
      activity: updatedActivity,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/activities/:id/sms-status - Check SMS delivery status
router.get('/:id/sms-status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Verify activity belongs to user
    const activity = await prisma.activity.findFirst({
      where: { id, userId, type: 'SMS' },
    });

    if (!activity) {
      throw new AppError('SMS activity not found', 404);
    }

    if (!activity.smsSid) {
      throw new AppError('No SMS SID found for this activity', 400);
    }

    // Get SMS status from Twilio
    const twilioService = new TwilioService();
    const status = await twilioService.getSMSStatus(activity.smsSid);

    // Update activity with latest status
    await prisma.activity.update({
      where: { id },
      data: {
        smsStatus: status.status,
      },
    });

    res.json({
      success: true,
      status,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/activities/zoom/test - Test Zoom connection
router.get('/zoom/test', async (req, res, next) => {
  try {
    const zoomService = new ZoomService();
    const isConnected = await zoomService.testConnection();

    res.json({
      success: true,
      connected: isConnected,
      message: isConnected
        ? 'Zoom connection successful'
        : 'Zoom connection failed. Please check your credentials.',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      connected: false,
      message: error.message,
    });
  }
});

export default router;