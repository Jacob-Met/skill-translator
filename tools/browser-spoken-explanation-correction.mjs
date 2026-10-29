// Actual local browser receiving. Authored PNGs and tones are software controls,
// not evidence of an expert recording, human listening or a learning benefit.
import assert from 'node:assert/strict';
import {mkdir, readFile, writeFile, open} from 'node:fs/promises';
import {join, dirname, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {createAppServer} from '../server.mjs';
import {createSequence, appendMoment, upsertStep, sequenceFindings} from '../src/demonstration-sequence.mjs';
import {frameOrigin} from '../src/frame-origin.mjs';

const output = resolve(process.env.QA_OUTPUT || '/tmp/skill-spoken-correction');
await mkdir(dirname(output), {recursive: true});
await mkdir(output); // A stale download must never satisfy a new receiving run.
const sha = data => createHash('sha256').update(data).digest('hex');
const receipt = {startedAt: new Date().toISOString(), state: 'running', fixtureClass: 'Authored PNG and tone software controls', groups: [], pageErrors: [], externalRequests: []};
const saveReceipt = () => writeFile(join(output, 'browser.json'), JSON.stringify(receipt, null, 2) + '\n');
await saveReceipt();
const modulePath = process.env.PLAYWRIGHT_MODULE;
const {chromium} = await import(modulePath?.startsWith('/') ? pathToFileURL(modulePath).href : modulePath || 'playwright');
const server = createAppServer();
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
const base = 'http://127.0.0.1:' + server.address().port;
let browser;

function wave(seconds, frequency = 330) {
  const rate = 8000, samples = Math.ceil(seconds * rate), data = Buffer.alloc(44 + samples);
  data.write('RIFF', 0); data.writeUInt32LE(36 + samples, 4); data.write('WAVEfmt ', 8);
  data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22);
  data.writeUInt32LE(rate, 24); data.writeUInt32LE(rate, 28); data.writeUInt16LE(1, 32); data.writeUInt16LE(8, 34);
  data.write('data', 36); data.writeUInt32LE(samples, 40);
  for (let index = 0; index < samples; index++) data[44 + index] = Math.round(128 + 24 * Math.sin(index * frequency * 2 * Math.PI / rate));
  return data;
}

async function context(viewport = {width: 1380, height: 1050}, conceptCSS = null) {
  const value = await browser.newContext({viewport, acceptDownloads: true});
  await value.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith(base + '/') || url.startsWith('blob:') || url.startsWith('data:')) return route.continue();
    receipt.externalRequests.push(url); return route.abort();
  });
  if (conceptCSS) {
    const originalCSS = await readFile(new URL('../web/spoken-explanations.css', import.meta.url), 'utf8');
    await value.route(base + '/web/spoken-explanations.css', route => route.fulfill({status: 200, contentType: 'text/css', body: originalCSS + '\n' + conceptCSS}));
  }
  const page = await value.newPage();
  page.on('pageerror', error => receipt.pageErrors.push(String(error)));
  const response = await page.goto(base + '/spoken-explanations');
  assert.equal(response.status(), 200);
  return {context: value, page};
}

async function group(name, operation) {
  const started = performance.now();
  const observations = await operation();
  receipt.groups.push({name, passed: true, seconds: (performance.now() - started) / 1000, ...observations});
  await saveReceipt(); console.log('PASS ' + name);
}

async function download(page, name) {
  const promised = page.waitForEvent('download');
  await page.locator('#save').click();
  const file = await promised, path = join(output, name); await file.saveAs(path);
  assert.equal(await file.failure(), null);
  return {path, bytes: await readFile(path)};
}

async function readNotebook(page, file) {
  await page.locator('#notebook-file').setInputFiles(file);
  await page.waitForFunction(() => document.querySelector('#status').textContent.startsWith('Complete notebook reopened.'));
}

