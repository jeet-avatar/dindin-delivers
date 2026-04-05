import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '../crypto.js';

describe('crypto', () => {
  it('roundtrips plaintext through encrypt/decrypt', () => {
    const original = 'super-secret-token-abc123';
    const ciphertext = encrypt(original);
    expect(ciphertext).not.toBe(original);
    expect(decrypt(ciphertext)).toBe(original);
  });

  it('produces different ciphertext for same plaintext (random IV)', () => {
    const a = encrypt('hello');
    const b = encrypt('hello');
    expect(a).not.toBe(b);
  });
});
