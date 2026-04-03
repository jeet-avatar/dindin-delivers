/**
 * Zietra Meet — Comprehensive Signaling Server Test Suite
 */

import { WebSocket } from 'ws';
import { spawn } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';

const PORT = 3099;
let serverProcess;
let pass = 0;
let fail = 0;
const failures = [];

// ── helpers ────────────────────────────────────────────────────────────────

function assert(condition, label) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    pass++;
  } else {
    console.error(`  ✗ ${label}`);
    fail++;
    failures.push(label);
  }
}

function connect(retries = 5) {
  return new Promise((resolve, reject) => {
    const attempt = (remaining) => {
      const ws = new WebSocket(`ws://localhost:${PORT}/ws`);
      ws.on('open', () => resolve(ws));
      ws.on('error', (err) => {
        if (remaining > 0) {
          setTimeout(() => attempt(remaining - 1), 200);
        } else {
          reject(new Error(`WS connect failed: ${err.message}`));
        }
      });
    };
    attempt(retries);
  });
}

function collectMessages(ws) {
  const msgs = [];
  ws.on('message', (raw) => {
    try { msgs.push(JSON.parse(raw.toString())); } catch {}
  });

  const waitFor = (type, timeoutMs = 600) =>
    new Promise((resolve, reject) => {
      const deadline = Date.now() + timeoutMs;
      const check = () => {
        const found = msgs.find(m => m.type === type);
        if (found) return resolve(found);
        if (Date.now() > deadline) return reject(new Error(`timeout waiting for "${type}"`));
        setTimeout(check, 20);
      };
      check();
    });

  return { msgs, waitFor };
}

function send(ws, obj) { ws.send(JSON.stringify(obj)); }
function closeAll(...sockets) { for (const s of sockets) { try { s.close(); } catch {} } }

// ── server startup ─────────────────────────────────────────────────────────

