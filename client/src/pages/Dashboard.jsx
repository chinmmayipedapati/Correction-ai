import { Link } from 'react-router-dom';
import useSessionStore from '../hooks/useSessionStore';
import SessionCard from '../components/SessionCard';

export default function Dashboard() {
  const { getSessions, getProfile } = useSessionStore();
  const sessions = getSessions();
  const profile = getProfile();

  const averageScore = sessions.length > 0 
    ? Math.round(sessions.reduce((acc, s) => acc + (s.overallScore || 0), 0) / sessions.length)
    : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* Header section */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome back!</h1>
          <p className="text-gray-400">
            {profile.currentStreak > 0 
              ? `You're on a ${profile.currentStreak}-day practice streak. Keep it up!` 
              : "Ready to improve your communication today?"}
          </p>
        </div>
        <Link 
          to="/live" 
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-emerald-500/20"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
          Start Practice
        </Link>
      </section>

      {/* Stats Summary */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 shadow-sm">
          <div className="text-gray-400 text-sm mb-1">Total Sessions</div>
          <div className="text-3xl font-bold text-white">{profile.totalSessions}</div>
        </div>
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 shadow-sm">
          <div className="text-gray-400 text-sm mb-1">Practice Time (min)</div>
          <div className="text-3xl font-bold text-white">{profile.totalMinutes}</div>
        </div>
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 shadow-sm">
          <div className="text-gray-400 text-sm mb-1">Average Score</div>
          <div className="text-3xl font-bold text-emerald-400">{sessions.length ? averageScore : '-'}</div>
        </div>
      </section>

      {/* Recent Sessions */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Recent Sessions</h2>
          {sessions.length > 0 && (
            <Link to="/progress" className="text-emerald-500 hover:text-emerald-400 text-sm font-medium">
              View all history &rarr;
            </Link>
          )}
        </div>
        
        {sessions.length === 0 ? (
          <div className="bg-gray-900/50 rounded-xl p-10 border border-gray-800 border-dashed text-center">
            <div className="w-16 h-16 mx-auto bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No sessions yet</h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Start your first practice session to get personalized AI coaching on your speech, pacing, and clarity.
            </p>
            <Link to="/live" className="text-emerald-500 hover:text-emerald-400 font-medium">
              Start your first session &rarr;
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.slice(0, 6).map(session => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
