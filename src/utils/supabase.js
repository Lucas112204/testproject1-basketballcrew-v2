import { createClient } from '@supabase/supabase-js';

// TODO: Replace with your actual Supabase URL and Anon Key
// It is recommended to use environment variables in a production environment:
// const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
// const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const supabaseUrl = 'https://auoljgglzyssungrimop.supabase.co';
const supabaseKey = 'sb_publishable_mxOihVOwNImU1UMz9WQ1-Q_orEajnDk';

export const supabase = createClient(supabaseUrl, supabaseKey);
