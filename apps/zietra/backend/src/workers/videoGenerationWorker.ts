import { PrismaClient } from '@prisma/client';
import { spawn } from 'child_process';
import path from 'path';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

interface GenerationResult {
  success: boolean;
  video_url?: string;
  error?: string;
  message?: string;
}

class VideoGenerationWorker {
  private isRunning = false;
  private pollInterval = 5000; // Poll every 5 seconds

  async start() {
    logger.info('Video Generation Worker started');
    this.isRunning = true;
    this.poll();
  }

  async stop() {
    logger.info('Video Generation Worker stopping...');
    this.isRunning = false;
  }

  private async poll() {
    while (this.isRunning) {
      try {
        await this.processPendingJobs();
      } catch (error) {
        logger.error('Worker poll error:', error);
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, this.pollInterval));
    }
  }

  private async processPendingJobs() {
    // Find pending jobs
    const jobs = await prisma.videoGenerationJob.findMany({
      where: {
        status: 'pending',
      },
      include: {
        campaign: {
          include: {
            template: true,
          },
        },
      },
      take: 1, // Process one at a time
    });

    for (const job of jobs) {
      await this.processJob(job);
    }
  }

  private async processJob(job: any) {
    logger.info(`Processing job ${job.id} for campaign ${job.campaignId}`);

    try {
      // Mark as processing
      await prisma.videoGenerationJob.update({
        where: { id: job.id },
        data: {
          status: 'processing',
          startedAt: new Date(),
          progress: 10,
          currentStep: 'Initializing video generation',
        },
      });

      const campaign = job.campaign;
      const pythonScript = path.join(__dirname, '../../video_generator_lite.py');
      const outputFilename = `video_${campaign.id}_${Date.now()}.mp4`;

      // Build arguments
      const args = [
        pythonScript,
        '--script', campaign.narrationScript,
        '--output', outputFilename,
        '--campaign-id', campaign.id,
      ];

      if (campaign.templateId && campaign.template?.videoUrl) {
        args.push('--template', campaign.template.videoUrl);
      } else if (campaign.customVideoUrl) {
        args.push('--template', campaign.customVideoUrl);
      }

      if (campaign.clientLogoUrl && !campaign.clientLogoUrl.startsWith('blob:')) {
        args.push('--client-logo', campaign.clientLogoUrl);
      }

      if (campaign.userLogoUrl && campaign.userLogoUrl !== 'w' && !campaign.userLogoUrl.startsWith('blob:')) {
        args.push('--user-logo', campaign.userLogoUrl);
      }

      // Voice settings
      if (campaign.voiceId) {
        args.push('--voice-id', campaign.voiceId);
      }

      if (campaign.customVoiceUrl) {
        args.push('--custom-voice-url', campaign.customVoiceUrl);
      }

      logger.info(`Spawning Python process: python3 ${args.join(' ')}`);

      // Update progress
      await prisma.videoGenerationJob.update({
        where: { id: job.id },
        data: {
          progress: 30,
          currentStep: 'Generating audio narration',
        },
      });

      // Execute Python script
      const result = await this.executePythonScript(args, job.id);

      if (result.success && result.video_url) {
        // Success!
        await prisma.videoGenerationJob.update({
          where: { id: job.id },
          data: {
            status: 'completed',
            progress: 100,
            completedAt: new Date(),
            currentStep: 'Video generation complete',
          },
        });

        await prisma.videoCampaign.update({
          where: { id: campaign.id },
          data: {
            status: 'READY',
            videoUrl: result.video_url,
            generatedAt: new Date(),
          },
        });

        logger.info(`Job ${job.id} completed successfully`);
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error: any) {
      logger.error(`Job ${job.id} failed:`, error);

      await prisma.videoGenerationJob.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          errorMessage: error.message,
          completedAt: new Date(),
          attempts: { increment: 1 },
        },
      });

      await prisma.videoCampaign.update({
        where: { id: job.campaignId },
        data: {
          status: 'FAILED',
          generationError: error.message,
        },
      });
    }
  }

  private executePythonScript(args: string[], jobId: string): Promise<GenerationResult> {
    return new Promise((resolve, reject) => {
      const python = spawn('python3', args);
      let stdout = '';
      let stderr = '';

      python.stdout.on('data', (data) => {
        stdout += data.toString();
        logger.info(`Python output: ${data}`);

        // Update progress based on log messages
        this.updateProgressFromLogs(data.toString(), jobId);
      });

      python.stderr.on('data', (data) => {
        stderr += data.toString();
        logger.error(`Python error: ${data}`);
      });

      python.on('close', (code) => {
        if (code === 0) {
          try {
            const result: GenerationResult = JSON.parse(stdout);
            resolve(result);
          } catch (e) {
            reject(new Error(`Invalid JSON output: ${stdout}`));
          }
        } else {
          reject(new Error(`Python script exited with code ${code}: ${stderr}`));
        }
      });

      python.on('error', (error) => {
        reject(error);
      });
    });
  }

  private async updateProgressFromLogs(logLine: string, jobId: string) {
    try {
      // Parse log messages and update progress
      if (logLine.includes('Generating audio')) {
        await prisma.videoGenerationJob.update({
          where: { id: jobId },
          data: { progress: 40, currentStep: 'Generating audio' },
        });
      } else if (logLine.includes('Downloading')) {
        await prisma.videoGenerationJob.update({
          where: { id: jobId },
          data: { progress: 50, currentStep: 'Downloading template' },
        });
      } else if (logLine.includes('Rendering video')) {
        await prisma.videoGenerationJob.update({
          where: { id: jobId },
          data: { progress: 70, currentStep: 'Rendering video' },
        });
      } else if (logLine.includes('Uploading to S3')) {
        await prisma.videoGenerationJob.update({
          where: { id: jobId },
          data: { progress: 90, currentStep: 'Uploading to S3' },
        });
      }
    } catch (error) {
      // Ignore progress update errors
    }
  }
}

// Main execution
const worker = new VideoGenerationWorker();

// Handle shutdown gracefully
process.on('SIGTERM', async () => {
  await worker.stop();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await worker.stop();
  await prisma.$disconnect();
  process.exit(0);
});

// Start worker
worker.start().catch((error) => {
  logger.error('Worker failed to start:', error);
  process.exit(1);
});
