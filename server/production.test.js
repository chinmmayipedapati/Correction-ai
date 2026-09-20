const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { mkdtemp, mkdir, writeFile, rm } = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { createProductionApp } = require('./production');

test('production serves browser routes and assets while preserving API responses and limits', async () => {
  const clientDirectory = await mkdtemp(path.join(os.tmpdir(), 'correction-ai-production-'));
  let server;
  try {
    await mkdir(path.join(clientDirectory, 'assets'));
    await writeFile(path.join(clientDirectory, 'index.html'), '<!doctype html><title>Correction AI fixture</title>');
    await writeFile(path.join(clientDirectory, 'assets/app.js'), 'window.appLoaded = true;');
    server = createProductionApp({ clientDirectory, apiKey: '' }).listen(0, '127.0.0.1');
    await once(server, 'listening');
    const url = `http://127.0.0.1:${server.address().port}`;

    for (const route of ['/', '/live', '/progress', '/review/saved-session']) {
      const response = await fetch(url + route);
      assert.equal(response.status, 200);
      assert.match(response.headers.get('Content-Type'), /text\/html/);
      assert.equal(response.headers.get('Cache-Control'), 'no-cache');
      assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
      assert.match(await response.text(), /Correction AI fixture/);
    }
    const asset = await fetch(url + '/assets/app.js');
    assert.equal(asset.status, 200);
    assert.match(await asset.text(), /appLoaded/);
    for (const route of ['/assets/missing.js', '/.env', '/.git/config']) {
      assert.equal((await fetch(url + route)).status, 404);
    }
    assert.deepEqual(await (await fetch(url + '/api/unknown')).json(), { error: 'API endpoint not found.' });
    for (const method of ['GET', 'POST']) {
      const missing = await fetch(url + '/API/missing', { method });
      assert.equal(missing.status, 404);
      assert.match(missing.headers.get('Content-Type'), /application\/json/);
    }
    const health = await fetch(url + '/api/health');
    assert.equal(health.status, 200);
    assert.equal((await health.json()).aiConfigured, false);
    for (let request = 0; request < 21; request++) {
      const response = await fetch(url + '/api/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: 'Production limit check.' })
      });
      assert.equal(response.status, request < 20 ? 503 : 429);
    }
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    await rm(clientDirectory, { recursive: true, force: true });
  }
});
