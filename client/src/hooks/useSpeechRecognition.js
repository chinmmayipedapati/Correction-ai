import { useState, useEffect, useRef, useCallback } from 'react';
import { transcribeAudio } from '../services/api';
import { createAudioCapture } from '../utils/audioCapture';

export default function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [recording, setRecording] = useState(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState('');
  const captureRef = useRef(null);
  const mountedRef = useRef(true);
  const startingRef = useRef(false);
  const textRef = useRef('');
  const isSupported = !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; captureRef.current?.stop(); };
  }, []);
  useEffect(() => {
    if (!isListening) return;
    const timer = setInterval(() => setDuration(captureRef.current?.elapsed() || 0), 250);
    return () => clearInterval(timer);
  }, [isListening]);

  const startListening = useCallback(async () => {
    if (startingRef.current || isListening) return false;
    startingRef.current = true;
    setIsStarting(true);
    setError('');
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mountedRef.current) { stream.getTracks().forEach(track => track.stop()); return false; }
      const capture = createAudioCapture(stream, {
        onStop: result => { if (mountedRef.current) { setRecording(result.blob); setDuration(result.duration); setIsListening(false); } },
        onLimit: () => { if (mountedRef.current) setError('Recording limit reached. Your audio is ready to review or download.'); },
        onError: () => { if (mountedRef.current) setError('Microphone interrupted. Review the captured audio before retrying.'); }
      });
      capture.start();
      captureRef.current = capture;
      textRef.current = '';
      setRecording(null);
      setDuration(0);
      setIsListening(true);
      return true;
    } catch (err) {
      stream?.getTracks().forEach(track => track.stop());
      if (mountedRef.current) setError(err.name === 'NotAllowedError'
        ? 'Microphone access is blocked. Allow it in your browser’s site settings, then retry.'
        : err.name === 'NotFoundError' ? 'No microphone was found. Connect one and retry.'
        : 'Cannot open the microphone. Close other apps using it and retry.');
      return false;
    } finally {
      startingRef.current = false;
      if (mountedRef.current) setIsStarting(false);
    }
  }, [isListening]);
  const stopRecording = useCallback(() => captureRef.current?.stop(), []);
  const transcribe = useCallback(async () => {
    if (textRef.current) return textRef.current;
    const result = await captureRef.current?.stop();
    if (!result?.blob.size) throw new Error('No audio was recorded. Record again or enter text.');
    const text = await transcribeAudio(result.blob);
    textRef.current = text;
    return text;
  }, []);
  return { isListening, isStarting, recording, duration, startListening, stopRecording, transcribe, isSupported, error };
}
