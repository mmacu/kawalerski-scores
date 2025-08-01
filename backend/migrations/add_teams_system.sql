-- Add teams system for team-based matches
-- This allows organizing players into teams and selecting winning teams

-- Create teams table for match-specific teams
CREATE TABLE IF NOT EXISTS match_teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    team_name VARCHAR(100) NOT NULL,
    team_color VARCHAR(50) DEFAULT NULL, -- For UI display (blue, red, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_team_per_match UNIQUE(match_id, team_name)
);

-- Add team_id to match_participants to assign players to teams
ALTER TABLE match_participants 
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES match_teams(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_match_teams_match ON match_teams(match_id);
CREATE INDEX IF NOT EXISTS idx_match_participants_team ON match_participants(team_id);

-- Add a winning_team_id to matches table for team-based completion
ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS winning_team_id UUID REFERENCES match_teams(id) ON DELETE SET NULL;

-- Create index for winning team lookups
CREATE INDEX IF NOT EXISTS idx_matches_winning_team ON matches(winning_team_id);