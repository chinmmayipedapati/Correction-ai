export default function ScoreCard({ label, score, color = 'emerald' }) {
  // Map color names to tailwind classes (since dynamic string interpolation for colors can break in PurgeCSS/Tailwind V4)
  const colorMaps = {
    emerald: 'bg-emerald-500',
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500'
  };
  
  const textMaps = {
    emerald: 'text-emerald-400',
    blue: 'text-blue-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
    purple: 'text-purple-400'
  };

  const barColor = colorMaps[color] || 'bg-emerald-500';
  const textColor = textMaps[color] || 'text-emerald-400';

  return (
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 shadow-sm flex flex-col justify-between">
      <div className="flex justify-between items-end mb-4">
        <h3 className="text-gray-400 text-sm font-medium">{label}</h3>
        <span className={`text-2xl font-bold ${textColor}`}>{score}</span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden">
        <div 
          className={`h-2.5 rounded-full ${barColor}`} 
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
        ></div>
      </div>
    </div>
  );
}