try {
  browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_BINARY, chromiumSandbox: true});
  const desktop = await context(), page = desktop.page;
  const clip = {name: 'authored-bookbinding.webm', mimeType: 'video/webm', sizeBytes: 1234, sha256: 'a'.repeat(64), durationSeconds: 20};
  let sequence = createSequence(clip, {title: 'A fold explained by its author', context: 'Authored bookbinding frames and generated audio tones for software receiving.'});
  const frames = [];
  for (let index = 0; index < 3; index++) {
    const encoded = await page.evaluate(index => {
      const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 360;
      const context = canvas.getContext('2d'); context.fillStyle = '#354b40'; context.fillRect(0, 0, 640, 360);
      context.fillStyle = '#d2b991'; context.fillRect(65, 60, 505, 225);
      context.fillStyle = '#f0e5d1'; context.fillRect(110, 92, 390 - index * 65, 160);
      context.strokeStyle = '#367f70'; context.lineWidth = 5; context.beginPath(); context.moveTo(304, 72); context.lineTo(304, 271); context.stroke();
      if (index) { context.fillStyle = '#b9ac94'; context.beginPath(); context.moveTo(304, 92); context.lineTo(435 - index * 40, 172); context.lineTo(304, 252); context.closePath(); context.fill(); }
      context.font = '17px sans-serif'; context.fillStyle = '#eef2e9'; context.fillText('AUTHORED SOFTWARE CONTROL · FRAME ' + (index + 1), 65, 325);
      return canvas.toDataURL('image/png').split(',')[1];
    }, index);
    const bytes = Buffer.from(encoded, 'base64'), time = index * 2;
    const image = {name: 'authored-' + index + '.png', mimeType: 'image/png', sha256: sha(bytes), widthPx: 640, heightPx: 360, pixelCoordinates: 'browser-oriented'};
    sequence = appendMoment(sequence, {id: 'moment-' + index, label: ['Sheet against the guide', 'Fold taking shape', 'Fold held for inspection'][index], visibleState: 'Authored pixel control', image,
      origin: frameOrigin(clip, time, {mediaTime: time, width: 640, height: 360}, image)});
    frames.push({momentId: 'moment-' + index, pngBase64: encoded});
  }
  for (let index = 0; index < 2; index++) sequence = upsertStep(sequence, {id: 'step-' + index, beforeMomentId: 'moment-' + index, afterMomentId: 'moment-' + (index + 1),
    title: ['Bring the fold to the guide', 'Inspect the held fold'][index], intent: 'Keep the fold against the guide.', visibleChange: 'The authored paper shape changes.',
    sensoryCue: 'Original supplied account: resistance may change.', recoveryCue: 'Original account: pause and inspect if the paper buckles.'});
  const bundle = {format: 'skill-translator.sequence-bundle/v1', sequence, frames, findings: sequenceFindings(sequence)};
  const sourceFile = join(output, 'original-sequence.json'); await writeFile(sourceFile, JSON.stringify(bundle));
  const originalSource = await readFile(sourceFile), audioBytes = wave(2), audioFile = join(output, 'supplied-explanation.wav');
  await writeFile(audioFile, audioBytes);
  await group('checked source and separately attributed real audio playback', async () => {
    await page.locator('#source').setInputFiles(sourceFile);
    await page.waitForFunction(() => document.querySelector('#status').textContent.startsWith('Original frames checked.'));
    assert.deepEqual(await page.locator('#frames img').evaluateAll(images => images.map(image => [image.naturalWidth, image.naturalHeight])), [[640, 360], [640, 360]]);
    assert.equal(await page.locator('#attach').isDisabled(), true);
    await page.locator('#audio-file').setInputFiles(audioFile);
    await page.waitForFunction(() => document.querySelector('#audio-status').textContent.includes('Preview, add attribution'));
    await page.locator('#attribution').fill('Authored tone control — <strong>literal supplier text</strong>');
    await page.locator('#description').fill('A generated tone exercises audio custody. It contains no expert speech.');
    await page.locator('#description').press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'attach');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelectorAll('.explanation-card').length === 1);
    assert.equal(await page.locator('.explanation-card h3 strong').count(), 0);
    const player = page.locator('.explanation-card audio');
    assert.equal(await player.evaluate(audio => audio.paused), true);
    await player.click({position: {x: 23, y: 22}});
    await page.waitForFunction(() => document.querySelector('.explanation-card audio').currentTime > .1);
    const observed = await player.evaluate(audio => ({durationSeconds: audio.duration, currentTimeSeconds: audio.currentTime, paused: audio.paused,
      decodedAudioBytes: Number.isFinite(audio.webkitAudioDecodedByteCount) ? audio.webkitAudioDecodedByteCount : null}));
    assert.equal(observed.durationSeconds, 2); await player.evaluate(audio => audio.pause());
    assert.match(await page.locator('#original-account').textContent(), /Original supplied account: resistance may change/);
    return {audioSha256: sha(audioBytes), playback: observed};
  });


  const initial = await download(page, 'before-correction.json');
  const original = JSON.parse(initial.bytes);
  const card = page.locator('.explanation-card').first();
  const edit = () => card.locator('[data-account-action="edit"]').click();
  const form = () => card.locator('form');
  const attribution = () => form().locator('input');
  const description = () => form().locator('textarea');
  const submit = () => form().getByRole('button', {name: 'Save text', exact: true}).click();
  const cancel = () => form().getByRole('button', {name: 'Cancel', exact: true}).click();
  let corrected;

  await group('cancel and rejected correction preserve original while accepting explicit text changes', async () => {
    const audioURL = await card.locator('audio').getAttribute('src');
    const retainedPlayer = await card.locator('audio').elementHandle();
    await retainedPlayer.evaluate(audio => { audio.pause(); audio.currentTime = 0.6; });
    await edit();
    assert.equal(await page.locator('#save').isDisabled(), true);
    await attribution().fill('Canceled supplier'); await cancel();
    assert.equal(await retainedPlayer.evaluate(audio => audio === document.querySelector('.explanation-card audio')), true);
    assert.ok(Math.abs(await retainedPlayer.evaluate(audio => audio.currentTime) - 0.6) < 0.02);
    assert.equal(await card.locator('h3').textContent(), original.notebook.explanations[0].attribution);
    assert.equal(await card.locator('[data-account-action="edit"]').evaluate(node => node === document.activeElement), true);
    await edit(); await attribution().fill('   '); await submit();
    assert.match(await form().getByRole('alert').textContent(), /refused/);
    assert.equal(await card.locator('h3').textContent(), original.notebook.explanations[0].attribution);
    await attribution().fill('Corrected <strong>supplier</strong>'); await description().fill(''); await submit();
    assert.equal(await card.locator('h3').textContent(), 'Corrected <strong>supplier</strong>');
    assert.equal(await card.locator('h3 strong').count(), 0);
    assert.match(await card.textContent(), /No written description supplied/);
    assert.equal(await card.locator('audio').getAttribute('src'), audioURL);
    assert.equal(await retainedPlayer.evaluate(audio => audio === document.querySelector('.explanation-card audio')), true);
    assert.ok(Math.abs(await retainedPlayer.evaluate(audio => audio.currentTime) - 0.6) < 0.02);
    assert.equal(await card.locator('audio').getAttribute('aria-label'), 'Spoken explanation supplied by Corrected <strong>supplier</strong>');
    corrected = await download(page, 'corrected.json');
    const expected = structuredClone(original); expected.notebook.explanations[0].attribution = 'Corrected <strong>supplier</strong>'; expected.notebook.explanations[0].description = '';
    assert.deepEqual(JSON.parse(corrected.bytes), expected);
    await readNotebook(page, corrected.path);
    assert.equal(await card.locator('h3').textContent(), expected.notebook.explanations[0].attribution);
    await card.locator('audio').click({position: {x: 23, y: 22}});
    await page.waitForFunction(() => document.querySelector('.explanation-card audio').currentTime > .1);
    await card.locator('audio').evaluate(audio => audio.pause());
    await page.screenshot({path: join(output, 'corrected-desktop.png'), fullPage: true});
    return {exactOriginalSourceAndAudioBytesPreserved: true, playbackAfterReopen: true};
  });

  await group('retained correction preserves an independent unattached audio draft', async () => {
    await page.locator('#audio-file').setInputFiles(audioFile);
    await page.waitForFunction(() => document.querySelector('#audio-status').textContent.includes('Preview, add attribution'));
    await page.locator('#attribution').fill('Independent draft supplier');
    await page.locator('#description').fill('Independent draft account');
    const draftURL = await page.locator('#draft-audio').getAttribute('src');
    for (const finish of [cancel, submit]) {
      await edit(); assert.equal(await page.locator('#attach').isDisabled(), true);
      await finish();
      assert.equal(await page.locator('#attribution').inputValue(), 'Independent draft supplier');
      assert.equal(await page.locator('#description').inputValue(), 'Independent draft account');
      assert.equal(await page.locator('#draft-audio').getAttribute('src'), draftURL);
      assert.equal(await page.locator('#attach').isDisabled(), false);
      assert.equal(await page.locator('#save').isDisabled(), true);
    }
    await page.locator('#discard').click();
    assert.deepEqual((await download(page, 'after-independent-draft.json')).bytes, corrected.bytes);
    return {draftTextAndAudioRetainedAcrossCancelAndSave: true};
  });

  await group('failed import preserves correction draft and step change cancels unapplied text', async () => {
    await edit(); await description().fill('Draft survives rejected import');
    const bad = join(output, 'invalid-correction-import.json'); await writeFile(bad, '{}');
    await page.locator('#notebook-file').setInputFiles(bad);
    await page.waitForFunction(() => document.querySelector('#status').textContent.startsWith('Import refused:'));
    assert.equal(await description().inputValue(), 'Draft survives rejected import');
    await page.locator('#step').selectOption('step-1');
    assert.match(await page.locator('#status').textContent(), /Unapplied text changes canceled when changing steps/);
    await page.locator('#step').selectOption('step-0');
    assert.equal(await form().count(), 0);
    assert.deepEqual((await download(page, 'after-canceled-step.json')).bytes, corrected.bytes);
    return {failedImportDraftRetained: true, stepChangeUnapplied: true};
  });

  await group('new correction input supersedes an earlier pending import', async () => {
    await edit();
    const late = join(output, 'late-correction-source.json');
    const replacement = structuredClone(bundle); replacement.sequence.title = 'Must not replace newer correction';
    await writeFile(late, JSON.stringify(replacement));
    await page.evaluate(() => {
      const original = File.prototype.text; window.__originalFileText = original;
      File.prototype.text = async function() { if (this.name === 'late-correction-source.json') await new Promise(resolve => { window.__releaseSource = resolve; }); return original.call(this); };
    });
    await page.locator('#source').setInputFiles(late);
    await page.waitForFunction(() => typeof window.__releaseSource === 'function');
    await description().fill('Newer correction must survive the earlier import');
    await page.evaluate(async () => { window.__releaseSource(); File.prototype.text = window.__originalFileText; await new Promise(resolve => setTimeout(resolve, 150)); });
    assert.equal(await page.locator('#source-title').textContent(), sequence.title);
    assert.equal(await description().inputValue(), 'Newer correction must survive the earlier import');
    await cancel();
    assert.deepEqual((await download(page, 'after-retired-import.json')).bytes, corrected.bytes);
    return {laterCorrectionRetained: true, originalNotebookRetained: true};
  });

  await group('successful import invalidates detached correction handler even with same retained ID', async () => {
    await edit(); await attribution().fill('Must never leak into imported notebook');
    const retired = await form().elementHandle();
    await readNotebook(page, corrected.path);
    await retired.evaluate(node => node.dispatchEvent(new Event('submit', {bubbles: true, cancelable: true})));
    assert.deepEqual((await download(page, 'after-stale-handler.json')).bytes, corrected.bytes);
    return {staleHandlerIgnored: true};
  });

  await group('starting a correction retires an already running export', async () => {
    await page.evaluate(() => {
      const original = File.prototype.arrayBuffer; window.__originalArrayBuffer = original;
      File.prototype.arrayBuffer = async function() { if (this.name === 'authored-0.png') await new Promise(resolve => { window.__releaseExport = resolve; }); return original.call(this); };
    });
    let downloads = 0; const count = () => downloads++; page.on('download', count);
    await page.locator('#save').click(); await page.waitForFunction(() => typeof window.__releaseExport === 'function');
    await edit(); await description().fill('A later correction');
    await page.evaluate(async () => { window.__releaseExport(); File.prototype.arrayBuffer = window.__originalArrayBuffer; await new Promise(resolve => setTimeout(resolve, 150)); });
    assert.equal(downloads, 0); page.off('download', count); await cancel();
    assert.deepEqual((await download(page, 'after-export-cancel.json')).bytes, corrected.bytes);
    return {staleDownloads: 0};
  });

  await group('narrow keyboard correction remains usable and keeps original media', async () => {
    const narrow = await context({width: 390, height: 844}); await readNotebook(narrow.page, corrected.path);
    await narrow.page.locator('[data-account-action="edit"]').click();
    assert.equal(await narrow.page.locator('.explanation-card form input').evaluate(node => node === document.activeElement), true);
    assert.equal(await narrow.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    await narrow.page.screenshot({path: join(output, 'correction-narrow.png'), fullPage: true});
    await narrow.page.keyboard.press('Escape'); assert.equal(await narrow.page.locator('.explanation-card form').count(), 0);
    await narrow.context.close(); return {width: 390, focusedEditor: true, escapeCancels: true};
  });
  assert.deepEqual(receipt.pageErrors, []); assert.deepEqual(receipt.externalRequests, []);
  receipt.state = 'completed'; receipt.allPassed = true;
} catch (error) {
  receipt.state = 'failed'; receipt.error = String(error?.stack || error); process.exitCode = 1; console.error(receipt.error);
} finally {
  receipt.finishedAt = new Date().toISOString(); await saveReceipt();
  await browser?.close(); await new Promise(resolve => server.close(resolve));
}
