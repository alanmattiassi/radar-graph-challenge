-- ==============================================================================
-- Schema Supabase per il Gioco dei Grafi ad Area (Radar Graph Challenge)
-- Esegui questo script nell'SQL Editor di Supabase per configurare il database.
-- ==============================================================================

-- 1. Tabella delle Stanze di Gioco (Rooms)
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) UNIQUE NOT NULL,
    num_dimensions INTEGER NOT NULL DEFAULT 5,
    dimensions JSONB NOT NULL DEFAULT '[]'::jsonb,
    current_question TEXT DEFAULT '',
    current_round INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'lobby', -- 'lobby', 'voting', 'scored', 'finished'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabella dei Partecipanti (Participants)
CREATE TABLE IF NOT EXISTS participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code VARCHAR(10) NOT NULL REFERENCES rooms(code) ON DELETE CASCADE,
    player_code VARCHAR(20) NOT NULL,
    nickname VARCHAR(50) NOT NULL,
    total_score NUMERIC(5, 1) NOT NULL DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_player_in_room UNIQUE (room_code, player_code)
);

-- 3. Tabella dei Round / Domande (Rounds)
CREATE TABLE IF NOT EXISTS rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code VARCHAR(10) NOT NULL REFERENCES rooms(code) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'voting', -- 'voting', 'scored', 'closed'
    correctness_scores JSONB NOT NULL DEFAULT '{}'::jsonb, -- es: {"0": 1, "1": 0.5, "2": 0}
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_round_per_room UNIQUE (room_code, round_number)
);

-- 4. Tabella dei Voti dei Partecipanti (Votes)
CREATE TABLE IF NOT EXISTS votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code VARCHAR(10) NOT NULL REFERENCES rooms(code) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    dimension_index INTEGER NOT NULL,
    score_awarded NUMERIC(3, 1) DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_vote_per_participant_round UNIQUE (room_code, round_number, participant_id)
);

-- Indici per performance ottimali
CREATE INDEX IF NOT EXISTS idx_participants_room ON participants(room_code);
CREATE INDEX IF NOT EXISTS idx_rounds_room ON rounds(room_code);
CREATE INDEX IF NOT EXISTS idx_votes_round ON votes(room_code, round_number);

-- Abilitazione Realtime per tutte le tabelle
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE participants;
ALTER PUBLICATION supabase_realtime ADD TABLE rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE votes;

-- Politiche di sicurezza RLS (permesse letture/scritture anonime per stanze di gioco pubbliche)
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Accesso pubblico rooms" ON rooms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Accesso pubblico participants" ON participants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Accesso pubblico rounds" ON rounds FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Accesso pubblico votes" ON votes FOR ALL USING (true) WITH CHECK (true);
