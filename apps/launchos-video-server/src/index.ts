import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import { renderRouter } from './routes/render';

const app = express();
const PORT = parseInt(process.env.PORT || '3010', 10);
const VIDEO_SERVER_SECRET = process.env.VIDEO_SERVER_SECRET;

if (!VIDEO_SERVER_SECRET) {
  console.error('FATAL: VIDEO_SERVER_SECRET env var is required');
  process.exit(1);
}

// Parse JSON bodies
app.use(express.json());

// Health check — no auth required
app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true, service: 'launchos-video-server', uptime: process.uptime() });
});

// Shared secret auth middleware for all /video/* routes
app.use('/video', (req: Request, res: Response, next: NextFunction) => {
  const key = req.headers['x-video-server-key'];
  if (key !== VIDEO_SERVER_SECRET) {
    res.status(401).json({ error: 'Unauthorized — invalid X-Video-Server-Key' });
    return;
  }
  next();
});

// Mount render router
app.use('/video', renderRouter);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`LaunchOS Video Server running on port ${PORT}`);
});

export default app;
