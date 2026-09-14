import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useSpeechRecognition from '../hooks/useSpeechRecognition';
import useSessionStore from '../hooks/useSessionStore';
import { analyzeTranscript } from '../services/api';
import { calculateSpeakingStats } from '../utils/localAnalytics';
import CoachCue from '../components/CoachCue';

export default function LiveCoach() {
  const navigate = useNavigate();
  const { saveSession } = useSessionStore();
  const { 
    isListening, transcript, interimTranscript, 
    startListening, stopListening, isSupported, isStarting, error 
  } = useSpeechRecognition();
  
  const [duration, setDuration] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [sessionFinished, setSessionFinished] = useState(false);
  const [mode, setMode] = useState('supportive');
  const [context, setContext] = useState('General Practice');
  const submittingRef = useRef(false);
  const cachedReviewRef = useRef(null);
  const [stats, setStats] = useState({ wpm: 0, words: 0, fillers: 0 });
  const [cues, setCues] = useState([]);
  
  // Fallback for network errors
  const [manualMode, setManualMode] = useState(false);
  const [manualText, setManualText] = useState("");
  
  const timerRef = useRef(null);
  const transcriptEndRef = useRef(null);
  const videoRef = useRef(null);

  // Camera logic
  useEffect(() => {
    if (isAnalyzing) return;
    let stream = null;
    let cancelled = false;
    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (cancelled) { stream.getTracks().forEach(track => track.stop()); return; }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn("Camera access denied or unavailable:", err);
      }
    }
    startCamera();
    
    return () => {
      cancelled = true;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isAnalyzing]);

  // Timer logic
  useEffect(() => {
    if ((isListening || manualMode) && !isAnalyzing && !sessionFinished) {
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isListening, manualMode, isAnalyzing, sessionFinished]);


  // Real-time analytics logic
  useEffect(() => {
    const textToAnalyze = manualMode ? manualText : transcript;
    
    const currentStats = calculateSpeakingStats(textToAnalyze, duration);
    setStats({
      wpm: currentStats.wpm,
      words: currentStats.words,
      fillers: currentStats.fillerStats.totalFillers
    });
    
    const newCues = [];
    if (duration > 30) {
      if (currentStats.wpm > 170) {
        newCues.push({ id: 'speed', msg: 'You are speaking very fast. Try to slow down.', type: 'warning' });
      } else if (currentStats.wpm < 110 && currentStats.wpm > 0) {
        newCues.push({ id: 'speed', msg: 'Pace is a bit slow. Try picking up the energy.', type: 'info' });
      } else if (currentStats.wpm >= 120 && currentStats.wpm <= 160) {
        newCues.push({ id: 'speed', msg: 'Great pacing!', type: 'success' });
      }
    }
    
    if (currentStats.fillerStats.totalFillers > (duration / 60) * 5) {
      newCues.push({ id: 'fillers', msg: 'Watch out for filler words (um, uh, like).', type: 'warning' });
    }
    
    setCues(newCues.slice(-2));
  }, [transcript, manualText, duration, manualMode]);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptEndRef.current && !manualMode) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript, interimTranscript, manualMode]);

  const handleStop = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setAnalysisError('');
    setSessionFinished(true);
    setIsAnalyzing(true);
    try {
    const finalText = manualMode ? manualText.trim() : await stopListening();
    
    if (!finalText || finalText.trim().length === 0) {
      setAnalysisError('No speech or text detected. Please try again.');
      setIsAnalyzing(false);
      setSessionFinished(false);
      submittingRef.current = false;
      return;
    }
    
    setIsAnalyzing(true);
    
      const cacheKey = JSON.stringify([finalText, duration, context, mode]);
      const analysis = cachedReviewRef.current?.key === cacheKey ? cachedReviewRef.current.analysis
        : await analyzeTranscript(finalText, duration, context, mode);
      cachedReviewRef.current = { key: cacheKey, analysis };
      
      const sessionData = {
        transcript: finalText,
        duration,
        overallScore: analysis.overallScore,
        analysis,
        context,
        mode
      };
      
      const sessionId = saveSession(sessionData);
      navigate(`/review/${sessionId}`);
    } catch (err) {
      console.error("Analysis failed:", err);
      setAnalysisError(err.message || 'Analysis failed. Please retry.');
      setIsAnalyzing(false);
    } finally {
      submittingRef.current = false;
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!isSupported && !manualMode) {
    return (
      <div className="max-w-xl mx-auto mt-20 p-6 bg-gray-900 border border-gray-800 rounded-xl text-center">
        <h2 className="text-xl font-bold text-white mb-2">Speech Recognition Unavailable</h2>
        <p className="text-gray-400 mb-6">Microphone recording is unavailable here. Open this page in Chrome or Edge, or type your speech manually.</p>
        <button onClick={() => setManualMode(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-8 rounded-full transition-all">
          Use Manual Text Entry
        </button>
      </div>
    );
  }

  if (isAnalyzing) {
    return (
      <div className="max-w-2xl mx-auto mt-20 text-center animate-pulse">
        <div className="w-20 h-20 mx-auto bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-emerald-500 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Analyzing your session...</h2>
        <p className="text-gray-400">Transcribing your recording and preparing your coaching review. This can take a minute.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto min-h-[calc(100vh-120px)] flex flex-col pb-8">
      {analysisError && <p role="alert" className="mb-4 rounded-lg border border-amber-600 bg-gray-900 p-4 text-amber-300">{analysisError}</p>}
      <div className="flex flex-wrap gap-4 mb-4">
        <label className="text-gray-300 text-sm">Practice context
          <input value={context} maxLength={500} onChange={e => setContext(e.target.value)} className="block bg-gray-900 border border-gray-700 rounded p-2" />
        </label>
        <label className="text-gray-300 text-sm">Coaching style
          <select value={mode} onChange={e => setMode(e.target.value)} className="block bg-gray-900 border border-gray-700 rounded p-2">
            <option value="supportive">Supportive</option><option value="direct">Direct</option><option value="tough">Tough</option>
          </select>
        </label>
      </div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Live Practice Session</h1>
          {error && <p role="alert" className="text-amber-400 text-sm mt-1">
            {error}
          </p>}
          <p className="text-gray-400 text-sm mt-2">Record your speech, then finish to transcribe it with Gemini. Audio is uploaded only when you finish.</p>
        </div>
        <div className="text-4xl font-mono font-bold text-emerald-400 bg-gray-900 px-4 py-2 rounded-lg border border-gray-800 shadow-inner">
          {formatTime(duration)}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Recording Area */}
        <div className="lg:col-span-2 min-h-[420px] bg-gray-900 rounded-xl border border-gray-800 shadow-sm flex flex-col relative overflow-hidden">
          
          {/* Camera Feed Background */}
          <video 
            ref={videoRef} 
            autoPlay 
            muted 
            playsInline
            className="absolute inset-0 w-full h-full object-cover opacity-[0.15] pointer-events-none"
          />

          {(isListening || manualMode) && (
            <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              <span className="text-xs font-bold text-red-500 uppercase tracking-wider bg-black/50 px-2 py-1 rounded">
                {manualMode ? 'Session Active' : 'Recording'}
              </span>
            </div>
          )}

          <div className="flex-1 p-6 overflow-y-auto relative z-10">
            {!isListening && !manualMode && !transcript && !interimTranscript ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 relative z-20">
                <svg className="w-16 h-16 mb-4 opacity-50 drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
                <p className="text-lg text-white font-semibold shadow-black drop-shadow-md">Click Start to begin practicing</p>
                <p className="text-sm mt-2 max-w-sm text-center">Your camera appears in the background to help you practice eye contact and build confidence.</p>
                <button 
                  onClick={() => setManualMode(true)}
                  className="mt-6 text-sm text-emerald-400 hover:text-emerald-300 underline"
                >
                  Switch to text typing mode
                </button>
              </div>
            ) : manualMode ? (
              <textarea
                aria-label="Speech transcript"
                maxLength={20000}
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="Type your speech here..."
                className="w-full h-full bg-transparent text-xl leading-relaxed text-gray-200 font-medium outline-none resize-none placeholder-gray-500/50 relative z-20"
              />
            ) : (
              <div className="text-xl leading-relaxed text-gray-200 font-medium drop-shadow-md relative z-20">
                {isListening && <p className="text-emerald-300 mt-8">Microphone recording is active. Speak naturally; your transcript and word statistics will appear after you finish.</p>}
                {transcript}
                <span className="text-emerald-300 italic"> {interimTranscript}</span>
                <div ref={transcriptEndRef} />
              </div>
            )}
          </div>

          <div className="p-6 bg-gray-900/90 backdrop-blur-md border-t border-gray-800 flex flex-wrap gap-3 justify-center relative z-20">
            {!isListening && !manualMode && !sessionFinished ? (
              <button 
                disabled={isStarting}
                onClick={() => { setSessionFinished(false); setAnalysisError(''); startListening(); }}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 px-10 rounded-full transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-3 text-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path></svg>
                {isStarting ? 'Opening microphone…' : 'Start Session'}
              </button>
            ) : (
              <button 
                onClick={handleStop}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-4 px-10 rounded-full transition-all shadow-lg shadow-red-500/20 flex items-center gap-3 text-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"></path></svg>
                Finish & Analyze
              </button>
            )}
            {!isListening && !manualMode && sessionFinished && <button className="text-emerald-300 p-3" onClick={() => { setSessionFinished(false); setDuration(0); setAnalysisError(''); startListening(); }}>Record again</button>}
            {!isListening && <button disabled={isStarting} className="text-gray-300 p-3" onClick={() => {
              setManualText(transcript || manualText); setManualMode(!manualMode); setSessionFinished(false); setAnalysisError('');
            }}>{manualMode ? 'Use microphone' : 'Type instead'}</button>}
          </div>
        </div>

        {/* Sidebar / Cues */}
        <div className="flex flex-col gap-6">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Live Stats</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Words per minute</span>
                <span className={`font-bold ${stats.wpm > 170 || stats.wpm < 110 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {isListening ? 'After recording' : stats.wpm}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Filler words</span>
                <span className={`font-bold ${stats.fillers > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {stats.fillers}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Word count</span>
                <span className="font-bold text-white">{stats.words}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 shadow-sm flex-1 flex flex-col">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Live Coaching</h3>
            
            <div className="flex-1 flex flex-col gap-3">
              {cues.length > 0 ? (
                cues.map(cue => (
                  <CoachCue key={cue.id} message={cue.msg} type={cue.type} />
                ))
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 text-center text-sm p-4">
                  <svg className="w-10 h-10 mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>
                  <p>Speak naturally. Coaching and word statistics are available after transcription.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