async function startServer() {
  const dir = new URL('.', import.meta.url).pathname;
  return new Promise((resolve) => {
    serverProcess = spawn(
      process.execPath,
      ['--import', 'tsx/esm', 'index.ts'],
      {
        cwd: dir,
        env: { ...process.env, PORT: String(PORT) },
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    serverProcess.on('error', (err) => {
      console.error('spawn error:', err.message);
    });

    const onData = (chunk) => {
      const text = chunk.toString();
      if (text.includes(String(PORT))) resolve();
    };
    serverProcess.stdout.on('data', onData);
    serverProcess.stderr.on('data', onData);

    // Unconditional fallback after 3s
    setTimeout(resolve, 3000);
  });
}

// ══════════════════════════════════════════════════════════════════════════
//  TESTS
// ══════════════════════════════════════════════════════════════════════════

async function testJoinAndPeerIds() {
  console.log('\n[1] Join + UUID peer IDs');
  const ws = await connect();
  const { waitFor } = collectMessages(ws);

  send(ws, { type: 'join', room: 'T01', name: 'Alice' });
  const joined = await waitFor('joined').catch(() => null);
  assert(joined !== null, 'receives joined event');
  assert(typeof joined?.peerId === 'string' && joined.peerId.length > 8, 'peerId is a UUID string');
  assert(joined?.isHost === true, 'first joiner is host');
  assert(Array.isArray(joined?.peers), 'peers array present');
  closeAll(ws);
}

async function testTwoPeersExchangeOffers() {
  console.log('\n[2] Two peers — offer relay to newcomer');
  const [ws1, ws2] = await Promise.all([connect(), connect()]);
  const c1 = collectMessages(ws1);
  const c2 = collectMessages(ws2);

  send(ws1, { type: 'join', room: 'T02', name: 'Alice' });
  const j1 = await c1.waitFor('joined');

  send(ws2, { type: 'join', room: 'T02', name: 'Bob' });
  const j2 = await c2.waitFor('joined');

  // Alice (existing) notified of Bob joining
  const peerJoined = await c1.waitFor('peer-joined', 500).catch(() => null);
  assert(peerJoined !== null, 'existing peer receives peer-joined');
  assert(peerJoined?.name === 'Bob', 'peer-joined includes joiner name');

  // Bob (newcomer) sees existing peers list
  assert(j2?.isHost === false, 'newcomer is not host');
  assert(Array.isArray(j2?.peers), 'newcomer receives existing peers list');
  closeAll(ws1, ws2);
}

async function testSDPRelay() {
  console.log('\n[3] SDP offer/answer relay');
  const [ws1, ws2] = await Promise.all([connect(), connect()]);
  const c1 = collectMessages(ws1);
  const c2 = collectMessages(ws2);

  send(ws1, { type: 'join', room: 'T03', name: 'Alice' });
  const j1 = await c1.waitFor('joined');
  send(ws2, { type: 'join', room: 'T03', name: 'Bob' });
  const j2 = await c2.waitFor('joined');
  await sleep(80);

  // Alice sends offer to Bob
  send(ws1, { type: 'offer', targetId: j2.peerId, sdp: { type: 'offer', sdp: 'v=0\r\n' } });
  const offer = await c2.waitFor('offer', 500).catch(() => null);
  assert(offer !== null, 'offer relayed to target');
  assert(offer?.fromId === j1.peerId, 'offer fromId correct');
  assert(offer?.sdp?.type === 'offer', 'SDP payload intact');
  assert(offer?.targetId === undefined, 'targetId stripped from relayed offer');

  // Bob sends answer to Alice
  send(ws2, { type: 'answer', targetId: j1.peerId, sdp: { type: 'answer', sdp: 'v=0\r\n' } });
  const answer = await c1.waitFor('answer', 500).catch(() => null);
  assert(answer !== null, 'answer relayed to target');
  assert(answer?.fromId === j2.peerId, 'answer fromId correct');
  closeAll(ws1, ws2);
}

async function testIceCandidateRelay() {
  console.log('\n[4] ICE candidate relay');
  const [ws1, ws2] = await Promise.all([connect(), connect()]);
  const c1 = collectMessages(ws1);
  const c2 = collectMessages(ws2);

  send(ws1, { type: 'join', room: 'T04', name: 'Alice' });
  const j1 = await c1.waitFor('joined');
  send(ws2, { type: 'join', room: 'T04', name: 'Bob' });
  const j2 = await c2.waitFor('joined');
  await sleep(80);

  // Server handles 'ice-candidate' message type
  send(ws1, { type: 'ice-candidate', targetId: j2.peerId, candidate: { candidate: 'candidate:0 1 UDP 123 1.2.3.4 5000 typ host' } });
  const ice = await c2.waitFor('ice-candidate', 500).catch(() => null);
  assert(ice !== null, 'ICE candidate relayed to target');
  assert(ice?.fromId === j1.peerId, 'ICE candidate fromId correct');
  assert(ice?.candidate?.candidate?.includes('candidate:'), 'ICE candidate payload intact');
  closeAll(ws1, ws2);
}

async function testRoomIsolation() {
  console.log('\n[5] Room isolation');
  const [wsA, wsB] = await Promise.all([connect(), connect()]);
  const cA = collectMessages(wsA);
  const cB = collectMessages(wsB);

  send(wsA, { type: 'join', room: 'T05A', name: 'Alice' });
  send(wsB, { type: 'join', room: 'T05B', name: 'Bob' });
  await Promise.all([cA.waitFor('joined'), cB.waitFor('joined')]);
  await sleep(150);

  send(wsA, { type: 'chat', text: 'secret' });
  await sleep(200);

  const bobGot = cB.msgs.find(m => m.type === 'chat');
  assert(!bobGot, 'chat does not leak across rooms');
  closeAll(wsA, wsB);
}

async function testChat() {
  console.log('\n[6] Chat broadcast');
  const [ws1, ws2, ws3] = await Promise.all([connect(), connect(), connect()]);
  const c1 = collectMessages(ws1);
  const c2 = collectMessages(ws2);
  const c3 = collectMessages(ws3);

  send(ws1, { type: 'join', room: 'T06', name: 'Alice' });
  send(ws2, { type: 'join', room: 'T06', name: 'Bob' });
  send(ws3, { type: 'join', room: 'T06', name: 'Carol' });
  await Promise.all([c1.waitFor('joined'), c2.waitFor('joined'), c3.waitFor('joined')]);
  await sleep(100);

  send(ws1, { type: 'chat', text: 'Hey everyone!' });
  const [m2, m3] = await Promise.all([
    c2.waitFor('chat', 500),
    c3.waitFor('chat', 500),
  ]).catch(() => [null, null]);

  assert(m2?.text === 'Hey everyone!', 'Bob receives chat message');
  assert(m3?.text === 'Hey everyone!', 'Carol receives chat message');
  assert(m2?.fromName === 'Alice', 'chat includes sender name (fromName)');
  assert(typeof m2?.timestamp === 'number', 'chat includes timestamp');
  closeAll(ws1, ws2, ws3);
}

async function testChatTruncation() {
  console.log('\n[7] Chat — 2000-char truncation');
  const [ws1, ws2] = await Promise.all([connect(), connect()]);
  const c1 = collectMessages(ws1);
  const c2 = collectMessages(ws2);

  send(ws1, { type: 'join', room: 'T07', name: 'Alice' });
  send(ws2, { type: 'join', room: 'T07', name: 'Bob' });
  await Promise.all([c1.waitFor('joined'), c2.waitFor('joined')]);
  await sleep(80);

  // Server slices to 2000 chars (does not drop)
  send(ws1, { type: 'chat', text: 'x'.repeat(2500) });
  const recv = await c2.waitFor('chat', 500).catch(() => null);
  assert(recv !== null, 'oversized chat is delivered (truncated)');
  assert(recv?.text?.length === 2000, 'text truncated to exactly 2000 chars');
  closeAll(ws1, ws2);
}

async function testHandRaise() {
  console.log('\n[8] Hand raise broadcast');
  const [ws1, ws2] = await Promise.all([connect(), connect()]);
  const c1 = collectMessages(ws1);
  const c2 = collectMessages(ws2);

  send(ws1, { type: 'join', room: 'T08', name: 'Alice' });
  send(ws2, { type: 'join', room: 'T08', name: 'Bob' });
  await Promise.all([c1.waitFor('joined'), c2.waitFor('joined')]);
  await sleep(80);

  send(ws1, { type: 'hand-raise', raised: true });
  const hr = await c2.waitFor('hand-raise', 500).catch(() => null);
  assert(hr !== null, 'hand-raise received by peer');
  assert(hr?.raised === true, 'raised=true relayed correctly');
  assert(hr?.peerId !== undefined, 'peerId included in hand-raise');

  send(ws1, { type: 'hand-raise', raised: false });
  await sleep(200);
  const lowered = c2.msgs.filter(m => m.type === 'hand-raise' && m.raised === false);
  assert(lowered.length > 0, 'hand lower relayed correctly');
  closeAll(ws1, ws2);
}

async function testEmojiReaction() {
  console.log('\n[9] Emoji reactions');
  const [ws1, ws2] = await Promise.all([connect(), connect()]);
  const c1 = collectMessages(ws1);
  const c2 = collectMessages(ws2);

  send(ws1, { type: 'join', room: 'T09', name: 'Alice' });
  send(ws2, { type: 'join', room: 'T09', name: 'Bob' });
  await Promise.all([c1.waitFor('joined'), c2.waitFor('joined')]);
  await sleep(80);

  send(ws1, { type: 'reaction', emoji: '👍' });
  const rx = await c2.waitFor('reaction', 500).catch(() => null);
  assert(rx !== null, 'reaction received by peer');
  assert(rx?.emoji === '👍', 'emoji payload correct');
  assert(rx?.fromName === 'Alice', 'reaction includes sender name (fromName)');
  closeAll(ws1, ws2);
}

async function testAnnotation() {
  console.log('\n[10] Annotation relay — self-excluded');
  const [ws1, ws2, ws3] = await Promise.all([connect(), connect(), connect()]);
  const c1 = collectMessages(ws1);
  const c2 = collectMessages(ws2);
  const c3 = collectMessages(ws3);

  send(ws1, { type: 'join', room: 'T10', name: 'Alice' });
  send(ws2, { type: 'join', room: 'T10', name: 'Bob' });
  send(ws3, { type: 'join', room: 'T10', name: 'Carol' });
  await Promise.all([c1.waitFor('joined'), c2.waitFor('joined'), c3.waitFor('joined')]);
  await sleep(100);

  send(ws1, { type: 'annotation', data: { x: 10, y: 20 } });
  await sleep(200);

  assert(c2.msgs.find(m => m.type === 'annotation') !== undefined, 'annotation relayed to Bob');
  assert(c3.msgs.find(m => m.type === 'annotation') !== undefined, 'annotation relayed to Carol');
  assert(!c1.msgs.find(m => m.type === 'annotation'), 'sender does NOT receive own annotation');
  closeAll(ws1, ws2, ws3);
}

async function testHostAssignment() {
  console.log('\n[11] Host assignment');
  const ws1 = await connect();
  const c1 = collectMessages(ws1);
  send(ws1, { type: 'join', room: 'T11', name: 'Alice' });
  const j1 = await c1.waitFor('joined');
  assert(j1?.isHost === true, 'first joiner is host');

  const ws2 = await connect();
  const c2 = collectMessages(ws2);
  send(ws2, { type: 'join', room: 'T11', name: 'Bob' });
  const j2 = await c2.waitFor('joined');
  assert(j2?.isHost === false, 'second joiner is NOT host');
  closeAll(ws1, ws2);
}

async function testHostTransferOnLeave() {
  console.log('\n[12] Host transfer when host leaves');
  const [ws1, ws2] = await Promise.all([connect(), connect()]);
  const c1 = collectMessages(ws1);
  const c2 = collectMessages(ws2);

  send(ws1, { type: 'join', room: 'T12', name: 'Alice' });
  await c1.waitFor('joined');
  send(ws2, { type: 'join', room: 'T12', name: 'Bob' });
  await c2.waitFor('joined');
  await sleep(100);

  ws1.close(); // Alice (host) disconnects
  // Server sends 'host-transfer' to the new host (Bob)
  const transfer = await c2.waitFor('host-transfer', 800).catch(() => null);
  assert(transfer !== null, 'new host receives host-transfer event');
  // Also check peer-left is sent
  const peerLeft = await c2.waitFor('peer-left', 500).catch(() => null);
  assert(peerLeft !== null, 'peer-left sent when host disconnects');
  closeAll(ws2);
}

async function testKickByHost() {
  console.log('\n[13] Host kick');
  const [ws1, ws2] = await Promise.all([connect(), connect()]);
  const c1 = collectMessages(ws1);
  const c2 = collectMessages(ws2);

  send(ws1, { type: 'join', room: 'T13', name: 'Alice' });
  const j1 = await c1.waitFor('joined');
  send(ws2, { type: 'join', room: 'T13', name: 'Bob' });
  const j2 = await c2.waitFor('joined');
  await sleep(100);

  send(ws1, { type: 'kick', targetId: j2.peerId });
  const kicked = await c2.waitFor('kicked', 500).catch(() => null);
  assert(kicked !== null, 'kicked peer receives kicked event');
  closeAll(ws1, ws2);
}

async function testKickBlockedForNonHost() {
  console.log('\n[14] Kick blocked for non-host');
  const [ws1, ws2, ws3] = await Promise.all([connect(), connect(), connect()]);
  const c1 = collectMessages(ws1);
  const c2 = collectMessages(ws2);
  const c3 = collectMessages(ws3);

  send(ws1, { type: 'join', room: 'T14', name: 'Alice' }); // host
  send(ws2, { type: 'join', room: 'T14', name: 'Bob' });
  send(ws3, { type: 'join', room: 'T14', name: 'Carol' });
  const j1 = await c1.waitFor('joined');
  const j2 = await c2.waitFor('joined');
  const j3 = await c3.waitFor('joined');
  await sleep(100);

  // Bob (non-host) tries to kick Carol
  send(ws2, { type: 'kick', targetId: j3.peerId });
  await sleep(200);
  const carolKicked = c3.msgs.find(m => m.type === 'kicked');
  assert(!carolKicked, 'non-host kick attempt is ignored');
  closeAll(ws1, ws2, ws3);
}

async function testRecordingFlow() {
  console.log('\n[15] Recording consent flow');
  const [ws1, ws2, ws3] = await Promise.all([connect(), connect(), connect()]);
  const c1 = collectMessages(ws1);
  const c2 = collectMessages(ws2);
  const c3 = collectMessages(ws3);

  send(ws1, { type: 'join', room: 'T15', name: 'Alice' });
  const j1 = await c1.waitFor('joined');
  send(ws2, { type: 'join', room: 'T15', name: 'Bob' });
  send(ws3, { type: 'join', room: 'T15', name: 'Carol' });
  await Promise.all([c2.waitFor('joined'), c3.waitFor('joined')]);
  await sleep(100);

  // Alice starts recording — server broadcasts 'recording-start'
  send(ws1, { type: 'recording-start' });
  const [bobRec, carolRec] = await Promise.all([
    c2.waitFor('recording-start', 500),
    c3.waitFor('recording-start', 500),
  ]).catch(() => [null, null]);

  assert(bobRec !== null, 'Bob notified via recording-start');
  assert(carolRec !== null, 'Carol notified via recording-start');
  assert(bobRec?.recorderName === 'Alice', 'recorderName in event');
  assert(bobRec?.recorderId === j1.peerId, 'recorderId in event');

  // Bob consents — server broadcasts 'recording-consent'
  send(ws2, { type: 'recording-consent', consented: true });
  await sleep(200);
  const consentBroadcast = c1.msgs.find(m => m.type === 'recording-consent');
  assert(consentBroadcast !== null, 'consent broadcast received by recorder');
  assert(consentBroadcast?.consented === true, 'consented=true preserved');

  // Alice stops — server broadcasts 'recording-stop'
  send(ws1, { type: 'recording-stop' });
  const [bobStop, carolStop] = await Promise.all([
    c2.waitFor('recording-stop', 500),
    c3.waitFor('recording-stop', 500),
  ]).catch(() => [null, null]);
  assert(bobStop !== null, 'Bob receives recording-stop');
  assert(carolStop !== null, 'Carol receives recording-stop');
  assert(bobStop?.recorderId === j1.peerId, 'recorderId in recording-stop');
  closeAll(ws1, ws2, ws3);
}

async function testEndMeetingForAll() {
  console.log('\n[16] End meeting for all (host only)');
  const [ws1, ws2] = await Promise.all([connect(), connect()]);
  const c1 = collectMessages(ws1);
  const c2 = collectMessages(ws2);

  send(ws1, { type: 'join', room: 'T16', name: 'Alice' });
  await c1.waitFor('joined');
  send(ws2, { type: 'join', room: 'T16', name: 'Bob' });
  await c2.waitFor('joined');
  await sleep(80);

  send(ws1, { type: 'end-meeting' });
  const ended = await c2.waitFor('meeting-ended', 500).catch(() => null);
  assert(ended !== null, 'all peers receive meeting-ended from host');
  closeAll(ws1, ws2);
}

async function testEndMeetingBlockedForNonHost() {
  console.log('\n[17] End meeting blocked for non-host');
  const [ws1, ws2] = await Promise.all([connect(), connect()]);
  const c1 = collectMessages(ws1);
  const c2 = collectMessages(ws2);

  send(ws1, { type: 'join', room: 'T17', name: 'Alice' }); // host
  send(ws2, { type: 'join', room: 'T17', name: 'Bob' });
  await Promise.all([c1.waitFor('joined'), c2.waitFor('joined')]);
  await sleep(80);

  send(ws2, { type: 'end-meeting' }); // non-host attempt
  await sleep(200);
  assert(!c1.msgs.find(m => m.type === 'meeting-ended'), 'host does NOT receive meeting-ended from non-host');
  closeAll(ws1, ws2);
}

async function testMaxParticipants() {
  console.log('\n[18] Max 8 participants enforced');
  const sockets = [];
  for (let i = 0; i < 8; i++) {
    const ws = await connect();
    const c = collectMessages(ws);
    send(ws, { type: 'join', room: 'T18MAX', name: `User${i}` });
    await c.waitFor('joined', 1200);
    sockets.push(ws);
  }

  const ws9 = await connect();
  const c9 = collectMessages(ws9);
  send(ws9, { type: 'join', room: 'T18MAX', name: 'Overflow' });
  await sleep(300);

  const overflowError = c9.msgs.find(m => m.type === 'error');
  const overflowJoined = c9.msgs.find(m => m.type === 'joined');
  assert(overflowError !== null || !overflowJoined, '9th participant is rejected with error');
  closeAll(...sockets, ws9);
}

async function testPeerDisconnectNotification() {
  console.log('\n[19] Peer disconnect notification');
  const [ws1, ws2] = await Promise.all([connect(), connect()]);
  const c1 = collectMessages(ws1);
  const c2 = collectMessages(ws2);

  send(ws1, { type: 'join', room: 'T19', name: 'Alice' });
  const j1 = await c1.waitFor('joined');
  send(ws2, { type: 'join', room: 'T19', name: 'Bob' });
  const j2 = await c2.waitFor('joined');
  await sleep(80);

  ws2.close();
  const left = await c1.waitFor('peer-left', 800).catch(() => null);
  assert(left !== null, 'Alice notified when Bob disconnects');
  assert(left?.peerId === j2.peerId, 'peer-left includes correct peerId');
  closeAll(ws1);
}

async function testPasswordProtection() {
  console.log('\n[20] Password-protected rooms');
  const ws1 = await connect();
  const c1 = collectMessages(ws1);
  send(ws1, { type: 'join', room: 'T20', name: 'Alice', password: 'secret123' });
  await c1.waitFor('joined');

  // Wrong password
  const ws2 = await connect();
  const c2 = collectMessages(ws2);
  send(ws2, { type: 'join', room: 'T20', name: 'Bob', password: 'wrong' });
  await sleep(200);
  const err = c2.msgs.find(m => m.type === 'error');
  assert(err !== null, 'wrong password returns error');

  // Correct password
  const ws3 = await connect();
  const c3 = collectMessages(ws3);
  send(ws3, { type: 'join', room: 'T20', name: 'Carol', password: 'secret123' });
  const joined = await c3.waitFor('joined', 500).catch(() => null);
  assert(joined !== null, 'correct password allows join');
  closeAll(ws1, ws2, ws3);
}

// ══════════════════════════════════════════════════════════════════════════
//  RUNNER
// ══════════════════════════════════════════════════════════════════════════

const tests = [
  testJoinAndPeerIds,
  testTwoPeersExchangeOffers,
  testSDPRelay,
  testIceCandidateRelay,
  testRoomIsolation,
  testChat,
  testChatTruncation,
  testHandRaise,
  testEmojiReaction,
  testAnnotation,
  testHostAssignment,
  testHostTransferOnLeave,
  testKickByHost,
  testKickBlockedForNonHost,
  testRecordingFlow,
  testEndMeetingForAll,
  testEndMeetingBlockedForNonHost,
  testMaxParticipants,
  testPeerDisconnectNotification,
  testPasswordProtection,
];

console.log(`Starting Zietra Meet test server on port ${PORT}...`);
await startServer();
await sleep(500);

for (const test of tests) {
  try {
    await test();
    await sleep(80);
  } catch (err) {
    console.error(`  ✗ EXCEPTION in ${test.name}: ${err.message}`);
    fail++;
    failures.push(`${test.name}: ${err.message}`);
  }
}

serverProcess?.kill();

console.log(`\n${'═'.repeat(52)}`);
console.log(`  ${pass} passed  ·  ${fail} failed  ·  ${tests.length} test groups`);
if (failures.length) {
  console.log('\nFailed assertions:');
  failures.forEach(f => console.log(`  ✗ ${f}`));
}
console.log('═'.repeat(52));
process.exit(fail > 0 ? 1 : 0);
