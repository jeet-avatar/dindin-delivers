const assert = require('node:assert/strict'), fs = require('node:fs'), Module = require('node:module'), ts = require('typescript');
const path = require('node:path'), React = require('react'), { renderToStaticMarkup } = require('react-dom/server');
function load(relative) {
  const file = path.resolve(__dirname, relative);
  const mod = new Module(file, module);
  mod.paths = Module._nodeModulePaths(path.dirname(file));
  mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017, jsx: ts.JsxEmit.ReactJSX } }).outputText, file);
  return mod.exports;
}
const stems = load('../src/lib/stems.ts');
const detailed = { stems: ['drums', 'bass', 'vocals', 'other', 'kick', 'snare', 'toms', 'cymbals'].map(name => ({ name })) };
assert.deepEqual(stems.audioStems(undefined), ['drums', 'bass', 'vocals', 'other']);
assert.deepEqual(stems.audioStems({ stems: [] }), ['drums', 'bass', 'vocals', 'other']);
assert.deepEqual(stems.reviewStems({ stems: [{ name: 'drums' }, { name: 'bass' }] }), ['drums', 'bass']);
assert.deepEqual(stems.reviewStems(detailed), ['bass', 'vocals', 'other', 'kick', 'snare', 'toms', 'cymbals']);
assert.equal(stems.audioStems(detailed).length, 8);
assert.equal(stems.stemLabel('cymbals'), 'Cymbals and hi-hat');
assert.equal(stems.stemLabel('kick'), 'Kick');
const status = load('../src/components/ReferenceStatus.tsx');
const html = renderToStaticMarkup(React.createElement(status.default, { reference: { name: 'x.wav', status: 'processing',
  stage: 'Splitting drums into kick, snare, toms and cymbals', created_at: new Date().toISOString() }, checkedAt: Date.now() }));
assert.match(html, /splitting drums into kick, snare, toms and cymbals/);
console.log('Detailed stem taxonomy, legacy fallback, labels and drum-split status passed.');
