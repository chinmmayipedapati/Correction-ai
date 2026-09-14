import useSessionStore from '../hooks/useSessionStore';
import { Link } from 'react-router-dom';
import SessionCard from '../components/SessionCard';

export default function Progress() {
  const { getSessions, getProfile } = useSessionStore();
  const sessions = getSessions();
  const profile = getProfile();

  if (sessions.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center animate-fade-in">
        <div className="w-24 h-24 mx-auto bg-gray-900 rounded-full flex items-center justify-center mb-6">
          <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
        </div>
        <h2 className="text-3xl font-bold text-white mb-4">No data yet</h2>
        <p className="text-gray-400 mb-8 max-w-md mx-auto">
          Complete your first practice session to see your progress and insights here.
        </p>
        <Link 
          to="/live" 
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-8 rounded-lg transition-colors inline-block"
        >
          Start Practice Session
        </Link>
      </div>
    );
  }

  // Calculate trends from last 5 sessions
  const recentSessions = sessions.slice(0, 5).reverse();
  const scores = recentSessions.map(s => s.overallScore);
  
  // Averages for last 5 sessions
  const avgOverall = Math.round(scores.reduce((a,b) => a+b, 0) / scores.length);
  
  // Calculate average of specific metrics if they exist
  const getMetricAvg = (metricName) => {
    let sum = 0;
    let count = 0;
    recentSessions.forEach(s => {
      if (Number.isFinite(s.analysis?.metrics?.[metricName]?.score)) {
        sum += s.analysis.metrics[metricName].score;
        count++;
      }
    });
    return count > 0 ? Math.round(sum / count) : 0;
  };

  const pacingAvg = getMetricAvg('structure');
  const clarityAvg = getMetricAvg('clarity');
  const fillersAvg = getMetricAvg('concision');
  const confidenceAvg = getMetricAvg('engagement');

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-10 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Your Progress</h1>
        <p className="text-gray-400">Tracking your communication journey</p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-900 p-5 rounded-xl border border-gray-800">
          <div className="text-gray-400 text-sm mb-1">Total Sessions</div>
          <div className="text-3xl font-bold text-white">{profile.totalSessions}</div>
        </div>
        <div className="bg-gray-900 p-5 rounded-xl border border-gray-800">
          <div className="text-gray-400 text-sm mb-1">Total Minutes</div>
          <div className="text-3xl font-bold text-white">{profile.totalMinutes}</div>
        </div>
        <div className="bg-gray-900 p-5 rounded-xl border border-gray-800">
          <div className="text-gray-400 text-sm mb-1">Current Streak</div>
          <div className="text-3xl font-bold text-amber-400">{profile.currentStreak} days</div>
        </div>
        <div className="bg-gray-900 p-5 rounded-xl border border-gray-800">
          <div className="text-gray-400 text-sm mb-1">Recent Avg Score</div>
          <div className="text-3xl font-bold text-emerald-400">{avgOverall}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Recent Performance Chart (Simple visualization) */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h3 className="text-lg font-bold text-white mb-6">Recent Overall Scores</h3>
          <div className="flex items-end h-48 gap-2 mt-4">
            {recentSessions.map((session, i) => (
              <div key={session.id || i} className="flex-1 flex flex-col items-center group relative">
                <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 px-2 py-1 rounded text-xs text-white">
                  {session.overallScore}
                </div>
                <div 
                  className={`w-full rounded-t-md ${session.overallScore >= 80 ? 'bg-emerald-500' : session.overallScore >= 60 ? 'bg-blue-500' : 'bg-amber-500'}`}
                  style={{ height: `${session.overallScore * 1.6}px` }}
                ></div>
                <div className="text-xs text-gray-500 mt-2 truncate w-full text-center">
                  {new Date(session.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Skill Breakdown */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h3 className="text-lg font-bold text-white mb-6">Recent Skill Averages</h3>
          
          <div className="space-y-5">
            {[
              { label: 'Structure', val: pacingAvg },
              { label: 'Clarity', val: clarityAvg },
              { label: 'Concision', val: fillersAvg },
              { label: 'Engagement', val: confidenceAvg }
            ].map(skill => (
              <div key={skill.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-300">{skill.label}</span>
                  <span className="text-white font-bold">{skill.val || 0}</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div 
                    className="bg-emerald-500 h-2 rounded-full" 
                    style={{ width: `${Math.max(0, Math.min(100, skill.val || 0))}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* History */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">All Sessions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.map(session => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      </div>
    </div>
  );
}
