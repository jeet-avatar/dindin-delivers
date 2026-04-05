export function deriveSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 17);
}

export async function generateUniqueSlug(
  name: string,
  isTaken: (slug: string) => Promise<boolean>
): Promise<string> {
  const base = deriveSlug(name);
  if (!(await isTaken(base))) return base;
  for (let i = 2; i <= 99; i++) {
    const candidate = `${base}-${i}`;
    if (!(await isTaken(candidate))) return candidate;
  }
  throw new Error('slug_exhausted');
}
