const API_BASE = (import.meta.env?.VITE_API_BASE_URL || '').replace(/\/$/, '');

export async function analyzeTranscript(transcript, duration, context, mode = 'supportive') {
  let response;
  try {
    response = await fetch(`${API_BASE}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript, duration, context, mode }),
      signal: AbortSignal.timeout(100000)
    });
  } catch (error) {
    throw new Error(error.name === 'TimeoutError'
      ? 'Analysis timed out. Please retry.'
      : 'Cannot reach the coaching service. Check your connection and retry.');
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || 'Analysis is unavailable. Please try again shortly.');
  if (!data || !Number.isFinite(data.overallScore) || !data.metrics || !Array.isArray(data.improvements)) {
    throw new Error('The server returned an invalid review. Please retry.');
  }
  return data;
}

export async function transcribeAudio(audio) {
  if (audio.size > 12 * 1024 * 1024) throw new Error('This recording is too large. Record a shorter session (under 12 MB).');
  let response;
  try {
    response = await fetch(`${API_BASE}/api/transcribe`, {
      method: 'POST', headers: { 'Content-Type': audio.type || 'audio/webm' },
      body: audio, signal: AbortSignal.timeout(100000)
    });
  } catch {
    throw new Error('Could not upload the recording. Check your connection and choose Retry transcription.');
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || 'Transcription failed. Please retry.');
  if (typeof data?.transcript !== 'string' || !data.transcript.trim()) throw new Error('No speech was detected. Try recording again or enter text.');
  return data.transcript.trim();
}
