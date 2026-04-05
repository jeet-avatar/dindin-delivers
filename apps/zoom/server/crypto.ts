import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const KEY_HEX = process.env.TOKEN_ENCRYPT_KEY || '';
if (!KEY_HEX) throw new Error('TOKEN_ENCRYPT_KEY is required');
const KEY = Buffer.from(KEY_HEX, 'hex');
if (KEY.length !== 32) throw new Error('TOKEN_ENCRYPT_KEY must be 32 bytes (64 hex chars)');

const ALGO = 'aes-256-gcm';

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return iv.toString('hex') + authTag.toString('hex') + encrypted.toString('hex');
}

export function decrypt(data: string): string {
  const iv = Buffer.from(data.slice(0, 24), 'hex');
  const authTag = Buffer.from(data.slice(24, 56), 'hex');
  const ciphertext = Buffer.from(data.slice(56), 'hex');
  const decipher = createDecipheriv(ALGO, KEY, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(ciphertext).toString('utf8') + decipher.final('utf8');
}
