const pool = require('../config/database');

// Scoring constants from environment or defaults
const K = parseInt(process.env.K) || 40;
const WIN = parseFloat(process.env.WIN) || 0.70;
const LOSE = parseFloat(process.env.LOSE) || 0.30;
const MVP_BONUS = parseFloat(process.env.MVP_BONUS) || 0.05;

class ScoringEngine {
  /**
   * Calculate tickets for a completed match
   * @param {string} matchId - Match ID
   * @param {Array} winners - Array of winner player IDs
   * @param {string} mvpId - MVP player ID (optional)
   * @param {Array} jokersPlayed - Array of player IDs who played joker
   */
  static async calculateMatchTickets(matchId, winners, mvpId = null, jokersPlayed = []) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get match and participants info
      const matchQuery = `
        SELECT m.*, g.time_factor as game_time_factor
        FROM matches m
        JOIN games g ON m.game_id = g.id
        WHERE m.id = $1
      `;
      const matchResult = await client.query(matchQuery, [matchId]);
      const match = matchResult.rows[0];
      
      const participantsQuery = `
        SELECT mp.*, u.momentum_flag, u.joker_used
        FROM match_participants mp
        JOIN users u ON mp.user_id = u.id
        WHERE mp.match_id = $1
      `;
      const participantsResult = await client.query(participantsQuery, [matchId]);
      const participants = participantsResult.rows;
      
      const totalPlayers = participants.length;
      const numWinners = winners.length;
      const numLosers = totalPlayers - numWinners;
      
      // Calculate base pot (K * players * time_factor)
      const basePot = K * totalPlayers;
      const pot = Math.round(basePot * match.time_factor);
      
      // Calculate base ticket distributions
      const winnerTickets = Math.round((pot * WIN) / numWinners);
      const loserTickets = numLosers > 0 ? Math.round((pot * LOSE) / numLosers) : 0;
      const mvpTickets = Math.round(pot * MVP_BONUS);
      
      // Update match pot
      await client.query('UPDATE matches SET pot = $1 WHERE id = $2', [pot, matchId]);
      
      // Process each participant
      for (const participant of participants) {
        const userId = participant.user_id;
        const isWinner = winners.includes(userId);
        const isMvp = mvpId === userId;
        const jokerPlayed = participant.joker_declared && !participant.joker_used;
        const momentumTriggered = participant.momentum_flag && isWinner;
        
        // Calculate base tickets
        let baseTickets = isWinner ? winnerTickets : loserTickets;
        let bonusTickets = 0;
        
        // Add MVP bonus (before multipliers)
        if (isMvp) {
          bonusTickets += mvpTickets;
        }
        
        // Apply multipliers in order: Joker → Momentum
        let totalTickets = baseTickets + bonusTickets;
        
        if (jokerPlayed) {
          totalTickets *= 2;
        }
        
        if (momentumTriggered) {
          totalTickets = Math.round(totalTickets * 1.25);
        }
        
        // Update participant record
        await client.query(`
          UPDATE match_participants 
          SET is_winner = $2, is_mvp = $3, joker_played = $4, 
              momentum_triggered = $5, base_tickets = $6, 
              bonus_tickets = $7, total_tickets = $8
          WHERE match_id = $1 AND user_id = $9
        `, [matchId, isWinner, isMvp, jokerPlayed, momentumTriggered, 
            baseTickets, bonusTickets, totalTickets, userId]);
        
        // Mark joker as used if played
        if (jokerPlayed) {
          await client.query('UPDATE users SET joker_used = TRUE WHERE id = $1', [userId]);
        }
        
        // Clear momentum flag if triggered
        if (momentumTriggered) {
          await client.query('UPDATE users SET momentum_flag = FALSE WHERE id = $1', [userId]);
        }
      }
      
      // Update match status to completed
      await client.query('UPDATE matches SET status = $2 WHERE id = $1', [matchId, 'completed']);
      
      // Update momentum flags for all players (players ranked 4+ get momentum flag)
      await client.query('SELECT update_momentum_flags()');
      
      await client.query('COMMIT');
      
