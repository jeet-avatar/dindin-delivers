import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface EmailOptions {
  from?: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content?: string | Buffer;
    path?: string;
  }>;
}

/**
 * Google Workspace SMTP Email Service
 * Uses support@zietra.com for all outgoing emails
 * NO AWS SES dependency - production ready
 */
export class GoogleSMTPService {
  private transporter: Transporter;
  private readonly DEFAULT_FROM = 'support@zietra.com';

  constructor() {
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpUser || !smtpPass) {
      throw new Error(
        'Google Workspace SMTP credentials not configured. ' +
        'Please set SMTP_USER and SMTP_PASS environment variables.'
      );
    }

    console.log('✅ Initializing Google Workspace SMTP');
    console.log(`   Host: ${smtpHost}:${smtpPort}`);
    console.log(`   User: ${smtpUser}`);
    console.log(`   Default From: ${this.DEFAULT_FROM}`);

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: false, // Use STARTTLS
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      tls: {
        // Do not fail on invalid certificates
        rejectUnauthorized: false,
      },
    });
  }

  /**
   * Send email via Google Workspace SMTP
   * @param options - Email options
   * @returns Email info with messageId
   */
  async sendEmail(options: EmailOptions) {
    try {
      // Validate email addresses
      if (!options.to || options.to.length === 0) {
        throw new Error('At least one recipient (to) is required');
      }

      if (!options.subject || options.subject.trim() === '') {
        throw new Error('Email subject is required');
      }

      if (!options.html && !options.text) {
        throw new Error('Email body (html or text) is required');
      }

      // Always use support@zietra.com as sender
      const fromAddress = this.DEFAULT_FROM;

      // Send email
      const info = await this.transporter.sendMail({
        from: fromAddress,
        to: options.to.join(', '),
        cc: options.cc?.join(', '),
        bcc: options.bcc?.join(', '),
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html),
        attachments: options.attachments,
      });

      console.log(`✅ Email sent via Google SMTP to ${options.to.join(', ')}`);
      console.log(`   Message ID: ${info.messageId}`);

      return {
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
        response: info.response,
        envelope: info.envelope,
      };
    } catch (error: any) {
      console.error('❌ Google SMTP Error:', error);
      throw new Error(`Failed to send email via Google SMTP: ${error.message}`);
    }
  }

  /**
   * Send email with template variables
   * @param options - Email options
   * @param templateVariables - Variables to replace in template
   */
  async sendTemplatedEmail(
    options: EmailOptions,
    templateVariables: Record<string, string>
  ) {
    // Replace variables in HTML content
    let html = options.html;
    for (const [key, value] of Object.entries(templateVariables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      html = html.replace(regex, value);
    }

    return this.sendEmail({
      ...options,
      html,
    });
  }

  /**
   * Verify SMTP connection
   * @returns true if connection is successful
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('✅ Google Workspace SMTP connection verified');
      return true;
    } catch (error) {
      console.error('❌ Google Workspace SMTP connection failed:', error);
      return false;
    }
  }

  /**
   * Strip HTML tags from string
   * @param html - HTML string
   * @returns Plain text
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Generate 6-digit OTP code
   * @returns 6-digit numeric string
   */
  static generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Calculate OTP expiry time (15 minutes from now)
   * @returns Date object for expiry time
   */
  static getOTPExpiry(): Date {
    return new Date(Date.now() + 15 * 60 * 1000);
  }

  /**
   * Generate HTML email template
   * @param body - Email body content
   * @param title - Email title
   * @returns Formatted HTML email
   */
  static generateHtmlTemplate(body: string, title?: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'Email from Zietra CRM'}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px 20px;
      border-radius: 10px 10px 0 0;
      text-align: center;
    }
    .content {
      background: #ffffff;
      padding: 30px 20px;
      border: 1px solid #e0e0e0;
      border-top: none;
    }
    .footer {
      background: #f5f5f5;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #666;
      border-radius: 0 0 10px 10px;
    }
    a {
      color: #667eea;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0; font-size: 24px;">${title || 'Zietra CRM'}</h1>
  </div>
  <div class="content">
    ${body}
  </div>
  <div class="footer">
    <p style="margin: 0;">Sent from Zietra CRM</p>
    <p style="margin: 5px 0 0 0;">
      <a href="https://zietra.com">zietra.com</a>
    </p>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Send email verification with OTP
   * @param email - Recipient email
   * @param firstName - User's first name
   * @param otp - 6-digit OTP code
   * @returns Promise<boolean> - Success status
   */
  async sendVerificationEmail(email: string, firstName: string, otp: string): Promise<boolean> {
    try {
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .otp { font-size: 32px; font-weight: bold; color: #4F46E5; text-align: center; letter-spacing: 8px; padding: 20px; background: white; border-radius: 8px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔒 Email Verification</h1>
    </div>
    <div class="content">
      <p>Hi ${firstName},</p>
      <p>Thank you for signing up for Zietra CRM! Please use the code below to verify your email address:</p>
      <div class="otp">${otp}</div>
      <p><strong>This code expires in 15 minutes.</strong></p>
      <p>If you didn't create an account with Zietra, please ignore this email.</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Zietra CRM. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
      `;

      await this.sendEmail({
        to: [email],
        subject: 'Verify your Zietra CRM account',
        html: htmlContent,
        text: `Hi ${firstName},\n\nThank you for signing up for Zietra CRM! Your verification code is: ${otp}\n\nThis code expires in 15 minutes.\n\nIf you didn't create an account, please ignore this email.`,
      });

      console.log(`✅ Verification email sent to ${email}`);
      return true;
    } catch (error) {
      console.error('❌ Error sending verification email:', error);
      return false;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    email: string,
    firstName: string,
    resetUrl: string,
    token: string
  ): Promise<boolean> {
    try {
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 20px 0; }
    .token { font-family: monospace; background: #f3f4f6; padding: 12px; border-radius: 4px; font-size: 14px; word-break: break-all; margin: 15px 0; border-left: 4px solid #667eea; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
    .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; color: #92400e; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔒 Password Reset Request</h1>
    </div>
    <div class="content">
      <p>Hi ${firstName},</p>
      <p>We received a request to reset your password for your Zietra CRM account. Click the button below to reset your password:</p>

      <div style="text-align: center;">
        <a href="${resetUrl}" class="button">Reset Password</a>
      </div>

      <p>Or copy and paste this link into your browser:</p>
      <div class="token">${resetUrl}</div>

      <div class="warning">
        <strong>⏰ Important:</strong> This link will expire in 1 hour for security reasons.
      </div>

      <p><strong>If you didn't request a password reset</strong>, you can safely ignore this email. Your password will not be changed.</p>

      <p>For security reasons, we recommend:</p>
      <ul>
        <li>Use a strong, unique password</li>
        <li>Don't share your password with anyone</li>
        <li>Enable two-factor authentication</li>
      </ul>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Zietra CRM. All rights reserved.</p>
      <p>If you need help, contact us at support@zietra.com</p>
    </div>
  </div>
</body>
</html>
      `;

      const textContent = `
Hi ${firstName},

We received a request to reset your password for your Zietra CRM account.

Click this link to reset your password:
${resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.

© ${new Date().getFullYear()} Zietra CRM. All rights reserved.
      `;

      await this.sendEmail({
        to: [email],
        subject: 'Reset your Zietra CRM password',
        html: htmlContent,
        text: textContent,
      });

      console.log(`✅ Password reset email sent to ${email}`);
      return true;
    } catch (error) {
      console.error('❌ Error sending password reset email:', error);
      return false;
    }
  }

  /**
   * Send team invitation email
   */
  async sendTeamInvitationEmail(
    email: string,
    inviterName: string,
    teamName: string,
    inviteUrl: string
  ): Promise<boolean> {
    try {
      const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited to Zietra!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f5f7fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f7fa; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.12);">

          <!-- Hero Header with Gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 48px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0 0 12px 0; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">🎉 You're Invited!</h1>
              <p style="color: rgba(255,255,255,0.95); margin: 0; font-size: 18px; font-weight: 500;">Join ${teamName} on Zietra CRM</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 48px 40px;">
              <!-- Personalized Greeting -->
              <p style="font-size: 18px; line-height: 1.6; color: #1a1a1a; margin: 0 0 24px 0;">
                Hi there! 👋
              </p>

              <p style="font-size: 16px; line-height: 1.7; color: #4a5568; margin: 0 0 32px 0;">
                <strong style="color: #667eea;">${inviterName}</strong> has invited you to collaborate on <strong>${teamName}</strong>.
                You're about to experience a whole new way to manage customer relationships!
              </p>

              <!-- Value Proposition Card -->
              <div style="background: linear-gradient(135deg, #f6f8fb 0%, #f0f4f8 100%); border-left: 4px solid #FF6B35; padding: 24px; margin: 32px 0; border-radius: 8px;">
                <h3 style="color: #1a1a1a; margin: 0 0 16px 0; font-size: 20px; font-weight: 600;">🚀 What You'll Get:</h3>
                <ul style="margin: 0; padding-left: 20px; color: #4a5568; line-height: 2;">
                  <li><strong>Smart Contact Management</strong> – Organize customers effortlessly</li>
                  <li><strong>Video Campaigns</strong> – Create engaging AI-powered videos</li>
                  <li><strong>Email Automation</strong> – Save time with intelligent workflows</li>
                  <li><strong>Real-time Analytics</strong> – Track performance at a glance</li>
                  <li><strong>Team Collaboration</strong> – Work together seamlessly</li>
                </ul>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 40px 0;">
                <a href="${inviteUrl}" style="background: linear-gradient(135deg, #FF6B35 0%, #f54d23 100%); color: white; text-decoration: none; padding: 18px 48px; border-radius: 12px; font-weight: 700; font-size: 18px; display: inline-block; box-shadow: 0 6px 20px rgba(255, 107, 53, 0.4); transition: transform 0.2s;">
                  Accept Invitation →
                </a>
              </div>

              <p style="font-size: 14px; color: #718096; text-align: center; margin: 24px 0 0 0;">
                Or copy this link to your browser:
              </p>
              <div style="background: #f7fafc; border: 2px dashed #e2e8f0; padding: 16px; border-radius: 8px; margin: 12px 0 32px 0; text-align: center;">
                <a href="${inviteUrl}" style="color: #667eea; word-break: break-all; font-size: 13px; text-decoration: none;">${inviteUrl}</a>
              </div>

              <!-- Urgency Note -->
              <div style="background: #fff8e1; border-left: 4px solid #ffd54f; padding: 16px 20px; margin: 32px 0; border-radius: 6px;">
                <p style="margin: 0; font-size: 14px; color: #856404;">
                  <strong>⏰ Act Fast!</strong> This invitation expires in <strong>7 days</strong>. Don't miss out!
                </p>
              </div>

              <!-- Social Proof / Trust -->
              <p style="font-size: 15px; line-height: 1.7; color: #4a5568; margin: 32px 0 0 0; text-align: center;">
                Join thousands of teams already using Zietra to grow their business. <br>
                <strong style="color: #667eea;">Start collaborating today!</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #f8fafc; padding: 32px 40px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 12px 0; font-size: 14px; color: #718096; text-align: center;">
                <strong style="color: #1a1a1a;">Zietra CRM</strong><br>
                Empowering teams to build better customer relationships
              </p>
              <p style="margin: 12px 0 0 0; font-size: 12px; color: #a0aec0; text-align: center;">
                Need help? Contact us at <a href="mailto:support@zietra.com" style="color: #667eea; text-decoration: none;">support@zietra.com</a>
              </p>
              <p style="margin: 16px 0 0 0; font-size: 11px; color: #cbd5e0; text-align: center;">
                © ${new Date().getFullYear()} Zietra. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `;

      const textContent = `
🎉 You're Invited to ${teamName}!

Hi there!

${inviterName} has invited you to collaborate on ${teamName} using Zietra CRM.

What You'll Get:
• Smart Contact Management – Organize customers effortlessly
• Video Campaigns – Create engaging AI-powered videos
• Email Automation – Save time with intelligent workflows
• Real-time Analytics – Track performance at a glance
• Team Collaboration – Work together seamlessly

Accept your invitation now:
${inviteUrl}

⏰ This invitation expires in 7 days.

Join thousands of teams already using Zietra to grow their business!

Need help? Contact us at support@zietra.com

© ${new Date().getFullYear()} Zietra. All rights reserved.
      `;

      await this.sendEmail({
        to: [email],
        subject: `🎉 ${inviterName} invited you to ${teamName}!`,
        html: htmlContent,
        text: textContent,
      });

      console.log(`✅ Team invitation sent to ${email}`);
      return true;
    } catch (error) {
      console.error('❌ Error sending team invitation:', error);
      return false;
    }
  }
}

// Export singleton instance
export const googleSMTPService = new GoogleSMTPService();

// Backward compatibility: Export as EmailService
export { GoogleSMTPService as EmailService };
export const emailService = googleSMTPService;
