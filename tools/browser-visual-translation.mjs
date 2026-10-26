// Original authored moving-image course; this does not measure physical skills.
import {createRequire} from 'node:module';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {createAppServer} from '../server.mjs';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const out = resolve(process.env.RECEIPT_DIR || '/tmp/skill-visual-translation-receiving');
await mkdir(out, {recursive: true});
const server = createAppServer(); await new Promise(r => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;
const receipt = {fixture: 'Authored 320×240 RGB texture, 4×2 original-pixel image translation, local patch and uniform brightness change. Five one-second states encoded at 8fps. A second independent unchanged clip is a negative control.', tests: [], errors: [], result: 'FAIL'};
const record = message => receipt.tests.push(message);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
let browser;
async function waitText(page, id, text) { await page.locator('#' + id).filter({hasText: text}).waitFor({state: 'visible', timeout: 60000}); }
async function open(page, name) {
  await page.goto(origin + '/sequence');
  await page.locator('#clip-file').setInputFiles(out + '/' + name); await waitText(page, 'status', 'Original clip ready');
  await page.locator('#visual-scan summary').click();
  await page.locator('#scan-from').fill('.1'); await page.locator('#scan-until').fill('4.1'); await page.locator('#scan-count').fill('5');
  await page.locator('#scan-start').click(); await waitText(page, 'scan-status', 'Scan ready');
}
try {
  let state = 849217;
  const base = new Uint8Array(160 * 120 * 3);
  for (let i = 0; i < base.length; i++) {state = (Math.imul(state, 1664525) + 1013904223) >>> 0; base[i] = 35 + state % 160;}
  for (const variant of ['moving', 'still']) {
    for (let frame = 0; frame < 5; frame++) {
      const rgb = Buffer.alloc(320 * 240 * 3);
      for (let y = 0; y < 240; y++) for (let x = 0; x < 320; x++) {
        const dx = variant === 'moving' && frame >= 1 ? 4 : 0, dy = dx ? 2 : 0;
        const sx = x - dx, sy = y - dy, offset = (y * 320 + x) * 3;
        for (let c = 0; c < 3; c++) rgb[offset + c] = sx < 0 || sy < 0 ? 55 : base[(Math.floor(sy / 2) * 160 + Math.floor(sx / 2)) * 3 + c];
        if (variant === 'moving' && frame >= 2 && x >= 104 && x < 168 && y >= 74 && y < 134) rgb.set([220, 30, 80], offset);
        if (variant === 'moving' && frame >= 3) for (let c = 0; c < 3; c++) rgb[offset + c] += 18;
      }
      await writeFile(`${out}/${variant}-${frame}.ppm`, Buffer.concat([Buffer.from('P6\n320 240\n255\n'), rgb]));
    }
    const encoded = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', '1', '-i', `${out}/${variant}-%d.ppm`, '-vf', 'fps=8', '-c:v', 'libvpx-vp9', '-lossless', '1', `${out}/${variant}.webm`], {encoding: 'utf8'});
    assert.equal(encoded.status, 0, encoded.stderr);
  }
  receipt.sourceSha256 = digest(await readFile(out + '/moving.webm'));
  browser = await chromium.launch({headless: true, chromiumSandbox: true, args: ['--allow-chrome-scheme-url'], executablePath: process.env.CHROME_BINARY || '/usr/bin/google-chrome'});
  receipt.browser = browser.version();
  const sandbox = await browser.newPage(); await sandbox.goto('chrome://sandbox/'); receipt.sandbox = await sandbox.locator('body').innerText();
  assert.match(receipt.sandbox, /Layer 1 Sandbox\s+(Namespace|SUID)/); assert.match(receipt.sandbox, /Seccomp-BPF sandbox\s+Yes/); await sandbox.close();
  const page = await browser.newPage({viewport: {width: 1280, height: 900}}); page.on('pageerror', e => receipt.errors.push(String(e)));
  await open(page, 'moving.webm');
  await page.locator('#scan-order').selectOption('meanAdjustedChange');
  const originalFirst = await page.locator('.scan-interval').first().getAttribute('data-index');
  assert.equal(originalFirst, '0');
  const beforeCount = await page.locator('.moment-card').count();
  const started = Date.now(); await page.locator('#scan-order').selectOption('translationAdjustedChange');
  await waitText(page, 'scan-translation-summary', 'Image-shift comparison ready'); receipt.comparisonWallMilliseconds = Date.now() - started;
  assert.equal(await page.locator('.scan-interval').first().getAttribute('data-index'), '1');
  assert.equal(await page.locator('.moment-card').count(), beforeCount);
  receipt.intervals = await page.locator('.scan-interval').evaluateAll(rows => rows.map(r => ({index: r.dataset.index, text: r.textContent})));
  const moved = await page.locator('.scan-interval[data-index="0"] .scan-translation').textContent();
  assert.match(moved, /x \+2, y \+1/); assert.match(moved, /same interior pixels/); assert.match(moved, /border pixels are excluded/);
  const remain = Number(moved.match(/· ([\d.]+) levels remain/)[1]); assert.ok(remain < 1, moved);
  const changed = await page.locator('.scan-interval[data-index="1"] .scan-translation').textContent();
  assert.ok(Number(changed.match(/· ([\d.]+) levels remain/)[1]) > 2, changed);
  record('actual decoded image shift stops leading the scan; independent local change becomes first while original scores and every interval remain');

  await page.locator('.scan-interval[data-index="1"] .scan-translation details[data-total-alternatives] > summary').focus(); await page.keyboard.press('Enter');
  assert.equal(await page.locator('.scan-interval[data-index="1"] .scan-translation details[data-total-alternatives]').evaluate(d => d.open), true);
  await page.locator('#visual-scan').screenshot({path: out + '/translation-desktop.png'});
  await page.setViewportSize({width: 390, height: 844}); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.locator('#visual-scan').screenshot({path: out + '/translation-narrow.png'});
  record('keyboard-open alternatives and common-support disclosure render at desktop and390px without horizontal overflow');
  for (const [index, label] of [[0, 'Before local change'], [1, 'After local change']]) {
    await page.locator('.scan-interval[data-index="1"] button').nth(index).click();
    await page.locator('#capture-moment:enabled').waitFor();
    await page.locator('#moment-label').fill(label); await page.locator('#capture-moment').click(); await waitText(page, 'status', 'Retained ' + label);
  }
  assert.deepEqual(await page.locator('.moment-card img').evaluateAll(xs => xs.map(x => [x.naturalWidth, x.naturalHeight])), [[320, 240], [320, 240]]);
  await page.locator('#step-title').fill('Inspect authored local patch'); await page.locator('#step-intent').fill('Compare the retained original patch appearance'); await page.locator('#save-step').click(); await waitText(page, 'status', 'Authored step saved');
  const pending = page.waitForEvent('download'); await page.locator('#export-sequence').click(); const download = await pending; await download.saveAs(out + '/sequence.json');
  const saved = JSON.parse(await readFile(out + '/sequence.json', 'utf8')); assert.equal(saved.sequence.clip.sha256, receipt.sourceSha256);
  for (let i = 0; i < saved.frames.length; i++) assert.equal(digest(Buffer.from(saved.frames[i].pngBase64, 'base64')), saved.sequence.moments[i].image.sha256);
  const fresh = await browser.newPage(); await fresh.goto(origin + '/sequence'); await fresh.locator('#sequence-file').setInputFiles(out + '/sequence.json'); await waitText(fresh, 'status', 'Reopened 2 verified');
  assert.equal(await fresh.locator('#step-detail h3').textContent(), 'Inspect authored local patch'); await fresh.close();
  record('ranked pair passes through full-resolution original capture, unchanged source-only sequence export and fresh reopen with matching PNG hashes');

  await page.locator('#clear-sequence').click(); await open(page, 'still.webm'); await page.locator('#scan-order').selectOption('translationAdjustedChange'); await waitText(page, 'scan-translation-summary', 'Image-shift comparison ready');
  assert.equal(await page.locator('.scan-interval').first().getAttribute('data-index'), '0');
  for (const t of await page.locator('.scan-translation').allTextContents()) assert.match(t, /0\.00 levels remain/);
  record('new unchanged original clip recomputes to zero residuals and chronological ties, without retaining the previous local-change result');
  await page.locator('#clear-sequence').click(); await open(page, 'moving.webm');
  await page.evaluate(() => {const select = document.querySelector('#scan-order'); select.value = 'translationAdjustedChange'; select.dispatchEvent(new Event('change')); document.querySelector('#clear-sequence').click();});
  await page.waitForTimeout(300);
  assert.equal(await page.locator('#scan-results').isVisible(), false); assert.equal(await page.locator('.scan-translation').count(), 0);
  record('clearing during actual worker comparison retires the pending result');
  const failed = await browser.newPage(); await failed.route('**/web/visual-translation-worker.mjs', route => route.abort()); await open(failed, 'moving.webm');
  await failed.locator('#scan-order').selectOption('translationAdjustedChange'); await waitText(failed, 'scan-translation-summary', 'unavailable');
  assert.equal(await failed.locator('.scan-translation').count(), 0); assert.equal(await failed.locator('.scan-interval[data-state="compared"]').count(), 4);
  record('failed worker resource is shown as unavailable and cannot be reported as zero residual or successful translation'); await failed.close();
  assert.deepEqual(receipt.errors, []); receipt.result = 'PASS';
} finally {
  await writeFile(out + '/browser-receipt.json', JSON.stringify(receipt, null, 2) + '\n');
  await browser?.close(); await new Promise(r => server.close(r)); console.log(JSON.stringify(receipt, null, 2));
}
