import { google } from 'googleapis';
import type { calendar_v3 } from 'googleapis';

export interface MeetingOptions {
  summary: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  attendees: string[];
  location?: string;
  timezone?: string;
}

export class GoogleCalendarService {
  private oauth2Client: any;
  private calendar: calendar_v3.Calendar;

  constructor(accessToken: string, refreshToken: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth credentials not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env');
    }

    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * Create a meeting with Google Meet link
   * @param options - Meeting options
   * @returns Created calendar event with Google Meet link
   */
  async createMeeting(options: MeetingOptions) {
    try {
      const event = await this.calendar.events.insert({
        calendarId: 'primary',
        conferenceDataVersion: 1,
        requestBody: {
          summary: options.summary,
          description: options.description,
          location: options.location || 'Online',
          start: {
            dateTime: options.startTime.toISOString(),
            timeZone: options.timezone || 'America/New_York',
          },
          end: {
            dateTime: options.endTime.toISOString(),
            timeZone: options.timezone || 'America/New_York',
          },
          attendees: options.attendees.map(email => ({ email })),
          conferenceData: {
            createRequest: {
              requestId: `meet-${Date.now()}-${Math.random().toString(36).substring(7)}`,
              conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
          },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 24 * 60 }, // 1 day before
              { method: 'popup', minutes: 30 }, // 30 minutes before
            ],
          },
        },
      });

      const data = event.data;

      return {
        id: data.id,
        summary: data.summary,
        description: data.description,
        start: data.start?.dateTime,
        end: data.end?.dateTime,
        meetLink: data.hangoutLink || data.conferenceData?.entryPoints?.[0]?.uri || '',
        htmlLink: data.htmlLink,
        status: data.status,
        attendees: data.attendees?.map(a => ({
          email: a.email,
          responseStatus: a.responseStatus,
        })) || [],
      };
    } catch (error: any) {
      console.error('Google Calendar Error:', error);
      throw new Error(`Failed to create meeting: ${error.message}`);
    }
  }

  /**
   * Update existing calendar event
   * @param eventId - Google Calendar event ID
   * @param updates - Fields to update
   * @returns Updated event
   */
  async updateEvent(eventId: string, updates: Partial<MeetingOptions>) {
    try {
      const updateData: any = {};

      if (updates.summary) updateData.summary = updates.summary;
      if (updates.description) updateData.description = updates.description;
      if (updates.location) updateData.location = updates.location;

      if (updates.startTime) {
        updateData.start = {
          dateTime: updates.startTime.toISOString(),
          timeZone: updates.timezone || 'America/New_York',
        };
      }

      if (updates.endTime) {
        updateData.end = {
          dateTime: updates.endTime.toISOString(),
          timeZone: updates.timezone || 'America/New_York',
        };
      }

      if (updates.attendees) {
        updateData.attendees = updates.attendees.map(email => ({ email }));
      }

      const event = await this.calendar.events.update({
        calendarId: 'primary',
        eventId,
        requestBody: updateData,
      });

      return event.data;
    } catch (error: any) {
      console.error('Google Calendar Update Error:', error);
      throw new Error(`Failed to update event: ${error.message}`);
    }
  }

  /**
   * Delete calendar event
   * @param eventId - Google Calendar event ID
   */
  async deleteEvent(eventId: string) {
    try {
      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId,
      });
      return { success: true, message: 'Event deleted successfully' };
    } catch (error: any) {
      console.error('Google Calendar Delete Error:', error);
      throw new Error(`Failed to delete event: ${error.message}`);
    }
  }

  /**
   * Get event details
   * @param eventId - Google Calendar event ID
   * @returns Event details
   */
  async getEvent(eventId: string) {
    try {
      const event = await this.calendar.events.get({
        calendarId: 'primary',
        eventId,
      });

      return event.data;
    } catch (error: any) {
      console.error('Google Calendar Get Event Error:', error);
      throw new Error(`Failed to get event: ${error.message}`);
    }
  }

  /**
   * List upcoming events
   * @param maxResults - Maximum number of events to return
   * @returns List of upcoming events
   */
  async listUpcomingEvents(maxResults: number = 10) {
    try {
      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        maxResults,
        singleEvents: true,
        orderBy: 'startTime',
      });

      return response.data.items || [];
    } catch (error: any) {
      console.error('Google Calendar List Error:', error);
      throw new Error(`Failed to list events: ${error.message}`);
    }
  }

  /**
   * Generate Google OAuth2 authorization URL
   * @returns Authorization URL
   */
  static generateAuthUrl(): string {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth credentials not configured');
    }

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ];

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
    });
  }

  /**
   * Exchange authorization code for tokens
   * @param code - Authorization code from OAuth callback
   * @returns Access token and refresh token
   */
  static async getTokensFromCode(code: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    const { tokens } = await oauth2Client.getToken(code);

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date,
    };
  }
}
