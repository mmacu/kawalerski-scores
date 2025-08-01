const express = require('express');
const User = require('../models/User');
const { authenticateToken, authorizeAdmin } = require('./auth');

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const users = await User.getAll();
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get available users for match participation (accessible by mini-admins)
router.get('/available', authenticateToken, async (req, res) => {
  try {
    const users = await User.getAllWithStats();
    res.json(users);
  } catch (error) {
    console.error('Get available users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user by ID (admin only)
router.get('/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const user = await User.getById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user role (admin only)
router.patch('/:id/role', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!['admin', 'mini_admin', 'player'].includes(role)) {
      return res.status(400).json({ 
        error: 'Role must be admin, mini_admin, or player' 
      });
    }
    
    const user = await User.updateRole(req.params.id, role);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user's own display name (any authenticated user)
router.patch('/:id/display-name', authenticateToken, async (req, res) => {
  try {
    const { display_name } = req.body;
    
    // Users can only update their own display name (unless admin)
    if (req.params.id !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only update your own display name' });
    }
    
    if (!display_name || display_name.trim().length === 0) {
      return res.status(400).json({ error: 'Display name is required' });
    }
    
    if (display_name.length > 100) {
      return res.status(400).json({ error: 'Display name must be 100 characters or less' });
    }
    
    const user = await User.updateDisplayName(req.params.id, display_name.trim());
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Update display name error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new user (admin only)
router.post('/', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { username, password, role = 'player', display_name } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    if (!['admin', 'mini_admin', 'player'].includes(role)) {
      return res.status(400).json({ 
        error: 'Role must be admin, mini_admin, or player' 
      });
    }
    
    const existingUser = await User.getByUsername(username);
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    
    const user = await User.create({ username, password, role, display_name });
    
    res.status(201).json({
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        role: user.role,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user (admin only)
router.delete('/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const user = await User.delete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User deleted successfully', user });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;