const assert = require('node:assert/strict'), fs = require('node:fs'), Module = require('node:module'), ts = require('typescript');
const file = require('node:path').resolve(__dirname, '../src/lib/cloud-upload.ts');
const mod = new Module(file, module);
class UploadConfirmationError extends Error {}
mod.require = name => {
  if (name === './reference-upload') return { UploadConfirmationError };
  throw Error('Unexpected import ' + name);
};
mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 } }).outputText, file);
const { uploadToCloud } = mod.exports;
class FakeXHR {
  static calls = [];
  constructor() { this.upload = {}; FakeXHR.calls.push(this); }
  open(method, url) { this.method = method; this.url = url; }
  send(body) { this.body = body; }
  abort() { this.onabort(); }
  respond(status, text = '') { this.status = status; this.responseText = text; this.onload(); }
}
global.XMLHttpRequest = FakeXHR;
const form = { url: 'https://bucket.s3.amazonaws.com/', fields: { key: 'abc/source.mp3', policy: 'p', 'x-amz-signature': 's' } };
(async () => {
  const audio = new File(['audio'], 'Song.mp3'), progress = [];
  const done = uploadToCloud(form, audio, new AbortController().signal, p => progress.push(p));
  const xhr = FakeXHR.calls.at(-1);
  assert.equal(xhr.method, 'POST'); assert.equal(xhr.url, form.url);
  const keys = [...xhr.body.keys()];
  assert.deepEqual(keys, ['key', 'policy', 'x-amz-signature', 'file'], 'S3 requires the file after every signed field');
  xhr.upload.onload(); xhr.respond(204);
  await done;
  assert.equal(progress.at(-1).sent, true);

  const tooBig = uploadToCloud(form, audio, new AbortController().signal, () => {});
  FakeXHR.calls.at(-1).respond(400, '<Error><Code>EntityTooLarge</Code></Error>');
  await assert.rejects(tooBig, /larger than BeatMind Cloud accepts/);

  const lost = uploadToCloud(form, audio, new AbortController().signal, () => {});
  FakeXHR.calls.at(-1).onerror();
  await assert.rejects(lost, e => e instanceof UploadConfirmationError);

  const controller = new AbortController();
  const cancelled = uploadToCloud(form, audio, controller.signal, () => {});
  controller.abort();
  await assert.rejects(cancelled, { name: 'AbortError' });
  console.log('Direct S3 upload field order, success, size rejection, lost connection and cancel passed.');
})().catch(error => { console.error(error); process.exit(1); });
