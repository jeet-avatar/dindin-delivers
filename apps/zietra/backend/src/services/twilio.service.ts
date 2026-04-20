import twilio from 'twilio';

export class TwilioService {
  private client: twilio.Twilio;
  private fromNumber: string;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER || '';

    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env');
    }

    if (!this.fromNumber) {
      throw new Error('Twilio phone number not configured. Please set TWILIO_PHONE_NUMBER in .env');
    }

    this.client = twilio(accountSid, authToken);
  }

  /**
   * Send SMS message via Twilio
   * @param to - Recipient phone number (E.164 format: +15555551234)
   * @param body - Message content (max 1600 characters)
   * @returns Twilio message object with sid, status, etc.
   */
  async sendSMS(to: string, body: string) {
    try {
      // Validate phone number format
      if (!to.startsWith('+')) {
        throw new Error('Phone number must be in E.164 format (e.g., +15555551234)');
      }

      // Validate message length
      if (body.length > 1600) {
        throw new Error('SMS message must be 1600 characters or less');
      }

      const message = await this.client.messages.create({
        body,
        from: this.fromNumber,
        to,
      });

      return {
        sid: message.sid,
        status: message.status,
        to: message.to,
        from: message.from,
        body: message.body,
        dateCreated: message.dateCreated,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
      };
    } catch (error: any) {
      console.error('Twilio SMS Error:', error);
      throw new Error(`Failed to send SMS: ${error.message}`);
    }
  }

  /**
   * Get status of sent SMS
   * @param messageSid - Twilio message SID
   * @returns Message status (queued, sent, delivered, failed, etc.)
   */
  async getSMSStatus(messageSid: string) {
    try {
      const message = await this.client.messages(messageSid).fetch();
      return {
        sid: message.sid,
        status: message.status,
        to: message.to,
        from: message.from,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        dateCreated: message.dateCreated,
        dateSent: message.dateSent,
        dateUpdated: message.dateUpdated,
      };
    } catch (error: any) {
      console.error('Twilio Status Check Error:', error);
      throw new Error(`Failed to get SMS status: ${error.message}`);
    }
  }

  /**
   * Get SMS delivery report
   * @param messageSid - Twilio message SID
   * @returns Detailed message information
   */
  async getMessageDetails(messageSid: string) {
    try {
      const message = await this.client.messages(messageSid).fetch();
      return message;
    } catch (error: any) {
      console.error('Twilio Message Details Error:', error);
      throw new Error(`Failed to get message details: ${error.message}`);
    }
  }

  /**
   * Validate phone number using Twilio Lookup API
   * @param phoneNumber - Phone number to validate
   * @returns Phone number details if valid
   */
  async validatePhoneNumber(phoneNumber: string) {
    try {
      const result = await this.client.lookups.v1.phoneNumbers(phoneNumber).fetch();
      return {
        phoneNumber: result.phoneNumber,
        countryCode: result.countryCode,
        nationalFormat: result.nationalFormat,
        valid: true,
      };
    } catch (error: any) {
      console.error('Phone Number Validation Error:', error);
      return {
        phoneNumber,
        valid: false,
        error: error.message,
      };
    }
  }
}
