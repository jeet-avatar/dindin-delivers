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

export class ZoomService {
  private accountId: string;
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor() {
    this.accountId = process.env.ZOOM_ACCOUNT_ID || '';
    this.clientId = process.env.ZOOM_CLIENT_ID || '';
    this.clientSecret = process.env.ZOOM_CLIENT_SECRET || '';

    if (!this.accountId || !this.clientId || !this.clientSecret) {
      throw new Error('Zoom credentials not configured. Please set ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, and ZOOM_CLIENT_SECRET in .env');
    }
  }

  /**
   * Get OAuth access token using Server-to-Server OAuth
   * Token expires after 1 hour
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

      const response = await axios.post(
        `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${this.accountId}`,
        {},
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.accessToken = response.data.access_token;
      // Token expires in 1 hour, we'll refresh it 5 minutes before expiry
      const expiresIn = response.data.expires_in || 3600;
      this.tokenExpiry = new Date(Date.now() + (expiresIn - 300) * 1000);

      return this.accessToken;
    } catch (error: any) {
      console.error('Zoom OAuth Error:', error.response?.data || error.message);
      throw new Error(`Failed to get Zoom access token: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get the default Zoom user (Me)
   * For Server-to-Server OAuth, we use 'me' as the userId
   */
  private async getDefaultUser(): Promise<string> {
    return 'me';
  }

  /**
   * Create a Zoom meeting
   * @param options - Meeting options
   * @returns Created Zoom meeting details
   */
  async createMeeting(options: ZoomMeetingOptions): Promise<ZoomMeetingResponse> {
    try {
      const accessToken = await this.getAccessToken();
      const userId = await this.getDefaultUser();

      // Format start time to ISO 8601 format
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

      const response = await axios.post(
        `https://api.zoom.us/v2/users/${userId}/meetings`,
        meetingData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

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
      const accessToken = await this.getAccessToken();

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

      await axios.patch(
        `https://api.zoom.us/v2/meetings/${meetingId}`,
        updateData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
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
      const accessToken = await this.getAccessToken();

      await axios.delete(
        `https://api.zoom.us/v2/meetings/${meetingId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );
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
      const accessToken = await this.getAccessToken();

      const response = await axios.get(
        `https://api.zoom.us/v2/meetings/${meetingId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

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
   * Test the Zoom connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken();

      // Try to get user info to verify connection
      await axios.get('https://api.zoom.us/v2/users/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      return true;
    } catch (error: any) {
      console.error('Zoom Connection Test Failed:', error.response?.data || error.message);
      return false;
    }
  }
}
