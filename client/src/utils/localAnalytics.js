export function countWords(transcript) {
  if (!transcript || transcript.trim().length === 0) return 0;
  return transcript.trim().split(/\s+/).length;
}

export function calculateWPM(transcript, durationSeconds) {
  if (!durationSeconds || durationSeconds <= 0) return 0;
  const words = countWords(transcript);
  const minutes = durationSeconds / 60;
  return Math.round(words / minutes);
}

export function countFillerWords(transcript) {
  if (!transcript) return { fillers: [], totalFillers: 0 };
  
  const fillerList = [
    'um', 'uh', 'like', 'you know', 'basically', 'actually', 
    'so', 'right', 'i mean', 'kind of', 'sort of', 'literally', 
    'honestly', 'anyway'
  ];
  
  const text = transcript.toLowerCase();
  let totalFillers = 0;
  const fillers = [];
  
  fillerList.forEach(word => {
    // Basic regex for word boundary, handle multi-word phrases too
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    const matches = text.match(regex);
    if (matches && matches.length > 0) {
      totalFillers += matches.length;
      fillers.push({ word, count: matches.length });
    }
  });
  
  return { fillers: fillers.sort((a, b) => b.count - a.count), totalFillers };
}

export function detectRepetitions(transcript) {
  if (!transcript) return [];
  
  const words = transcript.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
  const phrases = {};
  const repetitions = [];
  
  // Look for 3-word phrases
  for (let i = 0; i < words.length - 2; i++) {
    const phrase = `${words[i]} ${words[i+1]} ${words[i+2]}`;
    if (phrase.length < 10) continue; // Skip very short phrases
    
    phrases[phrase] = (phrases[phrase] || 0) + 1;
  }
  
  for (const [phrase, count] of Object.entries(phrases)) {
    if (count >= 3) {
      repetitions.push({ phrase, count });
    }
  }
  
  return repetitions.sort((a, b) => b.count - a.count);
}

export function calculateSpeakingStats(transcript, durationSeconds) {
  const words = countWords(transcript);
  const wpm = calculateWPM(transcript, durationSeconds);
  const fillerStats = countFillerWords(transcript);
  
  return {
    words,
    wpm,
    fillerStats,
    repetitions: detectRepetitions(transcript),
    duration: durationSeconds
  };
}
