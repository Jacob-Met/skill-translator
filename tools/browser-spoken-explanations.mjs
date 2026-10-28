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

const output = resolve(process.env.QA_OUTPUT || '/tmp/skill-spoken-receiving');
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
  let firstDownload, completeDownload;

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

  await group('complete raw download retains original frames, account and audio bytes', async () => {
    firstDownload = await download(page, 'complete-notebook.json');
    const value = JSON.parse(firstDownload.bytes);
    assert.deepEqual(value.sourceBundle, bundle); assert.deepEqual(value.notebook.source, sequence);
    assert.equal(value.notebook.explanations[0].stepId, 'step-0');
    assert.equal(value.recordings.length, 1);
    assert.deepEqual(Buffer.from(value.recordings[0].dataBase64, 'base64'), audioBytes);
    assert.deepEqual(await readFile(sourceFile), originalSource);
    await page.screenshot({path: join(output, 'desktop-step-first.png'), fullPage: true});
    // A genuinely different composition for inspection: wide original sequence
    // above a two-column explanation/listening desk. The delivered view remains
    // the side-by-side source/account composition after this scoped style is removed.
    const alternative = await context({width: 1380, height: 1050}, '.workspace{grid-template-columns:1fr}.source-panel .frames{max-width:900px;margin-left:auto;margin-right:auto}.source-panel .frames img{height:230px}.original-account{max-width:900px;margin:auto}.explanation-panel{display:grid;grid-template-columns:1fr 1fr;column-gap:30px}.explanation-panel>.section-heading,.explanation-panel>h2,.explanation-panel>p{grid-column:1/-1}.attach-form{grid-column:2;grid-row:4}.explanations{grid-column:1;grid-row:4}');
    await readNotebook(alternative.page, firstDownload.path);
    await alternative.page.screenshot({path: join(output, 'desktop-wide-source-alternative.png'), fullPage: true});
    await alternative.context.close();
    return {downloadBytes: firstDownload.bytes.length, downloadSha256: sha(firstDownload.bytes)};
  });

  const narrow = await context({width: 390, height: 844}), small = narrow.page;
  await group('fresh narrow reopen, keyboard step selection and shared recording custody', async () => {
    await readNotebook(small, firstDownload.path);
    assert.equal(await small.locator('.explanation-card audio').evaluate(audio => audio.paused), true);
    assert.match(await small.locator('.explanation-card h3').textContent(), /literal supplier text/);
    await small.screenshot({path: join(output, 'narrow-reopened.png'), fullPage: true});
    assert.equal(await small.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    await small.locator('#step').focus(); await small.keyboard.press('ArrowDown');
    await small.waitForFunction(() => document.querySelector('#step').value === 'step-1');
    assert.equal(await small.locator('.explanation-card').count(), 0);
    await small.locator('#audio-file').setInputFiles(audioFile);
    await small.waitForFunction(() => document.querySelector('#audio-status').textContent.includes('Preview, add attribution'));
    await small.locator('#attribution').fill('Second explicit association of the same recording');
    await small.locator('#attach').click();
    completeDownload = await download(small, 'two-step-notebook.json');
    const value = JSON.parse(completeDownload.bytes);
    assert.deepEqual(value.notebook.explanations.map(note => note.stepId), ['step-0', 'step-1']);
    assert.equal(value.recordings.length, 1); assert.deepEqual(value.sourceBundle, bundle);
    return {width: 390, explanations: 2, distinctRetainedRecordings: 1};
  });

  await group('malformed, oversized and over-duration audio preserve accepted work', async () => {
    await readNotebook(page, firstDownload.path);
    const invalid = join(output, 'not-audio.wav'), long = join(output, 'too-long.wav'), large = join(output, 'too-large.wav');
    await writeFile(invalid, 'This is not an audio recording.'); await writeFile(long, wave(301));
    const handle = await open(large, 'wx'); await handle.truncate(4 * 1024 * 1024 + 1); await handle.close();
    for (const file of [invalid, long, large]) {
      await page.locator('#audio-file').setInputFiles(file);
      await page.waitForFunction(() => document.querySelector('#audio-status').textContent.startsWith('Audio refused:'));
      assert.equal(await page.locator('.explanation-card').count(), 1);
      await page.locator('#discard').click();
    }
    const observed = await download(page, 'after-audio-refusals.json'); assert.deepEqual(observed.bytes, firstDownload.bytes);
    return {refused: ['unsupported container', '301-second audio', '4 MiB plus one byte'], acceptedDownloadUnchanged: true};
  });

  await group('complete import checks source, original PNG and every audio byte', async () => {
    const original = JSON.parse(firstDownload.bytes);
    const changes = [value => { value.notebook.source.steps[0].sensoryCue = 'Changed original account'; },
      value => { value.sourceBundle.frames[0].pngBase64 = value.sourceBundle.frames[1].pngBase64; },
      value => { value.recordings[0].dataBase64 = wave(2, 550).toString('base64'); },
      value => { value.recordings.push({...value.recordings[0]}); }];
    for (let index = 0; index < changes.length; index++) {
      const value = structuredClone(original); changes[index](value); const path = join(output, 'tampered-' + index + '.json');
      await writeFile(path, JSON.stringify(value)); await page.locator('#notebook-file').setInputFiles(path);
      await page.waitForFunction(() => document.querySelector('#status').textContent.startsWith('Import refused:'));
      assert.equal(await page.locator('.explanation-card').count(), 1);
    }
    const oversized = join(output, 'oversized-notebook.json'), handle = await open(oversized, 'wx');
    await handle.truncate(64 * 1024 * 1024 + 1); await handle.close();
    await page.locator('#notebook-file').setInputFiles(oversized);
    await page.waitForFunction(() => document.querySelector('#status').textContent.startsWith('Import refused:'));
    const observed = await download(page, 'after-notebook-refusals.json'); assert.deepEqual(observed.bytes, firstDownload.bytes);
    return {refusedReplacements: 5, acceptedDownloadUnchanged: true};
  });

  await group('late source import cannot overwrite a new authored draft', async () => {
    const late = join(output, 'late-source.json'), changed = structuredClone(bundle); changed.sequence.title = 'Late replacement';
    await writeFile(late, JSON.stringify(changed));
    await page.evaluate(() => {
      const original = File.prototype.text; window.__originalFileText = original;
      File.prototype.text = async function() { if (this.name === 'late-source.json') await new Promise(resolve => { window.__releaseSource = resolve; }); return original.call(this); };
    });
    await page.locator('#source').setInputFiles(late);
    await page.waitForFunction(() => typeof window.__releaseSource === 'function');
    const openingStatus = await page.locator('#status').textContent();
    await page.locator('.explanation-card audio').evaluate(audio => audio.dispatchEvent(new Event('error')));
    assert.equal(await page.locator('#status').textContent(), openingStatus);
    await page.locator('#description').fill('A newer draft must survive the earlier import.');
    await page.evaluate(() => { window.__releaseSource(); File.prototype.text = window.__originalFileText; });
    await page.waitForFunction(() => document.querySelector('#status').textContent.includes('replaced by your edit'));
    assert.equal(await page.locator('#source-title').textContent(), sequence.title);
    assert.equal(await page.locator('#description').inputValue(), 'A newer draft must survive the earlier import.');
    assert.equal(await page.locator('.explanation-card').count(), 1);
    await page.locator('#discard').click();
    return {newDraftRetained: true, originalNotebookRetained: true};
  });

  await group('late audio and active playback retire on source replacement', async () => {
    const late = join(output, 'late-audio.wav'), replacement = join(output, 'replacement-source.json');
    await writeFile(late, audioBytes); await writeFile(replacement, JSON.stringify({...bundle, sequence: {...sequence, title: 'Another explicit demonstration'}}));
    await page.evaluate(() => {
      const original = File.prototype.arrayBuffer; window.__originalArrayBuffer = original;
      File.prototype.arrayBuffer = async function() { if (this.name === 'late-audio.wav') await new Promise(resolve => { window.__releaseAudio = resolve; }); return original.call(this); };
    });
    const player = await page.locator('.explanation-card audio').elementHandle();
    await page.locator('.explanation-card audio').click({position: {x: 23, y: 22}});
    await page.waitForFunction(() => document.querySelector('.explanation-card audio').currentTime > .05);
    await page.locator('#audio-file').setInputFiles(late); await page.waitForFunction(() => typeof window.__releaseAudio === 'function');
    await page.locator('.explanation-card audio').click({position: {x: 23, y: 22}});
    await page.waitForFunction(() => !document.querySelector('.explanation-card audio').paused);
    await page.locator('#source').setInputFiles(replacement);
    await page.waitForFunction(() => document.querySelector('#source-title').textContent === 'Another explicit demonstration');
    await page.evaluate(() => { window.__releaseAudio(); File.prototype.arrayBuffer = window.__originalArrayBuffer; });
    assert.equal(await player.evaluate(audio => audio.paused), true);
    const replacementStatus = await page.locator('#status').textContent();
    await player.evaluate(audio => audio.dispatchEvent(new Event('error')));
    assert.equal(await page.locator('#status').textContent(), replacementStatus);
    assert.equal(await page.locator('.explanation-card').count(), 0);
    assert.equal(await page.locator('#draft-preview').isHidden(), true);
    assert.equal(await page.locator('#save').isDisabled(), true);
    return {oldPlaybackPaused: true, lateAudioNotAttached: true};
  });

  await group('changed draft retires an in-flight complete export', async () => {
    await readNotebook(page, firstDownload.path);
    await page.evaluate(() => {
      const original = File.prototype.arrayBuffer; window.__originalArrayBuffer = original;
      File.prototype.arrayBuffer = async function() { if (this.name === 'authored-0.png') await new Promise(resolve => { window.__releaseExport = resolve; }); return original.call(this); };
    });
    let downloads = 0; const count = () => downloads++; page.on('download', count);
    await page.locator('#save').click(); await page.waitForFunction(() => typeof window.__releaseExport === 'function');
    await page.locator('#description').fill('This later edit retires the pending export.');
    await page.evaluate(async () => { window.__releaseExport(); File.prototype.arrayBuffer = window.__originalArrayBuffer; await new Promise(resolve => setTimeout(resolve, 150)); });
    assert.equal(downloads, 0); page.off('download', count);
    assert.equal(await page.locator('#save').isDisabled(), true);
    await page.locator('#discard').click(); const observed = await download(page, 'after-retired-export.json'); assert.deepEqual(observed.bytes, firstDownload.bytes);
    return {staleDownloads: 0, acceptedNotebookUnchanged: true};
  });

  await group('retired media events cannot interrupt current playback', async () => {
    await readNotebook(page, completeDownload.path);
    const retired = await page.locator('.explanation-card audio').elementHandle();
    await page.locator('#step').selectOption('step-1');
    const current = page.locator('.explanation-card audio');
    await current.click({position: {x: 23, y: 22}});
    await page.waitForFunction(() => !document.querySelector('.explanation-card audio').paused && document.querySelector('.explanation-card audio').currentTime > .05);
    await retired.evaluate(audio => audio.dispatchEvent(new Event('play')));
    assert.equal(await current.evaluate(audio => audio.paused), false, 'a removed card cannot pause current retained playback');
    await page.locator('#draft-audio').evaluate(audio => audio.dispatchEvent(new Event('play')));
    assert.equal(await current.evaluate(audio => audio.paused), false, 'an empty draft cannot pause current retained playback');
    await page.locator('#audio-file').setInputFiles(audioFile);
    await page.waitForFunction(() => !document.querySelector('#draft-preview').hidden);
    await page.locator('#draft-audio').click({position: {x: 23, y: 22}});
    await page.waitForFunction(() => !document.querySelector('#draft-audio').paused && document.querySelector('#draft-audio').currentTime > .05);
    await retired.evaluate(audio => audio.dispatchEvent(new Event('play')));
    assert.equal(await page.locator('#draft-audio').evaluate(audio => audio.paused), false, 'a removed card cannot pause the current audio draft');
    await page.locator('#discard').click();
    await current.click({position: {x: 23, y: 22}});
    await page.waitForFunction(() => !document.querySelector('.explanation-card audio').paused);
    await page.locator('#draft-audio').evaluate(audio => audio.dispatchEvent(new Event('play')));
    assert.equal(await current.evaluate(audio => audio.paused), false, 'a retired draft cannot pause current retained playback');
    return {retiredCardIgnored: true, emptyDraftIgnored: true, currentDraftRetained: true, retiredDraftIgnored: true};
  });

  await group('fresh complete two-step reopen and explicit removal keep source intact', async () => {
    const fresh = await context({width: 390, height: 844});
    await readNotebook(fresh.page, completeDownload.path);
    await fresh.page.locator('#step').selectOption('step-1');
    assert.match(await fresh.page.locator('.explanation-card h3').textContent(), /Second explicit association/);
    await fresh.page.locator('.remove').click();
    const result = await download(fresh.page, 'after-explicit-removal.json'), value = JSON.parse(result.bytes);
    assert.equal(value.notebook.explanations.length, 1); assert.equal(value.notebook.explanations[0].stepId, 'step-0');
    assert.deepEqual(value.sourceBundle, bundle); assert.deepEqual(Buffer.from(value.recordings[0].dataBase64, 'base64'), audioBytes);
    await fresh.context.close(); return {remainingExplanations: 1, originalSourceUnchanged: true};
  });

  assert.deepEqual(receipt.pageErrors, []); assert.deepEqual(receipt.externalRequests, []);
  receipt.state = 'completed'; receipt.allPassed = true;
} catch (error) {
  receipt.state = 'failed'; receipt.error = String(error?.stack || error); process.exitCode = 1; console.error(receipt.error);
} finally {
  receipt.finishedAt = new Date().toISOString(); await saveReceipt();
  await browser?.close(); await new Promise(resolve => server.close(resolve));
}
