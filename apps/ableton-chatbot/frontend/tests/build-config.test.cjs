const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module'), ts = require('typescript');
const { PHASE_PRODUCTION_BUILD, PHASE_DEVELOPMENT_SERVER } = require('next/constants');
const file = path.resolve(__dirname, '../next.config.ts');
const mod = new Module(file, module);
mod.paths = Module._nodeModulePaths(path.dirname(file));
mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, file);
const config = mod.exports.default, original = process.env.NEXT_PUBLIC_API_URL;
try {
  for (const value of [undefined, '', 'invalid', 'http://localhost:8000', 'https://localhost', 'https://test.localhost', 'https://127.0.0.1', 'https://[::1]', 'http://api.beatmind.io', 'https://api.beatmind.io/', 'https://api.beatmind.io/api', 'https://user:password@api.beatmind.io']) {
    if (value === undefined) delete process.env.NEXT_PUBLIC_API_URL;
    else process.env.NEXT_PUBLIC_API_URL = value;
    assert.throws(() => config(PHASE_PRODUCTION_BUILD), /Production build requires NEXT_PUBLIC_API_URL/);
    assert.equal(config(PHASE_DEVELOPMENT_SERVER).output, 'export');
  }
  process.env.NEXT_PUBLIC_API_URL = 'https://api.beatmind.io';
  assert.equal(config(PHASE_PRODUCTION_BUILD).output, 'export');
  process.env.NEXT_PUBLIC_API_URL = 'https://staging-api.example.com';
  assert.equal(config(PHASE_PRODUCTION_BUILD).output, 'export');
} finally {
  if (original === undefined) delete process.env.NEXT_PUBLIC_API_URL;
  else process.env.NEXT_PUBLIC_API_URL = original;
}
console.log('Production builds reject missing, local, non-HTTPS and malformed API origins; development remains available.');
