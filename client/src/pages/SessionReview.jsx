import { useParams, Link, useNavigate } from 'react-router-dom';
import useSessionStore from '../hooks/useSessionStore';
import ScoreCard from '../components/ScoreCard';
import TranscriptViewer from '../components/TranscriptViewer';
import { downloadReview } from '../utils/reviewExport';

export default function SessionReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getSession } = useSessionStore();
  
  const session = getSession(id);
  
  if (!session) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-white mb-4">Session not found</h2>
        <Link to="/" className="text-emerald-500 hover:underline">Return to Dashboard</Link>
      </div>
    );
  }

  const { analysis, transcript, duration, date } = session;
  const metrics = analysis?.metrics || {};
  const details = analysis?.details || {};

  const getScoreColor = (score) => {
    if (score >= 85) return 'emerald';
    if (score >= 70) return 'blue';
    if (score >= 50) return 'amber';
    return 'red';
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Session Review</h1>
          <p className="text-gray-400">
            {new Date(date).toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} 
            <span className="mx-2">•</span> 
            {duration ? `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')} min` : 'Duration not supplied'}
          </p>
          <p className="mt-2 text-emerald-400">{session.context || 'General Practice'}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => downloadReview(session)} className="px-4 py-2 rounded-lg border border-gray-700 text-emerald-300 hover:bg-gray-800">Download review</button>
          <Link to="/" className="px-4 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors">
            Dashboard
          </Link>
          <button 
            onClick={() => navigate('/live')}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors"
          >
            Practice Again
          </button>
        </div>
      </div>

      {/* Main Score Area */}
      <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 shadow-sm flex flex-col md:flex-row items-center gap-10">
        <div className="flex-shrink-0 relative">
          <svg className="w-48 h-48 transform -rotate-90">
            <circle cx="96" cy="96" r="88" className="text-gray-800" strokeWidth="12" stroke="currentColor" fill="none" />
            <circle 
              cx="96" cy="96" r="88" 
              className={{ emerald: 'text-emerald-500', blue: 'text-blue-500', amber: 'text-amber-500', red: 'text-red-500' }[getScoreColor(session.overallScore)]}
              strokeWidth="12" 
              strokeDasharray="553" 
              strokeDashoffset={553 - (553 * session.overallScore) / 100}
              strokeLinecap="round" 
              stroke="currentColor" 
              fill="none" 
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-bold text-white">{session.overallScore}</span>
            <span className="text-gray-400 text-sm">Overall</span>
          </div>
        </div>
        
        <div className="flex-1 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                What Worked
              </h3>
              <ul className="space-y-2">
                {analysis?.strengths?.length ? analysis.strengths.map((strength, i) => (
                  <li key={i} className="text-gray-300 flex items-start gap-2">
                    <span className="text-emerald-500 mt-1">•</span> {strength}
                  </li>
                )) : <li className="text-gray-500 italic">No specific strengths recorded.</li>}
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                Opportunities
              </h3>
              <ul className="space-y-2">
                {analysis?.improvements?.length ? analysis.improvements.map((imp, i) => (
                  <li key={i} className="text-gray-300 flex items-start gap-2">
                    <span className="text-amber-500 mt-1">•</span> {imp}
                  </li>
                )) : <li className="text-gray-500 italic">No specific improvements recorded.</li>}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Metric Breakdown Grid */}
      <div>
        <h2 className="text-xl font-bold text-white mb-6">Detailed Metrics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(metrics).map(([key, data]) => (
            <div key={key} className="group relative">
              <ScoreCard 
                label={key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')} 
                score={data.score} 
                color={getScoreColor(data.score)}
              />
              <p className="mt-3 px-1 text-sm leading-relaxed text-gray-300">{data.reason}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Coaching Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 shadow-sm">
          <h3 className="text-lg font-bold text-white mb-4">Structure & Delivery</h3>
          
          <div className="space-y-4">
            {details.betterOpening && (
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Better Opening Idea</h4>
                <p className="text-emerald-300 text-sm">{details.betterOpening}</p>
              </div>
            )}
            
            {details.betterClosing && (
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Better Closing Idea</h4>
                <p className="text-emerald-300 text-sm">{details.betterClosing}</p>
              </div>
            )}
            
            {details.memorableLine && (
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Your Most Memorable Line</h4>
                <p className="text-white text-sm font-medium border-l-2 border-emerald-500 pl-3 py-1 italic">"{details.memorableLine}"</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 shadow-sm">
          <h3 className="text-lg font-bold text-white mb-4">Engagement Opportunities</h3>
          
          <div className="space-y-4">
            {details.storyOpportunity && (
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Story Opportunity</h4>
                <p className="text-gray-300 text-sm">{details.storyOpportunity}</p>
              </div>
            )}
            
            {details.witOpportunity && (
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Wit/Humor Opportunity</h4>
                <p className="text-gray-300 text-sm">{details.witOpportunity}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-800">
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Strongest Moment</h4>
                <p className="text-emerald-400 text-sm">{details.bestMoment || "N/A"}</p>
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Weakest Moment</h4>
                <p className="text-amber-400 text-sm">{details.weakestMoment || "N/A"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transcript */}
      {(analysis?.nextExercise || analysis?.coachNotes) && <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 space-y-3">
        <h2 className="text-xl font-bold text-white">Next Practice</h2>
        <p className="text-emerald-300">{analysis.nextExercise}</p>
        <p className="text-gray-300">{analysis.coachNotes}</p>
        <p className="text-sm text-gray-500">Feedback is based on your transcript. Voice tone and body language are not assessed.</p>
      </div>}
      <TranscriptViewer transcript={transcript} highlights={analysis?.highlights} />
      
    </div>
  );
}
