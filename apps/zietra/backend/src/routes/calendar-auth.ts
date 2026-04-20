import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { google } from 'googleapis';

const router = Router();
const prisma = new PrismaClient();

// Test endpoint
router.get('/test', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Calendar routes are working!',
    timestamp: new Date().toISOString()
  });
});

// Google Calendar OAuth - Initiate connection
router.get('/google/connect', (req: Request, res: Response) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${process.env.BACKEND_URL || 'https://zietra.com'}/api/calendar/google/callback`;

  if (!clientId || !clientSecret) {
    return res.status(500).json({
      error: 'Google OAuth not configured',
      message: 'Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET'
    });
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  // Get userId from query params (will be passed from frontend)
  const userId = req.query.userId as string || 'test-user';

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ],
    prompt: 'consent',
    state: userId
  });

  console.log('[GOOGLE OAUTH] Initiating connection for user:', userId);
  res.redirect(authUrl);
});

// Google Calendar OAuth - Callback handler
router.get('/google/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error } = req.query;

    // Handle user denial
    if (error) {
      console.error('[GOOGLE OAUTH] User denied access:', error);
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Calendar Connection Failed</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 600px;
              margin: 100px auto;
              padding: 20px;
              text-align: center;
            }
            .error { color: #dc3545; font-size: 24px; margin-bottom: 20px; }
            .message { color: #666; margin-bottom: 30px; }
            .button {
              background: #007bff;
              color: white;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 4px;
              display: inline-block;
            }
          </style>
        </head>
        <body>
          <div class="error">❌ Calendar Connection Cancelled</div>
          <div class="message">You denied access to your Google Calendar.</div>
          <a href="https://zietra.com" class="button">Back to CRM</a>
        </body>
        </html>
      `);
    }

    if (!code) {
      return res.status(400).json({
        error: 'No authorization code received'
      });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${process.env.BACKEND_URL || 'https://zietra.com'}/api/calendar/google/callback`;

    if (!clientId || !clientSecret) {
      return res.status(500).json({
        error: 'Google OAuth not configured'
      });
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

    // Exchange authorization code for tokens
    console.log('[GOOGLE OAUTH] Exchanging code for tokens...');
    const { tokens } = await oauth2Client.getToken(code as string);

    console.log('[GOOGLE OAUTH] Tokens received:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiryDate: tokens.expiry_date
    });

    // Set credentials to get user info
    oauth2Client.setCredentials(tokens);

    // Get user's email
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const userEmail = userInfo.data.email!;

    console.log('[GOOGLE OAUTH] User email:', userEmail);

    // Get userId from state parameter
    const userId = state as string || 'test-user';

    // For now, we'll find user by email (you can modify this to use actual userId)
    let user;

    if (userId === 'test-user') {
      // Find user by the email they connected with
      user = await prisma.user.findFirst({
        where: {
          email: userEmail
        }
      });

      // If no user found, use the first admin user for testing
      if (!user) {
        user = await prisma.user.findFirst({
          where: {
            role: 'ADMIN'
          }
        });
      }
    } else {
      // Use the userId from state parameter
      user = await prisma.user.findUnique({
        where: {
          id: userId as string
        }
      });
    }

    if (!user) {
      console.error('[GOOGLE OAUTH] No user found for:', { userId, userEmail });
      return res.status(404).json({
        error: 'User not found',
        message: 'Could not find user to save tokens'
      });
    }

    console.log('[GOOGLE OAUTH] Saving tokens for user:', user.id, user.email);

    // Save tokens to database
    await prisma.user.update({
      where: {
        id: user.id
      },
      data: {
        googleCalendarAccessToken: tokens.access_token,
        googleCalendarRefreshToken: tokens.refresh_token,
        googleCalendarTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        googleCalendarConnected: true,
        googleCalendarEmail: userEmail
      }
    });

    console.log('[GOOGLE OAUTH] ✅ Successfully connected Google Calendar for user:', user.email);

    // Success page
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Calendar Connected Successfully</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 100px auto;
            padding: 20px;
            text-align: center;
          }
          .success { color: #28a745; font-size: 24px; margin-bottom: 20px; }
          .message { color: #666; margin-bottom: 30px; }
          .details {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
            text-align: left;
          }
          .details h3 { margin-top: 0; color: #333; }
          .details p { margin: 8px 0; color: #666; }
          .button {
            background: #28a745;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 4px;
            display: inline-block;
          }
        </style>
      </head>
      <body>
        <div class="success">✅ Google Calendar Connected!</div>
        <div class="message">Your Google Calendar has been successfully connected to Zietra CRM.</div>

        <div class="details">
          <h3>What's Next?</h3>
          <p>✓ Your calendar is now synced</p>
          <p>✓ When you create meetings in CRM, they'll appear in your Google Calendar</p>
          <p>✓ Meeting invitations will be sent automatically</p>
          <p><strong>Connected Email:</strong> ${userEmail}</p>
        </div>

        <a href="https://zietra.com" class="button">Back to CRM</a>

        <script>
          // Auto-redirect after 5 seconds
          setTimeout(() => {
            window.location.href = 'https://zietra.com';
          }, 5000);
        </script>
      </body>
      </html>
    `);

  } catch (error: any) {
    console.error('[GOOGLE OAUTH] Error in callback:', error);

    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Calendar Connection Error</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 100px auto;
            padding: 20px;
            text-align: center;
          }
          .error { color: #dc3545; font-size: 24px; margin-bottom: 20px; }
          .message { color: #666; margin-bottom: 20px; }
          .details {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 30px;
            font-family: monospace;
            text-align: left;
            font-size: 12px;
          }
          .button {
            background: #007bff;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 4px;
            display: inline-block;
          }
        </style>
      </head>
      <body>
        <div class="error">❌ Connection Failed</div>
        <div class="message">There was an error connecting your Google Calendar.</div>
        <div class="details">${error.message}</div>
        <a href="https://zietra.com/api/calendar/google/connect" class="button">Try Again</a>
      </body>
      </html>
    `);
  }
});

// Disconnect Google Calendar
router.post('/google/disconnect', async (req: Request, res: Response) => {
  try {
    // Get userId from request body or auth token
    const userId = req.body.userId || (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User ID required'
      });
    }

    await prisma.user.update({
      where: {
        id: userId
      },
      data: {
        googleCalendarAccessToken: null,
        googleCalendarRefreshToken: null,
        googleCalendarTokenExpiry: null,
        googleCalendarConnected: false,
        googleCalendarEmail: null
      }
    });

    res.json({
      success: true,
      message: 'Google Calendar disconnected successfully'
    });

  } catch (error: any) {
    console.error('[GOOGLE OAUTH] Error disconnecting:', error);
    res.status(500).json({
      error: 'Failed to disconnect',
      message: error.message
    });
  }
});

// Get calendar connection status
router.get('/status', async (req: Request, res: Response) => {
  try {
    // Get userId from query params or auth token
    const userId = req.query.userId || (req as any).user?.id;

    if (!userId) {
      return res.json({
        google: {
          connected: false,
          message: 'Not authenticated'
        }
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId as string
      },
      select: {
        googleCalendarConnected: true,
        googleCalendarEmail: true,
        googleCalendarTokenExpiry: true
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json({
      google: {
        connected: user.googleCalendarConnected || false,
        email: user.googleCalendarEmail || null,
        tokenExpiry: user.googleCalendarTokenExpiry || null
      }
    });

  } catch (error: any) {
    console.error('[GOOGLE OAUTH] Error getting status:', error);
    res.status(500).json({
      error: 'Failed to get status',
      message: error.message
    });
  }
});

export default router;
