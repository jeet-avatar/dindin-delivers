import { describe, it, expect } from 'vitest';
import { signJwt, verifyJwt } from '../auth.js';

describe('auth', () => {
  it('signs and verifies a JWT', () => {
    const token = signJwt({ host_id: 'abc', type: 'session' }, '7d');
    const payload = verifyJwt(token);
    expect(payload).not.toBeNull();
    expect((payload as any).host_id).toBe('abc');
    expect((payload as any).type).toBe('session');
  });

  it('returns null for tampered token', () => {
    const token = signJwt({ host_id: 'abc', type: 'session' }, '7d');
    const tampered = token.slice(0, -4) + 'XXXX';
    expect(verifyJwt(tampered)).toBeNull();
  });

  it('returns null for expired token', async () => {
    const token = signJwt({ host_id: 'abc', type: 'magic' }, '1ms');
    await new Promise(r => setTimeout(r, 10));
    expect(verifyJwt(token)).toBeNull();
  });
});
