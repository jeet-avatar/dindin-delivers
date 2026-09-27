const assert = require('node:assert/strict'), fs = require('node:fs'), Module = require('node:module'), ts = require('typescript');
const file = require('node:path').resolve(__dirname, '../src/lib/reference-upload.ts');
const mod = new Module(file, module);
const observed = [];
mod.require = name => {
  if (name === './auth') return { API_URL: 'https://api.example.invalid', getToken: () => 'fixture-token' };
  if (name === './background-polling') return { observePollingResponse: r => observed.push(r.status) };
  throw Error('Unexpected import ' + name);
};
mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 } }).outputText, file);
const { uploadReference, UploadConfirmationError } = mod.exports;
class FakeXHR {
  static calls = [];
  constructor() { this.upload = {}; this.headers = {}; FakeXHR.calls.push(this); }
  open(method, url) { this.method = method; this.url = url; }
  setRequestHeader(k, v) { this.headers[k] = v; }
  getResponseHeader() { return null; }
  send(body) { this.body = body; }
  abort() { this.onabort(); }
  respond(status, body) { this.status = status; this.responseText = JSON.stringify(body); this.onload(); }
}
global.XMLHttpRequest = FakeXHR;
(async () => {
  const audio = new File(['audio'], 'My song.mp3', { type: 'audio/mpeg' }), progress = [];
  const controller = new AbortController();
  let resolved = false;
  const result = uploadReference(audio, controller.signal, p => progress.push(p)).then(r => { resolved = true; return r; });
  const xhr = FakeXHR.calls.at(-1);
  assert.equal(xhr.url, 'https://api.example.invalid/api/references');
  assert.equal(xhr.method, 'POST');
  assert.equal(xhr.headers['X-Reference-Name'], 'My%20song.mp3');
  assert.equal(xhr.headers['X-Rights-Confirmed'], 'true');
  assert.equal(xhr.headers.Authorization, 'Bearer fixture-token');
  assert.equal(xhr.body, audio);
  xhr.upload.onprogress({ loaded: 3, total: 5, lengthComputable: true });
  assert.deepEqual(progress.at(-1), { loaded: 3, total: 5, sent: false });
  xhr.upload.onload();
  await Promise.resolve();
  assert.equal(resolved, false, '100% sent is not server confirmation');
  assert.deepEqual(progress.at(-1), { loaded: 5, total: 5, sent: true });
  xhr.respond(202, { id: 'accepted' });
  assert.equal((await result).status, 202);
  for (const status of [408, 409, 429, 503]) {
    const pending = uploadReference(audio, new AbortController().signal, () => {});
    FakeXHR.calls.at(-1).respond(status, { detail: 'not accepted' });
    assert.equal((await pending).status, status);
  }
  for (const failure of ['onerror', 'ontimeout']) {
    const pending = uploadReference(audio, new AbortController().signal, () => {});
    FakeXHR.calls.at(-1)[failure]();
    await assert.rejects(pending, UploadConfirmationError);
  }
  const abort = new AbortController();
  const pending = uploadReference(audio, abort.signal, () => {});
  abort.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  assert.deepEqual(observed, [202, 408, 409, 429, 503]);
  console.log('Actual upload bytes, separate server confirmation, HTTP errors, unknown completion and navigation abort passed.');
})().catch(e => { console.error(e); process.exitCode = 1; });
