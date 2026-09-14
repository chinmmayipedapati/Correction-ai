import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const location = useLocation();
  
  const navLinks = [
    { name: 'Dashboard', path: '/' },
    { name: 'Live Coach', path: '/live' },
    { name: 'Progress', path: '/progress' },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-md border-b border-gray-800">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold text-white hover:text-emerald-400 transition-colors">
          <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
          SpeakUp
        </Link>
        
        <div className="flex gap-1 md:gap-4">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.name}
                to={link.path}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-gray-800 text-emerald-400' 
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
