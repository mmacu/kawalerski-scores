const express = require('express');
const Player = require('../models/Player');
const { authenticateToken, authorizeAdmin } = require('./auth');

const router = express.Router();

// Get all players
router.get('/', authenticateToken, async (req, res) => {
  try {
    const players = await Player.getAll();
    res.json(players);
  } catch (error) {
    console.error('Get players error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get player by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const player = await Player.getById(req.params.id);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    res.json(player);
  } catch (error) {
    console.error('Get player error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new player (admin only)
router.post('/', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { name, user_id } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Player name is required' });
    }
    
    const player = await Player.create({ name: name.trim(), user_id });
    res.status(201).json(player);
  } catch (error) {
    console.error('Create player error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update player (admin only)
router.put('/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { name, joker_used, momentum_flag } = req.body;
    
    const player = await Player.update(req.params.id, {
      name: name?.trim(),
      joker_used,
      momentum_flag
    });
    
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    res.json(player);
  } catch (error) {
    console.error('Update player error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset player's joker flag (admin only)
router.post('/:id/reset-joker', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const player = await Player.resetJoker(req.params.id);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    res.json(player);
  } catch (error) {
    console.error('Reset joker error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update momentum flags for all players (admin only)
router.post('/update-momentum', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    await Player.updateMomentumFlags();
    const players = await Player.getAll();
    res.json({ message: 'Momentum flags updated', players });
  } catch (error) {
    console.error('Update momentum error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;