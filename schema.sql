-- ============================================================================
-- 🏀 Court Crew v2.1 — Database Schema (Supabase PostgreSQL)
-- ============================================================================

-- ~~~~~~~~~~~~~~~ DROP OLD TABLES (If migrating) ~~~~~~~~~~~~~~~
DROP TABLE IF EXISTS registrations CASCADE;
DROP TABLE IF EXISTS games CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- ============================================================================
-- 1. Profiles (extends auth.users)
-- ============================================================================
CREATE TABLE profiles (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    username        TEXT UNIQUE,
    email           TEXT UNIQUE,
    phone           TEXT,
    avatar_url      TEXT,
    payment_qr_url  TEXT,
    role            TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name, email, username)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
    )
    ON CONFLICT (username) DO UPDATE 
    SET username = NEW.raw_user_meta_data->>'username' || '_' || substr(md5(random()::text), 1, 4);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 2. Games
-- ============================================================================
CREATE TABLE games (
    id               BIGSERIAL PRIMARY KEY,
    title            TEXT DEFAULT 'Weekly Pickup',
    location         TEXT,
    game_date        DATE NOT NULL,
    game_time        TIME DEFAULT '20:00',
    organizer_id     UUID NOT NULL REFERENCES profiles(id),
    payer_id         UUID NOT NULL REFERENCES profiles(id),
    total_court_fee  DECIMAL(10,2) DEFAULT 0 CHECK (total_court_fee >= 0),
    status           TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'completed', 'cancelled')),
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_games_date ON games(game_date);
CREATE INDEX idx_games_organizer ON games(organizer_id);

-- ============================================================================
-- 3. Registrations (Includes guests tied to users)
-- ============================================================================
CREATE TABLE registrations (
    id           BIGSERIAL PRIMARY KEY,
    game_id      BIGINT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL REFERENCES profiles(id),
    is_guest     BOOLEAN DEFAULT FALSE,
    guest_name   TEXT,
    status       TEXT DEFAULT 'in' CHECK (status IN ('in', 'out')),
    is_paid      BOOLEAN DEFAULT FALSE,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_registrations_game ON registrations(game_id);
CREATE INDEX idx_registrations_user ON registrations(user_id);

-- ============================================================================
-- RLS Policies (Row Level Security) - Simplified for easy startup
-- ============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);

ALTER TABLE games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Games are viewable by everyone." ON games FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create games." ON games FOR INSERT WITH CHECK (auth.uid() = organizer_id);
CREATE POLICY "Organizer can update own games." ON games FOR UPDATE USING (auth.uid() = organizer_id);
CREATE POLICY "Organizer can delete own games." ON games FOR DELETE USING (auth.uid() = organizer_id);

ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Registrations are viewable by everyone." ON registrations FOR SELECT USING (true);
CREATE POLICY "Users can register spots for themselves." ON registrations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own registrations." ON registrations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own registrations." ON registrations FOR DELETE USING (auth.uid() = user_id);
