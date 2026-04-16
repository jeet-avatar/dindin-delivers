import { blogPosts } from '../src/data/blogPosts';

const BLOCKLIST = ['acme', 'globex', 'initech'];

const errors: string[] = [];
const slugsSeen = new Set<string>();

for (const post of blogPosts) {
  const prefix = `✗ ${post.slug}`;
  const postErrors: string[] = [];
  const postWarns: string[] = [];

  const required = ['slug','title','description','category','publishedAt','readTime','tags','content'];
  for (const f of required) {
    if (!(post as any)[f]) postErrors.push(`FAIL: missing required field '${f}'`);
  }

  if (post.slug && !/^[a-z0-9-]+$/.test(post.slug))
    postErrors.push('FAIL: slug must be lowercase, hyphens only');

  if (slugsSeen.has(post.slug)) postErrors.push('FAIL: duplicate slug');
  slugsSeen.add(post.slug);

  if (post.description && (post.description.length < 120 || post.description.length > 160))
    postErrors.push(`FAIL: description ${post.description.length} chars (must be 120–160)`);

  const wordCount = post.content.replace(/<[^>]+>/g,'').split(/\s+/).filter(Boolean).length;
  const minWords = post.badge === 'must-read' ? 2000 : 800;
  if (wordCount < minWords)
    postErrors.push(`FAIL: content only ${wordCount} words (minimum ${minWords} for ${post.badge ?? 'standard'} post)`);

  if (!/<h2/i.test(post.content)) postErrors.push('FAIL: no <h2> tag in content');

  if (!post.content.includes('/blog/')) postErrors.push('FAIL: missing /blog/ internal link');

  if (!post.content.includes('/solutions/')) postErrors.push('FAIL: missing /solutions/ internal link');

  if (!post.content.includes('/create-account')) postErrors.push('FAIL: missing /create-account CTA');

  if (post.publishedAt && !/^\d{4}-\d{2}-\d{2}$/.test(post.publishedAt))
    postErrors.push('FAIL: publishedAt must be YYYY-MM-DD');

  if (!post.tags || post.tags.length < 3)
    postWarns.push(`WARN: only ${post.tags?.length ?? 0} tags (minimum 3)`);

  const lowerContent = post.content.toLowerCase();
  for (const name of BLOCKLIST) {
    if (lowerContent.includes(name)) postWarns.push(`WARN: possible customer name '${name}'`);
  }

  if (postErrors.length || postWarns.length) {
    console.log(prefix);
    for (const e of postErrors) console.log(`    → ${e}`);
    for (const w of postWarns) console.log(`    → ${w}`);
  } else {
    console.log(`✓ ${post.slug}`);
  }
  if (postErrors.length) errors.push(...postErrors);
}

console.log('\n─────────────────────────────────────');
if (errors.length) {
  console.log(`${blogPosts.length - errors.length} passed · ${errors.length} failed · Build aborted.`);
  process.exit(1);
} else {
  console.log(`${blogPosts.length} passed · 0 failed · ✅ Blog valid.`);
}
