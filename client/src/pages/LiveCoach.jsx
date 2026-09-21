import { useState, useEffect, useRef } from 'react';
import { useNavigate, useBlocker } from 'react-router-dom';
import useSpeechRecognition from '../hooks/useSpeechRecognition';
import useSessionStore from '../hooks/useSessionStore';
import { analyzeTranscript } from '../services/api';
import { calculateSpeakingStats } from '../utils/localAnalytics';

const primary = 'rounded-full bg-emerald-500 px-6 py-3 font-semibold text-gray-950 hover:bg-emerald-400 disabled:opacity-50';
const secondary = 'rounded-full border border-gray-700 px-5 py-3 text-gray-200 hover:bg-gray-800 disabled:opacity-50';
const time = seconds => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

export default function LiveCoach() {
  const navigate = useNavigate();
  const { saveSession } = useSessionStore();
  const { isListening, isStarting, recording, duration, startListening, stopRecording, transcribe, isSupported, error } = useSpeechRecognition();
  const [manualMode, setManualMode] = useState(!isSupported);
  const [text, setText] = useState('');
  const [editorReady, setEditorReady] = useState(false);
  const [manualSeconds, setManualSeconds] = useState('');
  const [mode, setMode] = useState('supportive');
  const [context, setContext] = useState('General Practice');
  const [busy, setBusy] = useState('');
  const [analysisError, setAnalysisError] = useState('');
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const videoRef = useRef(null);
  const mountedRef = useRef(true);
  const submittingRef = useRef(false);
  const savedRef = useRef(false);
  const cacheRef = useRef(null);
  const unsaved = !!(isListening || isStarting || recording || text.trim());
  const blocker = useBlocker(({ currentLocation, nextLocation }) => !savedRef.current && unsaved && currentLocation.pathname !== nextLocation.pathname);
  const sessionDuration = manualMode ? Number(manualSeconds) || 0 : duration;
  const stats = calculateSpeakingStats(text, sessionDuration);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  useEffect(() => {
    if (!unsaved) return;
    const warn = event => { if (!savedRef.current) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [unsaved]);
  useEffect(() => {
    if (!recording?.size) { setAudioUrl(''); return; }
    const url = URL.createObjectURL(recording);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [recording]);
  useEffect(() => {
    if (!cameraOn) return;
    let stream;
    let cancelled = false;
    navigator.mediaDevices.getUserMedia({ video: true, audio: false }).then(result => {
      stream = result;
      if (cancelled) { stream.getTracks().forEach(track => track.stop()); return; }
      if (videoRef.current) videoRef.current.srcObject = stream;
    }).catch(() => { if (!cancelled) { setCameraError('Camera unavailable. You can keep practicing without it.'); setCameraOn(false); } });
    return () => { cancelled = true; stream?.getTracks().forEach(track => track.stop()); };
  }, [cameraOn]);

  async function runTranscription() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setBusy('Transcribing your recording…'); setAnalysisError('');
    try { const transcript = await transcribe(); if (mountedRef.current) { setText(transcript); setEditorReady(true); } }
    catch (err) { if (mountedRef.current) setAnalysisError(err.message); }
    finally { submittingRef.current = false; if (mountedRef.current) setBusy(''); }
  }
  async function analyze() {
    if (submittingRef.current || !text.trim()) return;
    if (!Number.isInteger(sessionDuration) || sessionDuration < 0 || sessionDuration > 86400) {
      setAnalysisError('Enter a whole speaking duration between 0 and 86,400 seconds.'); return;
    }
    submittingRef.current = true;
    setBusy('Preparing your coaching review…'); setAnalysisError('');
    try {
      const key = JSON.stringify([text.trim(), sessionDuration, context, mode]);
      const analysis = cacheRef.current?.key === key ? cacheRef.current.analysis : await analyzeTranscript(text.trim(), sessionDuration, context, mode);
      if (!mountedRef.current) return;
      cacheRef.current = { key, analysis };
      const id = saveSession({ transcript: text.trim(), duration: sessionDuration, overallScore: analysis.overallScore, analysis, context, mode });
      savedRef.current = true;
      navigate(`/review/${id}`);
    } catch (err) { if (mountedRef.current) setAnalysisError(err.message || 'Review failed. Please retry.'); }
    finally { submittingRef.current = false; if (mountedRef.current) setBusy(''); }
  }
  async function start() {
    if ((recording || text) && !window.confirm('Replace this practice draft? Download your audio first if you want to keep it.')) return;
    setAnalysisError('');
    if (await startListening()) { setText(''); setEditorReady(false); }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-8">
      {blocker.state === 'blocked' && <div role="alertdialog" aria-label="Unsaved practice" className="rounded-xl border border-amber-500 bg-gray-900 p-5">
        <h2 className="font-bold text-amber-300">Leave this practice?</h2>
        <p className="my-3 text-gray-300">Your unsaved text and recording will be lost. Stay to download the audio or finish your review.</p>
        <div className="flex flex-wrap gap-3"><button className={primary} onClick={() => blocker.reset()}>Keep practicing</button><button className={secondary} onClick={() => blocker.proceed()}>Leave and discard</button></div>
      </div>}
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div><h1 className="text-3xl font-bold">Live Practice Session</h1><p className="mt-2 text-gray-400">Record, check your transcript, then get personalized feedback.</p></div>
        <div aria-label="Speaking duration" className="rounded-xl border border-gray-800 bg-gray-900 px-4 py-2 font-mono text-3xl text-emerald-400">{time(Math.max(0, Math.floor(sessionDuration)))}</div>
      </div>
      {(analysisError || error) && <p role="alert" className="rounded-lg border border-amber-700 p-4 text-amber-300">{analysisError || error}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="text-sm text-gray-300">Practice context<input value={context} maxLength={500} disabled={!!busy} onChange={e => setContext(e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-900 p-3" /></label>
        <label className="text-sm text-gray-300">Coaching style<select value={mode} disabled={!!busy} onChange={e => setMode(e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-900 p-3"><option value="supportive">Supportive</option><option value="direct">Direct</option><option value="tough">Tough</option></select></label>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 rounded-xl border border-gray-800 bg-gray-900 p-5 sm:p-6 space-y-5 min-w-0">
          <div className="flex flex-wrap gap-3" role="group" aria-label="Practice input">
            <button aria-pressed={!manualMode} disabled={!!busy || isListening || isStarting || !isSupported} className={!manualMode ? primary : secondary} onClick={() => { setManualMode(false); setAnalysisError(''); }}>Microphone</button>
            <button aria-pressed={manualMode} disabled={!!busy || isListening || isStarting} className={manualMode ? primary : secondary} onClick={() => { setManualMode(true); setAnalysisError(''); }}>Type instead</button>
          </div>
          {!manualMode && <>
            <p className="text-sm text-gray-400">Up to 5 minutes per recording. Audio is uploaded only when you choose Transcribe.</p>
            {isListening ? <div className="space-y-4 py-5"><p role="status" className="text-emerald-300">● Recording — speak naturally.</p><button className="rounded-full bg-red-600 px-6 py-3 font-semibold hover:bg-red-500" onClick={stopRecording}>Stop recording</button></div>
              : <button disabled={isStarting || !!busy} className={recording ? secondary : primary} onClick={start}>{isStarting ? 'Opening microphone…' : recording ? 'Record again' : 'Start recording'}</button>}
          </>}
          {recording?.size > 0 && audioUrl && <div className="rounded-lg bg-gray-950 p-4 space-y-3">
            <h2 className="font-semibold">Your recording</h2><audio aria-label="Recording playback" controls src={audioUrl} className="w-full" />
            <div className="flex flex-wrap items-center gap-4"><a className="text-emerald-400 underline" href={audioUrl} download={`speakup-recording.${recording.type.includes('mp4') ? 'm4a' : recording.type.includes('ogg') ? 'ogg' : 'webm'}`}>Download audio</a>
              {!manualMode && !text && <button className={primary} disabled={!!busy} onClick={runTranscription}>{analysisError ? 'Retry transcription' : 'Transcribe recording'}</button>}</div>
            <p className="text-xs text-gray-400">Audio is kept on this page for retries. Download it before leaving; only the transcript is saved with your review.</p>
          </div>}
          {(manualMode || editorReady || text) && <>
            <label className="block font-semibold">Speech transcript<textarea maxLength={20000} value={text} disabled={!!busy || isListening} onChange={e => setText(e.target.value)} placeholder="Type or paste your speech here…" className="mt-3 block w-full min-h-56 rounded-lg border border-gray-700 bg-gray-950 p-4 text-gray-200 font-normal leading-relaxed" /></label>
            <p className="text-sm text-gray-400">Check or edit your words before analysis. {text.length.toLocaleString()} / 20,000 characters</p>
            {manualMode && <label className="block text-sm text-gray-300">Speaking duration in seconds (optional)<input type="number" min="0" max="86400" step="1" value={manualSeconds} disabled={!!busy} onChange={e => setManualSeconds(e.target.value)} placeholder="e.g. 60" className="block w-full mt-2 rounded-lg border border-gray-700 bg-gray-950 p-3" /><span className="block text-xs text-gray-400 mt-2">Enter the time you actually spoke. Typing time is never counted.</span></label>}
            <button disabled={!!busy || !text.trim() || isListening} className={primary} onClick={analyze}>{analysisError ? 'Retry analysis' : 'Analyze speech'}</button>
          </>}
          {busy && <p role="status" className="text-emerald-300">{busy} This may take a minute. Keep this page open.</p>}
          {!isSupported && <p className="text-sm text-amber-300">Microphone recording is unavailable in this browser. You can practice using text.</p>}
        </section>
        <aside className="space-y-6 min-w-0">
          <section className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-4"><h2 className="font-bold">Speech statistics</h2>
            <dl className="space-y-3"><div className="flex justify-between gap-2"><dt className="text-gray-400">Words</dt><dd>{text ? stats.words : '—'}</dd></div><div className="flex justify-between gap-2"><dt className="text-gray-400">Words per minute</dt><dd>{text && sessionDuration > 0 ? stats.wpm : '—'}</dd></div><div className="flex justify-between gap-2"><dt className="text-gray-400">Potential fillers</dt><dd>{text ? stats.fillerStats.totalFillers : '—'}</dd></div></dl>
            <p className="text-xs text-gray-400">Statistics appear after transcription. Filler matches may include intentional words.</p>
          </section>
          <section className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-4"><h2 className="font-bold">Camera practice</h2><p className="text-sm text-gray-400">Optional mirror for eye contact. Video stays on your device and is never recorded.</p>
            <button disabled={!navigator.mediaDevices?.getUserMedia} className={secondary} aria-pressed={cameraOn} onClick={() => { setCameraError(''); setCameraOn(!cameraOn); }}>{cameraOn ? 'Turn camera off' : 'Turn camera on'}</button>
            {cameraOn && <video ref={videoRef} autoPlay muted playsInline className="w-full rounded-lg" />}
            {cameraError && <p role="status" className="text-sm text-amber-300">{cameraError}</p>}
          </section>
        </aside>
      </div>
    </div>
  );
}
