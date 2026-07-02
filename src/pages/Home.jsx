import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { Plus, MapPin, Calendar, Users, Trash2, X } from 'lucide-react';
import Header from '../components/Header';

export default function Home() {
  const [games, setGames] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  
  const [showModal, setShowModal] = useState(false);
  const [newGame, setNewGame] = useState({
    title: 'Weekly Pickup',
    location: '',
    game_date: '',
    game_time: '20:00',
    total_court_fee: '',
    payer_id: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
         setNewGame(prev => ({...prev, payer_id: user.id}));
      }

      const { data: gData, error: gError } = await supabase
        .from('games')
        .select(`*, registrations ( id )`)
        .order('game_date', { ascending: true });
      if (gError) throw gError;
      setGames(gData || []);

      const { data: pData } = await supabase.from('profiles').select('id, name');
      setProfiles(pData || []);
    } catch (error) {
      console.error('Error fetching data:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGame = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const { data, error } = await supabase.from('games').insert({
        title: newGame.title,
        location: newGame.location,
        game_date: newGame.game_date,
        game_time: newGame.game_time,
        total_court_fee: parseFloat(newGame.total_court_fee) || 0,
        organizer_id: user.id,
        payer_id: newGame.payer_id || user.id
      }).select().single();

      if (error) throw error;

      // Auto join creator
      await supabase.from('registrations').insert({
        game_id: data.id,
        user_id: user.id,
        status: 'in'
      });

      // 重置表单（问题 6）
      setNewGame({
        title: 'Weekly Pickup',
        location: '',
        game_date: '',
        game_time: '20:00',
        total_court_fee: '',
        payer_id: user.id
      });
      setShowModal(false);
      fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (e, gameId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Are you sure you want to cancel and delete this game?')) return;

    try {
      const { error } = await supabase.from('games').delete().eq('id', gameId);
      if (error) throw error;
      fetchData();
    } catch (err) {
      alert('Failed to delete game: ' + err.message);
    }
  };

  return (
    <div className="animate-fade-in">
      <Header title="Games" />
      
      <div className="flex justify-between items-center mb-4 mt-4">
        <h2 style={{margin:0}}>Upcoming Games</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
          <Plus size={16}/> New Game
        </button>
      </div>

      {showModal && (
         <div className="glass card mb-4 animate-fade-in" style={{ borderColor: 'var(--primary)' }}>
            <div className="flex justify-between items-center mb-4">
               <h3>Create New Game</h3>
               <button onClick={() => setShowModal(false)} style={{background:'none', border:'none', color:'white', cursor:'pointer'}}><X size={20}/></button>
            </div>
            <form onSubmit={handleCreateGame}>
               <div className="form-group">
                  <label>Title</label>
                  <input type="text" className="input" value={newGame.title} onChange={e => setNewGame({...newGame, title: e.target.value})} required />
               </div>
               <div className="form-group">
                  <label>Location</label>
                  <input type="text" className="input" placeholder="e.g. Sportizza Setapak" value={newGame.location} onChange={e => setNewGame({...newGame, location: e.target.value})} required />
               </div>
               <div className="flex gap-2">
                  <div className="form-group" style={{flex: 1}}>
                     <label>Date</label>
                     <input type="date" className="input" value={newGame.game_date} onChange={e => setNewGame({...newGame, game_date: e.target.value})} required />
                  </div>
                  <div className="form-group" style={{flex: 1}}>
                     <label>Time</label>
                     <input type="time" className="input" value={newGame.game_time} onChange={e => setNewGame({...newGame, game_time: e.target.value})} required />
                  </div>
               </div>
               <div className="form-group">
                  <label>Total Court Fee (RM)</label>
                  <input type="number" step="0.01" className="input" value={newGame.total_court_fee} onChange={e => setNewGame({...newGame, total_court_fee: e.target.value})} required />
               </div>
               <div className="form-group">
                  <label>Who receives the payment? (Payer)</label>
                  <select className="input" value={newGame.payer_id} onChange={e => setNewGame({...newGame, payer_id: e.target.value})}>
                     {profiles.map(p => (
                        <option key={p.id} value={p.id}>{p.name} {p.id === user?.id ? '(Me)' : ''}</option>
                     ))}
                  </select>
               </div>
               <button type="submit" className="btn btn-primary btn-full mt-2" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Game'}
               </button>
            </form>
         </div>
      )}

      {loading ? (
        <p className="text-muted text-center mt-8">Loading games...</p>
      ) : games.length === 0 ? (
        <div className="glass card text-center mt-8">
          <p className="text-muted mb-4">No games scheduled yet.</p>
          <button className="btn btn-outline" onClick={() => setShowModal(true)}>Create a Game</button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {games.map(game => (
            <Link to={`/game/${game.id}`} key={game.id} style={{ textDecoration: 'none' }}>
              <div className="glass card">
                <div className="flex justify-between items-center mb-2">
                  <h3 style={{color: 'var(--text-main)'}}>{game.title}</h3>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${game.status === 'upcoming' ? 'badge-blue' : 'badge-green'}`}>
                      {game.status}
                    </span>
                    {game.organizer_id === user?.id && (
                       <button onClick={(e) => handleDelete(e, game.id)} className="btn btn-sm btn-outline" style={{padding: '4px', borderColor: 'var(--red)', color: 'var(--red)'}}>
                          <Trash2 size={14} />
                       </button>
                    )}
                  </div>
                </div>
                
                <div className="text-sm text-muted flex flex-col gap-2">
                  <div className="flex items-center gap-2"><MapPin size={14}/> {game.location || 'TBD'}</div>
                  <div className="flex items-center gap-2"><Calendar size={14}/> {game.game_date} at {game.game_time.slice(0,5)}</div>
                  <div className="flex items-center gap-2"><Users size={14}/> {game.registrations?.length || 0} players registered</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
