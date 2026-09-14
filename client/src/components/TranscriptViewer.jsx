export default function TranscriptViewer({ transcript }) {
  if (!transcript) {
    return <div className="text-gray-500 italic p-4 bg-gray-900 rounded-xl border border-gray-800">No transcript available for this session.</div>;
  }

  // MVP: just display text. Highlighting requires complex text parsing which we skip for the MVP to keep it clean.
  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 shadow-sm">
      <h3 className="text-lg font-bold text-white mb-4">Transcript</h3>
      <div className="prose prose-invert max-w-none text-gray-300 leading-relaxed whitespace-pre-wrap">
        {transcript}
      </div>
    </div>
  );
}
