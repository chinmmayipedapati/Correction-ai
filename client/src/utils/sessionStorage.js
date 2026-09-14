export const SESSIONS_KEY = 'speakup_sessions';
export function readSessions(storage) {
  try {
    const parsed = JSON.parse(storage.getItem(SESSIONS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter(s => s && typeof s.id === 'string' &&
      typeof s.transcript === 'string' && Number.isFinite(s.duration) && s.duration >= 0 &&
      Number.isFinite(s.overallScore) && !Number.isNaN(Date.parse(s.date))) : [];
  } catch { return []; }
}
export function deriveProfile(sessions, now = new Date()) {
  const days = new Set(sessions.map(s => new Date(s.date).toDateString()));
  const cursor = new Date(now);
  if (!days.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);
  let currentStreak = 0;
  while (days.has(cursor.toDateString())) {
    currentStreak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return {
    totalSessions: sessions.length,
    totalMinutes: Math.round(sessions.reduce((sum, s) => sum + s.duration, 0) / 6) / 10,
    currentStreak,
    lastSessionDate: sessions[0]?.date || null,
    strengths: [...new Set(sessions.flatMap(s => Array.isArray(s.analysis?.strengths) ? s.analysis.strengths : []))].slice(0, 5),
    weaknesses: [...new Set(sessions.flatMap(s => Array.isArray(s.analysis?.improvements) ? s.analysis.improvements : []))].slice(0, 5),
    recentFocus: []
  };
}
export function persistSession(storage, sessionData) {
  const session = { ...sessionData, id: sessionData.id || crypto.randomUUID(), date: sessionData.date || new Date().toISOString() };
  const sessions = [session, ...readSessions(storage).filter(s => s.id !== session.id)];
  try { storage.setItem(SESSIONS_KEY, JSON.stringify(sessions)); }
  catch { throw new Error('Your browser could not save this session. Free some browser storage or enable site storage, then retry.'); }
  return { session, sessions };
}
