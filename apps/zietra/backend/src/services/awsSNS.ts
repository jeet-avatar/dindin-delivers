import { SNSClient, PublishCommand, SetSMSAttributesCommand, GetSMSAttributesCommand } from '@aws-sdk/client-sns';
import { fromEnv } from '@aws-sdk/credential-providers';

// Validate required AWS configuration
if (!process.env.AWS_REGION) {
  throw new Error('AWS_REGION environment variable is required');
}

const snsClient = new SNSClient({
  region: process.env.AWS_REGION,
  credentials: fromEnv(),
});

export interface SMSParams {
  phoneNumber: string;
  message: string;
  senderID?: string;
  smsType?: 'Promotional' | 'Transactional';
}

/**
 * Send SMS via AWS SNS
 */
export async function sendSMS(params: SMSParams) {
  try {
    const command = new PublishCommand({
      PhoneNumber: params.phoneNumber,
      Message: params.message,
      MessageAttributes: {
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: params.smsType || 'Transactional',
        },
        ...(params.senderID
          ? {
              'AWS.SNS.SMS.SenderID': {
                DataType: 'String',
                StringValue: params.senderID,
              },
            }
          : {}),
      },
    });

    const response = await snsClient.send(command);
    return {
      success: true,
      messageId: response.MessageId,
    };
  } catch (error: any) {
    console.error('SNS SMS Error:', error);
    throw new Error(`Failed to send SMS via SNS: ${error.message}`);
  }
}

/**
 * Send bulk SMS to multiple recipients
 */
export async function sendBulkSMS(phoneNumbers: string[], message: string, smsType?: 'Promotional' | 'Transactional') {
  const results = await Promise.allSettled(
    phoneNumbers.map((phoneNumber) =>
      sendSMS({
        phoneNumber,
        message,
        smsType,
      })
    )
  );

  const successful = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  return {
    total: phoneNumbers.length,
    successful,
    failed,
    results,
  };
}

/**
 * Set SMS attributes (spending limits, sender ID, etc.)
 */
export async function setSMSAttributes(attributes: Record<string, string>) {
  try {
    const command = new SetSMSAttributesCommand({
      attributes,
    });

    await snsClient.send(command);
    return { success: true };
  } catch (error: any) {
    console.error('Failed to set SMS attributes:', error);
    throw error;
  }
}

/**
 * Get current SMS attributes
 */
export async function getSMSAttributes() {
  try {
    const command = new GetSMSAttributesCommand({});
    const response = await snsClient.send(command);
    return response.attributes;
  } catch (error: any) {
    console.error('Failed to get SMS attributes:', error);
    throw error;
  }
}

/**
 * Send SMS notification to topic subscribers
 */
export async function publishToTopic(topicArn: string, message: string, subject?: string) {
  try {
    const command = new PublishCommand({
      TopicArn: topicArn,
      Message: message,
      Subject: subject,
    });

    const response = await snsClient.send(command);
    return {
      success: true,
      messageId: response.MessageId,
    };
  } catch (error: any) {
    console.error('SNS Topic Publish Error:', error);
    throw new Error(`Failed to publish to SNS topic: ${error.message}`);
  }
}
