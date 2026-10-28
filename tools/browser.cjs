const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const sourceFile = process.env.SOURCE_FILE || path.join(root, 'receiving.json');
const refusedFile = process.env.REFUSED_FILE || path.join(root, 'refused.json');
const receiptDir = process.env.RECEIPT_DIR || fs.mkdtempSync(path.join(os.tmpdir(), 'joint-browser-'));
const base = process.env.BASE_URL || 'http://127.0.0.1:8896/';
const url = new URL('web/joint-numeric-cues.html', base.endsWith('/') ? base : base + '/').href;
fs.mkdirSync(receiptDir, {recursive: true});

(async () => {
  const browser = await chromium.launch({
    ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {}),
    chromiumSandbox: true,
    headless: true,
  });
  const consoleMessages = [], pageErrors = [];
  try {
    const page = await browser.newPage();
    page.on('console', message => consoleMessages.push({type: message.type(), text: message.text()}));
    page.on('pageerror', error => pageErrors.push(error.message));
    // The test fixture has no favicon. Avoid an unrelated static-server 404.
    await page.route('**/favicon.ico', route => route.fulfill({status: 204, body: ''}));
    let actualUrl = url;
    if (process.env.NUMERIC_PAGE_URL) {
      await page.goto(process.env.NUMERIC_PAGE_URL);
      const [response] = await Promise.all([
        page.waitForResponse(r => new URL(r.url()).pathname === '/joint-numeric-cues' && r.request().isNavigationRequest()),
        page.locator("a[href='/joint-numeric-cues']").click(),
      ]);
      await page.waitForLoadState('load');
      assert.equal(new URL(page.url()).pathname, '/joint-numeric-cues');
      const csp = response.headers()['content-security-policy'];
      assert(csp && csp.includes("style-src 'self'") && csp.includes("script-src 'self'") && !csp.includes('unsafe-inline'), 'Maintained strict CSP must be active');
      const style = await page.evaluate(() => ({fontSize: getComputedStyle(document.body).fontSize, maxWidth: getComputedStyle(document.body).maxWidth, inputBox: getComputedStyle(document.querySelector('#input')).boxSizing}));
      assert.deepEqual(style, {fontSize: '18px', maxWidth: '1120px', inputBox: 'border-box'});
      actualUrl = page.url();
    } else {
      await page.goto(url);
    }
    await page.locator('#input').setInputFiles(sourceFile);
    await page.waitForFunction(() => document.querySelector('#status').textContent.startsWith('compatible;'));
    assert.match(await page.locator('#result').textContent(), /unanimous-conditional-label: A/);
    const baselines = page.locator('#result > p').filter({hasText: 'Maintained single-quantity model: no-compatible-threshold'});
    assert.equal(await baselines.count(), 2, 'Both maintained single-cue baseline findings must be rendered');
    assert.equal(await page.locator('#result > h2').filter({hasText: /^Retained target$/}).count(), 1);
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#save').click()]);
    const reopened = path.join(receiptDir, 'reopened.json');
    await download.saveAs(reopened);
    assert.deepEqual(JSON.parse(fs.readFileSync(reopened)), JSON.parse(fs.readFileSync(sourceFile)));
    await page.locator('#input').setInputFiles(reopened);
    await page.waitForFunction(() => document.querySelector('#status').textContent.startsWith('compatible;'));
    await page.screenshot({path: path.join(receiptDir, 'desktop.png')});
    await page.setViewportSize({width: 390, height: 844});
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({path: path.join(receiptDir, 'narrow.png')});
    await page.locator('#input').setInputFiles(refusedFile);
    await page.waitForFunction(() => document.querySelector('#status').textContent.startsWith('Refused:'));
    assert(await page.locator('#save').isDisabled());
    assert.equal(await page.locator('#result').textContent(), '');
    await page.locator('#input').setInputFiles({name: 'invalid-utf8.json', mimeType: 'application/json', buffer: Buffer.from([123,34,120,34,58,34,255,34,125])});
    await page.waitForFunction(() => document.querySelector('#status').textContent.startsWith('Refused:'));
    assert(await page.locator('#save').isDisabled());
    assert.deepEqual(consoleMessages, [], 'Browser console must remain empty');
    assert.deepEqual(pageErrors, [], 'No unhandled page errors');
    const receipt = {status: 'PASS', url: actualUrl, maintainedNavigation: !!process.env.NUMERIC_PAGE_URL, browser: browser.version(), chromiumSandbox: true,
      checks: ['file intake', 'conditional target', 'both maintained single-cue baselines', 'retained target label', 'actual download/reopen', '390px overflow', 'source refusal and stale retirement', 'fatal UTF-8 refusal', 'empty console and page errors'],
      consoleMessages, pageErrors};
    fs.writeFileSync(path.join(receiptDir, 'browser-receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
    console.log(JSON.stringify(receipt));
  } finally {
    await browser.close();
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
