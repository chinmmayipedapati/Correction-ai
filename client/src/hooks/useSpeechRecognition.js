import { useState, useEffect, useRef, useCallback } from 'react';
import { transcribeAudio } from '../services/api';

export default function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const blobRef = useRef(null);
  const textRef = useRef('');
  const mountedRef = useRef(true);
  const startingRef = useRef(false);
  const isSupported = !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
      streamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, []);

  const startListening = useCallback(async () => {
    if (startingRef.current || recorderRef.current?.state === 'recording') return;
    startingRef.current = true;
    setIsStarting(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mountedRef.current) { stream.getTracks().forEach(track => track.stop()); return; }
      streamRef.current = stream;
      const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus'].find(type => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      const chunks = [];
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = () => {
        blobRef.current = new Blob(chunks, { type: recorder.mimeType });
        stream.getTracks().forEach(track => track.stop());
        if (mountedRef.current) setIsListening(false);
      };
      recorder.onerror = () => {
        stream.getTracks().forEach(track => track.stop());
        if (mountedRef.current) { setError('Recording stopped unexpectedly. Please retry microphone access.'); setIsListening(false); }
      };
      recorder.start(1000);
      blobRef.current = null;
      textRef.current = '';
      setTranscript('');
      setIsListening(true);
    } catch (err) {
      streamRef.current?.getTracks().forEach(track => track.stop());
      if (mountedRef.current) setError(err.name === 'NotAllowedError'
        ? 'Microphone access is blocked. Allow microphone access in your browser’s site settings, then retry.'
        : err.name === 'NotFoundError' ? 'No microphone was found. Connect a microphone and retry.'
        : 'Cannot open the microphone. Close other apps using it and retry.');
    } finally {
      startingRef.current = false;
      if (mountedRef.current) setIsStarting(false);
    }
  }, []);

  const stopListening = useCallback(async () => {
    const recorder = recorderRef.current;
    if (recorder?.state === 'recording') {
      await new Promise(resolve => {
        recorder.addEventListener('stop', resolve, { once: true });
        recorder.stop();
      });
    }
    if (textRef.current) return textRef.current;
    if (!blobRef.current?.size) throw new Error('No audio was recorded. Start a recording and speak before finishing.');
    // Keep the recording in memory so a failed upload can be retried.
    const text = await transcribeAudio(blobRef.current);
    textRef.current = text;
    setTranscript(text);
    return text;
  }, []);

  return { isListening, isStarting, transcript, interimTranscript: '', startListening, stopListening, isSupported, error };
}
