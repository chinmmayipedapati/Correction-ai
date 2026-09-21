import { createBrowserRouter, RouterProvider, Outlet, Link } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import LiveCoach from './pages/LiveCoach';
import SessionReview from './pages/SessionReview';
import Progress from './pages/Progress';

function Layout() {
  return (
      <div className="min-h-screen bg-gray-950 text-white font-sans selection:bg-emerald-500/30">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Outlet />
        </main>
      </div>
  );
}

const router = createBrowserRouter([{ element: <Layout />, children: [
  { path: '/', element: <Dashboard /> },
  { path: '/live', element: <LiveCoach /> },
  { path: '/review/:id', element: <SessionReview /> },
  { path: '/progress', element: <Progress /> },
  { path: '*', element: <div className="text-center py-20"><h1 className="text-2xl mb-4">Page not found</h1><Link className="text-emerald-400 underline" to="/">Go to Dashboard</Link></div> }
] }]);
export default function App() { return <RouterProvider router={router} />; }
