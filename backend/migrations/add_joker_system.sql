-- Migration to add the new joker system
ALTER TABLE players DROP COLUMN IF EXISTS joker_used;
ALTER TABLE players ADD COLUMN IF NOT EXISTS jokers INTEGER NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS games_played_since_joker INTEGER NOT NULL DEFAULT 0;

-- Drop the old function and trigger to recreate them
DROP TRIGGER IF EXISTS trigger_update_player_stats ON match_participants;
DROP FUNCTION IF EXISTS update_player_stats();

-- Recreate the function with new logic for jokers and using user_id
CREATE OR REPLACE FUNCTION update_player_stats()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_update_player_stats
    AFTER INSERT OR UPDATE ON match_participants
    FOR EACH ROW
    EXECUTE FUNCTION update_player_stats();