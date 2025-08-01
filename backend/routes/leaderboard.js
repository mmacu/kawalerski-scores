const express = require('express');
const ScoringEngine = require('../utils/scoring');
const { authenticateToken } = require('./auth');

const router = express.Router();

// Get current leaderboard
router.get('/', authenticateToken, async (req, res) => {
  try {
    const leaderboard = await ScoringEngine.getLeaderboard();
    res.json(leaderboard);
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get head-to-head comparison between two players
router.get('/head-to-head/:player1Id/:player2Id', authenticateToken, async (req, res) => {
  try {
    const { player1Id, player2Id } = req.params;
    
    if (player1Id === player2Id) {
      return res.status(400).json({ error: 'Cannot compare player with themselves' });
    }
    
    const headToHead = await ScoringEngine.getHeadToHead(player1Id, player2Id);
    res.json(headToHead);
  } catch (error) {
    console.error('Get head-to-head error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;