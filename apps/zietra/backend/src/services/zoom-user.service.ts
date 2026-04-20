import axios from 'axios';

export interface ZoomMeetingOptions {
  topic: string;
  agenda?: string;
  startTime: Date;
  duration: number; // in minutes
  timezone?: string;
  password?: string;
  settings?: {
    hostVideo?: boolean;
    participantVideo?: boolean;
    joinBeforeHost?: boolean;
    muteUponEntry?: boolean;
    waitingRoom?: boolean;
    autoRecording?: 'local' | 'cloud' | 'none';
  };
}

export interface ZoomMeetingResponse {
  id: string | number;
  hostId: string;
  topic: string;
  agenda: string;
  startTime: string;
  duration: number;
  timezone: string;
  joinUrl: string;
  password: string;
  startUrl: string;
  settings: {
    hostVideo: boolean;
    participantVideo: boolean;
    joinBeforeHost: boolean;
    muteUponEntry: boolean;
    waitingRoom: boolean;
    autoRecording: string;
  };
}

/**
 * Zoom Service for USER-LEVEL OAuth
 * Creates meetings in individual user's Zoom accounts
 * This is for true calendar sync (enterprise-level)
 */
export class ZoomUserService {
  private accessToken: string;
  private refreshToken: string;
  private userId: string;

  constructor(accessToken: string, refreshToken: string, userId: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.userId = userId;

    if (!accessToken || !refreshToken || !userId) {
      throw new Error('Zoom user OAuth credentials are required (accessToken, refreshToken, userId)');
    }
  }

