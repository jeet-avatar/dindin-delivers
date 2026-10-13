const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module');
const ts = require('typescript');
const { test } = require('node:test');

function load(relative) {
  const file = path.resolve(__dirname, '../src', relative);
  const mod = new Module(file, module);
  mod.paths = Module._nodeModulePaths(path.dirname(file));
  const original = mod.require.bind(mod);
  mod.require = name => name.startsWith('@/') ? load(name.slice(2) + '.ts') : original(name);
  mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText, file);
  return mod.exports;
}

const blog = load('lib/blog.ts');
const slugs = ['automatic-remix-preview-guide', 'beatmind-bridge-ableton-connection-guide', 'reference-track-vs-stem-remix'];

test('new guides have unique metadata and visible FAQs for structured data', () => {
  const posts = blog.getAllPosts();
  assert.equal(new Set(posts.map(p => p.slug)).size, posts.length);
  for (const slug of slugs) {
    const post = blog.getPost(slug);
    assert.ok(post && post.description && post.keywords.length && post.author);
    assert.equal(post.updated, '2026-10-13');
    assert.ok(blog.extractFaqs(post.body).length >= 4);
    assert.ok(post.body.includes('/dashboard') || post.body.includes('/blog/'));
  }
});

test('crawler summary and sitemap derive articles and prices from current data', async () => {
  const response = load('app/llms.txt/route.ts').GET();
  assert.match(response.headers.get('content-type'), /text\/plain/);
  const summary = await response.text();
  const sitemap = load('app/sitemap.ts').default();
  for (const post of blog.getAllPosts()) {
    const url = `https://www.beatmind.io/blog/${post.slug}`;
    assert.ok(summary.includes(url));
    assert.ok(sitemap.some(entry => entry.url === url && entry.lastModified === post.updated));
  }
  for (const plan of load('lib/pricing.ts').PLANS) {
    assert.ok(summary.includes(`$${plan.monthly}/month`));
    assert.ok(summary.includes(`$${plan.yearly}/year`));
  }
  assert.match(summary, /Automatic Ableton import of these previews is disabled/);
  assert.equal(fs.existsSync(path.resolve(__dirname, '../public/llms.txt')), false);
});

test('search crawler may read public pages but not account or API paths', () => {
  const robots = fs.readFileSync(path.resolve(__dirname, '../public/robots.txt'), 'utf8');
  for (const agent of ['OAI-SearchBot', '*']) {
    const group = robots.split(`User-agent: ${agent}\n`)[1]?.split('User-agent:')[0];
    assert.ok(group);
    assert.match(group, /^Allow: \/$/m);
    for (const route of ['/dashboard', '/login', '/signup', '/forgot-password', '/reset-password', '/api/']) {
      assert.ok(group.includes(`Disallow: ${route}\n`));
    }
  }
  assert.ok(robots.includes('Sitemap: https://www.beatmind.io/sitemap.xml'));
});
