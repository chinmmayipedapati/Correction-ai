import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorker } from './index.mjs';
const env = { GEMINI_API_KEY: 'test-key' };
const post = (path, body, type = 'application/json') => new Request('https://example.test' + path, { method: 'POST', headers: { 'Content-Type': type }, body });
test('hosted app serves SPA pages, bundled assets, and bounded API errors', async () => {
  const worker = createWorker();
  const page = await worker.fetch(new Request('https://example.test/live'), env);
  const html = await page.text();
  assert.equal(page.status, 200);
  const script = html.match(/src="([^"]+\.js)"/)[1];
  assert.equal((await worker.fetch(new Request('https://example.test' + script), env)).status, 200);
  assert.equal((await worker.fetch(new Request('https://example.test/.env'), env)).status, 404);
  assert.equal((await worker.fetch(post('/api/unknown', '{}'), env)).status, 404);
  assert.equal((await worker.fetch(post('/api/analyze', '{}'), env)).status, 400);
  assert.equal((await worker.fetch(post('/api/analyze', 'x'.repeat(65537)), env)).status, 413);
  assert.equal((await worker.fetch(post('/api/transcribe', 'audio', 'text/plain'), env)).status, 400);
});
test('hosted transcription retries provider failures and validates the transcript', async () => {
  let calls = 0;
  const worker = createWorker({ fetchImpl: async (url, init) => {
    calls++;
    if (calls === 1) throw new TypeError('temporary failure');
    const sent = JSON.parse(init.body);
    assert.equal(sent.contents[0].parts[0].inlineData.data, Buffer.from('audio').toString('base64'));
    return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"transcript":"Hello everyone."}' }] } }] });
  } });
  const response = await worker.fetch(post('/api/transcribe', 'audio', 'audio/webm;codecs=opus'), env);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { transcript: 'Hello everyone.' });
  assert.equal(calls, 2);
});
