// Real /practice receiving with authored geometry and genuine delayed File.text.
// Run against an already started product using BASE_URL. This course does not
// launch or stop the product server and never changes its source files.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {mkdir, mkdtemp, readFile, readdir, writeFile} from 'node:fs/promises';
import {basename, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

if (!process.env.BASE_URL) throw Error('BASE_URL must identify the already started product.');
if (!process.env.QA_OUTPUT) throw Error('QA_OUTPUT must identify a new receiving directory.');
const origin = new URL(process.env.BASE_URL).origin;
const out = resolve(process.env.QA_OUTPUT);
const sourceRoot = resolve(process.env.SOURCE_ROOT || process.cwd());
const helperPath = process.env.SANDBOX_HELPER_PATH
  || resolve(sourceRoot, 'tools/support/chromium-sandbox.mjs');
const {requireChromiumSandbox} = await import(pathToFileURL(helperPath).href);
const require = createRequire(import.meta.url);
const puppeteer = require(process.env.PUPPETEER_PATH || 'puppeteer');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const fixtures = resolve(out, 'fixtures');
const downloads = resolve(out, 'downloads');
await mkdir(fixtures, {recursive: true});
await mkdir(downloads, {recursive: true});
const report = {
  schema: 'skill-translator-practice-import-races/v1',
  evidence: 'Authored analytic geometry and browser interaction controls; no physical skill or learning claim',
  origin, startedAt: new Date().toISOString(), result: 'FAIL',
  browser: null, sandbox: null, source: {}, groups: [], downloads: [],
  errors: [], offsite: [], csp: [],
};
const livePages = new Set();
let browser, downloadNumber = 0, fixtureNumber = 0;
let sourceAPath, sourceBPath, failedPath, correctedPath, failedSession, correctedSession;

const sourceA = {
  title: 'Authored import-race source A',
  provenance: 'Authored analytic import-race control A; not a physical demonstration',
  source: {widthMm: 100, heightMm: 80, corners: [
    {x: 0, y: 0}, {x: 100, y: 0}, {x: 100, y: 80}, {x: 0, y: 80},
  ]},
  landmarks: [
    {id: 'left', label: 'Left guide', kind: 'edge_offset_mm', edge: 'left',
      sourcePx: {x: 20, y: 20}, toleranceMm: 1},
    {id: 'center', label: 'Center', kind: 'fraction',
      sourcePx: {x: 50, y: 40}, toleranceMm: 2},
    {id: 'top', label: 'Top guide', kind: 'edge_offset_mm', edge: 'top',
      sourcePx: {x: 75, y: 10}, toleranceMm: 1},
  ],
};
const sourceB = {...structuredClone(sourceA), title: 'Newer authored source B',
  provenance: 'Different authored analytic source B; not a physical demonstration'};
const exact = [
  {id: 'left', xMm: 20, yMm: 40},
  {id: 'center', xMm: 100, yMm: 80},
  {id: 'top', xMm: 150, yMm: 10},
];

async function file(label, value, {raw = false} = {}) {
  const path = resolve(fixtures, `${++fixtureNumber}-${label}.json`);
  await writeFile(path, raw ? value : JSON.stringify(value, null, 2));
  return path;
}
async function fill(page, id, value) {
  await page.$eval('#' + id, (input, next) => {
    input.value = String(next);
    input.dispatchEvent(new Event('input', {bubbles: true}));
  }, value);
}
async function upload(page, id, path) {
  const input = await page.$('#' + id);
  assert.ok(input, `Missing file input #${id}`);
  await input.uploadFile(path);
}
const ui = page => page.evaluate(() => ({
  setup: document.querySelector('#setupLabel')?.textContent,
  round: document.querySelector('#roundLabel')?.textContent,
  count: document.querySelector('#placementCount')?.textContent,
  outcome: document.querySelector('#taskOutcome')?.dataset.state,
  status: document.querySelector('#practiceStatus')?.textContent,
  error: document.querySelector('#practiceError')?.textContent,
  errorHidden: document.querySelector('#practiceError')?.hidden,
  x: document.querySelector('#placementX')?.value,
  y: document.querySelector('#placementY')?.value,
  width: document.querySelector('#practiceWidth')?.value,
  height: document.querySelector('#practiceHeight')?.value,
}));
const notices = state => ({status: state.status, error: state.error, errorHidden: state.errorHidden});

// Observe a genuinely completed browser download, not just the producer Blob.
async function download(page, id, label = id) {
  await page.bringToFront();
  const folder = await mkdtemp(resolve(downloads, `${++downloadNumber}-`));
  const cdp = await page.createCDPSession();
  try {
    await cdp.send('Browser.setDownloadBehavior', {behavior: 'allow', downloadPath: folder});
    await page.click('#' + id);
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      const names = await readdir(folder);
      const complete = names.filter(name => !name.endsWith('.crdownload') && !name.endsWith('.tmp'));
      assert.ok(complete.length <= 1, `Unexpected extra download for ${label}`);
      if (complete.length === 1 && !names.some(name => name.endsWith('.crdownload'))) {
        const path = resolve(folder, complete[0]);
        const bytes = await readFile(path);
        const value = JSON.parse(bytes.toString('utf8'));
        report.downloads.push({label, filename: complete[0], path, bytes: bytes.length, sha256: sha256(bytes)});
        return value;
      }
      await new Promise(ok => setTimeout(ok, 50));
    }
    throw Error(`No completed browser download within 15 seconds: ${label}`);
  } finally {
    await cdp.detach();
  }
}
async function snapshot(page, label) {
  return {
    source: await download(page, 'savePracticeSource', label + ' source'),
    session: await download(page, 'savePractice', label + ' session'),
  };
}
async function unchanged(page, accepted, label, priorNotices = null) {
  assert.deepEqual(await snapshot(page, label), accepted, label + ': accepted source/session changed');
  if (priorNotices) assert.deepEqual(notices(await ui(page)), priorNotices, label + ': stale notice replaced current feedback');
}
async function place(page, mark) {
  await page.click('#practiceMarks button[data-id="' + mark.id + '"]');
  await fill(page, 'placementX', mark.xMm);
  await fill(page, 'placementY', mark.yMm);
  await page.click('#placementForm button[type="submit"]');
}
async function importSource(page, path, title) {
  await upload(page, 'practiceSource', path);
  await page.waitForFunction(title => document.querySelector('#setupLabel').textContent.includes(title), {}, title);
}
async function importSession(page, path, expected) {
  await upload(page, 'openPractice', path);
  await page.waitForFunction(expected => {
    const round = document.querySelector('#roundLabel').textContent;
    const count = document.querySelectorAll('.placed-point').length;
    return round === 'ROUND ' + String(expected.round).padStart(2, '0')
      && count === expected.attempts.length
      && document.querySelector('#practiceStatus').textContent.includes('Session reopened');
  }, {}, expected);
}
async function newPage(width = 1380) {
  const page = await browser.newPage();
  livePages.add(page);
  await page.setViewport({width, height: width === 390 ? 844 : 960, deviceScaleFactor: 1});
  page.on('pageerror', error => report.errors.push({url: page.url(), error: String(error)}));
  page.on('request', request => {
    const url = new URL(request.url());
    if (['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol) && url.origin !== origin)
      report.offsite.push(request.url());
  });
  await page.evaluateOnNewDocument(() => {
    window.__practiceRaceCSP = [];
    document.addEventListener('securitypolicyviolation', event => window.__practiceRaceCSP.push({
      directive: event.violatedDirective, blockedURI: event.blockedURI,
    }));
  });
  await page.goto(origin + '/practice', {waitUntil: 'networkidle0'});
  await page.waitForSelector('#practiceMarks button');
  await page.$eval('#setupForm', form => { form.closest('details').open = true; });
  await fill(page, 'practiceWidth', 200);
  await fill(page, 'practiceHeight', 160);
  await page.click('#setupForm button[type="submit"]');
  await importSource(page, sourceAPath, sourceA.title);
  return page;
}
async function readyPage({session = 'corrected', width = 1380} = {}) {
  const page = await newPage(width);
  if (session === 'corrected') await importSession(page, correctedPath, correctedSession);
  if (session === 'failed') await importSession(page, failedPath, failedSession);
  return page;
}
async function closePage(page) {
  if (!page || page.isClosed()) { livePages.delete(page); return; }
  try {
    const violations = await page.evaluate(() => {
      window.__practiceImportDelay?.restore?.();
      return window.__practiceRaceCSP || [];
    });
    report.csp.push(...violations.map(value => ({url: page.url(), ...value})));
  } catch (error) {
    report.cleanupWarnings ||= [];
    report.cleanupWarnings.push(String(error));
  }
  await page.close();
  livePages.delete(page);
}

// Hold exactly one named File.text invocation. Every returned byte still comes
// from the actual selected File through the original browser implementation.
async function holdFile(page, id, path) {
  await page.evaluate(name => {
    if (window.__practiceImportDelay) throw Error('A prior receiving gate was not retired.');
    const original = File.prototype.text;
    const gate = {name, started: false, released: false, delivered: false, release: null};
    gate.restore = () => { File.prototype.text = original; };
    window.__practiceImportDelay = gate;
    File.prototype.text = function () {
      if (this.name !== name || gate.started) return original.call(this);
      gate.started = true;
      const selectedFile = this;
      return new Promise((resolve, reject) => {
        gate.release = async () => {
          if (gate.released) throw Error('File read gate already released.');
          gate.released = true;
          try { resolve(await original.call(selectedFile)); }
          catch (error) { reject(error); }
          finally { gate.delivered = true; }
        };
      });
    };
  }, basename(path));
  await upload(page, id, path);
  await page.waitForFunction(() => window.__practiceImportDelay?.started
    && typeof window.__practiceImportDelay.release === 'function');
}
async function releaseFile(page) {
  const receipt = await page.evaluate(async () => {
    const gate = window.__practiceImportDelay;
    if (!gate?.started) throw Error('No genuine File.text invocation is held.');
    try {
      await gate.release();
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return {name: gate.name, started: gate.started, released: gate.released, delivered: gate.delivered};
    } finally {
      gate.restore();
      delete window.__practiceImportDelay;
    }
  });
  assert.equal(receipt.delivered, true);
  return receipt;
}
async function emptyChange(page, id) {
  await page.$eval('#' + id, input => {
    input.value = '';
    input.dispatchEvent(new Event('change', {bubbles: true}));
  });
}

// Every case uses its own page. A failed baseline assertion is recorded and
// receiving continues, so one race cannot conceal the remaining controls.
async function group(name, cases) {
  const entry = {name, cases: [], result: 'PASS'};
  report.groups.push(entry);
  for (const [label, test] of cases) {
    const result = {name: label, result: 'FAIL'};
    entry.cases.push(result);
    const prior = new Set(livePages);
    try {
      await test(result);
      result.result = 'PASS';
    } catch (error) {
      entry.result = 'FAIL';
      result.failure = {name: error.name, message: error.message, stack: error.stack};
      result.documents = [];
      for (const page of livePages) {
        if (prior.has(page) || page.isClosed()) continue;
        try {
          result.documents.push({url: page.url(), ...(await ui(page))});
          const screenshot = resolve(out, `failure-${report.groups.length}-${entry.cases.length}.png`);
          await page.screenshot({path: screenshot, fullPage: true});
          result.screenshot = screenshot;
        } catch (diagnosticError) { result.diagnosticError = String(diagnosticError); }
      }
    } finally {
      for (const page of [...livePages]) if (!prior.has(page)) await closePage(page);
      console.log(JSON.stringify({group: name, case: label, result: result.result,
        failure: result.failure?.message}));
      await writeFile(resolve(out, 'browser-receipt.json'), JSON.stringify(report, null, 2) + '\n');
    }
  }
}
async function servedSource() {
  const receipt = {};
  for (const path of ['/practice', '/web/practice.mjs', '/src/practice.mjs', '/src/geometry.mjs']) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 200, 'Receiving source unavailable: ' + path);
    const bytes = Buffer.from(await response.arrayBuffer());
    receipt[path] = {bytes: bytes.length, sha256: sha256(bytes)};
  }
  return receipt;
}

