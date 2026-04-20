import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { fromEnv } from '@aws-sdk/credential-providers';
import { Readable } from 'stream';

// Validate required AWS configuration
if (!process.env.AWS_REGION) {
  throw new Error('AWS_REGION environment variable is required');
}

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: fromEnv(),
});

export interface UploadParams {
  bucket: string;
  key: string;
  body: Buffer | Readable | string;
  contentType?: string;
  metadata?: Record<string, string>;
}

/**
 * Upload file to S3
 */
export async function uploadToS3(params: UploadParams) {
  try {
    const command = new PutObjectCommand({
      Bucket: params.bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
      Metadata: params.metadata,
    });

    const response = await s3Client.send(command);
    return {
      success: true,
      etag: response.ETag,
      location: `https://${params.bucket}.s3.amazonaws.com/${params.key}`,
    };
  } catch (error: any) {
    console.error('S3 Upload Error:', error);
    throw new Error(`Failed to upload to S3: ${error.message}`);
  }
}

/**
 * Get file from S3
 */
export async function getFromS3(bucket: string, key: string) {
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await s3Client.send(command);
    return {
      body: response.Body,
      contentType: response.ContentType,
      metadata: response.Metadata,
    };
  } catch (error: any) {
    console.error('S3 Get Error:', error);
    throw new Error(`Failed to get from S3: ${error.message}`);
  }
}

/**
 * Delete file from S3
 */
export async function deleteFromS3(bucket: string, key: string) {
  try {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await s3Client.send(command);
    return { success: true };
  } catch (error: any) {
    console.error('S3 Delete Error:', error);
    throw new Error(`Failed to delete from S3: ${error.message}`);
  }
}

/**
 * List files in S3 bucket
 */
export async function listS3Files(bucket: string, prefix?: string) {
  try {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
    });

    const response = await s3Client.send(command);
    return response.Contents || [];
  } catch (error: any) {
    console.error('S3 List Error:', error);
    throw new Error(`Failed to list S3 files: ${error.message}`);
  }
}

/**
 * Generate presigned URL for temporary access
 */
export async function getPresignedUrl(bucket: string, key: string, expiresIn: number = 3600) {
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error: any) {
    console.error('S3 Presigned URL Error:', error);
    throw new Error(`Failed to generate presigned URL: ${error.message}`);
  }
}

/**
 * Generate presigned URL for upload
 */
export async function getPresignedUploadUrl(bucket: string, key: string, contentType?: string, expiresIn: number = 3600) {
  try {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error: any) {
    console.error('S3 Presigned Upload URL Error:', error);
    throw new Error(`Failed to generate presigned upload URL: ${error.message}`);
  }
}

/**
 * Stream file body to Buffer
 */
export async function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}
