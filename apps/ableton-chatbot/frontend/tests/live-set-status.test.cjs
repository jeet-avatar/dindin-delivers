const assert = require('node:assert/strict'), fs = require('node:fs'), Module = require('node:module'), ts = require('typescript');
const file = require('node:path').resolve(__dirname, '../src/lib/live-set-status.ts');
const mod = new Module(file, module);
mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, file);
const { liveSetMessage } = mod.exports;
assert.match(liveSetMessage('System Events: osascript is not allowed assistive access. (-25211)'), /Enable BeatMind Bridge.*Accessibility/);
assert.match(liveSetMessage('Accessibility control denied'), /reopen and reconnect/);
const windowFailure = liveSetMessage('502:608: execution error: Unable to identify one Ableton document window. Close extra document or plug-in windows and check again. (-2700)');
assert.match(windowFailure, /could not identify your Live Set window/);
assert.doesNotMatch(windowFailure, /macOS blocked|Enable BeatMind Bridge|502:608/);
assert.match(liveSetMessage('Not authorized to send Apple events. (-1743)'), /Automation/);
for (const message of ['', 'Save requested.', 'Ableton did not respond. Check its open dialogs before retrying.']) {
  assert.equal(liveSetMessage(message), message);
}
console.log('Live Set permission guidance and unchanged unknown errors passed.');
