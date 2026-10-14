const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), os = require('node:os');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '../out');
const server = http.createServer((req, res) => {
  const base = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!base.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
  const file = [base, base + '.html', path.join(base, 'index.html')].find(p => fs.existsSync(p) && fs.statSync(p).isFile());
  if (!file) { res.writeHead(404); return res.end(); }
  res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
    '.txt': 'text/plain', '.xml': 'application/xml', '.json': 'application/json', '.png': 'image/png',
    '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' })[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});

function run(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env, stdio: 'inherit', timeout: 240000 });
    child.once('error', reject);
    child.once('exit', (code, signal) => resolve(code === 0 && !signal));
  });
}

(async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'beatmind-browser-'));
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const site = process.env.BEATMIND_UI_URL || `http://127.0.0.1:${server.address().port}`;
    const env = { ...process.env, PYTHON_DOTENV_DISABLED: '1', BEATMIND_UI_URL: site, BEATMIND_TEST_SITE_URL: site,
      BEATMIND_COMPARISON_FIXTURE_DIR: directory };
    if (!await run(env.BEATMIND_TEST_PYTHON || 'python3', [path.resolve(__dirname, '../../backend/make_comparison_fixture.py'), directory], env)) {
      throw new Error('Comparison audio fixture generation failed');
    }
    const available = fs.readdirSync(__dirname).filter(name => name.endsWith('.browser.cjs')).sort();
    const requested = process.argv.slice(2);
    if (requested.some(name => !available.includes(name))) throw new Error('Unknown browser test name');
    const selected = requested.length ? requested : available;
    const results = [];
    for (const name of selected) {
      console.log(`\nRUN ${name}`);
      results.push({ name, passed: await run(process.execPath, [path.join(__dirname, name)], env) });
    }
    if (selected.includes('automatic-remix.browser.cjs')) results.push({ name: 'automatic-remix import disabled', passed: await run(process.execPath,
      [path.join(__dirname, 'automatic-remix.browser.cjs')], { ...env, BEATMIND_TEST_IMPORT_ENABLED: '0' }) });
    console.log(JSON.stringify(results, null, 2));
    if (results.some(result => !result.passed)) process.exitCode = 1;
  } finally {
    server.closeAllConnections(); server.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
