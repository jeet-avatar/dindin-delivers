const assert = require('node:assert/strict'), fs = require('node:fs'), Module = require('node:module'), ts = require('typescript');
const path = require('node:path'), React = require('react'), { renderToStaticMarkup } = require('react-dom/server');
// billing.ts imports ./auth, so compile TypeScript dependencies on require as well.
Module._extensions['.ts'] = Module._extensions['.tsx'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017, jsx: ts.JsxEmit.ReactJSX } }).outputText, file);
const alias = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  return alias.call(this, request.startsWith('@/') ? path.resolve(__dirname, '../src', request.slice(2)) : request, ...rest);
};
const billing = require('../src/lib/billing.ts');

assert.equal(billing.hasMixMindAccess({ mixmind_access: true }), true);
for (const user of [{ mixmind_access: false }, {}, null, undefined]) assert.equal(billing.hasMixMindAccess(user), false);

assert.equal(billing.hasPaidPlan({ source: 'subscription' }), true);
assert.equal(billing.hasPaidPlan({ source: 'legacy' }), true, 'subscribers from before plans are Starter');
assert.equal(billing.hasPaidPlan({ source: 'trial' }), false);
assert.equal(billing.hasPaidPlan(null), false);

assert.equal(billing.planName({ plan: 'pro_mixmind' }), 'Pro + MixMind');
assert.equal(billing.planName({ plan: 'trial' }), 'Free trial');
assert.equal(billing.planName({ plan: null }), 'No plan');

assert.equal(billing.formatPrice(1900, 'usd'), '$19');
assert.equal(billing.formatPrice(799, 'usd'), '$7.99');
assert.equal(billing.daysLeft(null), null);
assert.equal(billing.daysLeft(new Date(Date.now() - 1000).toISOString()), 0);
assert.equal(billing.daysLeft(new Date(Date.now() + 2.5 * 86400000).toISOString()), 3);

// The plan picker renders nothing sold before the catalog loads.
const PlanPicker = require('../src/components/PlanPicker.tsx').default;
const html = renderToStaticMarkup(React.createElement(PlanPicker, { onClose() {}, reason: 'Your free trial includes 3 tracks. Choose a plan to keep going.', inTrial: true }));
assert.match(html, /Choose your plan/);
assert.match(html, /Your free trial includes 3 tracks/);
assert.match(html, /Subscribing ends your free trial/);
assert.match(html, /Loading plans/);
assert.doesNotMatch(html, /Unlimited/);
console.log('billing helpers ok');
