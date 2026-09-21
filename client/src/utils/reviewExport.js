export function formatReview(session) {
  const { analysis = {} } = session;
  return ['SpeakUp — Practice Review', `Date: ${new Date(session.date).toLocaleString()}`,
    `Context: ${session.context || 'General Practice'}`, `Overall score: ${session.overallScore}/100`,
    `Speaking duration: ${session.duration ? `${session.duration} seconds` : 'Not supplied'}`,
    '\nWhat worked', ...(analysis.strengths || []).map(text => `• ${text}`),
    '\nOpportunities', ...(analysis.improvements || []).map(text => `• ${text}`),
    '\nDetailed metrics', ...Object.entries(analysis.metrics || {}).map(([name, data]) => `${name}: ${data.score}/100 — ${data.reason}`),
    '\nCoaching insights', ...Object.entries(analysis.details || {}).map(([name, text]) => `${name.replace(/([A-Z])/g, ' $1')}: ${text}`),
    '\nNext practice', analysis.nextExercise || '', analysis.coachNotes || '',
    '\nTranscript', session.transcript,
    '\nFeedback is based on the transcript. Voice tone and body language are not assessed.'
  ].join('\n');
}
export function downloadReview(session) {
  const url = URL.createObjectURL(new Blob([formatReview(session)], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `speakup-review-${session.id}.txt`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
