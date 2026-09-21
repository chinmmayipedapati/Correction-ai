# Correction AI — SpeakUp

Correction AI is a web app for practicing communication and receiving AI coaching. The interface is named **SpeakUp**. Users can record a short speech or enter text, review the transcript, get feedback, and track their practice history.

- **Live app:** https://correction-ai.vvchinmmayipedapati.chatgpt.site/
- **GitHub:** https://github.com/chinmmayipedapati/Correction-ai

## Features

- Microphone recording with playback and audio download.
- Separate transcription and analysis steps, so users can edit the transcript before requesting feedback.
- Recording recovery after a microphone interruption, clear retry controls, and warnings before leaving an unsaved practice session.
- Automatic recording stop after five minutes or when the captured audio reaches the size threshold.
- Text entry with an optional actual speaking duration; typing time is not counted as speaking time.
- Practice context and three coaching styles: Supportive, Direct, and Tough.
- An overall score and eight coaching metrics: clarity, storytelling, engagement, concision, wit, delivery, structure, and adaptability.
- Strengths, improvement suggestions, alternative openings and closings, and a next practice exercise.
- Downloadable text reviews, saved session history, practice streaks, and progress charts.
- Optional camera mirror for practicing eye contact.

## How to use the app

1. Open **Live Coach** or select **Start Practice** from the dashboard.
2. Enter your practice context and choose a coaching style.
3. Select **Microphone**, choose **Start recording**, speak, and choose **Stop recording**. Listen to the playback or download the audio if needed.
4. Choose **Transcribe recording**. Check and edit the resulting transcript. Alternatively, select **Type instead** and paste or type your speech.
5. For typed text, optionally enter how many seconds you actually spoke. Leave it blank if unknown.
6. Choose **Analyze speech** to generate and save a coaching review.
7. Use **Download review** to keep a text copy, or revisit the session from the dashboard and **Progress** page.

If a request fails, the draft remains available on the practice page for retry. Audio is kept in memory, so download it before closing the page, navigating away, or replacing the recording.

## Technology and architecture

- **Frontend:** React 18, React Router 6, Vite 5, and Tailwind CSS 4.
- **Browser audio:** MediaRecorder and microphone permission through getUserMedia.
- **Local backend:** Node.js and Express.
- **AI provider:** Google Gemini REST API for transcription and structured coaching reviews.
- **Public hosting:** OpenAI Sites with a Cloudflare Worker-compatible server bundle.
- **Session storage:** Browser localStorage; no shared user database.

The browser sends audio to `/api/transcribe` and text to `/api/analyze`. The backend calls Gemini using a server-side secret and validates the returned review before sending it to the browser. The frontend stores completed sessions locally and derives dashboard statistics from that history.

## Project structure

```text
client/                      React frontend
  src/pages/                 Dashboard, Live Coach, review, and progress pages
  src/hooks/                 Recording lifecycle and session state
  src/services/api.js        Browser API client and request timeouts
  src/utils/                 Audio capture, statistics, storage, and review export
server/                      Express backend and backend tests
  index.js                   Local API server
  production.js              Express API plus built frontend
  analysisContract.cjs       Shared AI review schema and validation
  transcriptionRequest.js    Bounded retries for temporary provider failures
worker/                      Public Sites API and asset-serving entrypoint
scripts/build-sites.cjs       Frontend and Worker build
.openai/hosting.json          Existing Sites project association
firebase/                    Earlier optional Firebase deployment configuration
render.yaml                  Optional Render deployment configuration
read.md                      Detailed project documentation
```

## Run locally

Requirements: Node.js 22 or newer, npm, a supported browser, and a Gemini API key with access to the configured model.

```powershell
git clone https://github.com/chinmmayipedapati/Correction-ai.git
cd Correction-ai
npm ci --prefix server
npm ci --prefix client
Copy-Item server/.env.example server/.env
```

Edit `server/.env` and replace the placeholder key:

