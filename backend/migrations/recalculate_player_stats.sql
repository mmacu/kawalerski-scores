UPDATE players p
SET
    matches_played = (
        SELECT COUNT(*)
        FROM match_participants mp
        JOIN matches m ON mp.match_id = m.id
        WHERE mp.user_id = p.user_id AND m.status = 'completed'
    ),
    tickets_total = (
        SELECT COALESCE(SUM(mp.total_tickets), 0)
        FROM match_participants mp
        JOIN matches m ON mp.match_id = m.id
        WHERE mp.user_id = p.user_id AND m.status = 'completed'
    ),
    efficiency = CASE
        WHEN (
            SELECT COUNT(*)
            FROM match_participants mp
            JOIN matches m ON mp.match_id = m.id
            WHERE mp.user_id = p.user_id AND m.status = 'completed'
        ) > 0
        THEN (
            SELECT COALESCE(SUM(mp.total_tickets), 0) * 100.0 / (40 * COUNT(*))
            FROM match_participants mp
            JOIN matches m ON mp.match_id = m.id
            WHERE mp.user_id = p.user_id AND m.status = 'completed'
        )
        ELSE 0.0
    END;