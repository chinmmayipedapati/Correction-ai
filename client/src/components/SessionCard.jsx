import { Link } from 'react-router-dom';

export default function SessionCard({ session }) {
  const { id, date, overallScore, duration } = session;
  
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  
  return (
    <Link to={`/review/${id}`} className="block group">
      <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 hover:border-emerald-500/50 hover:bg-gray-800/80 transition-all shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <span className="text-gray-400 text-sm">{formattedDate}</span>
          <span className="text-xs font-mono bg-gray-800 px-2 py-1 rounded text-gray-300">
            {duration ? `${minutes}:${seconds.toString().padStart(2, '0')}` : 'Text only'}
          </span>
        </div>
        
        <p className="truncate text-emerald-300 text-sm" title={session.context}>{session.context || 'General Practice'}</p>
        <div className="flex items-end gap-3 mt-2">
          <div className="text-3xl font-bold text-white group-hover:text-emerald-400 transition-colors">
            {overallScore}
          </div>
          <div className="text-sm text-gray-500 mb-1">Overall Score</div>
        </div>
      </div>
    </Link>
  );
}
