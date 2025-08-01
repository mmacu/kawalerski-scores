-- Seed data for testing the Mini Olympics scoring system

TRUNCATE users, players, matches, match_participants RESTART IDENTITY CASCADE;

-- Insert test players (the 12 bachelor party attendees)
INSERT INTO players (name) VALUES
('Alice'), ('Bob'), ('Charlie'), ('David'), ('Eve'), ('Frank'),
('Grace'), ('Henry'), ('Ivy'), ('Jack'), ('Kate'), ('Leo');

-- Create an admin user for testing
INSERT INTO users (username, password_hash, role) VALUES
('testadmin', '$2b$10$example_hash_replace_with_real', 'admin'),
('miniadmin1', '$2b$10$example_hash_replace_with_real', 'mini_admin');

-- Games are already inserted by the schema, but let's verify they exist
-- The schema.sql already includes default games

-- Create some test matches to demonstrate the scoring system

-- Example 1: 5v5 League of Legends match (based on the worked example in SCORING_SYSTEM.md)
INSERT INTO matches (game_id, admin_id, pot, time_factor, status) 
SELECT g.id, u.id, 400, 1.0, 'completed'
FROM games g, users u 
WHERE g.name = 'League of Legends' AND u.username = 'testadmin';

-- Get the match ID for the LoL match we just created
DO $$
DECLARE
    lol_match_id UUID;
    admin_user_id UUID;
    alice_id UUID;
    bob_id UUID;
    charlie_id UUID;
    david_id UUID;
    eve_id UUID;
    frank_id UUID;
    grace_id UUID;
    henry_id UUID;
    ivy_id UUID;
    jack_id UUID;
BEGIN
    -- Get IDs we need
    SELECT id INTO admin_user_id FROM users WHERE username = 'testadmin';
    SELECT id INTO lol_match_id FROM matches WHERE admin_id = admin_user_id AND status = 'completed' LIMIT 1;
    
    SELECT id INTO alice_id FROM players WHERE name = 'Alice';
    SELECT id INTO bob_id FROM players WHERE name = 'Bob';
    SELECT id INTO charlie_id FROM players WHERE name = 'Charlie';
    SELECT id INTO david_id FROM players WHERE name = 'David';
    SELECT id INTO eve_id FROM players WHERE name = 'Eve';
    SELECT id INTO frank_id FROM players WHERE name = 'Frank';
    SELECT id INTO grace_id FROM players WHERE name = 'Grace';
    SELECT id INTO henry_id FROM players WHERE name = 'Henry';
    SELECT id INTO ivy_id FROM players WHERE name = 'Ivy';
    SELECT id INTO jack_id FROM players WHERE name = 'Jack';
    
    -- Add participants to LoL match (10 players: 5v5)
    INSERT INTO match_participants (match_id, player_id, is_winner, is_mvp, joker_played, momentum_triggered, base_tickets, bonus_tickets, total_tickets) VALUES
    -- Winners (Team 1)
    (lol_match_id, alice_id, TRUE, TRUE, TRUE, FALSE, 56, 20, 152),  -- Alice: winner + MVP + joker = (56+20)*2 = 152
    (lol_match_id, bob_id, TRUE, FALSE, FALSE, FALSE, 56, 0, 56),    -- Bob: winner only = 56
    (lol_match_id, charlie_id, TRUE, FALSE, FALSE, FALSE, 56, 0, 56), -- Charlie: winner only = 56
    (lol_match_id, david_id, TRUE, FALSE, FALSE, FALSE, 56, 0, 56),   -- David: winner only = 56
    (lol_match_id, frank_id, TRUE, FALSE, FALSE, FALSE, 56, 0, 56),   -- Frank: winner only = 56
    -- Losers (Team 2)
    (lol_match_id, eve_id, FALSE, FALSE, FALSE, FALSE, 24, 0, 24),    -- Eve: loser = 24
    (lol_match_id, grace_id, FALSE, FALSE, FALSE, FALSE, 24, 0, 24),  -- Grace: loser = 24
    (lol_match_id, henry_id, FALSE, FALSE, FALSE, FALSE, 24, 0, 24),  -- Henry: loser = 24
    (lol_match_id, ivy_id, FALSE, FALSE, FALSE, FALSE, 24, 0, 24),    -- Ivy: loser = 24
    (lol_match_id, jack_id, FALSE, FALSE, FALSE, FALSE, 24, 0, 24);   -- Jack: loser = 24
    
    -- Mark Alice's joker as used
    UPDATE players SET joker_used = TRUE WHERE id = alice_id;
    
