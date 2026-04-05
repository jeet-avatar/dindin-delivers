import nodemailer from 'nodemailer';

const transport = nodemailer.createTransport({
  host: 'smtp.office365.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: { filename: string; content: string; contentType: string }[];
}

export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  await transport.sendMail({
    from: 'Zietra Meet <peter@techcloudpro.com>',
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    replyTo: opts.replyTo,
    attachments: opts.attachments,
  });
}
