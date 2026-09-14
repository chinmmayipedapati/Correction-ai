import { test } from 'node:test';
import assert from 'node:assert/strict';
import { persistSession, readSessions, deriveProfile } from './sessionStorage.js';
const memoryStorage = () => {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
};
test('sessions survive reload, repeated IDs replace, and short practice accumulates', () => {
  const storage = memoryStorage();
  const sample = { transcript: 'Hello', duration: 30, overallScore: 80, date: new Date(2026, 8, 14, 12).toISOString() };
  persistSession(storage, { ...sample, id: 'first' });
  persistSession(storage, { ...sample, id: 'second' });
  persistSession(storage, { ...sample, id: 'second', overallScore: 90 });
  const sessions = readSessions(storage);
  assert.equal(sessions.length, 2);
  assert.equal(sessions[0].overallScore, 90);
  assert.equal(deriveProfile(sessions).totalMinutes, 1);
  assert.equal(deriveProfile(sessions, new Date(2026, 8, 14)).currentStreak, 1);
  assert.equal(deriveProfile(sessions, new Date(2026, 8, 17)).currentStreak, 0);
});
test('malformed storage is safe and quota failures are visible', () => {
  for (const value of ['null', '{}', 'broken', '[null]']) assert.deepEqual(readSessions({ getItem: () => value }), []);
  assert.throws(() => persistSession({ getItem: () => null, setItem: () => { throw new Error('quota'); } }, { id: 'a' }), /could not save/);
});