END $$;

-- Example 2: 1v1 FIFA match
INSERT INTO matches (game_id, admin_id, pot, time_factor, status)
SELECT g.id, u.id, 80, 1.0, 'completed'
FROM games g, users u 
WHERE g.name = 'FIFA' AND u.username = 'testadmin';

-- Add participants to FIFA match
DO $$
DECLARE
    fifa_match_id UUID;
    admin_user_id UUID;
    bob_id UUID;
    eve_id UUID;
BEGIN
    SELECT id INTO admin_user_id FROM users WHERE username = 'testadmin';
    SELECT m.id INTO fifa_match_id FROM matches m 
    JOIN games g ON m.game_id = g.id 
    WHERE g.name = 'FIFA' AND m.admin_id = admin_user_id AND m.status = 'completed';
    
    SELECT id INTO bob_id FROM players WHERE name = 'Bob';
    SELECT id INTO eve_id FROM players WHERE name = 'Eve';
    
    -- Bob vs Eve in FIFA (Bob wins with momentum bonus)
    INSERT INTO match_participants (match_id, player_id, is_winner, is_mvp, joker_played, momentum_triggered, base_tickets, bonus_tickets, total_tickets) VALUES
    (fifa_match_id, bob_id, TRUE, FALSE, FALSE, TRUE, 56, 0, 70),   -- Bob wins with momentum: 56 * 1.25 = 70
    (fifa_match_id, eve_id, FALSE, FALSE, FALSE, FALSE, 24, 0, 24); -- Eve loses = 24
    
    -- Clear Bob's momentum flag since it was used
    UPDATE players SET momentum_flag = FALSE WHERE id = bob_id;
    
END $$;

-- Example 3: Chess Tournament (12 players, free-for-all)
INSERT INTO matches (game_id, admin_id, pot, time_factor, status)
SELECT g.id, u.id, 480, 1.0, 'completed'
FROM games g, users u 
WHERE g.name = 'Chess Tournament' AND u.username = 'testadmin';

-- Add all 12 players to chess tournament with their final rankings
DO $$
DECLARE
    chess_match_id UUID;
    admin_user_id UUID;
    player_ids UUID[];
    player_names TEXT[] := ARRAY['Alice', 'Bob', 'Charlie', 'David', 'Eve', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack', 'Kate', 'Leo'];
    total_players INT := 12;
    weight_sum INT := 78; -- 12 * 13 / 2 = 78
    i INT;
    weight INT;
    tickets INT;
BEGIN
    SELECT id INTO admin_user_id FROM users WHERE username = 'testadmin';
    SELECT m.id INTO chess_match_id FROM matches m 
    JOIN games g ON m.game_id = g.id 
    WHERE g.name = 'Chess Tournament' AND m.admin_id = admin_user_id AND m.status = 'completed';
    
    -- Get all player IDs in order
    FOR i IN 1..12 LOOP
        player_ids[i] := (SELECT id FROM players WHERE name = player_names[i]);
    END LOOP;
    
    -- Insert tournament results (Alice 1st, Bob 2nd, etc.)
    FOR i IN 1..12 LOOP
        weight := total_players - i + 1; -- 12, 11, 10, ..., 1
        tickets := ROUND((480 * weight)::DECIMAL / weight_sum);
        
        INSERT INTO match_participants (match_id, player_id, is_winner, is_mvp, joker_played, momentum_triggered, base_tickets, bonus_tickets, total_tickets) VALUES
        (chess_match_id, player_ids[i], (i = 1), FALSE, FALSE, FALSE, tickets, 0, tickets);
    END LOOP;
    
END $$;

-- Update momentum flags based on current leaderboard positions
SELECT update_momentum_flags();

-- Verify the results
SELECT 'Final Leaderboard:' as info;
SELECT 
    ROW_NUMBER() OVER (ORDER BY efficiency DESC, tickets_total DESC) as rank,
    name, 
    matches_played, 
    tickets_total, 
    ROUND(efficiency, 2) as efficiency_percent,
    joker_used,
    momentum_flag
FROM players 
WHERE matches_played > 0
ORDER BY efficiency DESC, tickets_total DESC;

SELECT 'Match Results Summary:' as info;
SELECT 
    g.name as game,
    m.pot,
    COUNT(mp.player_id) as players,
    m.status
FROM matches m
JOIN games g ON m.game_id = g.id
LEFT JOIN match_participants mp ON m.id = mp.match_id
GROUP BY m.id, g.name, m.pot, m.status
ORDER BY m.timestamp;