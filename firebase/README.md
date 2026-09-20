# Firebase deployment

The frontend uses Firebase Hosting. The Express API runs in a public second-generation HTTPS Function named `api` in `us-central1`, with its key bound from Secret Manager. Calling the function directly avoids Firebase Hosting's 60-second rewrite timeout.

Project: `correction-ai-chinmmayi`. The backend requires the Blaze plan.

## Prepare and verify (PowerShell, project root)

```powershell
npm ci --prefix client
npm ci --prefix server
node --test server/index.test.js server/transcriptionRequest.test.js client/src/utils/sessionStorage.test.js
npm run lint --prefix client
node scripts/prepare-firebase.cjs
npm ci --prefix .firebase-functions --omit=dev
$env:VITE_API_BASE_URL = 'https://us-central1-correction-ai-chinmmayi.cloudfunctions.net/api'
npm run build --prefix client
Remove-Item Env:VITE_API_BASE_URL
```

The staging script copies an explicit source allowlist and never copies `server/.env`. `.firebase-functions` and build outputs are ignored by Git. Node 22 is the deployed runtime.

## Configure and publish

Use `firebase functions:secrets:set GEMINI_API_KEY --project correction-ai-chinmmayi` to enter the key securely when prompted. Keep it out of commands, source code and frontend environment variables.

```powershell
firebase deploy --only functions --project correction-ai-chinmmayi
firebase deploy --only hosting --project correction-ai-chinmmayi
```

After deployment, verify the function's `/api/health`, a real transcription and review, and the Hosting `/live` route. Expected site: `https://correction-ai-chinmmayi.web.app` (available only after Hosting deployment).

Public API limits: 12 MB audio, 64 KB JSON, 20 AI requests/minute per function instance, up to two instances and four concurrent requests each. These protect capacity; they are not a billing cap. The frontend's two Firebase Hosting origins are allowed by CORS. Existing localhost reviews remain on localhost because session storage is browser-origin-specific.
