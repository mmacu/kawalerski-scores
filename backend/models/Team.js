const pool = require('../config/database');

class Team {
  // Get all teams for a specific match
  static async getByMatchId(matchId) {
    const query = `
      SELECT 
        mt.id, mt.match_id, mt.team_name, mt.team_color, mt.created_at,
        COUNT(mp.user_id) as player_count
      FROM match_teams mt
      LEFT JOIN match_participants mp ON mt.id = mp.team_id
      WHERE mt.match_id = $1
      GROUP BY mt.id, mt.match_id, mt.team_name, mt.team_color, mt.created_at
      ORDER BY mt.created_at ASC
    `;
    const result = await pool.query(query, [matchId]);
    return result.rows;
  }

  // Get team by ID with participants
  static async getByIdWithParticipants(teamId) {
    const teamQuery = `
      SELECT mt.id, mt.match_id, mt.team_name, mt.team_color, mt.created_at
      FROM match_teams mt
      WHERE mt.id = $1
    `;
    const teamResult = await pool.query(teamQuery, [teamId]);
    
    if (teamResult.rows.length === 0) {
      return null;
    }
    
    const team = teamResult.rows[0];
    
    // Get team participants (now using users directly)
    const participantsQuery = `
      SELECT 
        mp.id, mp.user_id, mp.is_winner, mp.is_mvp, mp.joker_played,
        mp.momentum_triggered, mp.base_tickets, mp.bonus_tickets, mp.total_tickets,
        u.username, u.display_name, u.role
      FROM match_participants mp
      JOIN users u ON mp.user_id = u.id
      WHERE mp.team_id = $1 AND mp.user_id IS NOT NULL
      ORDER BY mp.created_at ASC
    `;
    const participantsResult = await pool.query(participantsQuery, [teamId]);
    
    return {
      ...team,
      participants: participantsResult.rows
    };
  }

  // Create teams for a match
  static async createTeamsForMatch(matchId, teamNames) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const teams = [];
      const colors = ['blue', 'red', 'green', 'yellow', 'purple', 'orange']; // Default colors
      
      for (let i = 0; i < teamNames.length; i++) {
        const teamName = teamNames[i];
        const teamColor = colors[i % colors.length];
        
        const query = `
          INSERT INTO match_teams (match_id, team_name, team_color)
          VALUES ($1, $2, $3)
          RETURNING id, match_id, team_name, team_color, created_at
        `;
        const result = await client.query(query, [matchId, teamName, teamColor]);
        teams.push(result.rows[0]);
      }
      
      await client.query('COMMIT');
      return teams;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Add user to team
  static async addPlayerToTeam(matchId, userId, teamId) {
    const query = `
      UPDATE match_participants 
      SET team_id = $3
      WHERE match_id = $1 AND user_id = $2
      RETURNING id, match_id, user_id, team_id
    `;
    const result = await pool.query(query, [matchId, userId, teamId]);
    return result.rows[0];
  }

  // Remove user from team (set team_id to null)
  static async removePlayerFromTeam(matchId, userId) {
    const query = `
      UPDATE match_participants 
      SET team_id = NULL
      WHERE match_id = $1 AND user_id = $2
      RETURNING id, match_id, user_id, team_id
    `;
    const result = await pool.query(query, [matchId, userId]);
    return result.rows[0];
  }

  // Delete team (and remove all players from it)
  static async deleteTeam(teamId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Remove all players from this team first
      await client.query('UPDATE match_participants SET team_id = NULL WHERE team_id = $1', [teamId]);
      
      // Delete the team
      const query = 'DELETE FROM match_teams WHERE id = $1 RETURNING *';
      const result = await client.query(query, [teamId]);
      
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Get match teams with all participants organized by team  
  static async getMatchTeamsWithParticipants(matchId) {
    const query = `
      SELECT 
        mt.id as team_id, mt.team_name, mt.team_color,
        mp.id as participant_id, mp.user_id, mp.is_winner, mp.is_mvp, 
        mp.joker_played, mp.momentum_triggered, mp.base_tickets, 
        mp.bonus_tickets, mp.total_tickets,
        u.username, u.display_name, u.role
      FROM match_teams mt
      LEFT JOIN match_participants mp ON mt.id = mp.team_id AND mp.user_id IS NOT NULL
      LEFT JOIN users u ON mp.user_id = u.id
      WHERE mt.match_id = $1
      ORDER BY mt.created_at ASC, mp.created_at ASC
    `;
    const result = await pool.query(query, [matchId]);
    
    // Group participants by team
    const teamsMap = new Map();
    
    result.rows.forEach(row => {
      if (!teamsMap.has(row.team_id)) {
        teamsMap.set(row.team_id, {
          id: row.team_id,
          team_name: row.team_name,
          team_color: row.team_color,
          participants: []
        });
      }
      
      if (row.participant_id) {
        teamsMap.get(row.team_id).participants.push({
          id: row.participant_id,
          user_id: row.user_id,
          username: row.username,
          display_name: row.display_name,
          role: row.role,
          is_winner: row.is_winner,
          is_mvp: row.is_mvp,
          joker_played: row.joker_played,
          momentum_triggered: row.momentum_triggered,
          base_tickets: row.base_tickets,
          bonus_tickets: row.bonus_tickets,
          total_tickets: row.total_tickets
        });
      }
    });
    
    return Array.from(teamsMap.values());
  }

  // Get unassigned participants (users not in any team)
  static async getUnassignedParticipants(matchId) {
    const query = `
      SELECT 
        mp.id, mp.user_id, mp.is_winner, mp.is_mvp, mp.joker_played,
        mp.momentum_triggered, mp.base_tickets, mp.bonus_tickets, mp.total_tickets,
        u.username, u.display_name, u.role
      FROM match_participants mp
      JOIN users u ON mp.user_id = u.id
      WHERE mp.match_id = $1 AND mp.team_id IS NULL AND mp.user_id IS NOT NULL
      ORDER BY mp.created_at ASC
    `;
    const result = await pool.query(query, [matchId]);
    return result.rows;
  }
}

module.exports = Team;