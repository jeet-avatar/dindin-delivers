import { EventEmitter } from 'events';

export type JobStatus = 'queued' | 'rendering' | 'done' | 'failed';

export interface Job {
  id: string;
  status: JobStatus;
  output_url?: string;
  error?: string;
  created_at: string;
}

const jobs = new Map<string, Job>();
// EventEmitter kept for future pubsub extension
const queue = new EventEmitter();
queue.setMaxListeners(100);

export function enqueueJob(id: string, task: () => Promise<string>, webhookUrl?: string): void {
  jobs.set(id, { id, status: 'queued', created_at: new Date().toISOString() });
  // Run async without blocking the HTTP response
  setImmediate(async () => {
    const job = jobs.get(id)!;
    job.status = 'rendering';
    try {
      const output_url = await task();
      job.status = 'done';
      job.output_url = output_url;
      if (webhookUrl) await notifyWebhook(webhookUrl, { job_id: id, status: 'done', output_url });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      job.status = 'failed';
      job.error = message;
      if (webhookUrl) await notifyWebhook(webhookUrl, { job_id: id, status: 'failed', error: message });
    }
  });
}

export function getJobStatus(id: string): Job | undefined {
  return jobs.get(id);
}

async function notifyWebhook(url: string, payload: object): Promise<void> {
  try {
    // best-effort webhook — do not throw on failure
    const { default: axios } = await import('axios');
    await axios.post(url, payload, { timeout: 5000 });
  } catch {
    // Intentionally swallowed — webhook delivery is best-effort
  }
}
