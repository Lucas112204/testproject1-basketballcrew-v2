import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { ArrowLeft, UserPlus, LogOut, Check } from 'lucide-react';

export default function GameDetail({ session }) {
  const { id } = useParams();
  const [game, setGame] = useState(null);
  const [regs, setRegs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);       // ← 新增：错误状态
  const [guestName, setGuestName] = useState('');
  const [actionLoading, setActionLoading] = useState(false);  // ← 新增：操作加载中

  const user = session?.user;

  useEffect(() => {
    fetchGameDetails();
  }, [id]);

  const fetchGameDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select('*, organizer:profiles!games_organizer_id_fkey(name), payer:profiles!games_payer_id_fkey(name, payment_qr_url)')
        .eq('id', id)
        .single();

      // 比赛不存在或已被删除
      if (gameError || !gameData) {
        setError('This game has been deleted or does not exist.');
        setGame(null);
        return;
      }

      const { data: regData } = await supabase
        .from('registrations')
        .select('*, profiles(name)')
        .eq('game_id', id)
        .eq('status', 'in');

      setGame(gameData);
      setRegs(regData || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load game details. It may have been deleted.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSelf = async () => {
    setActionLoading(true);
    try {
      // 先检查是否已经报名了（防止重复点击）
      const { data: existing } = await supabase
        .from('registrations')
        .select('id')
        .eq('game_id', id)
        .eq('user_id', user.id)
        .eq('is_guest', false)
        .maybeSingle();

      if (existing) return;  // 已经报名了，不做任何事

      await supabase.from('registrations').insert({
        game_id: id,
        user_id: user.id,
        is_guest: false,
        status: 'in'
      });
      fetchGameDetails();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeaveSelf = async () => {
    setActionLoading(true);
    try {
      await supabase.from('registrations').delete()
        .eq('game_id', id)
        .eq('user_id', user.id)
        .eq('is_guest', false);
      fetchGameDetails();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const addGuest = async (e) => {
    e.preventDefault();
    if (!guestName.trim()) return;
    setActionLoading(true);
    try {
      await supabase.from('registrations').insert({
        game_id: id,
        user_id: user.id,
        is_guest: true,
        guest_name: guestName.trim(),
        status: 'in'
      });
      setGuestName('');
      fetchGameDetails();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const removeGuest = async (regId) => {
    try {
      await supabase.from('registrations').delete().eq('id', regId);
      fetchGameDetails();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="text-center mt-8">Loading...</div>;

  // 比赛被删除或不存在时，显示友好错误页
  if (error || !game) return (
    <div className="animate-fade-in" style={{ paddingTop: '20px' }}>
      <Link to="/" className="btn btn-outline btn-sm mb-4" style={{ display: 'inline-flex' }}>
        <ArrowLeft size={16} /> Back
      </Link>
      <div className="glass card text-center mt-8">
        <p className="text-muted mb-4">{error || 'Game not found.'}</p>
        <Link to="/" className="btn btn-primary">Go Back to Games</Link>
      </div>
    </div>
  );

  const myRegs = regs.filter(r => r.user_id === user.id);
  const iAmPlaying = myRegs.some(r => !r.is_guest);
  const myGuests = myRegs.filter(r => r.is_guest);
  const hasAnySpots = myRegs.length > 0;
  
  const totalPlayers = regs.length;
  const costPerPersonNum = game.total_court_fee > 0 && totalPlayers > 0
    ? game.total_court_fee / totalPlayers
    : 0;
  const costPerPerson = costPerPersonNum.toFixed(2);
  const myTotalCost = (costPerPersonNum * myRegs.length).toFixed(2);

  return (
    <div className="animate-fade-in" style={{ paddingTop: '20px' }}>
      <Link to="/" className="btn btn-outline btn-sm mb-4" style={{ display: 'inline-flex' }}>
        <ArrowLeft size={16} /> Back
      </Link>

      <div className="glass card mb-4">
        <h2 style={{color: 'var(--text-main)', marginBottom: '8px'}}>{game.title}</h2>
        <div className="text-muted text-sm flex flex-col gap-2">
          <div>📍 {game.location}</div>
          <div>📅 {game.game_date} @ {game.game_time?.slice(0,5) || '20:00'}</div>
          <div>💰 Total Fee: RM {game.total_court_fee}</div>
          <div>📌 Organizer: {game.organizer?.name} | Payer: {game.payer?.name}</div>
        </div>
      </div>

      {hasAnySpots && costPerPerson > 0 && (
        <div className="glass card mb-4 animate-fade-in" style={{ borderColor: 'var(--accent)' }}>
          <h3 className="mb-2 text-center text-accent">Payment Due</h3>
          
          <div className="text-center mb-4">
            <span style={{fontSize: '1rem', color: 'var(--text-muted)'}}>Cost Per Person</span><br/>
            <strong style={{fontSize: '2.5rem', color: 'var(--text-main)'}}>RM {costPerPerson}</strong>
          </div>
          
          <div className="text-sm text-center mb-4" style={{background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px'}}>
             You are paying for <strong>{myRegs.length} spots</strong><br/>
             ({iAmPlaying ? 'You' : 'Not playing'} + {myGuests.length} guests)<br/>
             <strong className="text-accent mt-2 block">Total: RM {myTotalCost}</strong>
          </div>

          {game.payer?.payment_qr_url ? (
            <div className="text-center mt-4">
              <p className="text-sm text-muted mb-2">Scan to pay <strong>{game.payer?.name}</strong></p>
              <img 
                src={game.payer.payment_qr_url} 
                alt="QR Code" 
                style={{ width: '180px', borderRadius: '12px', border: '1px solid var(--border-color)', margin: '0 auto' }}
              />
            </div>
          ) : (
            <p className="text-sm text-muted text-center">Payer hasn't uploaded a QR code yet.</p>
          )}
        </div>
      )}

      <div className="glass card mb-4">
        <div className="flex justify-between items-center mb-4">
          <h3 style={{margin:0}}>Players ({totalPlayers})</h3>
          {!iAmPlaying ? (
            <button className="btn btn-primary btn-sm" onClick={handleJoinSelf} disabled={actionLoading}>I'm Playing!</button>
          ) : (
            <button className="btn btn-outline btn-sm" onClick={handleLeaveSelf} disabled={actionLoading} style={{color: 'var(--text-muted)'}}><LogOut size={14}/> Opt out</button>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {regs.map(r => (
            <div key={r.id} className="flex justify-between items-center" style={{ padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
              <div className="flex items-center gap-2">
                <span style={{ fontSize: '1.2rem' }}>{r.is_guest ? '🧑' : '👤'}</span>
                <span>{r.is_guest ? `${r.guest_name}` : r.profiles?.name}</span>
              </div>
              <div className="flex gap-2 items-center">
                 {r.user_id === user.id && r.is_guest && (
                   <button className="badge badge-red" style={{border:'none', cursor:'pointer'}} onClick={() => removeGuest(r.id)}>Remove</button>
                 )}
                 {r.user_id === user.id && (
                   <span className="badge badge-blue">Your Spot</span>
                 )}
              </div>
            </div>
          ))}
          {regs.length === 0 && <p className="text-sm text-muted">No players joined yet.</p>}
        </div>

        <form onSubmit={addGuest} className="flex gap-2 mt-4 pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
          <input 
            type="text" 
            className="input" 
            placeholder="Add a Guest (e.g. John Doe)" 
            value={guestName} 
            onChange={e => setGuestName(e.target.value)} 
            required 
          />
          <button type="submit" className="btn btn-outline"><UserPlus size={18}/> Add</button>
        </form>
      </div>
    </div>
  );
}
