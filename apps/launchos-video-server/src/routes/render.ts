import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { enqueueJob, getJobStatus } from '../queue/jobQueue';
import { generateVoiceover } from '../services/elevenLabs';
import { renderVideo } from '../services/remotionRenderer';

export const renderRouter = Router();

const ENTITLEMENT_SERVICE_URL = process.env.ENTITLEMENT_SERVICE_URL!;

interface RenderRequest {
  campaign_id: string;
  script: string;          // campaign copy for ElevenLabs
  voiceover: boolean;      // false = skip ElevenLabs
  composition?: string;    // default: "DollorDemo"
  launchos_user_id: string;
  tier: 'starter' | 'growth' | 'scale';
  webhook?: string;        // URL to POST when job completes or fails
}

/**
 * POST /video/render
 * Enqueues a render job and returns job_id + status:queued synchronously.
 */
renderRouter.post('/render', async (req: Request, res: Response): Promise<void> => {
  const body = req.body as RenderRequest;

  // Validate required fields
  if (!body.campaign_id || !body.script || !body.launchos_user_id || !body.tier) {
    res.status(400).json({ error: 'Missing required fields: campaign_id, script, launchos_user_id, tier' });
    return;
  }

  const job_id = uuidv4();
  const composition = body.composition || 'DollorDemo';

  // Check render_video entitlement BEFORE enqueuing
  try {
    await axios.post(`${ENTITLEMENT_SERVICE_URL}/entitlements/check`, {
      launchos_user_id: body.launchos_user_id,
      action: 'render_video',
      quantity: 1,
    });
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.status === 402) {
      res.status(402).json({ error: 'Render video entitlement quota exceeded' });
      return;
    }
    // Other entitlement service errors — treat as allowed to not block renders
    console.error('[render] Entitlement check error (allowing render):', err);
  }

  // Capture body fields for closure
  const { script, voiceover, launchos_user_id, webhook } = body;
  const scriptLength = script.length;

  enqueueJob(
    job_id,
    async () => {
      let audioPath: string | undefined;

      if (voiceover) {
        // Check tts_character entitlement BEFORE calling ElevenLabs
        let ttsAllowed = false;
        try {
          await axios.post(`${ENTITLEMENT_SERVICE_URL}/entitlements/check`, {
            launchos_user_id,
            action: 'tts_character',
            quantity: scriptLength,
          });
          ttsAllowed = true;
        } catch (err: unknown) {
          if (axios.isAxiosError(err) && err.response?.status === 402) {
            // 402 = tts_character quota exceeded — music-only fallback, not a failure
            console.warn(`[render:${job_id}] tts_character quota exceeded — falling back to music-only`);
            ttsAllowed = false;
          } else {
            // Unexpected error from entitlement service — fall back to music-only
            console.error(`[render:${job_id}] tts_character check error — falling back to music-only:`, err);
            ttsAllowed = false;
          }
        }

        if (ttsAllowed) {
          try {
            audioPath = await generateVoiceover(script, '/tmp');
          } catch (err: unknown) {
            // ElevenLabs API failure — music-only fallback, not a job failure
            console.error(`[render:${job_id}] ElevenLabs error — falling back to music-only:`, err);
            audioPath = undefined;
          }
        }
      }

      // Run Remotion render (with or without audio)
      const output_url = await renderVideo({ composition, audioPath, jobId: job_id });

      // Consume render_video entitlement
      try {
        await axios.post(`${ENTITLEMENT_SERVICE_URL}/entitlements/consume`, {
          launchos_user_id,
          action: 'render_video',
          quantity: 1,
        });
      } catch (err: unknown) {
        console.error(`[render:${job_id}] Failed to consume render_video entitlement:`, err);
      }

      // Consume tts_character entitlement if voiceover was actually used
      if (audioPath) {
        try {
          await axios.post(`${ENTITLEMENT_SERVICE_URL}/entitlements/consume`, {
            launchos_user_id,
            action: 'tts_character',
            quantity: scriptLength,
          });
        } catch (err: unknown) {
          console.error(`[render:${job_id}] Failed to consume tts_character entitlement:`, err);
        }
      }

      return output_url;
    },
    webhook
  );

  res.status(201).json({
    job_id,
    status: 'queued',
    poll_url: `/video/jobs/${job_id}`,
  });
});

/**
 * GET /video/jobs/:id
 * Returns current job status and output_url when done.
 */
renderRouter.get('/jobs/:id', (req: Request, res: Response): void => {
  const job = getJobStatus(req.params.id);
  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }
  res.json({
    job_id: job.id,
    status: job.status,
    output_url: job.output_url,
    error: job.error,
    created_at: job.created_at,
  });
});
