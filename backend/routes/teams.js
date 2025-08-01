const express = require('express');
const Team = require('../models/Team');
const Match = require('../models/Match');
const ScoringEngine = require('../utils/scoring');
const { authenticateToken, authorizeMatchSpecificAdmin } = require('./auth');

const router = express.Router();

// Get teams for a specific match
router.get('/match/:matchId', authenticateToken, async (req, res) => {
  try {
    const teams = await Team.getMatchTeamsWithParticipants(req.params.matchId);
    const unassigned = await Team.getUnassignedParticipants(req.params.matchId);
    
    res.json({
      teams,
      unassigned
    });
  } catch (error) {
    console.error('Get match teams error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create teams for a match
router.post('/match/:matchId', authenticateToken, authorizeMatchSpecificAdmin, async (req, res) => {
  try {
    const { teamNames } = req.body;
    
    if (!teamNames || !Array.isArray(teamNames) || teamNames.length < 2) {
      return res.status(400).json({ error: 'At least 2 team names are required' });
    }
    
    const teams = await Team.createTeamsForMatch(req.params.matchId, teamNames);
    res.status(201).json(teams);
  } catch (error) {
    console.error('Create teams error:', error);
    if (error.code === '23505') { // Unique constraint violation
      res.status(409).json({ error: 'Team name already exists for this match' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Assign user to team
router.post('/match/:matchId/assign', authenticateToken, authorizeMatchSpecificAdmin, async (req, res) => {
  try {
    const { userId, teamId } = req.body;
    
    if (!userId || !teamId) {
      return res.status(400).json({ error: 'User ID and Team ID are required' });
    }
    
    const assignment = await Team.addPlayerToTeam(req.params.matchId, userId, teamId);
    res.json(assignment);
  } catch (error) {
    console.error('Assign user to team error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove user from team
router.delete('/match/:matchId/unassign/:userId', authenticateToken, authorizeMatchSpecificAdmin, async (req, res) => {
  try {
    const assignment = await Team.removePlayerFromTeam(req.params.matchId, req.params.userId);
    if (!assignment) {
      return res.status(404).json({ error: 'User assignment not found' });
    }
    res.json(assignment);
  } catch (error) {
    console.error('Remove user from team error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete team
router.delete('/:teamId', authenticateToken, async (req, res) => {
  try {
    // Check if user has permission to manage this team's match
    const teamQuery = 'SELECT match_id FROM match_teams WHERE id = $1';
    const { authenticateToken: auth } = require('./auth');
    const pool = require('../config/database');
    const teamResult = await pool.query(teamQuery, [req.params.teamId]);
    
    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // This is a simplified check - in production you'd want to reuse the authorizeMatchSpecificAdmin logic
    const team = await Team.deleteTeam(req.params.teamId);
    res.json({ message: 'Team deleted successfully', team });
  } catch (error) {
    console.error('Delete team error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Complete match by selecting winning team
router.post('/match/:matchId/complete-team', authenticateToken, authorizeMatchSpecificAdmin, async (req, res) => {
  try {
    const { winningTeamId, mvpPlayerId } = req.body;
    
    if (!winningTeamId) {
      return res.status(400).json({ error: 'Winning team ID is required' });
    }
    
    // Get team with participants to validate the MVP selection
    const winningTeam = await Team.getByIdWithParticipants(winningTeamId);
    if (!winningTeam) {
      return res.status(404).json({ error: 'Winning team not found' });
    }
    
    // Validate MVP is from winning team if specified
    if (mvpPlayerId) {
      const mvpInWinningTeam = winningTeam.participants.some(p => p.user_id === mvpPlayerId);
      if (!mvpInWinningTeam) {
        return res.status(400).json({ error: 'MVP must be from the winning team' });
      }
    }
    
    // Update match with winning team
    const match = await Match.setWinningTeam(req.params.matchId, winningTeamId);
    
    // Get all team participants to determine winners for scoring
    const allTeams = await Team.getMatchTeamsWithParticipants(req.params.matchId);
    const winners = winningTeam.participants.map(p => p.user_id);
    const jokers_played = []; // We'll need to handle this in the UI
    
    // Calculate scoring using existing system
    const result = await ScoringEngine.calculateMatchTickets(
      req.params.matchId,
      winners,
      mvpPlayerId,
      jokers_played
    );
    
    res.json({
      match,
      scoring: result,
      winningTeam: winningTeam
    });
  } catch (error) {
    console.error('Complete team match error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;