const assert = require('node:assert/strict');
const fs = require('node:fs'), Module = require('node:module'), path = require('node:path'), ts = require('typescript');
const file = path.resolve(__dirname, '../src/lib/reference-import.ts');
const mod = new Module(file, module);
mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021,
} }).outputText, file);
const { importOperation, finishImport } = mod.exports;
const entries = new Map();
const storage = { getItem: key => entries.get(key) || null, setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key) };
const intent = { stems: ['vocals', 'kick'], source_use: { rights_confirmed: true, intended_use: 'private' } };
const id = importOperation(storage, 'a'.repeat(32), intent);
assert.match(id, /^[a-f0-9]{32}$/);
assert.equal(importOperation(storage, 'a'.repeat(32), intent), id, 'Retry after reload keeps the identifier');
assert.equal(importOperation(storage, 'a'.repeat(32), { ...intent, stems: ['kick', 'vocals'] }), id);
assert.notEqual(importOperation(storage, 'b'.repeat(32), intent), id, 'Other references have independent imports');
assert.notEqual(importOperation(storage, 'a'.repeat(32), { ...intent, stems: ['vocals'] }), id, 'Changed choices need a new identifier');
finishImport(storage, 'a'.repeat(32));
assert.equal(storage.getItem('beatmind_import_' + 'a'.repeat(32)), null);
assert.throws(() => importOperation({ ...storage, setItem() { throw new Error('Storage unavailable'); } }, 'c'.repeat(32), intent));
console.log('Stem import retry identity, reference isolation, changed choices and unavailable storage passed.');