      // Return updated match with participants
      return await this.getMatchResults(matchId);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Get detailed match results
   */
  static async getMatchResults(matchId) {
    const query = `
      SELECT 
        m.id, m.game_id, m.pot, m.status, m.timestamp,
        g.name as game_name,
        json_agg(
          json_build_object(
            'user_id', mp.user_id,
            'username', u.username,
            'display_name', u.display_name,
            'is_winner', mp.is_winner,
            'is_mvp', mp.is_mvp,
            'joker_played', mp.joker_played,
            'momentum_triggered', mp.momentum_triggered,
            'base_tickets', mp.base_tickets,
            'bonus_tickets', mp.bonus_tickets,
            'total_tickets', mp.total_tickets
          ) ORDER BY mp.total_tickets DESC
        ) as participants
      FROM matches m
      JOIN games g ON m.game_id = g.id
      JOIN match_participants mp ON m.id = mp.match_id
      JOIN users u ON mp.user_id = u.id
      WHERE m.id = $1
      GROUP BY m.id, g.name
    `;
    
    const result = await pool.query(query, [matchId]);
    return result.rows[0];
  }
  
  /**
   * Calculate tournament/free-for-all scoring (e.g., chess tournament)
   */
  static async calculateTournamentTickets(matchId, userRankings) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const totalUsers = userRankings.length;
      const pot = K * totalUsers;
      
      // Calculate weight sum: P * (P + 1) / 2
      const weightSum = (totalUsers * (totalUsers + 1)) / 2;
      
      // Update match pot
      await client.query('UPDATE matches SET pot = $1 WHERE id = $2', [pot, matchId]);
      
      // Process each user ranking
      for (const { userId, rank } of userRankings) {
        // weight = P - rank + 1 (1st place gets highest weight)
        const weight = totalUsers - rank + 1;
        const tickets = Math.round((pot * weight) / weightSum);
        
        // Update participant record
        await client.query(`
          UPDATE match_participants 
          SET is_winner = $2, base_tickets = $3, total_tickets = $3
          WHERE match_id = $1 AND user_id = $4
        `, [matchId, rank === 1, tickets, userId]);
      }
      
      // Update match status to completed
      await client.query('UPDATE matches SET status = $2 WHERE id = $1', [matchId, 'completed']);
      
      await client.query('COMMIT');
      
      return await this.getMatchResults(matchId);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Reset a user's joker flag (admin function)
   */
  static async resetUserJoker(userId) {
    const query = 'UPDATE users SET joker_used = FALSE WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [userId]);
    return result.rows[0];
  }
  
  /**
   * Get current leaderboard with efficiency calculations
   */
  static async getLeaderboard() {
    const query = `
      SELECT 
        ROW_NUMBER() OVER (ORDER BY p.efficiency DESC, p.tickets_total DESC, u.username) as rank,
        u.id, u.username, u.display_name, p.matches_played, p.tickets_total, 
        ROUND(p.efficiency, 2) as efficiency,
        p.jokers, p.momentum_flag
      FROM players p
      JOIN users u ON p.user_id = u.id
      WHERE p.matches_played > 0
      ORDER BY p.efficiency DESC, p.tickets_total DESC, u.username
    `;
    
    const result = await pool.query(query);
    return result.rows;
  }
  
  /**
   * Get head-to-head record between two players
   */
  static async getHeadToHead(user1Id, user2Id) {
    const query = `
      SELECT 
        m.id as match_id,
        m.timestamp,
        g.name as game_name,
        mp1.total_tickets as user1_tickets,
        mp2.total_tickets as user2_tickets,
        (mp1.total_tickets - mp2.total_tickets) as ticket_differential
      FROM matches m
      JOIN games g ON m.game_id = g.id
      JOIN match_participants mp1 ON m.id = mp1.match_id AND mp1.user_id = $1
      JOIN match_participants mp2 ON m.id = mp2.match_id AND mp2.user_id = $2
      WHERE m.status = 'completed'
      ORDER BY m.timestamp DESC
    `;
    
    const result = await pool.query(query, [user1Id, user2Id]);
    const matches = result.rows;
    
    const totalDifferential = matches.reduce((sum, match) => sum + match.ticket_differential, 0);
    
    return {
      matches,
      totalDifferential,
      matchCount: matches.length
    };
  }
}

module.exports = ScoringEngine;