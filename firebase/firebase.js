const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { createApp } = require('./index');
const apiKey = defineSecret('GEMINI_API_KEY');
let app;

exports.api = onRequest({
  region: 'us-central1',
  timeoutSeconds: 120,
  memory: '512MiB',
  minInstances: 0,
  maxInstances: 2,
  concurrency: 4,
  invoker: 'public',
  secrets: [apiKey]
}, (req, res) => {
  if (!app) {
    const project = process.env.GCLOUD_PROJECT || JSON.parse(process.env.FIREBASE_CONFIG || '{}').projectId;
    app = createApp({
      apiKey: apiKey.value(),
      publicDeployment: true,
      allowedOrigins: [`https://${project}.web.app`, `https://${project}.firebaseapp.com`]
    });
  }
  return app(req, res);
});
