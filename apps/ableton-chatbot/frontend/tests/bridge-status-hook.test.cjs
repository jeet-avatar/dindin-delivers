// Run the real hook with deterministic timers and deferred API responses; no desktop/browser opens.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const slots = [], effects = [], timers = new Map();
let cursor = 0, dirty = false, now = 0, nextTimer = 0, output;
let installedVersion = '1.3.16';
let account = 7, visible = true, allowed = true, connected = false;
const calls = [], details = [];
const react = {
  useState(initial) {
    const index = cursor++;
    if (!(index in slots)) slots[index] = initial;
    return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; dirty = true; }];
  },
  useRef(initial) { const index = cursor++; return slots[index] ||= { current: initial }; },
  useCallback(fn) { cursor++; return fn; },
  useEffect(fn, deps) {
    const index = cursor++, previous = slots[index];
    if (!previous || deps.some((value, i) => value !== previous.deps[i])) {
      effects.push(() => { previous?.cleanup?.(); slots[index] = { deps, cleanup: fn() }; });
    }
  },
};
function eventTarget() {
  const listeners = new Map();
  return {
    addEventListener(name, fn) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(fn); },
    removeEventListener(name, fn) { listeners.get(name)?.delete(fn); },
    dispatch(name) { for (const fn of [...(listeners.get(name) || [])]) fn(); },
  };
}
const window = eventTarget(), document = eventTarget();
Object.defineProperty(document, 'visibilityState', { get: () => visible ? 'visible' : 'hidden' });
function timer(fn, delay, repeat = false) {
  const id = ++nextTimer;
  timers.set(id, { fn, at: now + delay, delay, repeat });
  return id;
}
const response = data => ({ status: 200, json: async () => data });
async function apiFetch(url, options) {
  calls.push(url);
  if (url.includes('include_live_set=false')) return response({ bridge_connected: connected, bridge_version: connected ? installedVersion : null });
  return new Promise((resolve, reject) => {
    details.push({ resolve, reject, signal: options.signal });
    options.signal.addEventListener('abort', () => reject(new Error('Aborted')), { once: true });
  });
}
const filename = path.resolve(__dirname, '../src/lib/use-bridge-status.ts');
const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const exports_ = {};
vm.runInNewContext(source, {
  exports: exports_, AbortController, window, document,
  setTimeout: (fn, delay) => timer(fn, delay), clearTimeout: id => timers.delete(id),
  setInterval: (fn, delay) => timer(fn, delay, true), clearInterval: id => timers.delete(id),
  require(name) {
    if (name === 'react') return react;
    if (name === './auth') return { apiFetch };
    if (name === './background-polling') return { backgroundPollingAllowed: () => visible && allowed };
    if (name === './bridge-status') return { bridgeStatusFromResponse: (code, data) => code === 200 && typeof data?.bridge_connected === 'boolean' ? data.bridge_connected ? 'connected' : 'disconnected' : 'unavailable' };
    throw new Error(name);
  },
}, { filename });
function render() {
  cursor = 0; dirty = false;
  output = exports_.useBridgeStatus(account);
  while (effects.length) effects.shift()();
}
async function flush() {
  for (let i = 0; i < 8; i++) { await Promise.resolve(); if (dirty) render(); }
}
async function advance(ms) {
  const end = now + ms;
  while (true) {
    const entry = [...timers].filter(([, value]) => value.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
    if (!entry) break;
    const [id, value] = entry;
    now = value.at;
    if (value.repeat) value.at += value.delay; else timers.delete(id);
    value.fn(); await flush();
  }
  now = end; await flush();
}
async function main() {
  render(); await flush();
  assert.equal(output.status, 'disconnected');
  connected = true;
  await advance(1000);
  assert.equal(output.status, 'connected', 'Connection appears at the next one-second check');
  assert.equal(output.version, '1.3.16', 'Show the running version reported by the Bridge');
  assert.equal(details.length, 1);
  assert.equal(output.liveSet, null, 'Connection badge does not wait for Ableton inspection');
  details[0].resolve(response({ bridge_connected: true, live_set: 'Song A' }));
  await flush();
  assert.equal(output.liveSet, 'Song A');

  window.dispatch('focus'); await flush();
  assert.equal(details.length, 2);
  installedVersion = '1.3.17';
  window.dispatch('focus'); await flush();
  assert.equal(output.version, '1.3.17', 'Confirm the updated version after reconnect/check');
  connected = false;
  await advance(5000);
  assert.equal(output.version, null, 'Disconnected Bridges never retain update confirmation');
  assert.equal(output.status, 'disconnected', 'A slow detail request must not block disconnection detection');
  assert.equal(details[1].signal.aborted, true);
  details[1].resolve(response({ bridge_connected: true, live_set: 'Stale set' }));
  await flush();
  assert.equal(output.liveSet, null, 'Stale inspection cannot resurrect a disconnected set');

  const count = calls.length;
  visible = false;
  await advance(10000);
  assert.equal(calls.length, count, 'Hidden pages do not poll');
  visible = true; allowed = false;
  window.dispatch('focus'); await flush();
  assert.equal(calls.length, count, 'Rate-limit cooldown still applies to focus checks');
  allowed = true; connected = true;
  window.dispatch('focus'); await flush();
  assert.equal(output.status, 'connected');
  account = 8; render(); await flush();
  assert.equal(output.liveSet, null, 'Changing accounts clears the previous set');
  for (const slot of slots) slot?.cleanup?.();
  await flush();
  assert.equal(timers.size, 0, 'Unmount cancels polling and timeouts');
  console.log('Fast connection, delayed inspection, stale results, visibility and cooldown checks passed.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
