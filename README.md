# Correction AI — SpeakUp

An AI communication coach for recording or typing a speech, editing its transcript, receiving Gemini feedback, and tracking practice progress.

**[Open the live app](https://correction-ai.vvchinmmayipedapati.chatgpt.site/)** · **[Read full project details](read.md)**

## What it does

- Record, replay, and download audio; retry transcription without rerecording.
- Edit a transcript before analysis, or practice using typed text.
- Choose a practice context and Supportive, Direct, or Tough coaching.
- Review eight coaching metrics, personalized suggestions, and a next exercise.
- Download a text review and revisit browser-saved sessions and progress.
- Use an optional local camera mirror and warnings for unsaved drafts.

## Start locally

Use Node.js 22 or newer. Install the frontend and backend dependencies:

```powershell
npm ci --prefix server
npm ci --prefix client
Copy-Item server/.env.example server/.env
```

Set `GEMINI_API_KEY` in the ignored `server/.env` file. Keep the key on the server. Start the backend and frontend in separate terminals:

```powershell
npm start --prefix server
```

```powershell
npm run dev --prefix client
```

Open http://localhost:5173. See [read.md](read.md) for configuration, architecture, build and deployment instructions, API endpoints, tests, data handling, and limitations.

Feedback is based on transcript content. Completed reviews are stored in the current browser, and AI requests depend on provider availability and quota.
