import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface LaunchOSRequest extends Request {
  launchosUser?: jwt.JwtPayload | string;
}

export function requireLaunchOSToken(
  req: LaunchOSRequest,
  res: Response,
  next: NextFunction
): void {
  const token = req.headers['x-launchos-token'];

  if (!token || typeof token !== 'string') {
    res.status(401).json({ error: 'Missing x-launchos-token' });
    return;
  }

  const secret = process.env.LAUNCHOS_JWT_SECRET;
  if (!secret) {
    res.status(500).json({ error: 'JWT secret not configured' });
    return;
  }

  try {
    const payload = jwt.verify(token, secret);
    req.launchosUser = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
