import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';
import { logger } from '../utils/logger';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const JWKS_URL = SUPABASE_URL ? `${SUPABASE_URL}/auth/v1/.well-known/jwks.json` : '';

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

if (JWKS_URL) {
  try {
    jwks = createRemoteJWKSet(new URL(JWKS_URL), {
      cacheMaxAge: 10 * 60 * 1000,
      cooldownDuration: 30 * 1000,
    });
  } catch (err) {
    logger.warn(`Failed to initialize Supabase JWKS: ${(err as Error).message}`);
  }
} else {
  logger.warn('Supabase JWKS disabled — SUPABASE_URL not set');
}

export interface SupabaseClaims extends JWTPayload {
  sub: string;
  email?: string;
  role?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
}

export async function verifySupabaseJwt(token: string): Promise<SupabaseClaims> {
  if (!jwks) {
    throw new Error('Supabase JWKS verifier not initialized (SUPABASE_URL missing)');
  }
  const { payload } = await jwtVerify(token, jwks, {
    issuer: `${SUPABASE_URL}/auth/v1`,
  });
  if (!payload.sub) {
    throw new Error('Supabase JWT missing sub claim');
  }
  return payload as SupabaseClaims;
}

export function isSupabaseJwtConfigured(): boolean {
  return !!jwks;
}
