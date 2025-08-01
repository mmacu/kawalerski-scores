-- Consolidate users and players - every user is a player
-- This eliminates the confusing dual system and makes chad (and all users) immediately available for matches

-- Add game-related fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS matches_played INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tickets_total INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS efficiency DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS joker_used BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS momentum_flag BOOLEAN DEFAULT FALSE;

-- Migrate existing player data to users where user_id exists
UPDATE users SET 
    matches_played = p.matches_played,
    tickets_total = p.tickets_total,
    efficiency = p.efficiency::DECIMAL(10,2),
    joker_used = p.joker_used,
    momentum_flag = p.momentum_flag
FROM players p 
WHERE users.id = p.user_id AND p.user_id IS NOT NULL;

-- Update match_participants to reference users instead of players
-- First add new user_id column
ALTER TABLE match_participants 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);

-- Populate user_id from existing player relationships
UPDATE match_participants SET user_id = p.user_id
FROM players p 
WHERE match_participants.player_id = p.id AND p.user_id IS NOT NULL;

-- For players without user_id, we'll handle them separately
-- (these are the old system players like Alice, Bob, etc.)

-- Create index for new user_id column
CREATE INDEX IF NOT EXISTS idx_match_participants_user ON match_participants(user_id);

-- Note: We'll keep the players table temporarily for backward compatibility
-- and handle the cleanup in a later step once we verify everything works