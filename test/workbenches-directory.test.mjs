import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createAppServer} from '../server.mjs';

test('full workbench directory exposes every maintained HTML workbench through live routes', async () => {
  const source = await readFile(new URL('../server.mjs', import.meta.url), 'utf8');
  const start = source.indexOf('const routes=Object.freeze({');
  const end = source.indexOf('});', start);
  assert.ok(start >= 0 && end > start, 'the maintained route map must be inspectable');
  const block = source.slice(start, end);
  const mapped = [...block.matchAll(/["'](\/[^"']*)["']\s*:\s*\[\s*["']([^"']+)["']/g)];
  const canonical = new Map();
  for (const [, route, file] of mapped) {
    if (!file.endsWith('.html') || route === '/workbenches') continue;
    if (!canonical.has(file) || route.length < canonical.get(file).length) canonical.set(file, route);
  }
  const expected = new Set([...canonical.values()].filter(path => path !== '/'));
  assert.ok(expected.size >= 70, 'check all established source/practice/investigation pages');
  const server = createAppServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    const landing = await (await fetch(base + '/')).text();
    assert.match(landing, /href="\/workbenches"/, 'homepage exposes discovery entry');
    const directory = await fetch(base + '/workbenches');
    assert.equal(directory.status, 200);
    assert.match(directory.headers.get('content-type') ?? '', /^text\/html/);
    assert.equal(directory.headers.get('x-content-type-options'), 'nosniff');
    const page = await directory.text();
    const links = [...page.matchAll(/data-workbench-link href="(\/[^"]+)"/g)].map(match => match[1]);
    assert.equal(links.length, expected.size, 'one discoverable link per maintained workbench');
    assert.deepEqual(new Set(links), expected, 'no maintained workbench is silently omitted or invented');
    for (const link of links) {
      const response = await fetch(base + link);
      assert.equal(response.status, 200, link + ' is actually served');
      assert.match(response.headers.get('content-type') ?? '', /^text\/html/, link);
      assert.ok((await response.text()).length > 0, link + ' is not empty');
    }
    for (const asset of ['/web/workbenches.mjs', '/web/workbenches.css']) {
      const response = await fetch(base + asset);
      assert.equal(response.status, 200, asset + ' is served');
      assert.ok((await response.text()).length > 0);
    }
    assert.equal((await fetch(base + '/workbenches-not-real')).status, 404);
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
