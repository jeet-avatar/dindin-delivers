const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const filename = path.join(__dirname, "../src/lib/stream-health.ts");
const compiled = new Module(filename, module);
compiled._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename);
const { streamHealth } = compiled.exports;
assert.deepEqual(streamHealth(10_000, 0, 0), { notice: "", disconnected: false });
assert.match(streamHealth(61_000, 60_000, 0).notice, /Still connected/);
assert.equal(streamHealth(61_000, 60_000, 0).disconnected, false);
assert.match(streamHealth(46_000, 0, 0).notice, /connection/);
assert.equal(streamHealth(90_000, 0, 0).disconnected, true);
assert.match(streamHealth(90_000, 0, 0).notice, /inspect before retrying/);
assert.equal(streamHealth(95_000, 94_000, 94_000).notice, "");
