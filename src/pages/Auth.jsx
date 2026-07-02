import { useState } from 'react';
import { supabase } from '../utils/supabase';
import { LogIn, UserPlus } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    const email = `${username.toLowerCase().trim()}@courtcrew.internal`;

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            if (error.message.includes('Invalid login credentials')) {
                throw new Error('Invalid username or password.');
            }
            throw error;
        }
      } else {
        // Quick check if username exists
        const { data: existingUser } = await supabase.from('profiles').select('id').eq('username', username.toLowerCase().trim()).maybeSingle();
        if (existingUser) {
           throw new Error('Username already exists. Please choose another one.');
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name, username: username.toLowerCase().trim() } }
        });
        if (error) {
           if (error.message.includes('already registered')) {
              throw new Error('Username already exists.');
           }
           throw error;
        }

        // 如果 Supabase 开了邮箱验证，signUp 不会自动登录
        // data.session 为 null 表示需要去邮箱确认
        if (!data.session) {
          setError('Account created! Please check your email to confirm, then log in.');
          return;
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingTop: '60px' }}>
      <div className="text-center mb-8">
        <h1 className="text-primary mb-2" style={{ color: 'var(--primary)' }}>🏀 Court Crew</h1>
        <p className="text-muted">Organize your pickup games.</p>
      </div>

      <div className="glass card">
        <h2 className="mb-4">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
        {error && <div className="badge badge-red mb-4" style={{display: 'block', textAlign:'center', padding:'8px'}}>{error}</div>}
        
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" className="input" value={name} onChange={e => setName(e.target.value)} required />
            </div>
          )}
          <div className="form-group">
            <label>Username</label>
            <input type="text" className="input" value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Password (Min 6 chars)</label>
            <input type="password" className="input" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          </div>

          <button type="submit" className="btn btn-primary btn-full mt-4" disabled={loading}>
            {loading ? 'Processing...' : isLogin ? <><LogIn size={18}/> Login</> : <><UserPlus size={18}/> Sign Up</>}
          </button>
        </form>

        <div className="text-center mt-4">
          <button type="button" className="btn btn-outline btn-sm w-full" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
          </button>
        </div>
      </div>
    </div>
  );
}
