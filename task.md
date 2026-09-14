# Phase 1 — Verification tracker

Verified on 2026-09-14:

- [x] Frontend and backend use the same structured review contract.
- [x] Real Gemini analysis returns HTTP 200 and all eight scoring categories.
- [x] Coaching mode and practice context reach the provider request.
- [x] API failures display errors instead of invented mock scores.
- [x] Session persistence, duplicate IDs, short-session totals and stale streaks covered by automated tests.
- [x] Corrupt storage and storage-write failures handled.
- [x] Recording lifecycle corrected to keep one recognition instance and await final text.
- [x] Six automated integration/storage tests pass.
- [x] Frontend lint passes.
- [x] Frontend production build passes.
- [ ] Verify actual microphone capture, permissions and automatic recognition restart in Chrome/Edge.
- [ ] Verify the full spoken browser flow through review, reload and dashboard.

The real-provider verification is separate from the automated suite, which uses controlled provider responses. A passed build is not a substitute for the remaining browser checks.

Microphone fix verification:
- [x] Direct MediaRecorder capture starts in the browser preview.
- [x] Synthetic audio transcribes correctly through the live Gemini endpoint.
- [x] Eight automated regression tests, lint and production build pass.
- [x] Narrow-screen preview keeps recording controls visible.
- [ ] User completes a spoken session with their own microphone and reviews the result.
