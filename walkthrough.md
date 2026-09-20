# Completion update — 2026-09-14

The earlier implementation contained a response-format mismatch: the backend returned `scores` and `topImprovements`, while the UI expected `metrics` and `improvements`. The API now requests and validates the UI contract through Gemini REST structured output. The old SDK import is no longer used. The configured key was successfully tested with a sample team-proposal transcript; the provider returned HTTP 200, an overall score, and all eight metrics.

API errors no longer become random mock reviews. The UI preserves the transcript, exposes a retryable error, and prevents duplicate submissions. Coaching context and style are configurable. Recording now uses a stable speech-recognition instance and waits for final results. Camera cleanup handles delayed permission responses and analysis transitions.

Session loading is synchronous, malformed saved records are filtered, storage errors are visible, and profile totals are derived from saved sessions. Short sessions accumulate correctly; streaks expire when practice stops. Progress charts have visible bar heights and include zero-valued scores. Review pages show the next exercise and coaching notes.

Validation: six automated integration/storage tests, frontend lint, and production build passed. A real Gemini request also passed. Microphone permissions, real speech capture and the complete browser journey remain manual checks. See README.md for startup commands; this document does not imply that development servers are currently running.

## Microphone fix — 2026-09-14

The browser SpeechRecognition service has been replaced with MediaRecorder capture and `/api/transcribe`. Recording no longer depends on the browser vendor's speech service. Audio stays in memory until Finish & Analyze, then is sent through the backend to Gemini; failed uploads can be retried. Transcripts, statistics and coaching are produced after recording, not live. Requests accept at most 12 MB of audio. Microphone permission is still required.

Verified: recording starts in the app preview; a synthetic WAV spoken sentence was transcribed correctly by the live Gemini endpoint through the frontend proxy. Eight automated tests, lint and production build pass. The narrow-screen recording panel now retains a minimum height so its controls remain visible.

## Transcription retry recovery

The retained seven-second browser recording successfully transcribed and reached a saved review after a backend restart and retry. The prior generic exception message did not preserve the original failure cause; this incident cannot be attributed to a specific provider or transport error retrospectively.

Added one bounded automatic retry for transient transport failures and HTTP 500/502/503/504. Quota and authentication errors are not retried. Each attempt has a 45-second timeout; the frontend allows 100 seconds. Final failures distinguish transport, timeout and invalid provider responses. Diagnostic logs contain only failure codes, audio MIME type and byte count, never audio or credentials.

Regression suite: 11 tests pass, including retained-body retries, quota/auth handling and bounded failure. Run `node --test server/index.test.js server/transcriptionRequest.test.js client/src/utils/sessionStorage.test.js`.

## Firebase deployment status — 2026-09-15

Created Firebase project `correction-ai-chinmmayi`. Prepared Hosting configuration, Node 22 Functions v2 wrapper, isolated source packaging, Secret Manager binding, production API URL, request-size limits and per-instance throttling. All 14 tests, lint and production build pass. Wrapper export inspection confirms the API function with a 120-second timeout.

Deployment is not live yet. Firebase rejected the Secret Manager setup because the project is on the Spark plan. The owner must enable Blaze at https://console.firebase.google.com/project/correction-ai-chinmmayi/usage/details before the secret and function can be deployed. The Gemini key has not been uploaded to Firebase. Hosting has not been published with an unavailable backend. See firebase/README.md for the prepared deployment commands.
