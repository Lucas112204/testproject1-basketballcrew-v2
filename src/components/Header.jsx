import { LogOut } from 'lucide-react';
import { supabase } from '../utils/supabase';

export default function Header({ title }) {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <header>
      <div className="logo">
        <span className="logo-icon">🏀</span>
        {title}
      </div>
      <button className="btn btn-outline btn-sm" onClick={handleLogout}>
        <LogOut size={16} /> Logout
      </button>
    </header>
  );
}
