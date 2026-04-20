import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { TwilioVerifyService } from '../services/twilio-verify.service';

const router = Router();

// Public routes for phone verification (no auth required)
// These are used during signup/login flows

/**
 * @route POST /api/verification/send
 * @desc Send OTP verification code to phone number
 * @access Public
 */
router.post('/send', async (req, res, next) => {
  try {
    const { phoneNumber, channel } = req.body;

    if (!phoneNumber) {
      throw new AppError('Phone number is required', 400);
    }

    // Validate phone number format (E.164 format: +1234567890)
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phoneNumber)) {
      throw new AppError('Invalid phone number format. Use E.164 format: +1234567890', 400);
    }

    const verifyService = new TwilioVerifyService();
    const result = await verifyService.sendVerificationCode(
      phoneNumber,
      channel === 'call' ? 'call' : 'sms'
    );

    res.json({
      success: true,
      message: `Verification code sent via ${channel || 'SMS'}`,
      data: {
        to: result.to,
        channel: result.channel,
        status: result.status,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/verification/verify
 * @desc Verify the OTP code
 * @access Public
 */
router.post('/verify', async (req, res, next) => {
  try {
    const { phoneNumber, code } = req.body;

    if (!phoneNumber || !code) {
      throw new AppError('Phone number and verification code are required', 400);
    }

    const verifyService = new TwilioVerifyService();
    const result = await verifyService.verifyCode(phoneNumber, code);

    if (!result.success) {
      throw new AppError('Invalid or expired verification code', 400);
    }

    res.json({
      success: true,
      message: 'Phone number verified successfully',
      data: {
        verified: true,
        status: result.status,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/verification/send-call
 * @desc Send verification code via voice call
 * @access Public
 */
router.post('/send-call', async (req, res, next) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      throw new AppError('Phone number is required', 400);
    }

    const verifyService = new TwilioVerifyService();
    const result = await verifyService.sendVerificationCall(phoneNumber);

    res.json({
      success: true,
      message: 'Verification code will be delivered via phone call',
      data: {
        to: result.to,
        channel: result.channel,
        status: result.status,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Protected routes (require authentication)
router.use(authenticate);

/**
 * @route POST /api/verification/send-to-contact
 * @desc Send verification code to a contact in CRM
 * @access Private
 */
router.post('/send-to-contact', async (req, res, next) => {
  try {
    const { contactId, channel } = req.body;

    if (!contactId) {
      throw new AppError('Contact ID is required', 400);
    }

    // TODO: Get contact's phone number from database
    // This would query the contacts table to get the phone number
    // For now, using phone from request body
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      throw new AppError('Phone number is required', 400);
    }

    const verifyService = new TwilioVerifyService();
    const result = await verifyService.sendVerificationCode(phoneNumber, channel || 'sms');

    res.json({
      success: true,
      message: 'Verification code sent to contact',
      data: {
        contactId,
        to: result.to,
        channel: result.channel,
        status: result.status,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
