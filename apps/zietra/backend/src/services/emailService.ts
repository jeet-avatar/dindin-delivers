import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
      port: Number.parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || 'apikey',
        pass: process.env.SENDGRID_API_KEY,
      },
    });
  }

  async sendEmail(options: {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
    from?: string;
  }): Promise<void> {
    try {
      const mailOptions = {
        from: options.from || `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info('Email sent successfully:', { messageId: result.messageId, to: options.to });
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw new Error('Failed to send email');
    }
  }

  async sendTemplateEmail(options: {
    to: string | string[];
    templateId: string;
    variables: Record<string, any>;
    subject?: string;
  }): Promise<void> {
    // TODO: Implement template email sending
    logger.info('Template email sending - to be implemented');
  }

  async sendBulkEmails(emails: Array<{
    to: string;
    subject: string;
    html: string;
    text?: string;
  }>): Promise<void> {
    // TODO: Implement bulk email sending with queue
    logger.info('Bulk email sending - to be implemented');
  }
}

export const emailService = new EmailService();