const { createApp } = require('./index');
const { once } = require('node:events');
(async () => {
  const server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/analyze`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: 'Our team spends two hours each week searching for project updates. I propose a shared weekly summary. Each person adds their progress and blockers on Friday. This gives us one place to look and more time to do useful work. Let us try it for two weeks and measure the time saved.', duration: 30, context: 'Team proposal', mode: 'supportive' })
    });
    const body = await response.json();
    console.log(JSON.stringify({ status: response.status, overallScore: body.overallScore, metrics: Object.keys(body.metrics || {}), error: body.error }));
    if (!response.ok) process.exitCode = 1;
  } finally { server.close(); }
})().catch(() => { console.error('Live verification could not connect.'); process.exitCode = 1; });
