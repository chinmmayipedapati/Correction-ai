import { useState, useEffect } from 'react';
import { readSessions, deriveProfile, persistSession } from '../utils/sessionStorage';
export default function useSessionStore() {
  const [sessions, setSessions] = useState(() => {
    try { return readSessions(window.localStorage); } catch { return []; }
  });
  useEffect(() => {
    const sync = () => { try { setSessions(readSessions(window.localStorage)); } catch { setSessions([]); } };
    window.addEventListener('storage', sync);
    window.addEventListener('speakup-sessions', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('speakup-sessions', sync);
    };
  }, []);
  const profile = deriveProfile(sessions);
  const saveSession = data => {
    let storage;
    try { storage = window.localStorage; }
    catch { throw new Error('Browser storage is unavailable. Enable site storage and retry.'); }
    const result = persistSession(storage, data);
    setSessions(result.sessions);
    window.dispatchEvent(new Event('speakup-sessions'));
    return result.session.id;
  };
  return { sessions, profile, getSessions: () => sessions, getSession: id => sessions.find(s => s.id === id), saveSession, getProfile: () => profile };
}
