const { test } = require('node:test');
const assert = require('node:assert/strict');
const { transcriptionRequest } = require('./transcriptionRequest');
test('recovers from temporary connection failures with the same audio', async () => {
  const calls = [];
  const response = await transcriptionRequest(async (url, init) => {
    calls.push(init);
    if (calls.length === 1) throw new TypeError('fetch failed');
    return Response.json({ ok: true });
  }, 'https://example.test', { body: 'retained audio' });
  assert.equal(response.status, 200);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].body, 'retained audio');
  assert.notEqual(calls[0].signal, calls[1].signal);
});
test('retries temporary service failures but not quota or authentication', async () => {
  for (const status of [503, 429, 401]) {
    let calls = 0;
    await transcriptionRequest(async () => { calls++; return new Response('', { status }); }, 'https://example.test', {});
    assert.equal(calls, status === 503 ? 2 : 1);
  }
});
test('stops after two failed attempts', async () => {
  let calls = 0;
  await assert.rejects(transcriptionRequest(async () => {
    calls++; throw Object.assign(new Error('timeout'), { name: 'TimeoutError' });
  }, 'https://example.test', {}), { name: 'TimeoutError' });
  assert.equal(calls, 2);
});
