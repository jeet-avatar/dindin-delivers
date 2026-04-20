import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

const FROM = (process.env.FROM_NAME || 'Zietra') + ' <' + (process.env.FROM_EMAIL || 'contracts@zietra.com') + '>';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://crm.zietra.com';

function createTransporter(): nodemailer.Transporter {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.office365.com',
    port: Number.parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER || 'peter@zietra.com',
      pass: process.env.SMTP_PASS,
    },
  });
}

function darkWrapper(title: string, bodyHtml: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#0f0f23;font-family:'Segoe UI',Arial,sans-serif;color:#e2e8f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f23;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);padding:32px 40px;border-radius:12px 12px 0 0;text-align:center;">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Zietra</h1>
              <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.75);">Contract Management</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background:#1a1a2e;padding:40px;border-radius:0 0 12px 12px;">
              ${bodyHtml}
              <!-- Footer -->
              <hr style="border:none;border-top:1px solid #2d2d4e;margin:32px 0 24px;" />
              <p style="margin:0;font-size:12px;color:#64748b;text-align:center;">
                &copy; ${new Date().getFullYear()} Zietra. All rights reserved.<br />
                This email was sent by the Zietra Contract Management System.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

function primaryButton(href: string, label: string): string {
  return `
<table cellpadding="0" cellspacing="0" style="margin:28px 0;">
  <tr>
    <td style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);border-radius:8px;">
      <a href="${href}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${label}</a>
    </td>
  </tr>
</table>`.trim();
}

// ─── 1. sendSigningRequest ────────────────────────────────────────────────────

export async function sendSigningRequest(options: {
  to: string;
  clientName: string;
  contractTitle: string;
  senderName: string;
  signingToken: string;
  message?: string;
}): Promise<void> {
  const { to, clientName, contractTitle, senderName, signingToken, message } = options;
  const signingUrl = `${FRONTEND_URL}/contracts/sign/${signingToken}`;

  const body = `
<h2 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#f1f5f9;">You have a contract to sign</h2>
<p style="margin:0 0 20px;font-size:15px;color:#94a3b8;">Hi ${clientName},</p>
<p style="margin:0 0 16px;font-size:15px;color:#cbd5e1;">
  <strong style="color:#f1f5f9;">${senderName}</strong> has sent you a contract for your review and signature:
</p>
<div style="background:#0f0f23;border:1px solid #2d2d4e;border-radius:8px;padding:20px;margin:0 0 24px;">
  <p style="margin:0;font-size:16px;font-weight:600;color:#a5b4fc;">${contractTitle}</p>
</div>
${message ? `<p style="margin:0 0 24px;font-size:14px;color:#94a3b8;font-style:italic;">"${message}"</p>` : ''}
<p style="margin:0 0 4px;font-size:14px;color:#94a3b8;">Click below to review and sign the contract:</p>
${primaryButton(signingUrl, 'Review & Sign Contract')}
<p style="margin:0;font-size:12px;color:#64748b;">
  Or copy this link into your browser:<br />
  <a href="${signingUrl}" style="color:#818cf8;word-break:break-all;">${signingUrl}</a>
</p>`;

  const html = darkWrapper(`Sign Contract — ${contractTitle}`, body);

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: FROM,
      to,
      subject: `Action Required: Please sign "${contractTitle}"`,
      html,
      text: `Hi ${clientName},\n\n${senderName} has sent you a contract to sign: "${contractTitle}".\n\nReview and sign here: ${signingUrl}\n\nZietra Contract Management`,
    });
    logger.info('Contract signing request email sent', { to, contractTitle, signingToken });
  } catch (error: any) {
    logger.error('Failed to send signing request email', { message: error?.message, code: error?.code, response: error?.response, to });
    throw error;
  }
}

// ─── 2. sendOtpEmail ─────────────────────────────────────────────────────────

