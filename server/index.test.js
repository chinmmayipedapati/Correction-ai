const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./index');
const { once } = require('node:events');
const express = require('express');
const analysis = {
  overallScore: 80,
  metrics: Object.fromEntries(['clarity','storytelling','engagement','concision','wit','delivery','structure','adaptability'].map(k => [k, { score: 80, reason: 'Specific text feedback' }])),
  strengths: ['Clear opening'], improvements: ['Shorten the closing'],
  details: Object.fromEntries(['storyOpportunity','witOpportunity','bestMoment','weakestMoment','betterOpening','betterClosing','memorableLine'].map(k => [k, 'Text feedback'])),
  nextExercise: 'Practice a shorter closing.', coachNotes: 'Transcript only.'
};
async function withServer(options, run, wrap = app => app) {
  const server = wrap(createApp(options)).listen(0, '127.0.0.1');
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

test('public deployment limits pre-parsed Firebase bodies before sending them to AI', async () => {
  let providerCalls = 0;
  const emulateFirebaseParser = app => {
    const verify = (req, res, buffer) => { req.rawBody = buffer; };
    return express().use(express.json({ limit: '32mb', verify }))
      .use(express.raw({ type: '*/*', limit: '32mb', verify })).use(app);
  };
  await withServer({ apiKey: 'test-key', publicDeployment: true, fetchImpl: async (url, init) => {
    providerCalls++;
    const isAudio = JSON.parse(init.body).contents[0].parts[0].inlineData;
    const result = isAudio ? { transcript: 'A test speech.' } : analysis;
    return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(result) }] } }] });
  } }, async url => {
    for (const [bytes, status] of [[12 * 1024 * 1024, 200], [12 * 1024 * 1024 + 1, 413]]) {
      const response = await fetch(url + '/API/TRANSCRIBE/', {
        method: 'POST', headers: { 'Content-Type': 'audio/webm' }, body: Buffer.alloc(bytes, 1)
      });
      assert.equal(response.status, status);
      if (status === 413) assert.match((await response.json()).error, /Recording is too large/);
    }
    for (const [bytes, status] of [[64 * 1024, 200], [64 * 1024 + 1, 413]]) {
      const response = await fetch(url + '/api/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: 'A speech.' }).padEnd(bytes, ' ')
      });
      assert.equal(response.status, status);
    }
    assert.equal(providerCalls, 2);
  }, emulateFirebaseParser);
});

test('public deployment shares a bounded quota across AI endpoints and permits retry after reset', async t => {
  let now = Date.now();
  t.mock.method(Date, 'now', () => now);
  let providerCalls = 0;
  await withServer({ apiKey: 'test-key', publicDeployment: true, allowedOrigins: ['https://example.web.app'], fetchImpl: async (url, init) => {
    providerCalls++;
    const isAudio = JSON.parse(init.body).contents[0].parts[0].inlineData;
    const result = isAudio ? { transcript: 'A test speech.' } : analysis;
    return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(result) }] } }] });
  } }, async url => {
    for (let i = 0; i < 20; i++) {
      const response = i % 2 === 0 ? await post(url, { transcript: 'A speech.' })
        : await fetch(url + '/API/TRANSCRIBE/', { method: 'POST', headers: { 'Content-Type': 'audio/webm' }, body: 'audio' });
      assert.equal(response.status, 200);
    }
    now += 15000;
    const blocked = await fetch(url + '/API/ANALYZE/', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://example.web.app' },
      body: JSON.stringify({ transcript: 'A speech.' })
    });
    assert.equal(blocked.status, 429);
    assert.equal(blocked.headers.get('Retry-After'), '45');
    assert.equal(blocked.headers.get('Access-Control-Allow-Origin'), 'https://example.web.app');
    assert.match((await blocked.json()).error, /still available/);
    assert.equal(providerCalls, 20);
    assert.equal((await fetch(url + '/api/health')).status, 200);
    now += 45000;
    assert.equal((await post(url, { transcript: 'Retry speech.' })).status, 200);
    assert.equal(providerCalls, 21);
  });
});

test('local defaults do not enable the public deployment quota', async () => {
  await withServer({ apiKey: '' }, async url => {
    for (let i = 0; i < 21; i++) assert.equal((await post(url, { transcript: 'A speech.' })).status, 503);
  });
});
