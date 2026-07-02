import { useEffect, useState, useRef } from 'react';
import { supabase } from '../utils/supabase';
import Header from '../components/Header';
import { Camera, QrCode, Upload } from 'lucide-react';

export default function Profile({ session }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [message, setMessage] = useState('');
  
  const avatarInputRef = useRef(null);
  const qrInputRef = useRef(null);

  const user = session?.user;

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (data) {
        setProfile(data);
        setName(data.name || '');
        setAvatarUrl(data.avatar_url || '');
        setQrUrl(data.payment_qr_url || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const uploadImage = async (event, bucket) => {
    try {
      setSaving(true);
      setMessage('');
      if (!event.target.files || event.target.files.length === 0) return;
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (uploadError) {
         if(uploadError.message.includes('Bucket not found') || uploadError.message.includes('Object not found')) {
            throw new Error(`Error: You need to create a storage bucket named "${bucket}" and set it to PUBLIC in Supabase first.`);
         }
         throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath);

      // Immediately save to profile
      const updates = bucket === 'avatars' ? { avatar_url: publicUrl } : { payment_qr_url: publicUrl };
      const { error: updateError } = await supabase.from('profiles').update(updates).eq('id', user.id);
      
      if (updateError) throw updateError;
      
      if (bucket === 'avatars') setAvatarUrl(publicUrl);
      else setQrUrl(publicUrl);

      setMessage(`${bucket === 'avatars' ? 'Avatar' : 'QR Code'} uploaded successfully!`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  const updateProfileName = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const { error } = await supabase.from('profiles').update({ name }).eq('id', user.id);
      if (error) throw error;
      setMessage('Name updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center mt-8">Loading...</div>;

  return (
    <div className="animate-fade-in">
      <Header title="My Profile" />
      
      {message && (
        <div className={`badge ${message.includes('Error') ? 'badge-red' : 'badge-green'} mb-4 mt-4`} style={{display: 'block', textAlign: 'center', padding: '8px'}}>
          {message}
        </div>
      )}

      {/* Avatar Section */}
      <div className="glass card mt-4 text-center relative">
        <div 
          onClick={() => avatarInputRef.current.click()}
          style={{ width: '80px', height: '80px', borderRadius: '50%', background: avatarUrl ? `url(${avatarUrl}) center/cover` : 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 16px', fontWeight: 'bold', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
        >
          {!avatarUrl && name.charAt(0).toUpperCase()}
          <div style={{ position: 'absolute', bottom: 0, width: '100%', height: '30%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Camera size={14} color="white" />
          </div>
        </div>
        <input type="file" accept="image/*" ref={avatarInputRef} style={{ display: 'none' }} onChange={(e) => uploadImage(e, 'avatars')} disabled={saving} />
        
        <h2 style={{margin:0}}>{name}</h2>
        <p className="text-muted text-sm mb-4">@{profile?.username}</p>
        
        <form onSubmit={updateProfileName} className="flex gap-2 justify-center">
            <input type="text" className="input" style={{ width: 'auto' }} value={name} onChange={e => setName(e.target.value)} required />
            <button type="submit" className="btn btn-primary" disabled={saving}>Save</button>
        </form>
      </div>

      {/* QR Code Section */}
      <div className="glass card mt-4">
        <h3 className="mb-2 flex items-center gap-2"><QrCode size={18} /> Payment QR Code</h3>
        <p className="text-sm text-muted mb-4">Upload a screenshot of your bank/DuitNow QR code so others can pay you when you organize a game.</p>
        
        {qrUrl && (
          <div className="text-center mb-4">
            <img src={qrUrl} alt="Payment QR" style={{ width: '180px', borderRadius: '12px', border: '1px solid var(--border-color)' }} />
          </div>
        )}
        
        <input type="file" accept="image/*" ref={qrInputRef} style={{ display: 'none' }} onChange={(e) => uploadImage(e, 'qrcodes')} disabled={saving} />
        <button type="button" className="btn btn-outline btn-full" onClick={() => qrInputRef.current.click()} disabled={saving}>
           <Upload size={16}/> {qrUrl ? 'Change QR Code' : 'Upload QR Code'}
        </button>
      </div>
      
    </div>
  );
}
