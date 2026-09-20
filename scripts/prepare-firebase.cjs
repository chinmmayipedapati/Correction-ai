const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const target = path.join(root, '.firebase-functions');
fs.mkdirSync(target, { recursive: true });
// Only these source files enter the deployment bundle. Never copy server/.env.
for (const name of ['index.js', 'transcriptionRequest.js', 'analysisContract.cjs']) {
  fs.copyFileSync(path.join(root, 'server', name), path.join(target, name));
}
for (const name of ['firebase.js', 'package.json', 'package-lock.json']) {
  fs.copyFileSync(path.join(root, 'firebase', name), path.join(target, name));
}
if (fs.readdirSync(target).some(name => name.startsWith('.env'))) {
  throw new Error('Remove unexpected environment files from .firebase-functions before deploying.');
}
console.log('Firebase source prepared without local credentials.');
