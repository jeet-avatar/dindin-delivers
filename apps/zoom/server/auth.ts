import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || '';
if (!JWT_SECRET) throw new Error('JWT_SECRET is required');

export function signJwt(payload: object, expiresIn: string): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as jwt.SignOptions);
}

export function verifyJwt(token: string): object | null {
  try {
    return jwt.verify(token, JWT_SECRET) as object;
  } catch {
    return null;
  }
}
