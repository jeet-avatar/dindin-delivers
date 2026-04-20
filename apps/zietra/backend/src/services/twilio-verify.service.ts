import twilio from 'twilio';

export class TwilioVerifyService {
  private client: twilio.Twilio;
  private verifySid: string;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.verifySid = process.env.TWILIO_VERIFY_SID || 'VA90ffd3c7d478be108b78b51d50a6c34a';

    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials are not configured');
    }

    this.client = twilio(accountSid, authToken);
  }

  /**
   * Send OTP verification code to phone number
   */
  async sendVerificationCode(phoneNumber: string, channel: 'sms' | 'call' = 'sms') {
    try {
      const verification = await this.client.verify.v2
        .services(this.verifySid)
        .verifications.create({
          to: phoneNumber,
          channel: channel,
        });

      return {
        success: true,
        status: verification.status,
        to: verification.to,
        channel: verification.channel,
        valid: verification.valid,
      };
    } catch (error: any) {
      console.error('Twilio Verify Error:', error);
      throw new Error(`Failed to send verification code: ${error.message}`);
    }
  }

  /**
   * Verify the OTP code entered by user
   */
  async verifyCode(phoneNumber: string, code: string) {
    try {
      const verificationCheck = await this.client.verify.v2
        .services(this.verifySid)
        .verificationChecks.create({
          to: phoneNumber,
          code: code,
        });

      return {
        success: verificationCheck.status === 'approved',
        status: verificationCheck.status,
        to: verificationCheck.to,
        valid: verificationCheck.valid,
      };
    } catch (error: any) {
      console.error('Twilio Verify Check Error:', error);
      throw new Error(`Failed to verify code: ${error.message}`);
    }
  }

  /**
   * Send verification code via voice call
   */
  async sendVerificationCall(phoneNumber: string) {
    return this.sendVerificationCode(phoneNumber, 'call');
  }
}
