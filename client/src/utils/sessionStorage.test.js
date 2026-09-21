import { test } from 'node:test';
import assert from 'node:assert/strict';
import { persistSession, readSessions, deriveProfile } from './sessionStorage.js';
import { formatReview } from './reviewExport.js';
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

test('legacy malformed review fields remain readable and zero scores can be exported', () => {
  const session = { id: 'legacy', date: new Date().toISOString(), duration: 0, overallScore: 0, transcript: 'Sample transcript',
    context: { bad: true }, analysis: { strengths: ['Clear point', {}], improvements: 'invalid', metrics: { clarity: { score: 0, reason: 'Needs context' }, broken: null }, details: { bestMoment: {} } } };
  const [safe] = readSessions({ getItem: () => JSON.stringify([session]) });
  assert.deepEqual(safe.analysis.strengths, ['Clear point']);
  assert.deepEqual(safe.analysis.improvements, []);
  assert.deepEqual(Object.keys(safe.analysis.metrics), ['clarity']);
  assert.equal(safe.context, '');
  const exported = formatReview(safe);
  assert.match(exported, /Overall score: 0\/100/);
  assert.match(exported, /Speaking duration: Not supplied/);
  assert.match(exported, /Sample transcript/);
});
