import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import LiveCoach from './pages/LiveCoach';
import SessionReview from './pages/SessionReview';
import Progress from './pages/Progress';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-950 text-white font-sans selection:bg-emerald-500/30">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/live" element={<LiveCoach />} />
            <Route path="/review/:id" element={<SessionReview />} />
            <Route path="/progress" element={<Progress />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
