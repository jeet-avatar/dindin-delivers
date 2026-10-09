const assert = require('node:assert/strict'), fs = require('node:fs'), Module = require('node:module'), ts = require('typescript');
const file = require('node:path').resolve(__dirname, '../src/lib/update-check.ts');
const mod = new Module(file, module);
mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, file);
const { updateNotice, newerVersion } = mod.exports;
assert.equal(newerVersion('1.2.0', '1.1.9'), true);
assert.equal(newerVersion('1.10.0', '1.9.0'), true);
assert.equal(newerVersion('1.2.0', '1.2.0'), false);
assert.equal(newerVersion('1.1.0', '1.2.0'), false);
assert.deepEqual(updateNotice('abc', { frontend_commit: 'def' }, '1.1.0', { version: '1.2.0' }), { web: true, bridge: '1.2.0' });
assert.deepEqual(updateNotice('abc', { frontend_commit: 'abc' }, '1.2.0', { version: '1.2.0' }), { web: false, bridge: null });
// A disconnected Bridge, a missing build commit or unreadable metadata never nags.
assert.deepEqual(updateNotice(undefined, { frontend_commit: 'def' }, null, { version: '9.0.0' }), { web: false, bridge: null });
assert.deepEqual(updateNotice('abc', null, '1.0.0', null), { web: false, bridge: null });
console.log('Update notices: web release and Bridge version comparisons passed.');
