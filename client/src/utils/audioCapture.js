// Every stop path preserves the same audio, including device disconnects.
export function createAudioCapture(stream, { Recorder = MediaRecorder, now = Date.now,
  onStop, onLimit, onError, maxBytes = 10 * 1024 * 1024, maxMs = 300000 } = {}) {
  const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus'].find(type => Recorder.isTypeSupported(type));
  const recorder = new Recorder(stream, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 64000 });
  const chunks = [];
  let bytes = 0;
  let started = 0;
  let finished = false;
  let timer;
  let resolveStopped;
  const stopped = new Promise(resolve => { resolveStopped = resolve; });
  const stop = () => {
    if (recorder.state === 'recording') recorder.stop();
    return stopped;
  };
  const limit = () => {
    if (recorder.state !== 'recording') return;
    onLimit?.();
    stop();
  };
  recorder.ondataavailable = event => {
    if (event.data.size) { chunks.push(event.data); bytes += event.data.size; }
    if (bytes >= maxBytes) limit();
  };
  recorder.onerror = () => { onError?.(); stop(); };
  recorder.onstop = () => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    const result = { blob: new Blob(chunks, { type: recorder.mimeType }), duration: Math.max(1, Math.round((now() - started) / 1000)) };
    stream.getTracks().forEach(track => track.stop());
    onStop?.(result);
    resolveStopped(result);
  };
  stream.getTracks().forEach(track => track.addEventListener('ended', stop, { once: true }));
  return {
    start() { recorder.start(1000); started = now(); timer = setTimeout(limit, maxMs); },
    stop,
    elapsed: () => Math.max(0, Math.floor((now() - started) / 1000))
  };
}