try {
  report.courseSha256 = sha256(await readFile(new URL(import.meta.url)));
  report.helperSha256 = sha256(await readFile(helperPath));
  report.source.before = await servedSource();
  if (process.env.EXPECTED_PRACTICE_SHA256)
    assert.equal(report.source.before['/web/practice.mjs'].sha256, process.env.EXPECTED_PRACTICE_SHA256,
      'The served practice module is not the expected source.');
  sourceAPath = await file('source-A', sourceA);
  sourceBPath = await file('source-B', sourceB);
  browser = await puppeteer.launch({headless: true,
    executablePath: process.env.CHROME_BINARY || '/usr/bin/google-chrome',
    args: ['--no-first-run', '--disable-extensions', '--no-default-browser-check']});
  report.browser = await browser.version();
  if (process.platform === 'linux') {
    const admission = await browser.newPage();
    const cdp = await admission.createCDPSession();
    try { report.sandbox = await requireChromiumSandbox({send: (method, args) => cdp.send(method, args)}); }
    catch (error) { report.sandbox = error.receipt; throw error; }
    finally { await cdp.detach(); await admission.close(); }
  }

  await group('1. Actual complete-task downloads and ordinary reopen', [
    ['authored failed/corrected rounds survive actual export and fresh-page reopen', async result => {
      const page = await newPage();
      assert.deepEqual(await download(page, 'savePracticeSource', 'source fixture'), sourceA);
      for (const mark of exact) await place(page, {...mark, xMm: mark.xMm + 4, yMm: mark.yMm + 3});
      await page.click('#reviewTask');
      assert.equal((await ui(page)).outcome, 'needs-adjustment');
      failedSession = await download(page, 'savePractice', 'actual failed round');
      assert.deepEqual(failedSession.attempts, exact.map(mark => ({...mark, xMm: mark.xMm + 4, yMm: mark.yMm + 3})));
      failedPath = await file('actual-failed-round', failedSession);
      await page.click('#retryTask');
      for (const mark of exact) await place(page, mark);
      await page.click('#reviewTask');
      assert.equal((await ui(page)).outcome, 'passed');
      correctedSession = await download(page, 'savePractice', 'actual corrected second round');
      assert.equal(correctedSession.round, 2);
      assert.deepEqual(correctedSession.attempts, exact);
      assert.deepEqual(correctedSession.history, [{round: 1, attempts: failedSession.attempts}]);
      assert.equal('passed' in correctedSession, false);
      correctedPath = await file('actual-corrected-session', correctedSession);
      await page.screenshot({path: resolve(out, 'practice-desktop.png'), fullPage: true});
      const fresh = await readyPage();
      assert.equal((await ui(fresh)).outcome, 'in-progress');
      await fresh.click('#reviewTask');
      assert.equal((await ui(fresh)).outcome, 'passed');
      assert.deepEqual(await download(fresh, 'savePractice', 'fresh-page corrected reopen'), correctedSession);
      result.fixture = {source: sourceAPath, failed: failedPath, corrected: correctedPath};
    }],
  ]);
  if (!failedPath || !correctedPath || report.groups[0].result !== 'PASS')
    throw Error('The ordinary product journey did not establish valid received sessions; race cases were not run.');

  await group('2. New placements and retries retire pending sessions', [
    ['submitted placement survives delayed old session', async () => {
      const page = await readyPage();
      await holdFile(page, 'openPractice', failedPath);
      await place(page, {id: 'left', xMm: 28, yMm: 47});
      const accepted = await snapshot(page, 'new placement before release');
      await releaseFile(page);
      await unchanged(page, accepted, 'new placement after release');
    }],
    ['real SVG keyboard placement survives delayed old session', async () => {
      const page = await readyPage();
      await holdFile(page, 'openPractice', failedPath);
      await page.$eval('#practiceSvg', element => element.focus());
      assert.equal(await page.$eval('#practiceSvg', element => document.activeElement === element), true);
      await page.keyboard.press('ArrowRight');
      const accepted = await snapshot(page, 'keyboard before release');
      assert.equal(accepted.session.attempts.find(mark => mark.id === 'left').xMm, 21);
      await releaseFile(page);
      await unchanged(page, accepted, 'keyboard after release');
    }],
    ['accepted retry and complete prior history survive delayed old session', async () => {
      const page = await readyPage();
      await holdFile(page, 'openPractice', failedPath);
      await page.click('#retryTask');
      const accepted = await snapshot(page, 'retry before release');
      assert.equal(accepted.session.round, 3);
      assert.deepEqual(accepted.session.attempts, []);
      assert.deepEqual(accepted.session.history[1], {round: 2, attempts: correctedSession.attempts});
      await releaseFile(page);
      await unchanged(page, accepted, 'retry after release');
    }],
  ]);

  await group('3. Latest source read owns adoption and feedback', [
    ['newer source and placement survive an older source completion', async () => {
      const page = await readyPage();
      await holdFile(page, 'practiceSource', sourceAPath);
      await importSource(page, sourceBPath, sourceB.title);
      await place(page, {id: 'left', xMm: 27, yMm: 45});
      const accepted = await snapshot(page, 'newer source before release');
      const feedback = notices(await ui(page));
      await releaseFile(page);
      await unchanged(page, accepted, 'newer source after release', feedback);
    }],
    ['an obsolete malformed source cannot overwrite newer successful feedback', async () => {
      const page = await readyPage();
      const bad = await file('delayed-malformed-source', '{broken JSON', {raw: true});
      await holdFile(page, 'practiceSource', bad);
      await importSource(page, sourceBPath, sourceB.title);
      const accepted = await snapshot(page, 'new source before obsolete failure');
      const feedback = notices(await ui(page));
      await releaseFile(page);
      await unchanged(page, accepted, 'new source after obsolete failure', feedback);
    }],
  ]);

  await group('4. Source and session inputs supersede one another', [
    ['a later source replacement retires a pending old session including its error', async () => {
      const page = await readyPage();
      await holdFile(page, 'openPractice', failedPath);
      await importSource(page, sourceBPath, sourceB.title);
      const accepted = await snapshot(page, 'cross-input source before release');
      const feedback = notices(await ui(page));
      await releaseFile(page);
      await unchanged(page, accepted, 'cross-input source after release', feedback);
    }],
    ['a later valid session retires an older pending source replacement', async () => {
      const page = await readyPage();
      await holdFile(page, 'practiceSource', sourceBPath);
      await importSession(page, failedPath, failedSession);
      const accepted = await snapshot(page, 'cross-input session before release');
      const feedback = notices(await ui(page));
      await releaseFile(page);
      await unchanged(page, accepted, 'cross-input session after release', feedback);
    }],
  ]);

  await group('5. Applied setup retires pending reads', [
    ...['openPractice', 'practiceSource'].map(id => [
    `changed target dimensions survive delayed ${id}`, async () => {
      const page = await readyPage();
      await holdFile(page, id, id === 'openPractice' ? failedPath : sourceBPath);
      await fill(page, 'practiceWidth', 240);
      await fill(page, 'practiceHeight', 180);
      await page.click('#setupForm button[type="submit"]');
      const accepted = await snapshot(page, 'new setup before ' + id);
      assert.deepEqual(accepted.session.reference.target, {widthMm: 240, heightMm: 180});
      const feedback = notices(await ui(page));
      await releaseFile(page);
      await unchanged(page, accepted, 'new setup after ' + id, feedback);
    },
    ]),
    ['same-dimension setup reset retires a pending session without a draft edit', async () => {
      const page = await readyPage();
      await holdFile(page, 'openPractice', failedPath);
      // The values are already 200 x 160. No input/change event occurs between
      // holding the read and clicking the actual accepted setup reset.
      await page.click('#setupForm button[type="submit"]');
      const accepted = await snapshot(page, 'same-dimension reset before release');
      assert.deepEqual(accepted.session.reference.target, {widthMm: 200, heightMm: 160});
      assert.equal(accepted.session.round, 1);
      assert.deepEqual(accepted.session.attempts, []);
      assert.deepEqual(accepted.session.history, []);
      const feedback = notices(await ui(page));
      await releaseFile(page);
      await unchanged(page, accepted, 'same-dimension reset after release', feedback);
    }],
  ]);

  await group('6. Newer unsubmitted drafts are retained', [
    ['openPractice', 'placementX', '37.25'],
    ['practiceSource', 'placementY', '53.5'],
    ['openPractice', 'practiceHeight', '222'],
    ['practiceSource', 'practiceWidth', '333'],
  ].map(([id, field, value]) => [
    `${field} draft survives delayed ${id}`, async () => {
      const page = await readyPage();
      await holdFile(page, id, id === 'openPractice' ? failedPath : sourceBPath);
      await fill(page, field, value);
      const accepted = await snapshot(page, 'draft before ' + field);
      await releaseFile(page);
      assert.equal(await page.$eval('#' + field, element => element.value), value, 'Newer draft was overwritten');
      await unchanged(page, accepted, 'draft after ' + field);
    },
  ]));

  await group('7. Refused files preserve validation and supersede older reads', [
    ...['practiceSource', 'openPractice'].map(id => [
    `new invalid ${id} retains accepted data and owns its refusal`, async () => {
      const page = await readyPage();
      const accepted = await snapshot(page, 'accepted before refused ' + id);
      await holdFile(page, id, id === 'openPractice' ? failedPath : sourceBPath);
      const bad = await file('newer-invalid-' + id, 'not JSON', {raw: true});
      await upload(page, id, bad);
      await page.waitForFunction(() => !document.querySelector('#practiceError').hidden
        && document.querySelector('#practiceError').textContent.includes('refused'));
      const feedback = notices(await ui(page));
      await releaseFile(page);
      await unchanged(page, accepted, 'retained after refused ' + id, feedback);
    },
    ]),
    ['current full-source mismatch visibly refuses while preserving accepted work', async () => {
      const foreign = await newPage();
      await importSource(foreign, sourceBPath, sourceB.title);
      await place(foreign, {id: 'left', xMm: 26, yMm: 44});
      const foreignSession = await download(foreign, 'savePractice', 'actual same-IDs foreign-source session');
      assert.deepEqual(foreignSession.reference.landmarks, correctedSession.reference.landmarks);
      assert.deepEqual(foreignSession.reference.target, correctedSession.reference.target);
      assert.notEqual(foreignSession.reference.provenance, correctedSession.reference.provenance);
      const foreignPath = await file('actual-foreign-source-session', foreignSession);
      const page = await readyPage();
      const accepted = await snapshot(page, 'accepted before current source mismatch');
      await upload(page, 'openPractice', foreignPath);
      await page.waitForFunction(() => !document.querySelector('#practiceError').hidden
        && document.querySelector('#practiceError').textContent.includes('Practice source, rules, tolerances or target dimensions differ'));
      const feedback = await ui(page);
      assert.equal(feedback.errorHidden, false);
      assert.match(feedback.error, /Session refused/);
      await unchanged(page, accepted, 'accepted after current source mismatch', notices(feedback));
    }],
  ]);

  await group('8. Display, export and empty selections do not cancel imports', ['practiceSource', 'openPractice'].map(id => [
    `valid ${id} survives display-only actions, exports and empty changes`, async () => {
      const page = await readyPage();
      await holdFile(page, id, id === 'openPractice' ? failedPath : sourceBPath);
      await page.click('#practiceMarks button[data-id="center"]');
      await page.click('#nextMark');
      await page.click('#reviewTask');
      await page.select('#practiceView', 'mirrored');
      await page.click('#practiceGoals');
      await snapshot(page, 'exports while valid import pending');
      await emptyChange(page, 'practiceSource');
      await emptyChange(page, 'openPractice');
      await releaseFile(page);
      if (id === 'openPractice') {
        assert.deepEqual(await download(page, 'savePractice', 'valid display-only session'), failedSession);
        assert.deepEqual(await download(page, 'savePracticeSource', 'unchanged source during valid session'), sourceA);
      } else {
        assert.deepEqual(await download(page, 'savePracticeSource', 'valid display-only source'), sourceB);
        const session = await download(page, 'savePractice', 'new source empty session');
        assert.equal(session.round, 1);
        assert.deepEqual(session.attempts, []);
        assert.equal(session.reference.provenance, sourceB.provenance);
      }
      assert.equal(await page.$eval('#practiceView', element => element.value), 'mirrored');
      assert.equal(await page.$eval('#practiceGoals', element => element.checked), false);
    },
  ]));

  await group('9. Rejected retry and a real calibration handoff preserve valid work', [
    ['rejected empty retry does not retire a valid pending session', async () => {
      const page = await readyPage({session: 'none'});
      await holdFile(page, 'openPractice', failedPath);
      await page.click('#retryTask');
      assert.match((await ui(page)).error, /Place at least one mark/);
      await releaseFile(page);
      assert.deepEqual(await download(page, 'savePractice', 'valid import after rejected retry'), failedSession);
    }],
    ['calibration handoff snapshots current work while a replacement read is pending', async result => {
      const page = await readyPage();
      const accepted = await snapshot(page, 'current work before handoff');
      await holdFile(page, 'practiceSource', sourceBPath);
      await Promise.all([
        page.waitForNavigation({waitUntil: 'networkidle0'}),
        page.click('#inspectCalibration'),
      ]);
      assert.equal(new URL(page.url()).pathname, '/sensitivity');
      const retained = await page.evaluate(() => JSON.parse(sessionStorage.getItem('skill-translator-practice-resume/v1')));
      assert.deepEqual(retained.demo, accepted.source);
      assert.deepEqual(retained.session, accepted.session);
      result.qualification = 'The real navigation retires the old document; this case verifies the handoff snapshot and resume, not completion inside a destroyed document.';
      await page.goto(origin + '/practice?resume=calibration', {waitUntil: 'networkidle0'});
      await page.waitForSelector('#practiceMarks button');
      await unchanged(page, accepted, 'work reopened from actual calibration handoff');
    }],
  ]);

  await group('10. Narrow keyboard practice and download/reopen remain usable', [
    ['390px mirrored keyboard edit exports and reopens complete unchanged evidence', async () => {
      const page = await readyPage({width: 390});
      await page.select('#practiceView', 'mirrored');
      await page.click('#practiceMarks button[data-id="center"]');
      await page.$eval('#practiceSvg', element => element.focus());
      assert.equal(await page.$eval('#practiceSvg', element => document.activeElement === element), true);
      await page.keyboard.press('ArrowRight');
      assert.equal(await page.$eval('#placementX', element => element.value), '99');
      const saved = await download(page, 'savePractice', '390px edited complete evidence');
      assert.equal(saved.attempts.find(mark => mark.id === 'center').xMm, 99);
      assert.deepEqual(saved.history, correctedSession.history);
      const path = await file('390px-downloaded-session', saved);
      await page.click('#retryTask');
      await importSession(page, path, saved);
      await page.click('#reviewTask');
      assert.equal((await ui(page)).outcome, 'passed');
      assert.deepEqual(await download(page, 'savePractice', '390px evidence after reopen'), saved);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), '390px horizontal overflow');
      await page.screenshot({path: resolve(out, 'practice-390.png'), fullPage: true});
    }],
  ]);

  report.source.after = await servedSource();
  assert.deepEqual(report.source.after, report.source.before, 'Served source changed during receiving.');
  assert.deepEqual(report.errors, [], 'Observed browser exceptions');
  assert.deepEqual(report.offsite, [], 'Observed offsite requests');
  assert.deepEqual(report.csp, [], 'Observed application CSP violations');
  report.result = report.groups.every(item => item.result === 'PASS') ? 'PASS' : 'FAIL';
} catch (error) {
  report.fatal = {name: error.name, message: error.message, stack: error.stack};
  report.result = 'FAIL';
} finally {
  for (const page of [...livePages]) await closePage(page);
  if (browser) await browser.close();
  report.completedAt = new Date().toISOString();
  report.summary = {
    groupsPassed: report.groups.filter(group => group.result === 'PASS').length,
    groupsFailed: report.groups.filter(group => group.result === 'FAIL').length,
    casesPassed: report.groups.flatMap(group => group.cases).filter(test => test.result === 'PASS').length,
    casesFailed: report.groups.flatMap(group => group.cases).filter(test => test.result === 'FAIL').length,
    completedDownloads: report.downloads.length,
  };
  await writeFile(resolve(out, 'browser-receipt.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({result: report.result, ...report.summary, fatal: report.fatal,
    receipt: resolve(out, 'browser-receipt.json')}, null, 2));
  process.exitCode = report.result === 'PASS' ? 0 : 1;
}
