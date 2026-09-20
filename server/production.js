const express = require('express');
const path = require('node:path');
const { existsSync } = require('node:fs');
const { createApp } = require('./index');

function createProductionApp({ clientDirectory = path.join(__dirname, '../client/dist'), ...apiOptions } = {}) {
  const publicDirectory = path.resolve(clientDirectory);
  const indexFile = path.join(publicDirectory, 'index.html');
  if (!existsSync(indexFile)) {
    throw new Error('Frontend build is missing. Run npm run build --prefix client before starting production.');
  }

  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });
  app.use(createApp({
    ...apiOptions,
    publicDeployment: true,
    // The deployed browser and API share one origin; no cross-origin access is needed.
    allowedOrigins: false
  }));
  app.use('/api', (req, res) => res.status(404).json({ error: 'API endpoint not found.' }));
  app.use(express.static(publicDirectory, { index: false, dotfiles: 'deny' }));
  app.get('*', (req, res) => {
    if (path.extname(req.path) || req.path.split('/').some(segment => segment.startsWith('.'))) {
      return res.status(404).type('text').send('Not found.');
    }
    res.set('Cache-Control', 'no-cache');
    res.sendFile(indexFile);
  });
  return app;
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3001);
  const server = createProductionApp().listen(port, '0.0.0.0', () => {
    console.log(`Correction AI production server listening on port ${port}`);
  });
  // Keep connections open longer than the hosting proxy's idle timeout.
  server.keepAliveTimeout = 120000;
  server.headersTimeout = 120000;
}

module.exports = { createProductionApp };