export async function sendOtpEmail(options: {
  to: string;
  clientName: string;
  otp: string;
  contractTitle: string;
  expiresInMinutes?: number;
}): Promise<void> {
  const { to, clientName, otp, contractTitle, expiresInMinutes = 10 } = options;

  const body = `
<h2 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#f1f5f9;">Verification Code</h2>
<p style="margin:0 0 20px;font-size:15px;color:#94a3b8;">Hi ${clientName},</p>
<p style="margin:0 0 24px;font-size:15px;color:#cbd5e1;">
  Use the 6-digit code below to verify your identity and proceed with signing
  <strong style="color:#f1f5f9;">"${contractTitle}"</strong>.
</p>
<div style="background:#0f0f23;border:2px solid #6366f1;border-radius:12px;padding:28px;text-align:center;margin:0 0 24px;">
  <p style="margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:2px;color:#818cf8;text-transform:uppercase;">Your Verification Code</p>
  <p style="margin:0;font-size:40px;font-weight:700;letter-spacing:12px;color:#ffffff;font-family:'Courier New',monospace;">${otp}</p>
</div>
<p style="margin:0;font-size:13px;color:#64748b;">
  This code expires in <strong style="color:#f59e0b;">${expiresInMinutes} minutes</strong>.
  Do not share it with anyone.
</p>`;

  const html = darkWrapper('Verification Code — Zietra', body);

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: FROM,
      to,
      subject: `Your verification code: ${otp}`,
      html,
      text: `Hi ${clientName},\n\nYour verification code for signing "${contractTitle}" is: ${otp}\n\nThis code expires in ${expiresInMinutes} minutes.\n\nZietra Contract Management`,
    });
    logger.info('OTP email sent', { to, contractTitle });
  } catch (error) {
    logger.error('Failed to send OTP email', { error, to });
    throw new Error('Failed to send OTP email');
  }
}

// ─── 3. sendClientSignedNotification ─────────────────────────────────────────

export async function sendClientSignedNotification(options: {
  to: string;
  ownerName: string;
  clientName: string;
  clientEmail: string;
  contractTitle: string;
  contractId: string;
  signedAt: Date;
}): Promise<void> {
  const { to, ownerName, clientName, clientEmail, contractTitle, contractId, signedAt } = options;
  const contractUrl = `${FRONTEND_URL}/contracts/${contractId}`;
  const formattedDate = signedAt.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  const body = `
<h2 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#f1f5f9;">Contract Signed</h2>
<p style="margin:0 0 20px;font-size:15px;color:#94a3b8;">Hi ${ownerName},</p>
<p style="margin:0 0 24px;font-size:15px;color:#cbd5e1;">
  Great news! Your contract has been signed by your client.
</p>
<div style="background:#0f0f23;border:1px solid #2d2d4e;border-radius:8px;padding:20px;margin:0 0 24px;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:6px 0;font-size:13px;color:#64748b;width:140px;">Contract</td><td style="padding:6px 0;font-size:14px;color:#f1f5f9;font-weight:600;">${contractTitle}</td></tr>
    <tr><td style="padding:6px 0;font-size:13px;color:#64748b;">Signed by</td><td style="padding:6px 0;font-size:14px;color:#f1f5f9;">${clientName} &lt;${clientEmail}&gt;</td></tr>
    <tr><td style="padding:6px 0;font-size:13px;color:#64748b;">Signed at</td><td style="padding:6px 0;font-size:14px;color:#f1f5f9;">${formattedDate}</td></tr>
  </table>
</div>
${primaryButton(contractUrl, 'View Signed Contract')}`;

  const html = darkWrapper(`Contract Signed — ${contractTitle}`, body);

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: FROM,
      to,
      subject: `✓ "${contractTitle}" has been signed by ${clientName}`,
      html,
      text: `Hi ${ownerName},\n\n${clientName} (${clientEmail}) has signed your contract "${contractTitle}" on ${formattedDate}.\n\nView it here: ${contractUrl}\n\nZietra Contract Management`,
    });
    logger.info('Client signed notification sent', { to, contractTitle, clientEmail });
  } catch (error) {
    logger.error('Failed to send client signed notification', { error, to });
    throw new Error('Failed to send client signed notification');
  }
}

// ─── 4. sendCompletedEmail ────────────────────────────────────────────────────

