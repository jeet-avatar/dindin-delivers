import { SESClient, SendEmailCommand, SendRawEmailCommand } from '@aws-sdk/client-ses';
import { fromEnv } from '@aws-sdk/credential-providers';

// Validate required AWS configuration
if (!process.env.AWS_REGION) {
  throw new Error('AWS_REGION environment variable is required');
}

const sesClient = new SESClient({
  region: process.env.AWS_REGION,
  credentials: fromEnv(),
});

export interface EmailParams {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}

/**
 * Send email using AWS SES
 */
export async function sendEmailViaSES(params: EmailParams) {
  // Validate SES_FROM_EMAIL is configured
  if (!process.env.SES_FROM_EMAIL && !params.from) {
    throw new Error('SES_FROM_EMAIL environment variable or params.from is required');
  }

  const fromEmail = params.from || process.env.SES_FROM_EMAIL!;

  try {
    if (params.attachments && params.attachments.length > 0) {
      // Use SendRawEmail for attachments
      return await sendRawEmail(params, fromEmail);
    } else {
      // Use SendEmail for simple emails
      const command = new SendEmailCommand({
        Source: fromEmail,
        Destination: {
          ToAddresses: params.to,
          CcAddresses: params.cc,
          BccAddresses: params.bcc,
        },
        Message: {
          Subject: {
            Data: params.subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: params.html
              ? {
                  Data: params.html,
                  Charset: 'UTF-8',
                }
              : undefined,
            Text: params.text
              ? {
                  Data: params.text,
                  Charset: 'UTF-8',
                }
              : undefined,
          },
        },
        ReplyToAddresses: params.replyTo ? [params.replyTo] : undefined,
      });

      const response = await sesClient.send(command);
      return {
        success: true,
        messageId: response.MessageId,
      };
    }
  } catch (error: any) {
    console.error('SES Error:', error);
    throw new Error(`Failed to send email via SES: ${error.message}`);
  }
}

/**
 * Send raw email with attachments using AWS SES
 */
async function sendRawEmail(params: EmailParams, fromEmail: string) {
  const boundary = `----=_Part_${Date.now()}`;

  let rawMessage = `From: ${fromEmail}\r\n`;
  rawMessage += `To: ${params.to.join(', ')}\r\n`;
  if (params.cc) rawMessage += `Cc: ${params.cc.join(', ')}\r\n`;
  if (params.replyTo) rawMessage += `Reply-To: ${params.replyTo}\r\n`;
  rawMessage += `Subject: ${params.subject}\r\n`;
  rawMessage += `MIME-Version: 1.0\r\n`;
  rawMessage += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`;

  // HTML/Text Body
  rawMessage += `--${boundary}\r\n`;
  if (params.html) {
    rawMessage += `Content-Type: text/html; charset=UTF-8\r\n\r\n`;
    rawMessage += `${params.html}\r\n\r\n`;
  } else if (params.text) {
    rawMessage += `Content-Type: text/plain; charset=UTF-8\r\n\r\n`;
    rawMessage += `${params.text}\r\n\r\n`;
  }

  // Attachments
  if (params.attachments) {
    for (const attachment of params.attachments) {
      rawMessage += `--${boundary}\r\n`;
      rawMessage += `Content-Type: ${attachment.contentType}; name="${attachment.filename}"\r\n`;
      rawMessage += `Content-Transfer-Encoding: base64\r\n`;
      rawMessage += `Content-Disposition: attachment; filename="${attachment.filename}"\r\n\r\n`;
      rawMessage += attachment.content.toString('base64') + '\r\n\r\n';
    }
  }

  rawMessage += `--${boundary}--`;

  const command = new SendRawEmailCommand({
    RawMessage: {
      Data: Buffer.from(rawMessage),
    },
    Source: fromEmail,
    Destinations: [...params.to, ...(params.cc || []), ...(params.bcc || [])],
  });

  const response = await sesClient.send(command);
  return {
    success: true,
    messageId: response.MessageId,
  };
}

/**
 * Get SES sending statistics
 */
export async function getSESStatistics() {
  const { GetSendStatisticsCommand } = await import('@aws-sdk/client-ses');
  const command = new GetSendStatisticsCommand({});

  try {
    const response = await sesClient.send(command);
    return response.SendDataPoints;
  } catch (error: any) {
    console.error('Failed to get SES statistics:', error);
    throw error;
  }
}

/**
 * Get SES sending quota
 */
export async function getSESQuota() {
  const { GetSendQuotaCommand } = await import('@aws-sdk/client-ses');
  const command = new GetSendQuotaCommand({});

  try {
    const response = await sesClient.send(command);
    return {
      max24HourSend: response.Max24HourSend,
      maxSendRate: response.MaxSendRate,
      sentLast24Hours: response.SentLast24Hours,
    };
  } catch (error: any) {
    console.error('Failed to get SES quota:', error);
    throw error;
  }
}
