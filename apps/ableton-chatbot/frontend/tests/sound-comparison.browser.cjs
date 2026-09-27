/* Isolated UI fixtures: never signs in to a real account or sends Ableton commands. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

async function assertPlaybackProgress(locator) {
  const progress = await locator.evaluate(audio => new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      audio.removeEventListener('timeupdate', advanced);
      audio.removeEventListener('error', failed);
    };
    const advanced = () => {
      if (audio.currentTime <= 0) return;
      cleanup();
      resolve({ time: audio.currentTime, error: audio.error?.code || null });
    };
    const failed = () => { cleanup(); reject(new Error('Audio playback failed.')); };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Audio did not advance: readyState=${audio.readyState}, paused=${audio.paused}, error=${audio.error?.code}`));
    }, 10000);
    audio.currentTime = 0;
    audio.addEventListener('timeupdate', advanced);
    audio.addEventListener('error', failed);
    audio.play().catch(error => { cleanup(); reject(error); });
  }));
  assert.ok(progress.time > 0);
  assert.equal(progress.error, null);
}

async function main() {
  const directory = process.env.BEATMIND_COMPARISON_FIXTURE_DIR;
  if (!directory) throw new Error('Set BEATMIND_COMPARISON_FIXTURE_DIR to a generated comparison fixture.');
  const base = process.env.BEATMIND_UI_URL || 'http://localhost:3011';
  const referenceId = 'a'.repeat(32), recordingId = 'b'.repeat(32), comparisonId = 'c'.repeat(32);
  const report = { ...JSON.parse(fs.readFileSync(path.join(directory, 'report.json'))),
    id: comparisonId, created_at: '2026-09-26T12:00:00Z', track_name: 'Bass audition',
    request: { recording_id: recordingId, layer: 'bass', reference_start_seconds: 0, recording_start_seconds: 0, duration_seconds: 2 } };
  const user = { id: 987654, email: 'fixture@example.invalid', name: 'Comparison Test', subscribed: true, subscription_status: 'active' };
  const reference = { id: referenceId, name: 'Reference bass fixture.wav', status: 'ready', created_at: report.created_at,
    report: { duration_seconds: 10, tempo: { bpm: 123 }, key_candidates: [], waveform: [0.2, 0.5, 0.3],
      stems: [], possible_change_points_seconds: [], limitations: [] } };
  const recording = { id: recordingId, track_name: 'Bass audition', decision: 'accepted', source: 'Test fixture',
    created_at: report.created_at, metrics: { duration_seconds: 3, peak_dbfs: -14, rms_dbfs: -17, waveform: [0.2, 0.4] } };
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => {
        if (message.type() === 'error' && !message.text().includes('422')) errors.push(message.text());
      });
      let saved = [], failNext = false, comparisons = 0;
      await context.addInitScript(user => {
        localStorage.setItem('beatmind_token', 'fixture-not-a-real-token');
        localStorage.setItem('beatmind_user', JSON.stringify(user));
      }, user);
      await context.route('**/api/**', async route => {
        const request = route.request();
        const url = new URL(request.url()).pathname;
        const json = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
        if (request.method() === 'OPTIONS') return route.fulfill({ status: 204 });
        if (url === '/api/auth/me') return json(user);
        if (url === '/api/references') return json({ references: [reference], available: true, max_bytes: 250 * 1024 * 1024, min_seconds: 5, max_seconds: 600, audio_listening: { available: false } });
        if (url === '/api/recordings') return json({ recordings: [recording] });
        if (url.endsWith('/comparisons')) {
          if (request.method() === 'GET') return json({ comparisons: saved, available: true });
          comparisons++;
          assert.equal(request.postDataJSON().recording_id, recordingId);
          if (failNext) return json({ detail: 'One selected excerpt is silent or too quiet to compare.' }, 422);
          saved = [report]; return json(report, 201);
        }
        if (url.endsWith('/comparisons/' + comparisonId) && request.method() === 'DELETE') {
          saved = []; return json({ deleted: comparisonId });
        }
        if (url.endsWith('/comparisons/' + comparisonId) && request.method() === 'GET') return json(report);
        if (url.includes('/audio/')) {
          const side = url.endsWith('/candidate') ? 'candidate' : 'reference';
          return route.fulfill({ contentType: 'audio/wav', body: fs.readFileSync(path.join(directory, side + '.wav')) });
        }
        if (url.endsWith('/chats') && request.method() === 'GET') return json({ chats: [{ id: 'saved-test', title: 'Restored comparison' }] });
        if (url.endsWith('/chats/saved-test') && request.method() === 'GET') return json({ sessionId: 'saved-test', messages: [
          { role: 'user', content: 'Compare this bass with the reference.', createdAt: report.created_at },
          { role: 'assistant', content: 'The saved A/B comparison is ready.', createdAt: report.created_at,
            toolCalls: [{ id: 'compare-test', tool: 'compare_reference_sound', input: {},
              result: { status: 'observed', comparison: { id: comparisonId, reference_id: referenceId } } }] },
        ] });
        if (url.includes('/chat')) throw new Error('UI comparison must not send chat or Ableton commands.');
        return json({ connected: false, messages: [] });
      });
      await page.goto(base + '/dashboard');
      await page.getByRole('button', { name: 'References', exact: true }).click();
      await page.getByRole('button', { name: /Reference bass fixture/ }).click();
      await page.getByRole('tab', { name: '5. Compare' }).click();
      const panel = page.getByRole('region', { name: 'Sound comparison' });
      await panel.getByRole('combobox', { name: /Ableton recording/ }).selectOption(recordingId);
      assert.equal(await panel.getByRole('button', { name: 'Compare sounds', exact: true }).isEnabled(), false);
      await panel.getByLabel('Length (s)', { exact: true }).fill('2');
      await panel.getByRole('button', { name: 'Compare sounds', exact: true }).click();
      await panel.getByText('Measured differences, not a match score').waitFor();
      const a = panel.getByLabel('A - Reference (RMS matched)', { exact: true });
      const b = panel.getByLabel('B - Ableton recording (RMS matched)', { exact: true });
      await a.waitFor(); await b.waitFor();
      await assertPlaybackProgress(a);
      // Check switching in one browser task; a short fixture may otherwise end
      // naturally while a loaded host is waiting on separate automation calls.
      assert.ok(await b.evaluate(async audio => {
        const other = document.querySelector('audio[aria-label="A - Reference (RMS matched)"]');
        await other.play();
        await audio.play();
        return other.paused && !audio.paused;
      }));
      await assertPlaybackProgress(b);
      await b.evaluate(audio => audio.pause());
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
      await panel.screenshot({ path: path.join(directory, `comparison-${viewport.width}.png`) });
      await panel.getByText('Measured differences, not a match score').scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(directory, `comparison-results-${viewport.width}.png`) });
      failNext = true;
      await panel.getByRole('button', { name: 'Compare sounds', exact: true }).click();
      await panel.getByRole('alert').filter({ hasText: 'silent or too quiet' }).waitFor();
      assert.equal(await panel.getByLabel('Saved comparisons').locator('option').count(), 2);
      assert.equal(comparisons, 2);
      page.once('dialog', dialog => dialog.accept());
      await panel.getByRole('button', { name: 'Delete comparison', exact: true }).click();
      await panel.getByLabel('Saved comparisons').waitFor({ state: 'detached' });
      assert.equal(await panel.getByLabel('Saved comparisons').count(), 0);
      await page.getByRole('button', { name: 'BeatMind', exact: true }).click();
      if (viewport.width < 640) await page.getByRole('button', { name: 'Saved songs', exact: true }).click();
      await page.getByRole('button', { name: 'Open saved song: Restored comparison', exact: true }).click();
      await page.getByText('The saved A/B comparison is ready.').waitFor();
      const chatComparison = page.getByRole('region', { name: 'Chat sound comparison' });
      await assertPlaybackProgress(chatComparison.getByLabel('B - Ableton recording (RMS matched)', { exact: true }));
      await page.locator('#chat-input').fill('Keep the low end and soften the attack.');
      await page.reload();
      await page.getByText('The saved A/B comparison is ready.').waitFor();
      assert.equal(await page.locator('#chat-input').inputValue(), 'Keep the low end and soften the attack.');
      await assertPlaybackProgress(page.getByRole('region', { name: 'Chat sound comparison' }).getByLabel('A - Reference (RMS matched)', { exact: true }));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
      await page.screenshot({ path: path.join(directory, `chat-comparison-${viewport.width}.png`) });
      assert.deepEqual(errors, []);
      console.log(`PASS ${viewport.width}px: comparison, A/B playback, exclusive audio, errors, deletion, server history, inline players, draft reload, no overflow or runtime errors`);
      await context.close();
    }
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
