import test from 'node:test';
import assert from 'node:assert/strict';
import {createAppServer} from '../server.mjs';

// A route can remain in the server map while the real landing page silently
// points elsewhere. Receive navigation through the same HTTP path as users.
test('landing-page navigation and local assets resolve through the maintained server', async () => {
  const server = createAppServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const landing = await fetch(base + '/');
    assert.equal(landing.status, 200);
    assert.match(landing.headers.get('content-type') ?? '', /^text\/html/);
    const html = await landing.text();
    const targets = [...html.matchAll(/\b(?:href|src)\s*=\s*["']([^"']+)["']/g)]
      .map(match => match[1])
      .filter(link => link.startsWith('/') && !link.startsWith('//'));
    assert.ok(targets.length >= 5, 'landing page should expose meaningful local navigation');
    for (const target of new Set(targets)) {
      const parsed = new URL(target, base);
      assert.equal(parsed.origin, base, `${target} stays on local origin`);
      const response = await fetch(parsed);
      assert.equal(response.status, 200, `${target} responds from the actual server`);
      assert.ok(Number(response.headers.get('content-length')) > 0, `${target} has a body`);
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
      const head = await fetch(parsed, {method: 'HEAD'});
      assert.equal(head.status, 200, `${target} also supports HEAD`);
      assert.equal(await head.text(), '', `${target} HEAD has no response body`);
    }
    assert.equal((await fetch(base + '/not-an-actual-navigation-target')).status, 404,
      'negative control: a nonexistent navigation target cannot be accepted');
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