export async function sendCompletedEmail(options: {
  toOwner: string;
  toClient: string;
  ownerName: string;
  clientName: string;
  contractTitle: string;
  contractId: string;
  pdfBuffer: Buffer;
}): Promise<void> {
  const { toOwner, toClient, ownerName, clientName, contractTitle, contractId, pdfBuffer } = options;
  const contractUrl = `${FRONTEND_URL}/contracts/${contractId}`;
  const fileName = `${contractTitle.replace(/[^a-z0-9]/gi, '_')}_signed.pdf`;

  function buildBody(recipientName: string): string {
    return `
<h2 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#f1f5f9;">Contract Completed</h2>
<p style="margin:0 0 20px;font-size:15px;color:#94a3b8;">Hi ${recipientName},</p>
<p style="margin:0 0 24px;font-size:15px;color:#cbd5e1;">
  Your contract <strong style="color:#f1f5f9;">"${contractTitle}"</strong> has been fully executed
  by all parties. Please find the signed PDF attached to this email.
</p>
<div style="background:#0f0f23;border:1px solid #2d2d4e;border-radius:8px;padding:20px;margin:0 0 24px;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:6px 0;font-size:13px;color:#64748b;width:140px;">Contract</td><td style="padding:6px 0;font-size:14px;color:#f1f5f9;font-weight:600;">${contractTitle}</td></tr>
    <tr><td style="padding:6px 0;font-size:13px;color:#64748b;">Parties</td><td style="padding:6px 0;font-size:14px;color:#f1f5f9;">${ownerName} &amp; ${clientName}</td></tr>
    <tr><td style="padding:6px 0;font-size:13px;color:#64748b;">Status</td><td style="padding:6px 0;font-size:14px;color:#22c55e;font-weight:600;">Fully Executed</td></tr>
  </table>
</div>
${primaryButton(contractUrl, 'View Contract Online')}
<p style="margin:0;font-size:12px;color:#64748b;">
  The signed PDF is attached to this email for your records.
</p>`;
  }

  const ownerHtml = darkWrapper(`Contract Completed — ${contractTitle}`, buildBody(ownerName));
  const clientHtml = darkWrapper(`Contract Completed — ${contractTitle}`, buildBody(clientName));

  const attachment = {
    filename: fileName,
    content: pdfBuffer,
    contentType: 'application/pdf',
  };

  try {
    const transporter = createTransporter();

    await transporter.sendMail({
      from: FROM,
      to: toOwner,
      subject: `✓ Fully Executed: "${contractTitle}"`,
      html: ownerHtml,
      text: `Hi ${ownerName},\n\nYour contract "${contractTitle}" has been fully executed by all parties. Please find the signed PDF attached.\n\nView online: ${contractUrl}\n\nZietra Contract Management`,
      attachments: [attachment],
    });
    logger.info('Completed contract email sent to owner', { to: toOwner, contractTitle });

    await transporter.sendMail({
      from: FROM,
      to: toClient,
      subject: `✓ Fully Executed: "${contractTitle}"`,
      html: clientHtml,
      text: `Hi ${clientName},\n\nYour contract "${contractTitle}" has been fully executed by all parties. Please find the signed PDF attached.\n\nView online: ${contractUrl}\n\nZietra Contract Management`,
      attachments: [attachment],
    });
    logger.info('Completed contract email sent to client', { to: toClient, contractTitle });
  } catch (error) {
    logger.error('Failed to send completed contract email', { error });
    throw new Error('Failed to send completed contract email');
  }
}

// ─── 5. sendReminderEmail ─────────────────────────────────────────────────────

export async function sendReminderEmail(options: {
  to: string;
  clientName: string;
  contractTitle: string;
  senderName: string;
  signingToken: string;
  daysOverdue?: number;
}): Promise<void> {
  const { to, clientName, contractTitle, senderName, signingToken, daysOverdue } = options;
  const signingUrl = `${FRONTEND_URL}/contracts/sign/${signingToken}`;
  const overdueNote = daysOverdue && daysOverdue > 0
    ? `<p style="margin:0 0 24px;font-size:14px;color:#f59e0b;">This contract has been awaiting your signature for <strong>${daysOverdue} day${daysOverdue === 1 ? '' : 's'}</strong>.</p>`
    : '';

  const body = `
<h2 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#f1f5f9;">Reminder: Contract Awaiting Your Signature</h2>
<p style="margin:0 0 20px;font-size:15px;color:#94a3b8;">Hi ${clientName},</p>
<p style="margin:0 0 16px;font-size:15px;color:#cbd5e1;">
  This is a friendly reminder that <strong style="color:#f1f5f9;">${senderName}</strong> is
  waiting for your signature on:
</p>
<div style="background:#0f0f23;border:1px solid #2d2d4e;border-radius:8px;padding:20px;margin:0 0 24px;">
  <p style="margin:0;font-size:16px;font-weight:600;color:#a5b4fc;">${contractTitle}</p>
</div>
${overdueNote}
<p style="margin:0 0 4px;font-size:14px;color:#94a3b8;">Click below to review and sign at your earliest convenience:</p>
${primaryButton(signingUrl, 'Sign Contract Now')}
<p style="margin:0;font-size:12px;color:#64748b;">
  Or copy this link into your browser:<br />
  <a href="${signingUrl}" style="color:#818cf8;word-break:break-all;">${signingUrl}</a>
</p>`;

  const html = darkWrapper(`Reminder: Sign "${contractTitle}"`, body);

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: FROM,
      to,
      subject: `Reminder: Please sign "${contractTitle}"`,
      html,
      text: `Hi ${clientName},\n\nThis is a reminder that ${senderName} is waiting for your signature on "${contractTitle}".\n\nSign here: ${signingUrl}\n\nZietra Contract Management`,
    });
    logger.info('Reminder email sent', { to, contractTitle, signingToken });
  } catch (error) {
    logger.error('Failed to send reminder email', { error, to });
    throw new Error('Failed to send reminder email');
  }
}