  /**
   * Refresh access token if expired
   */
  private async refreshAccessToken(): Promise<string> {
    try {
      const clientId = process.env.ZOOM_USER_CLIENT_ID;
      const clientSecret = process.env.ZOOM_USER_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        throw new Error('Zoom User OAuth credentials not configured');
      }

      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

      const response = await axios.post(
        'https://zoom.us/oauth/token',
        `grant_type=refresh_token&refresh_token=${this.refreshToken}`,
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.accessToken = response.data.access_token;

      if (response.data.refresh_token) {
        this.refreshToken = response.data.refresh_token;
      }

      return this.accessToken;
    } catch (error: any) {
      console.error('Zoom Token Refresh Error:', error.response?.data || error.message);
      throw new Error(`Failed to refresh Zoom access token: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Make authenticated API call with automatic token refresh
   */
  private async makeRequest(config: any): Promise<any> {
    try {
      config.headers = {
        ...config.headers,
        'Authorization': `Bearer ${this.accessToken}`,
      };

      return await axios(config);
    } catch (error: any) {
      // If token expired, refresh and retry
      if (error.response?.status === 401) {
        await this.refreshAccessToken();

        config.headers.Authorization = `Bearer ${this.accessToken}`;
        return await axios(config);
      }

      throw error;
    }
  }

  /**
   * Create a Zoom meeting in USER's account
   * Meeting will appear in user's Zoom dashboard and calendar
   * @param options - Meeting options
   * @returns Created Zoom meeting details
   */
  async createMeeting(options: ZoomMeetingOptions): Promise<ZoomMeetingResponse> {
    try {
      const startTime = options.startTime.toISOString();

      const meetingData = {
        topic: options.topic,
        type: 2, // Scheduled meeting
        start_time: startTime,
        duration: options.duration,
        timezone: options.timezone || 'America/New_York',
        agenda: options.agenda || '',
        password: options.password || this.generatePassword(),
        settings: {
          host_video: options.settings?.hostVideo ?? true,
          participant_video: options.settings?.participantVideo ?? true,
          join_before_host: options.settings?.joinBeforeHost ?? true,
          mute_upon_entry: options.settings?.muteUponEntry ?? false,
          waiting_room: options.settings?.waitingRoom ?? false,
          auto_recording: options.settings?.autoRecording || 'none',
          approval_type: 2, // No registration required
          audio: 'both', // Both telephony and VoIP
          use_pmi: false, // Don't use Personal Meeting ID
        },
      };

      const response = await this.makeRequest({
        method: 'POST',
        url: `https://api.zoom.us/v2/users/${this.userId}/meetings`,
        data: meetingData,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const meeting = response.data;

      console.log(`[Zoom User Meeting Created] ID: ${meeting.id}, User: ${this.userId}`);

      return {
        id: meeting.id,
        hostId: meeting.host_id,
        topic: meeting.topic,
        agenda: meeting.agenda || '',
        startTime: meeting.start_time,
        duration: meeting.duration,
        timezone: meeting.timezone,
        joinUrl: meeting.join_url,
        password: meeting.password || meeting.encrypted_password || '',
        startUrl: meeting.start_url,
        settings: {
          hostVideo: meeting.settings.host_video,
          participantVideo: meeting.settings.participant_video,
          joinBeforeHost: meeting.settings.join_before_host,
          muteUponEntry: meeting.settings.mute_upon_entry,
          waitingRoom: meeting.settings.waiting_room,
          autoRecording: meeting.settings.auto_recording,
        },
      };
    } catch (error: any) {
      console.error('Zoom Create Meeting Error:', error.response?.data || error.message);
      throw new Error(`Failed to create Zoom meeting: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Update an existing Zoom meeting
   * @param meetingId - Zoom meeting ID
   * @param options - Updated meeting options
   */
  async updateMeeting(meetingId: string | number, options: Partial<ZoomMeetingOptions>): Promise<void> {
    try {
      const updateData: any = {};

      if (options.topic) updateData.topic = options.topic;
      if (options.agenda) updateData.agenda = options.agenda;
      if (options.startTime) updateData.start_time = options.startTime.toISOString();
      if (options.duration) updateData.duration = options.duration;
      if (options.timezone) updateData.timezone = options.timezone;
      if (options.password) updateData.password = options.password;
      if (options.settings) {
        updateData.settings = {
          host_video: options.settings.hostVideo,
          participant_video: options.settings.participantVideo,
          join_before_host: options.settings.joinBeforeHost,
          mute_upon_entry: options.settings.muteUponEntry,
          waiting_room: options.settings.waitingRoom,
          auto_recording: options.settings.autoRecording,
        };
      }

      await this.makeRequest({
        method: 'PATCH',
        url: `https://api.zoom.us/v2/meetings/${meetingId}`,
        data: updateData,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log(`[Zoom User Meeting Updated] ID: ${meetingId}`);
    } catch (error: any) {
      console.error('Zoom Update Meeting Error:', error.response?.data || error.message);
      throw new Error(`Failed to update Zoom meeting: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Delete a Zoom meeting
   * @param meetingId - Zoom meeting ID
   */
  async deleteMeeting(meetingId: string | number): Promise<void> {
    try {
      await this.makeRequest({
        method: 'DELETE',
        url: `https://api.zoom.us/v2/meetings/${meetingId}`,
      });

      console.log(`[Zoom User Meeting Deleted] ID: ${meetingId}`);
    } catch (error: any) {
      console.error('Zoom Delete Meeting Error:', error.response?.data || error.message);
      throw new Error(`Failed to delete Zoom meeting: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get meeting details
   * @param meetingId - Zoom meeting ID
   */
  async getMeeting(meetingId: string | number): Promise<ZoomMeetingResponse> {
    try {
      const response = await this.makeRequest({
        method: 'GET',
        url: `https://api.zoom.us/v2/meetings/${meetingId}`,
      });

      const meeting = response.data;

      return {
        id: meeting.id,
        hostId: meeting.host_id,
        topic: meeting.topic,
        agenda: meeting.agenda || '',
        startTime: meeting.start_time,
        duration: meeting.duration,
        timezone: meeting.timezone,
        joinUrl: meeting.join_url,
        password: meeting.password || meeting.encrypted_password || '',
        startUrl: meeting.start_url,
        settings: {
          hostVideo: meeting.settings.host_video,
          participantVideo: meeting.settings.participant_video,
          joinBeforeHost: meeting.settings.join_before_host,
          muteUponEntry: meeting.settings.mute_upon_entry,
          waitingRoom: meeting.settings.waiting_room,
          autoRecording: meeting.settings.auto_recording,
        },
      };
    } catch (error: any) {
      console.error('Zoom Get Meeting Error:', error.response?.data || error.message);
      throw new Error(`Failed to get Zoom meeting: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Generate a random 6-digit meeting password
   */
  private generatePassword(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Get the new access token (after refresh)
   * Use this to update the database with new token
   */
  getAccessToken(): string {
    return this.accessToken;
  }

  /**
   * Get the refresh token
   * Use this to update the database if token was refreshed
   */
  getRefreshToken(): string {
    return this.refreshToken;
  }
}
