const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./index');
const { once } = require('node:events');
const analysis = {
  overallScore: 80,
  metrics: Object.fromEntries(['clarity','storytelling','engagement','concision','wit','delivery','structure','adaptability'].map(k => [k, { score: 80, reason: 'Specific text feedback' }])),
  strengths: ['Clear opening'], improvements: ['Shorten the closing'],
  details: Object.fromEntries(['storyOpportunity','witOpportunity','bestMoment','weakestMoment','betterOpening','betterClosing','memorableLine'].map(k => [k, 'Text feedback'])),
  nextExercise: 'Practice a shorter closing.', coachNotes: 'Transcript only.'
};
async function withServer(options, run) {
  const server = createApp(options).listen(0, '127.0.0.1');
  await once(server, 'listening');
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}
const post = (url, data) => fetch(url + '/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
test('health, validation and missing configuration are explicit', async () => {
  await withServer({ apiKey: '' }, async url => {
    assert.equal((await (await fetch(url + '/api/health')).json()).aiConfigured, false);
    for (const transcript of ['', '   ', 42, 'x'.repeat(20001)]) assert.equal((await post(url, { transcript })).status, 400);
    assert.equal((await post(url, { transcript: 'Hello', mode: 'invalid' })).status, 400);
    assert.equal((await post(url, { transcript: 'Hello', duration: -1 })).status, 400);
    assert.equal((await post(url, { transcript: 'Hello' })).status, 503);
  });
});
test('real client adapter integrates with backend and validated provider fixture', async () => {
  let sent;
  await withServer({ apiKey: 'test-key', fetchImpl: async (url, init) => {
    sent = JSON.parse(init.body);
    assert.equal(init.headers['x-goog-api-key'], 'test-key');
    return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(analysis) }] } }] });
  } }, async url => {
    const originalFetch = global.fetch;
    global.fetch = (path, init) => originalFetch(path.startsWith('/') ? url + path : path, init);
    try {
      const { analyzeTranscript } = await import('../client/src/services/api.js');
      assert.deepEqual(await analyzeTranscript('A clear speech.', 30, 'Interview', 'direct'), analysis);
      assert.match(sent.systemInstruction.parts[0].text, /direct/);
      assert.equal(JSON.parse(sent.contents[0].parts[0].text).context, 'Interview');
    } finally { global.fetch = originalFetch; }
  });
});
test('invalid, incomplete, rate-limited and timed out provider responses cannot become reviews', async () => {
  const fixtures = [
    [async () => Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"overallScore":99}' }] } }] }), 502],
    [async () => Response.json({ candidates: [{ finishReason: 'MAX_TOKENS' }] }), 502],
    [async () => new Response('', { status: 429 }), 429],
    [async () => { throw Object.assign(new Error('secret'), { name: 'TimeoutError' }); }, 504]
  ];
  for (const [fetchImpl, status] of fixtures) await withServer({ apiKey: 'test-key', fetchImpl }, async url => {
    const response = await post(url, { transcript: 'A speech' });
    assert.equal(response.status, status);
    assert.equal(JSON.stringify(await response.json()).includes('secret'), false);
  });
});
test('client propagates configuration errors instead of making up scores', async () => {
  await withServer({ apiKey: '' }, async url => {
    const originalFetch = global.fetch;
    global.fetch = (path, init) => originalFetch(url + path, init);
    try {
      const { analyzeTranscript } = await import('../client/src/services/api.js');
      await assert.rejects(analyzeTranscript('A speech', 30), /GEMINI_API_KEY/);
    } finally { global.fetch = originalFetch; }
  });
});

test('audio upload is transcribed via provider and returns plain transcript', async () => {
  await withServer({ apiKey: 'test-key', fetchImpl: async (url, init) => {
    const request = JSON.parse(init.body);
    assert.equal(request.contents[0].parts[0].inlineData.mimeType, 'audio/webm');
    assert.equal(Buffer.from(request.contents[0].parts[0].inlineData.data, 'base64').toString(), 'test audio');
    return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ transcript: 'A test speech.' }) }] } }] });
  } }, async url => {
    const response = await fetch(url + '/api/transcribe', { method: 'POST', headers: { 'Content-Type': 'audio/webm;codecs=opus' }, body: 'test audio' });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { transcript: 'A test speech.' });
  });
});
test('audio validation, missing key and silence are explicit', async () => {
  await withServer({ apiKey: '' }, async url => {
    assert.equal((await fetch(url + '/api/transcribe', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: 'invalid' })).status, 400);
    assert.equal((await fetch(url + '/api/transcribe', { method: 'POST', headers: { 'Content-Type': 'audio/webm' }, body: 'audio' })).status, 503);
  });
  await withServer({ apiKey: 'test-key', fetchImpl: async () => Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"transcript":""}' }] } }] }) }, async url => {
    assert.equal((await fetch(url + '/api/transcribe', { method: 'POST', headers: { 'Content-Type': 'audio/wav' }, body: 'silence' })).status, 422);
  });
});
