const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
const file = require('node:path').resolve(__dirname, '../src/lib/chat-index.ts');
const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const mod = new Module(file, module);
mod._compile(compiled.outputText, file);
const { restoreChatIndex, unmatchedServerChats, refreshPlaceholderTitles } = mod.exports;
const local = [{ id: 'browser-a', title: 'Same title', sessionId: 'a' }];
const server = [{ id: 'a', title: 'Same title' }, { id: 'b', title: 'Same title' }];
assert.deepEqual(unmatchedServerChats(local, server, null), [server[1]]);
assert.deepEqual(unmatchedServerChats([], server, 'a'), [server[1]]);
assert.deepEqual(unmatchedServerChats([], server, null), server);
assert.equal(server.length, 2, 'Filtering must not delete saved history');
const legacy = [{ id: 'old', title: 'Legacy' }];
assert.deepEqual(restoreChatIndex(legacy, () => JSON.stringify({ sessionId: 'a' })), [{ ...legacy[0], sessionId: 'a' }]);
assert.deepEqual(restoreChatIndex(legacy, () => '{'), legacy);
assert.deepEqual(restoreChatIndex(legacy, () => null), legacy);
assert.deepEqual(restoreChatIndex(local, () => { throw Error('Already indexed'); }), local);
assert.deepEqual(refreshPlaceholderTitles([{ id: 'local', sessionId: 'song', title: 'New song' }],
  [{ id: 'song', title: 'Deep minimal - 124 BPM' }]), [{ id: 'local', sessionId: 'song', title: 'Deep minimal - 124 BPM' }]);
assert.deepEqual(refreshPlaceholderTitles(local, [{ id: 'a', title: 'Older server name' }]), local,
  'An explicit local title must not be overwritten by a stale list response');
console.log('Local/server chat identity deduplication and legacy restoration passed.');
