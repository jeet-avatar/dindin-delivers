import type { Request, Response, NextFunction } from 'express';
import { verifyJwt } from '../auth.js';

export function requireHostAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'missing_token' });
    return;
  }
  const token = header.slice(7);
  const payload = verifyJwt(token) as { host_id?: string; type?: string } | null;
  if (!payload || payload.type !== 'session' || !payload.host_id) {
    res.status(401).json({ error: 'invalid_token' });
    return;
  }
  (req as any).hostId = payload.host_id;
  next();
}
