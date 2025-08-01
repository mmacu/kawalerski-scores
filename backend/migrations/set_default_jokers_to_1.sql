ALTER TABLE players ALTER COLUMN jokers SET DEFAULT 1;

-- Update existing players to have 1 joker if they currently have 0
UPDATE players SET jokers = 1 WHERE jokers = 0;