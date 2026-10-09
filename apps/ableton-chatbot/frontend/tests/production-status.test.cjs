const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const filename = path.join(__dirname, '../src/lib/production-status.ts');
const compiled = new Module(filename, module);
compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename);
const { summarizeProduction, actionOutcomes, trackOutcomes } = compiled.exports;
const action = (tool, status, input = {}, extra = {}) => ({ tool, input, result: { status, ...extra } });
const clip = { track: 18, scene: 0 };
const failed = action('add_notes', 'partial', clip, { summary: 'MIDI mismatch' });
const rebuilt = [failed, action('clear_notes', 'verified', clip, { notes: [] }), action('add_notes', 'verified', clip, { notes: [{ pitch: 60 }] })];
assert.equal(actionOutcomes(rebuilt)[0].kind, 'repaired');
assert.equal(summarizeProduction(rebuilt).issues.length, 0);
assert.equal(summarizeProduction(rebuilt).repairs, 1);
assert.equal(actionOutcomes([failed, action('add_notes', 'verified', clip, { notes: [] })])[0].kind, 'issue');
assert.equal(actionOutcomes([failed, action('clear_notes', 'verified', { track: 17, scene: 0 }), action('add_notes', 'verified', clip, { notes: [] })])[0].kind, 'issue');
assert.equal(actionOutcomes([action('load_pack_sample', 'partial', { track: 0 }), action('load_pack_sample', 'verified', { track: 0 })])[0].kind, 'issue');
assert.equal(actionOutcomes([action('create_midi_track', 'partial'), action('create_midi_track', 'verified')])[0].kind, 'issue');
assert.equal(summarizeProduction([action('get_tempo', 'observed')]).title, 'Inspection complete');
assert.equal(summarizeProduction([action('set_device_control', 'failed', {}, { summary: 'Listen and approve the current sound, or request changes, before further production.' })]).title, 'Earlier production pause');
assert.equal(summarizeProduction([...rebuilt, action('audition_part', 'verified', clip)]).title, 'Audio ready');
assert.equal(summarizeProduction([failed, action('audition_part', 'verified', clip)]).title, 'Needs attention');
assert.equal(summarizeProduction([action('audition_part', 'verified', clip), action('set_track_volume', 'verified', { track: 18, volume: .4 })]).title, 'Changes checked');
assert.equal(summarizeProduction([{ tool: 'load_pack_sample', input: { track: 0 } }]).title, 'Working in Ableton');
assert.equal(actionOutcomes([action('get_tempo', 'failed'), action('get_tempo', 'observed')])[0].kind, 'repaired');
const control = { track: 0, path: [0], control: 'Frequency', value: 1000, unit: 'Hz', map_id: 'a' };
assert.equal(actionOutcomes([action('set_device_control', 'failed', control), action('set_device_control', 'verified', { ...control, value: 2000 })])[0].kind, 'issue');
assert.equal(actionOutcomes([action('set_device_control', 'failed', control), action('set_device_control', 'verified', control)])[0].kind, 'repaired');
assert.equal(actionOutcomes([failed, action('delete_track', 'verified', { track: 0 }), action('clear_notes', 'verified', clip), action('add_notes', 'verified', clip, { notes: [] })])[0].kind, 'issue');
console.log('Production outcome tests passed.');
assert.equal(trackOutcomes([action('get_clip_notes', 'observed', clip, { notes: [{ pitch: 60 }] })])[0].notesVerified, false);
assert.equal(trackOutcomes([action('add_notes', 'verified', clip, { notes: [{ pitch: 60 }] }), failed])[0].noteCount, undefined);

const bassSetup = [action('get_session_state', 'observed'), action('create_midi_track', 'verified', { index: 1 }),
  action('set_track_name', 'verified', { track: 0, name: 'Bass' }),
  action('load_library_item', 'verified', { track: 1, kind: 'instrument', folders: ['Wavetable'] }),
  action('set_track_name', 'verified', { track: 1, name: 'Bass' }),
  action('set_device_parameter', 'verified', { track: 1, parameter: 39, value: .15 })];
assert.equal(summarizeProduction(bassSetup, 'interrupted').title, 'Request interrupted');
assert.match(summarizeProduction(bassSetup, 'interrupted').detail, /No current audio preview/);
assert.equal(summarizeProduction(bassSetup, 'running').title, 'Working in Ableton');
assert.equal(summarizeProduction(bassSetup, 'complete').title, 'Instrument setup only');
assert.equal(summarizeProduction(bassSetup).title, 'Instrument setup only');
assert.deepEqual(trackOutcomes(bassSetup).map(t => [t.track, t.name]), [[0, 'Bass'], [1, 'Bass']]);
assert.equal(summarizeProduction([action('set_track_volume', 'verified')], 'complete').title, 'Changes checked');
assert.equal(summarizeProduction([...bassSetup, action('audition_part', 'verified', { track: 1 })], 'complete').title, 'Audio ready');
assert.match(summarizeProduction([...bassSetup, action('audition_part', 'verified', { track: 1 })], 'interrupted').detail, /recording was captured before interruption/);
assert.equal(summarizeProduction([failed], 'interrupted').issues.length, 1);

// Rehearsal 2026-09-28: a check of an empty scene slot must not turn a track's real note count into 0.
{
  const actions = [
    action('add_notes', 'verified', { track: 5, scene: 2 }, { notes: new Array(64).fill({}) }),
    action('get_clip_notes', 'observed', { track: 5, scene: 0 }, { notes: [], has_clip: false }),
  ];
  assert.equal(trackOutcomes(actions)[0].noteCount, 64);
}
// A browser search that missed, then found the folder, is not an unresolved issue.
{
  const outcomes = actionOutcomes([
    action('get_library_catalog', 'failed', { category: 'sounds', folders: ['Plucked'] }, { summary: 'Browser folder is unavailable or ambiguous' }),
    action('get_library_catalog', 'observed', { category: 'sounds', folders: ['Guitar & Plucked'] }),
  ]);
  assert.equal(outcomes[0].kind, 'repaired');
  assert.equal(summarizeProduction([
    action('get_library_catalog', 'failed', { folders: ['Plucked'] }),
    action('get_library_catalog', 'observed', { folders: ['Guitar & Plucked'] }),
  ]).issues.length, 0);
}
console.log('Empty-slot note checks and recovered browser searches passed.');

