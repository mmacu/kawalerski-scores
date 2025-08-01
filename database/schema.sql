-- Mini-Olympics Scoring System Database Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table for authentication and admin roles
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'player' CHECK (role IN ('admin', 'mini_admin', 'player')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Game types (soccer, volleyball, CS, LoL, FIFA, chess, etc.)
CREATE TABLE games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('team', 'individual', 'tournament')),
    min_players INTEGER NOT NULL DEFAULT 2,
    max_players INTEGER,
    time_factor DECIMAL(3,2) DEFAULT 1.0, -- multiplier for longer matches
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Players table based on the recommended data model
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    matches_played INTEGER NOT NULL DEFAULT 0,
    tickets_total INTEGER NOT NULL DEFAULT 0,
    efficiency DECIMAL(5,2) DEFAULT 0.0, -- calculated field
    jokers INTEGER NOT NULL DEFAULT 1,
    games_played_since_joker INTEGER NOT NULL DEFAULT 0,
    momentum_flag BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Matches table to store match metadata
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id),
    admin_id UUID REFERENCES users(id), -- who created/managed this match
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    pot INTEGER NOT NULL,
    time_factor DECIMAL(3,2) DEFAULT 1.0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Match participants (many-to-many between matches and players)
CREATE TABLE match_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id),
    is_winner BOOLEAN NOT NULL DEFAULT FALSE,
    is_mvp BOOLEAN NOT NULL DEFAULT FALSE,
    joker_played BOOLEAN NOT NULL DEFAULT FALSE,
    momentum_triggered BOOLEAN NOT NULL DEFAULT FALSE,
    base_tickets INTEGER NOT NULL DEFAULT 0,
    bonus_tickets INTEGER NOT NULL DEFAULT 0,
    total_tickets INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(match_id, player_id)
);

-- Indexes for performance
CREATE INDEX idx_players_efficiency ON players(efficiency DESC);
CREATE INDEX idx_players_tickets_total ON players(tickets_total DESC);
CREATE INDEX idx_matches_timestamp ON matches(timestamp DESC);
CREATE INDEX idx_match_participants_player ON match_participants(player_id);
CREATE INDEX idx_match_participants_match ON match_participants(match_id);

-- Function to update player stats after match
CREATE OR REPLACE FUNCTION update_player_stats()
RETURNS TRIGGER AS $
DECLARE
    player_record players%ROWTYPE;
BEGIN
    -- Get the current player record, which is needed for joker logic
    SELECT * INTO player_record FROM players WHERE user_id = NEW.user_id;

    -- Update matches_played, tickets_total, and efficiency
    UPDATE players
    SET
        matches_played = (SELECT COUNT(*) FROM match_participants WHERE user_id = NEW.user_id),
        tickets_total = (SELECT COALESCE(SUM(total_tickets), 0) FROM match_participants WHERE user_id = NEW.user_id),
        efficiency = CASE
            WHEN (SELECT COUNT(*) FROM match_participants WHERE user_id = NEW.user_id) > 0
            THEN (SELECT COALESCE(SUM(total_tickets), 0) * 100.0 / (40 * COUNT(*)) FROM match_participants WHERE user_id = NEW.user_id)
            ELSE 0.0
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = NEW.user_id;

    -- Handle joker logic (usage and earning)
    -- This part only runs when a match is completed, which we infer from total_tickets being set
    IF NEW.total_tickets IS NOT NULL AND NEW.total_tickets != 0 THEN
        -- Decrement joker if used
        IF NEW.joker_played THEN
            player_record.jokers := player_record.jokers - 1;
        END IF;

        -- Increment games played count and check for new joker
        player_record.games_played_since_joker := player_record.games_played_since_joker + 1;
        IF player_record.games_played_since_joker >= 4 THEN
            IF player_record.jokers < 2 THEN
                player_record.jokers := player_record.jokers + 1;
            END IF;
            player_record.games_played_since_joker := 0;
        END IF;

        UPDATE players
        SET
            jokers = player_record.jokers,
            games_played_since_joker = player_record.games_played_since_joker
        WHERE user_id = NEW.user_id;
    END IF;

    -- Clear momentum flag if it was triggered
    IF NEW.momentum_triggered THEN
        UPDATE players
        SET momentum_flag = FALSE
        WHERE user_id = NEW.user_id;
    END IF;

    RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Trigger to automatically update player stats
CREATE TRIGGER trigger_update_player_stats
    AFTER INSERT OR UPDATE ON match_participants
    FOR EACH ROW
    EXECUTE FUNCTION update_player_stats();

-- Function to set momentum flags for players outside top 3
CREATE OR REPLACE FUNCTION update_momentum_flags()
RETURNS VOID AS $$
BEGIN
    -- Clear all momentum flags first
    UPDATE players SET momentum_flag = FALSE;
    
    -- Set momentum flag for players ranked 4th or lower
    UPDATE players 
    SET momentum_flag = TRUE 
    WHERE id IN (
        SELECT id 
        FROM players 
        ORDER BY efficiency DESC, tickets_total DESC 
        OFFSET 3
    );
END;
$$ LANGUAGE plpgsql;

-- Insert default game types
INSERT INTO games (name, type, min_players, max_players, time_factor) VALUES
('Soccer', 'team', 6, 12, 1.0),
('Volleyball', 'team', 6, 12, 1.0),
('Counter-Strike', 'team', 8, 10, 1.5),
('League of Legends', 'team', 8, 10, 1.5),
('FIFA', 'individual', 2, 2, 1.0),
('Chess', 'individual', 2, 2, 1.0),
('Target Shooting', 'individual', 2, 2, 1.0),
('Chess Tournament', 'tournament', 4, 12, 1.0);

-- Insert default admin user (password should be hashed in real implementation)
INSERT INTO users (username, password_hash, role) VALUES
('admin', '$2b$10$placeholder_hash', 'admin');