const pool = require('../config/database');

class Match {
  static async getAll() {
    const query = `
      SELECT 
        m.id, m.game_id, m.admin_id, m.mini_admin_id, m.timestamp, m.pot, m.time_factor, m.status,
        g.name as game_name, g.type as game_type,
        u.username as admin_username,
        mu.username as mini_admin_username,
        COUNT(mp.user_id) as player_count
      FROM matches m
      LEFT JOIN games g ON m.game_id = g.id
      LEFT JOIN users u ON m.admin_id = u.id
      LEFT JOIN users mu ON m.mini_admin_id = mu.id
      LEFT JOIN match_participants mp ON m.id = mp.match_id
      GROUP BY m.id, g.name, g.type, u.username, mu.username
      ORDER BY m.timestamp DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async getById(id) {
    const query = `
      SELECT 
        m.id, m.game_id, m.admin_id, m.mini_admin_id, m.timestamp, m.pot, m.time_factor, m.status,
        g.name as game_name, g.type as game_type,
        u.username as admin_username,
        mu.username as mini_admin_username
      FROM matches m
      LEFT JOIN games g ON m.game_id = g.id
      LEFT JOIN users u ON m.admin_id = u.id
      LEFT JOIN users mu ON m.mini_admin_id = mu.id
      WHERE m.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async getWithParticipants(id) {
    const match = await this.getById(id);
    if (!match) return null;

    const participantsQuery = `
      SELECT 
        mp.id, mp.user_id, mp.is_winner, mp.is_mvp, mp.joker_played, mp.joker_declared,
        mp.momentum_triggered, mp.base_tickets, mp.bonus_tickets, mp.total_tickets,
        u.username, u.display_name, u.role
      FROM match_participants mp
      JOIN users u ON mp.user_id = u.id
      WHERE mp.match_id = $1 AND mp.user_id IS NOT NULL
      ORDER BY mp.total_tickets DESC
    `;
    const participantsResult = await pool.query(participantsQuery, [id]);
    
    return {
      ...match,
      participants: participantsResult.rows
    };
  }

  static async create({ game_id, admin_id, mini_admin_id, time_factor = 1.0 }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Get game info to calculate base pot
      const gameQuery = 'SELECT time_factor as game_time_factor FROM games WHERE id = $1';
      const gameResult = await client.query(gameQuery, [game_id]);
      const game = gameResult.rows[0];
      
      // If no mini_admin_id provided, default to the main admin (michal)
      let finalMiniAdminId = mini_admin_id;
      if (!finalMiniAdminId || finalMiniAdminId === '' || finalMiniAdminId === 'null' || finalMiniAdminId === 'undefined') {
        const defaultAdminQuery = `SELECT id FROM users WHERE username = 'michal' AND role = 'admin' LIMIT 1`;
        const defaultAdminResult = await client.query(defaultAdminQuery);
        if (defaultAdminResult.rows.length > 0) {
          finalMiniAdminId = defaultAdminResult.rows[0].id;
        }
      }
      
      // Create match with pot = 0 initially (will be calculated when participants are added)
      const matchQuery = `
        INSERT INTO matches (game_id, admin_id, mini_admin_id, pot, time_factor, status) 
        VALUES ($1, $2, $3, 0, $4, 'pending') 
        RETURNING id, game_id, admin_id, mini_admin_id, timestamp, pot, time_factor, status, created_at
      `;
      const matchResult = await client.query(matchQuery, [game_id, admin_id, finalMiniAdminId, time_factor * game.game_time_factor]);
      
      await client.query('COMMIT');
      return matchResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async addParticipant(match_id, user_id) {
    const query = `
      INSERT INTO match_participants (match_id, user_id) 
      VALUES ($1, $2) 
      RETURNING id, match_id, user_id, is_winner, is_mvp, joker_played, 
                momentum_triggered, base_tickets, bonus_tickets, total_tickets
    `;
    const result = await pool.query(query, [match_id, user_id]);
    
    // Update match pot based on current participant count
    const K = parseInt(process.env.K) || 40;
    const countQuery = 'SELECT COUNT(*) as count FROM match_participants WHERE match_id = $1';
    const countResult = await pool.query(countQuery, [match_id]);
    const playerCount = parseInt(countResult.rows[0].count);
    
    const updatePotQuery = 'UPDATE matches SET pot = $1 WHERE id = $2';
    await pool.query(updatePotQuery, [K * playerCount, match_id]);
    
    return result.rows[0];
  }

  static async removeParticipant(match_id, user_id) {
    const query = `
      DELETE FROM match_participants 
      WHERE match_id = $1 AND user_id = $2 
      RETURNING *
    `;
    const result = await pool.query(query, [match_id, user_id]);
    
    // Update match pot
    const K = parseInt(process.env.K) || 40;
    const countQuery = 'SELECT COUNT(*) as count FROM match_participants WHERE match_id = $1';
    const countResult = await pool.query(countQuery, [match_id]);
    const playerCount = parseInt(countResult.rows[0].count);
    
    const updatePotQuery = 'UPDATE matches SET pot = $1 WHERE id = $2';
    await pool.query(updatePotQuery, [K * playerCount, match_id]);
    
    return result.rows[0];
  }

  static async updateStatus(id, status) {
    const query = `
      UPDATE matches 
      SET status = $2 
      WHERE id = $1 
      RETURNING id, game_id, admin_id, timestamp, pot, time_factor, status, created_at
    `;
    const result = await pool.query(query, [id, status]);
    return result.rows[0];
  }

  static async updateAdmin(id, admin_id) {
    const query = `
      UPDATE matches 
      SET admin_id = $2 
      WHERE id = $1 
      RETURNING id, game_id, admin_id, mini_admin_id, timestamp, pot, time_factor, status, created_at
    `;
    const result = await pool.query(query, [id, admin_id]);
    return result.rows[0];
  }

  static async updateMiniAdmin(id, mini_admin_id) {
    const query = `
      UPDATE matches 
      SET mini_admin_id = $2 
      WHERE id = $1 
      RETURNING id, game_id, admin_id, mini_admin_id, timestamp, pot, time_factor, status, created_at
    `;
    const result = await pool.query(query, [id, mini_admin_id]);
    return result.rows[0];
  }

  static async setWinningTeam(matchId, teamId) {
    const query = `
      UPDATE matches 
      SET winning_team_id = $2, status = 'completed'
      WHERE id = $1 
      RETURNING id, game_id, admin_id, mini_admin_id, timestamp, pot, time_factor, status, winning_team_id, created_at
    `;
    const result = await pool.query(query, [matchId, teamId]);
    return result.rows[0];
  }

  static async delete(id) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Get match details first
      const matchQuery = 'SELECT * FROM matches WHERE id = $1';
      const matchResult = await client.query(matchQuery, [id]);
      const match = matchResult.rows[0];
      
      if (!match) {
        return null;
      }
      
      // If the match is completed, we need to recalculate user statistics after deletion
      if (match.status === 'completed') {
        // Get all participants who will be affected
        const participantsQuery = `
          SELECT DISTINCT user_id 
          FROM match_participants 
          WHERE match_id = $1 AND user_id IS NOT NULL
        `;
        const participantsResult = await client.query(participantsQuery, [id]);
        const affectedUserIds = participantsResult.rows.map(row => row.user_id);
        
        // Delete the match (CASCADE will handle participants and teams)
        const deleteQuery = 'DELETE FROM matches WHERE id = $1 RETURNING *';
        const deleteResult = await client.query(deleteQuery, [id]);
        const deletedMatch = deleteResult.rows[0];
        
        // Recalculate statistics for affected users
        for (const userId of affectedUserIds) {
          await client.query(`
            UPDATE users
            SET
              matches_played = (
                SELECT COUNT(*)
                FROM match_participants mp
                JOIN matches m ON mp.match_id = m.id
                WHERE mp.user_id = $1 AND m.status = 'completed'
              ),
              tickets_total = (
                SELECT COALESCE(SUM(mp.total_tickets), 0)
                FROM match_participants mp
                JOIN matches m ON mp.match_id = m.id
                WHERE mp.user_id = $1 AND m.status = 'completed'
              ),
              efficiency = CASE
                WHEN (
                  SELECT COUNT(*)
                  FROM match_participants mp
                  JOIN matches m ON mp.match_id = m.id
                  WHERE mp.user_id = $1 AND m.status = 'completed'
                ) > 0
                THEN (
                  SELECT COALESCE(SUM(mp.total_tickets), 0) * 100.0 / (40 * COUNT(*))
                  FROM match_participants mp
                  JOIN matches m ON mp.match_id = m.id
                  WHERE mp.user_id = $1 AND m.status = 'completed'
                )
                ELSE 0.0
              END
            WHERE id = $1
          `, [userId]);
        }
        
        await client.query('COMMIT');
        return deletedMatch;
      } else {
        // For non-completed matches, simple delete is fine
        const deleteQuery = 'DELETE FROM matches WHERE id = $1 RETURNING *';
        const result = await client.query(deleteQuery, [id]);
        await client.query('COMMIT');
        return result.rows[0];
      }
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = Match;