```dotenv
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-3.5-flash
PORT=3001
CLIENT_ORIGIN=http://localhost:5173
```

Keep the real key in `server/.env`. This file is ignored by Git and must not be committed or placed in frontend code. Restart the backend after changing its configuration.

Start the backend in one terminal:

```powershell
npm start --prefix server
```

Start the frontend in another:

```powershell
npm run dev --prefix client
```

Open http://localhost:5173. Vite forwards `/api` requests to the backend at http://localhost:3001. Microphone recording needs HTTPS or localhost and browser permission.

## Build and deployment

Build the frontend and the public Worker bundle from the repository root:

```powershell
npm run build
```

This produces `dist/client/` and `dist/server/index.js`. The Sites build uses same-origin API requests and embeds the frontend assets in the Worker bundle. The existing Sites project is identified in `.openai/hosting.json`.

The public deployment requires `GEMINI_API_KEY` as a secret runtime variable and supports `GEMINI_MODEL` as a configurable runtime variable. Production values are configured in hosting, separately from local `.env` files. A GitHub push alone does not publish a new version of the current Sites deployment.

For a conventional Node server deployment, build the frontend and start the Express production entrypoint:

```powershell
npm run build --prefix client
node server/production.js
```

The current public app uses Sites. The Firebase and Render files are alternative configurations retained in the repository; they are not required for the live Sites app. The project does not require a paid hosting upgrade for its current deployment. AI availability still depends on the provider's quota, access, and service availability; free usage is not unlimited.

## API endpoints

- `GET /api/health`: reports service status, configured model, and whether a key is present.
- `POST /api/transcribe`: accepts supported raw audio and returns a transcript.
- `POST /api/analyze`: accepts JSON containing transcript, duration, context, and coaching style; returns a validated review.

Analysis accepts up to 20,000 transcript characters and 500 context characters. Supported audio types include WebM, MP4, Ogg, WAV, and MP3, with a 12 MB request limit. Browser recording stops earlier at five minutes or approximately 10 MB to leave room for the final audio chunk.

The public Worker applies a per-instance request budget of 20 AI requests per minute and permits one active AI operation per instance. These are basic load controls, not an account-level quota or a guaranteed global rate limit. Temporary transport and provider errors receive one automatic retry; quota and authentication failures are not automatically retried.

`/api/health` confirms that a key is configured; it does not prove that the key, model, quota, or AI provider is working.

## Checks

Install dependencies first. Build before running Worker tests because they import generated frontend assets.

```powershell
npm run build
npm run lint --prefix client
node --test server/index.test.js server/production.test.js server/transcriptionRequest.test.js client/src/utils/sessionStorage.test.js client/src/utils/audioCapture.test.js worker/index.test.mjs
```

The tests cover API validation, provider failure handling, retry behavior, production routes, request limits, recording stop and disconnect handling, recording limits, saved history, malformed storage, and review export formatting.

An optional real-provider check uses the configured key and consumes AI quota:

```powershell
node server/verify-live.cjs
```

Real microphone quality, device permission prompts, camera behavior, and browser downloads should also be checked on the user's target browser and device.

## Data handling and limitations

- Audio stays in browser memory until the user requests transcription; it is then sent through the backend to Gemini. Audio is not saved in session history.
- Transcripts and context are sent to Gemini for analysis. Avoid entering content you do not want processed by that provider.
- Completed transcripts and reviews are stored in this browser's localStorage. They are not synced across devices, accounts, or browsers. Review links work only in the browser and site origin that saved the session. Clearing site data removes it.
- Camera preview is optional, stays on the device, and is not recorded or analyzed.
- Feedback evaluates transcript content. It does not assess pronunciation, vocal tone, actual confidence, or body language. The delivery score describes textual flow.
- Word-per-minute statistics require a known speaking duration. Filler-word matching is a heuristic and may flag intentional words.
- There is no account system, cloud session backup, or real-time word-by-word transcription in the current app.
- Failed AI calls display errors and preserve the current draft; the app does not substitute fabricated review scores.
