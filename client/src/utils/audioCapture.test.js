import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAudioCapture } from './audioCapture.js';

function fixture(options = {}) {
  let recorder;
  let clock = 1000;
  let stops = 0;
  const track = new EventTarget();
  track.stop = () => stops++;
  class Recorder {
    static isTypeSupported() { return true; }
    constructor() { recorder = this; this.mimeType = 'audio/webm'; this.state = 'inactive'; }
    start() { this.state = 'recording'; }
    stop() {
      this.state = 'inactive';
      queueMicrotask(() => {
        this.ondataavailable({ data: new Blob(['final']) });
        this.onstop();
      });
    }
  }
  const capture = createAudioCapture({ getTracks: () => [track] }, { Recorder, now: () => clock, ...options });
  capture.start();
  return { capture, track, get recorder() { return recorder; }, advance: ms => { clock += ms; }, stops: () => stops };
}
test('stop preserves final chunk and duration, and retry reuses the same recording', async () => {
  const f = fixture();
  f.recorder.ondataavailable({ data: new Blob(['first-']) });
  f.advance(3100);
  const first = f.capture.stop();
  const concurrent = f.capture.stop();
  assert.equal(first, concurrent);
  const result = await first;
  assert.equal(await result.blob.text(), 'first-final');
  assert.equal(result.duration, 3);
  assert.equal(await f.capture.stop(), result);
  assert.equal(f.stops(), 1);
});
test('microphone disconnect retains audio instead of losing the session', async () => {
  let saved;
  const f = fixture({ onStop: value => { saved = value; } });
  f.track.dispatchEvent(new Event('ended'));
  const result = await f.capture.stop();
  assert.equal(saved, result);
  assert.equal(await saved.blob.text(), 'final');
});
test('size and time limits stop capture and release microphone', async () => {
  let limits = 0;
  const large = fixture({ maxBytes: 4, onLimit: () => limits++ });
  large.recorder.ondataavailable({ data: new Blob(['1234']) });
  await large.capture.stop();
  assert.equal(limits, 1);
  assert.equal(large.stops(), 1);
  let resolveTimed;
  const timed = new Promise(resolve => { resolveTimed = resolve; });
  const short = fixture({ maxMs: 1, onStop: resolveTimed });
  await timed;
  assert.equal(short.recorder.state, 'inactive');
  assert.equal(short.stops(), 1);
});
