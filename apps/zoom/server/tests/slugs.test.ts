import { describe, it, expect } from 'vitest';
import { deriveSlug, generateUniqueSlug } from '../slugs.js';

describe('deriveSlug', () => {
  it('lowercases and hyphenates', () => {
    expect(deriveSlug('Jeet Nair')).toBe('jeet-nair');
  });

  it("strips non-alphanumeric chars", () => {
    expect(deriveSlug("John O'Brien")).toBe('john-obrien');
  });

  it('truncates to 17 chars (leaving room for -99 suffix)', () => {
    expect(deriveSlug('Abcdefghijklmnopqrstuvwxyz')).toHaveLength(17);
  });
});

describe('generateUniqueSlug', () => {
  it('returns base slug when not taken', async () => {
    const slug = await generateUniqueSlug('Jeet Nair', async () => false);
    expect(slug).toBe('jeet-nair');
  });

  it('appends -2 when base is taken', async () => {
    let calls = 0;
    const slug = await generateUniqueSlug('Jeet Nair', async (s) => {
      calls++;
      return s === 'jeet-nair';
    });
    expect(slug).toBe('jeet-nair-2');
    expect(calls).toBe(2);
  });

  it('throws after 99 attempts', async () => {
    await expect(
      generateUniqueSlug('Jeet', async () => true)
    ).rejects.toThrow('slug_exhausted');
  });
});
