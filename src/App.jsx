import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, Calendar, User } from 'lucide-react';
import { supabase } from './utils/supabase';

// Pages
import HomePage from './pages/Home';
import GameDetail from './pages/GameDetail';
import Profile from './pages/Profile';
import Auth from './pages/Auth';

function BottomNav() {
  const location = useLocation();
  const path = location.pathname;

  return (
    <nav className="bottom-nav">
      <Link to="/" className={`nav-item ${path === '/' ? 'active' : ''}`}>
        <Home size={24} />
        <span>Games</span>
      </Link>
      <Link to="/profile" className={`nav-item ${path === '/profile' ? 'active' : ''}`}>
        <User size={24} />
        <span>Profile</span>
      </Link>
    </nav>
  );
}

function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <HashRouter>
      <div className="app-container">
        {!session ? (
          <Auth />
        ) : (
          <>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/game/:id" element={<GameDetail session={session} />} />
              <Route path="/profile" element={<Profile session={session} />} />
            </Routes>
            <BottomNav />
          </>
        )}
      </div>
    </HashRouter>
  );
}

export default App;
