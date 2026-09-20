const metricNames = ['clarity', 'storytelling', 'engagement', 'concision', 'wit', 'delivery', 'structure', 'adaptability'];
const detailNames = ['storyOpportunity', 'witOpportunity', 'bestMoment', 'weakestMoment', 'betterOpening', 'betterClosing', 'memorableLine'];
const scoreSchema = { type: 'NUMBER', minimum: 0, maximum: 100 };
const stringsSchema = { type: 'ARRAY', items: { type: 'STRING' } };
const responseSchema = {
  type: 'OBJECT',
  properties: {
    overallScore: scoreSchema,
    metrics: { type: 'OBJECT', properties: Object.fromEntries(metricNames.map(name => [name, {
      type: 'OBJECT', properties: { score: scoreSchema, reason: { type: 'STRING' } }, required: ['score', 'reason']
    }])), required: metricNames },
    strengths: stringsSchema, improvements: stringsSchema,
    details: { type: 'OBJECT', properties: Object.fromEntries(detailNames.map(name => [name, { type: 'STRING' }])), required: detailNames },
    nextExercise: { type: 'STRING' }, coachNotes: { type: 'STRING' }
  },
  required: ['overallScore', 'metrics', 'strengths', 'improvements', 'details', 'nextExercise', 'coachNotes']
};
function validAnalysis(value) {
  const score = n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 100;
  return value && score(value.overallScore) && metricNames.every(name =>
    score(value.metrics?.[name]?.score) && typeof value.metrics[name].reason === 'string') &&
    ['strengths', 'improvements'].every(name => Array.isArray(value[name]) && value[name].every(s => typeof s === 'string')) &&
    detailNames.every(name => typeof value.details?.[name] === 'string') &&
    typeof value.nextExercise === 'string' && typeof value.coachNotes === 'string';
}

module.exports = { responseSchema, validAnalysis };

