import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';

const execFileAsync = promisify(execFile);
const s3 = new S3Client({ region: process.env.AWS_REGION! });

export async function renderVideo(opts: {
  composition: string;    // e.g. "DollorDemo" or "Marketing60"
  audioPath?: string;     // local MP3 path from ElevenLabs (passed via --props)
  jobId: string;
}): Promise<string> {
  const outDir = `/tmp/renders/${opts.jobId}`;
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'output.mp4');
  const remotionProject = process.env.REMOTION_PROJECT_PATH!;

  // Pass audio path via props JSON if provided
  const props = opts.audioPath ? JSON.stringify({ audioPath: opts.audioPath }) : '{}';

  await execFileAsync('npx', [
    'remotion', 'render',
    `${remotionProject}/src/Root.tsx`,
    opts.composition,
    outFile,
    '--props', props,
    '--log', 'error',
  ], {
    timeout: 120000, // 120s timeout — required per pitfall #5 (render is slow)
    cwd: remotionProject,
  });

  // Upload to S3 suiteflow-demo bucket
  const s3Key = `launchos-videos/${opts.jobId}/output.mp4`;
  const fileStream = fs.createReadStream(outFile);
  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_VIDEO_BUCKET!,
    Key: s3Key,
    Body: fileStream,
    ContentType: 'video/mp4',
    ACL: 'public-read',
  }));

  // Cleanup temp files
  fs.rmSync(outDir, { recursive: true, force: true });

  return `https://${process.env.S3_VIDEO_BUCKET}.s3.amazonaws.com/${s3Key}`;
}
