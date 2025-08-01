const express = require('express');
const Game = require('../models/Game');
const { authenticateToken, authorizeAdmin } = require('./auth');

const router = express.Router();

// Get all games
router.get('/', authenticateToken, async (req, res) => {
  try {
    const games = await Game.getAll();
    res.json(games);
  } catch (error) {
    console.error('Get games error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get game by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const game = await Game.getById(req.params.id);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    res.json(game);
  } catch (error) {
    console.error('Get game error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new game (admin only)
router.post('/', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { name, type, min_players, max_players, time_factor } = req.body;
    
    if (!name || !type || !min_players) {
      return res.status(400).json({ 
        error: 'Name, type, and min_players are required' 
      });
    }
    
    if (!['team', 'individual', 'tournament'].includes(type)) {
      return res.status(400).json({ 
        error: 'Type must be team, individual, or tournament' 
      });
    }
    
    const game = await Game.create({
      name: name.trim(),
      type,
      min_players: parseInt(min_players),
      max_players: max_players ? parseInt(max_players) : null,
      time_factor: time_factor ? parseFloat(time_factor) : 1.0
    });
    
    res.status(201).json(game);
  } catch (error) {
    console.error('Create game error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update game (admin only)
router.put('/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { name, type, min_players, max_players, time_factor } = req.body;
    
    if (type && !['team', 'individual', 'tournament'].includes(type)) {
      return res.status(400).json({ 
        error: 'Type must be team, individual, or tournament' 
      });
    }
    
    const game = await Game.update(req.params.id, {
      name: name?.trim(),
      type,
      min_players: min_players ? parseInt(min_players) : undefined,
      max_players: max_players ? parseInt(max_players) : undefined,
      time_factor: time_factor ? parseFloat(time_factor) : undefined
    });
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    res.json(game);
  } catch (error) {
    console.error('Update game error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete game (admin only)
router.delete('/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const game = await Game.delete(req.params.id);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    res.json({ message: 'Game deleted successfully', game });
  } catch (error) {
    console.error('Delete game error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;