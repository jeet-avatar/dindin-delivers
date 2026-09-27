const assert = require('node:assert/strict'), fs = require('node:fs'), Module = require('node:module'), ts = require('typescript');
const file = require('node:path').resolve(__dirname, '../src/lib/bridge-status.ts');
const mod = new Module(file, module);
mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, file);
const { bridgeStatusFromResponse: status, bridgeStatusLabel } = mod.exports;
assert.equal(status(200, { bridge_connected: true }), 'connected');
assert.equal(status(200, { bridge_connected: false }), 'disconnected');
for (const data of [null, {}, { bridges_connected: 1 }, { bridge_connected: 'false' }, { bridge_connected: 1 }]) {
  assert.equal(status(200, data), 'unavailable');
}
for (const code of [403, 429, 500, 503]) assert.equal(status(code, { bridge_connected: true }), 'unavailable');
assert.equal(status(401, null), 'signed-out');
assert.equal(bridgeStatusLabel.connected, 'Bridge connected');
assert.match(bridgeStatusLabel.checking, /Checking/);
console.log('Account-specific bridge response states passed.');
