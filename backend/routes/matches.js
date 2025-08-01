const express = require('express');
const Match = require('../models/Match');
const Player = require('../models/Player');
const ScoringEngine = require('../utils/scoring');
const { authenticateToken, authorizeMatchAdmin, authorizeMatchSpecificAdmin } = require('./auth');

const router = express.Router();

// Get all matches (all authenticated users can see all matches)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const matches = await Match.getAll();
    res.json(matches);
  } catch (error) {
    console.error('Get matches error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user participation data for all matches
router.get('/participation', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const pool = require('../config/database');
    
    const query = `
      SELECT 
        mp.match_id,
        mp.joker_declared
      FROM match_participants mp
      WHERE mp.user_id = $1
    `;
    const result = await pool.query(query, [userId]);
    
    // Transform to the format expected by frontend
    const participation = {};
    const jokerDeclarations = {};
    
    result.rows.forEach(row => {
      participation[row.match_id] = true;
      if (row.joker_declared) {
        jokerDeclarations[row.match_id] = true;
      }
    });
    
    res.json({
      participation,
      jokerDeclarations
    });
  } catch (error) {
    console.error('Get participation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get match by ID with participants
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const match = await Match.getWithParticipants(req.params.id);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    res.json(match);
  } catch (error) {
    console.error('Get match error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new match
router.post('/', authenticateToken, authorizeMatchAdmin, async (req, res) => {
  try {
    const { game_id, mini_admin_id, time_factor } = req.body;
    
    if (!game_id) {
      return res.status(400).json({ error: 'Game ID is required' });
    }
    
    const match = await Match.create({
      game_id,
      admin_id: req.user.userId,
      mini_admin_id,
      time_factor: time_factor ? parseFloat(time_factor) : 1.0
    });
    
    res.status(201).json(match);
  } catch (error) {
    console.error('Create match error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add participant to match (by user ID)
router.post('/:id/participants', authenticateToken, authorizeMatchSpecificAdmin, async (req, res) => {
  try {
    const { user_id } = req.body;
    
    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const pool = require('../config/database');
    const query = `
      INSERT INTO match_participants (match_id, user_id) 
      VALUES ($1, $2) 
      RETURNING id, match_id, user_id, is_winner, is_mvp, joker_played, 
                momentum_triggered, base_tickets, bonus_tickets, total_tickets
    `;
    const result = await pool.query(query, [req.params.id, user_id]);
    
    // Update match pot
    const K = parseInt(process.env.K) || 40;
    const countQuery = 'SELECT COUNT(*) as count FROM match_participants WHERE match_id = $1';
    const countResult = await pool.query(countQuery, [req.params.id]);
    const playerCount = parseInt(countResult.rows[0].count);
    
    const updatePotQuery = 'UPDATE matches SET pot = $1 WHERE id = $2';
    await pool.query(updatePotQuery, [K * playerCount, req.params.id]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Add participant error:', error);
    if (error.code === '23505') { // Unique constraint violation
      res.status(409).json({ error: 'User already in this match' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Remove participant from match (by user ID)
router.delete('/:id/participants/:userId', authenticateToken, authorizeMatchSpecificAdmin, async (req, res) => {
  try {
    const pool = require('../config/database');
    const query = `
      DELETE FROM match_participants 
      WHERE match_id = $1 AND user_id = $2 
      RETURNING *
    `;
    const result = await pool.query(query, [req.params.id, req.params.userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Participant not found in this match' });
    }
    
    // Update match pot
    const K = parseInt(process.env.K) || 40;
    const countQuery = 'SELECT COUNT(*) as count FROM match_participants WHERE match_id = $1';
    const countResult = await pool.query(countQuery, [req.params.id]);
    const playerCount = parseInt(countResult.rows[0].count);
    
    const updatePotQuery = 'UPDATE matches SET pot = $1 WHERE id = $2';
    await pool.query(updatePotQuery, [K * playerCount, req.params.id]);
    
    res.json({ message: 'Participant removed successfully', participant: result.rows[0] });
  } catch (error) {
    console.error('Remove participant error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Complete match with regular scoring
router.post('/:id/complete', authenticateToken, authorizeMatchSpecificAdmin, async (req, res) => {
  try {
    const { winners, mvp_id, jokers_played = [] } = req.body;
    
    if (!winners || !Array.isArray(winners) || winners.length === 0) {
      return res.status(400).json({ error: 'Winners array is required and cannot be empty' });
    }
    
    const result = await ScoringEngine.calculateMatchTickets(
      req.params.id,
      winners,
      mvp_id,
      jokers_played
    );
    
    res.json(result);
  } catch (error) {
    console.error('Complete match error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Complete tournament match with ranking-based scoring
router.post('/:id/complete-tournament', authenticateToken, authorizeMatchSpecificAdmin, async (req, res) => {
  try {
    const { player_rankings } = req.body;
    
    if (!player_rankings || !Array.isArray(player_rankings)) {
      return res.status(400).json({ error: 'Player rankings array is required' });
    }
    
    // Validate rankings format: [{ playerId, rank }, ...]
    for (const ranking of player_rankings) {
      if (!ranking.playerId || !ranking.rank || ranking.rank < 1) {
        return res.status(400).json({ 
          error: 'Each ranking must have playerId and rank (starting from 1)' 
        });
      }
    }
    
    const result = await ScoringEngine.calculateTournamentTickets(
      req.params.id,
      player_rankings
    );
    
    res.json(result);
  } catch (error) {
    console.error('Complete tournament error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update match status
router.patch('/:id/status', authenticateToken, authorizeMatchSpecificAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['pending', 'in_progress', 'completed'].includes(status)) {
      return res.status(400).json({ 
        error: 'Status must be pending, in_progress, or completed' 
      });
    }
    
    const match = await Match.updateStatus(req.params.id, status);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    res.json(match);
  } catch (error) {
    console.error('Update match status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update match admin (admin only)
router.patch('/:id/admin', authenticateToken, async (req, res) => {
  try {
    // Only allow admins to change match admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { admin_id } = req.body;
    
    if (!admin_id) {
      return res.status(400).json({ error: 'Admin ID is required' });
    }
    
    const match = await Match.updateAdmin(req.params.id, admin_id);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    res.json(match);
  } catch (error) {
    console.error('Update match admin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update match mini-admin (admin only)
router.patch('/:id/mini-admin', authenticateToken, async (req, res) => {
  try {
    // Only allow admins to change mini-admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { mini_admin_id } = req.body;
    
    if (!mini_admin_id) {
      return res.status(400).json({ error: 'Mini-admin ID is required' });
    }
    
    const match = await Match.updateMiniAdmin(req.params.id, mini_admin_id);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    res.json(match);
  } catch (error) {
    console.error('Update match mini-admin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete match
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    // Get match details first to check status
    const matchToDelete = await Match.getById(req.params.id);
    if (!matchToDelete) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    // Check permissions based on match status
    if (matchToDelete.status === 'completed') {
      // Only admins can delete completed matches
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can delete completed matches' });
      }
    } else {
      // Non-completed matches can be deleted by admins or the match mini-admin
      if (req.user.role !== 'admin' && matchToDelete.mini_admin_id !== req.user.userId) {
        return res.status(403).json({ error: 'Admin or match mini-admin access required' });
      }
    }
    
    const match = await Match.delete(req.params.id);
    res.json({ message: 'Match deleted successfully', match });
  } catch (error) {
    console.error('Delete match error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Join match as current user
router.post('/:id/join', authenticateToken, async (req, res) => {
  try {
    // Add the user directly to the match
    const pool = require('../config/database');
    const query = `
      INSERT INTO match_participants (match_id, user_id) 
      VALUES ($1, $2) 
      RETURNING id, match_id, user_id, is_winner, is_mvp, joker_played, 
                momentum_triggered, base_tickets, bonus_tickets, total_tickets
    `;
    const result = await pool.query(query, [req.params.id, req.user.userId]);
    
    // Update match pot based on current participant count
    const K = parseInt(process.env.K) || 40;
    const countQuery = 'SELECT COUNT(*) as count FROM match_participants WHERE match_id = $1';
    const countResult = await pool.query(countQuery, [req.params.id]);
    const playerCount = parseInt(countResult.rows[0].count);
    
    const updatePotQuery = 'UPDATE matches SET pot = $1 WHERE id = $2';
    await pool.query(updatePotQuery, [K * playerCount, req.params.id]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Join match error:', error);
    if (error.code === '23505') { // Unique constraint violation
      res.status(409).json({ error: 'Already joined this match' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Leave match as current user
router.delete('/:id/leave', authenticateToken, async (req, res) => {
  try {
    const pool = require('../config/database');
    const query = `
      DELETE FROM match_participants 
      WHERE match_id = $1 AND user_id = $2 
      RETURNING *
    `;
    const result = await pool.query(query, [req.params.id, req.user.userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not a participant in this match' });
    }
    
    // Update match pot
    const K = parseInt(process.env.K) || 40;
    const countQuery = 'SELECT COUNT(*) as count FROM match_participants WHERE match_id = $1';
    const countResult = await pool.query(countQuery, [req.params.id]);
    const playerCount = parseInt(countResult.rows[0].count);
    
    const updatePotQuery = 'UPDATE matches SET pot = $1 WHERE id = $2';
    await pool.query(updatePotQuery, [K * playerCount, req.params.id]);
    
    res.json({ message: 'Left match successfully', participant: result.rows[0] });
  } catch (error) {
    console.error('Leave match error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get match results (detailed scoring info)
router.get('/:id/results', authenticateToken, async (req, res) => {
  try {
    const results = await ScoringEngine.getMatchResults(req.params.id);
    if (!results) {
      return res.status(404).json({ error: 'Match not found' });
    }
    res.json(results);
  } catch (error) {
    console.error('Get match results error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Declare joker usage for a match (for current user)
router.post('/:id/declare-joker', authenticateToken, async (req, res) => {
  try {
    const matchId = req.params.id;
    const userId = req.user.userId;
    
    // Check if user is in this match
    const pool = require('../config/database');
    const participantCheck = await pool.query(
      'SELECT id FROM match_participants WHERE match_id = $1 AND user_id = $2',
      [matchId, userId]
    );
    
    if (participantCheck.rows.length === 0) {
      return res.status(404).json({ error: 'You are not a participant in this match' });
    }
    
    // Check if match is still pending
    const matchCheck = await pool.query(
      'SELECT status FROM matches WHERE id = $1',
      [matchId]
    );
    
    if (matchCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    if (matchCheck.rows[0].status !== 'pending') {
      return res.status(400).json({ error: 'Can only declare joker for pending matches' });
    }
    
    // Check if user still has joker available
    const userCheck = await pool.query(
      'SELECT joker_used FROM users WHERE id = $1',
      [userId]
    );
    
    if (userCheck.rows[0].joker_used) {
      return res.status(400).json({ error: 'Joker already used' });
    }
    
    // Set joker declaration for this match
    const updateQuery = `
      UPDATE match_participants 
      SET joker_declared = true 
      WHERE match_id = $1 AND user_id = $2
      RETURNING *
    `;
    const result = await pool.query(updateQuery, [matchId, userId]);
    
    res.json({ 
      message: 'Joker declared for this match',
      participant: result.rows[0]
    });
  } catch (error) {
    console.error('Declare joker error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove joker declaration for a match (for current user)
router.delete('/:id/declare-joker', authenticateToken, async (req, res) => {
  try {
    const matchId = req.params.id;
    const userId = req.user.userId;
    
    // Check if match is still pending
    const pool = require('../config/database');
    const matchCheck = await pool.query(
      'SELECT status FROM matches WHERE id = $1',
      [matchId]
    );
    
    if (matchCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    if (matchCheck.rows[0].status !== 'pending') {
      return res.status(400).json({ error: 'Can only modify joker declaration for pending matches' });
    }
    
    // Remove joker declaration
    const updateQuery = `
      UPDATE match_participants 
      SET joker_declared = false 
      WHERE match_id = $1 AND user_id = $2
      RETURNING *
    `;
    const result = await pool.query(updateQuery, [matchId, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'You are not a participant in this match' });
    }
    
    res.json({ 
      message: 'Joker declaration removed',
      participant: result.rows[0]
    });
  } catch (error) {
    console.error('Remove joker declaration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;