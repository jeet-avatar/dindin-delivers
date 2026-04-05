import { describe, it } from 'vitest';

describe('db module', () => {
  it.skipIf(!process.env.DATABASE_URL)('exports pool and runMigrations', async () => {
    const mod = await import('../db.js');
    const { expect } = await import('vitest');
    expect(typeof mod.pool).toBe('object');
    expect(typeof mod.runMigrations).toBe('function');
  });
});
