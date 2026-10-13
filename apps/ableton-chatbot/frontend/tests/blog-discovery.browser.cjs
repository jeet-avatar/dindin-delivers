const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const slugs = ['automatic-remix-preview-guide', 'beatmind-bridge-ableton-connection-guide', 'reference-track-vs-stem-remix'];
const root = path.resolve(__dirname, '../out');
const server = http.createServer((req, res) => {
  const base = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!base.startsWith(root + '/')) { res.writeHead(403); return res.end(); }
  const file = [base, base + '.html', path.join(base, 'index.html')].find(p => fs.existsSync(p) && fs.statSync(p).isFile());
  if (!file) { res.writeHead(404); return res.end(); }
  res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.txt': 'text/plain', '.xml': 'application/xml', '.png': 'image/png' })[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});

(async () => {
  let browser;
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const site = process.env.BEATMIND_TEST_SITE_URL || `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    page.setDefaultTimeout(60000);
    const sitemap = await context.request.get(`${site}/sitemap.xml`);
    assert.equal(sitemap.status(), 200);
    const summary = await context.request.get(`${site}/llms.txt`);
    assert.equal(summary.status(), 200);
    assert.match(summary.headers()['content-type'], /text\/plain/);
    const robots = await context.request.get(`${site}/robots.txt`, { headers: { 'user-agent': 'OAI-SearchBot' } });
    assert.equal(robots.status(), 200);
    assert.ok((await robots.text()).includes('User-agent: OAI-SearchBot'));
    const links = new Set();
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const slug of slugs) {
        const response = await page.goto(`${site}/blog/${slug}`, { waitUntil: 'domcontentloaded' });
        assert.equal(response.status(), 200);
        assert.equal(await page.locator('h1').count(), 1);
        assert.ok((await page.locator('article').innerText()).length > 2000);
        const canonical = `https://www.beatmind.io/blog/${slug}`;
        assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), canonical);
        assert.ok((await sitemap.text()).includes(canonical));
        assert.ok((await summary.text()).includes(canonical));
        const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
        const values = schemas.map(JSON.parse);
        const article = values.find(value => value['@type'] === 'BlogPosting');
        assert.equal(article.url, canonical);
        assert.equal(article.headline, await page.locator('h1').innerText());
        const faq = values.find(value => value['@type'] === 'FAQPage');
        assert.ok(faq.mainEntity.length >= 4);
        const body = await page.locator('article').innerText();
        for (const item of faq.mainEntity) assert.ok(body.includes(item.name));
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
        for (const href of await page.locator('main a[href^="/blog/"]').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')))) links.add(href);
        await page.screenshot({ path: `/tmp/beatmind-blog-${slug}-${width}.png` });
      }
      console.log(`PASS blog discovery ${width}px: readable without JavaScript, metadata, visible FAQ schema, sitemap and summary`);
    }
    for (const href of links) assert.equal((await context.request.get(site + href)).status(), 200, href);
    const socialImage = await context.request.get(`${site}/og-blog.png`);
    assert.equal(socialImage.status(), 200);
    assert.match(socialImage.headers()['content-type'], /image\/png/);
    await page.goto(`${site}/blog`, { waitUntil: 'domcontentloaded' });
    for (const slug of slugs) assert.ok(await page.locator(`main a[href="/blog/${slug}"]`).count());
    console.log('PASS crawler resources, blog index, internal article links and social image');
    await context.close();
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
