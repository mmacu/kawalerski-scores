const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    const user = await User.getByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isValidPassword = await User.validatePassword(user, password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
    
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Register endpoint (admin only)
router.post('/register', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { username, password, role = 'player' } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    const existingUser = await User.getByUsername(username);
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    
    const user = await User.create({ username, password, role });
    
    res.status(201).json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user info
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.getById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Middleware to authorize admin access
function authorizeAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Middleware to authorize admin or mini-admin access
function authorizeMatchAdmin(req, res, next) {
  if (!['admin', 'mini_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Admin or mini-admin access required' });
  }
  next();
}

// Middleware to authorize match-specific admin access (admin, mini_admin role, or mini-admin for this specific match)
function authorizeMatchSpecificAdmin(req, res, next) {
  // Allow admins to access everything
  if (req.user.role === 'admin') {
    return next();
  }
  
  // Allow users with mini_admin role
  if (req.user.role === 'mini_admin') {
    return next();
  }
  
  // For specific match operations, check if user is the mini-admin of this match
  const matchId = req.params.id || req.params.matchId;
  if (matchId) {
    const pool = require('../config/database');
    pool.query('SELECT mini_admin_id FROM matches WHERE id = $1', [matchId])
      .then(result => {
        if (result.rows.length > 0 && result.rows[0].mini_admin_id === req.user.userId) {
          return next();
        }
        return res.status(403).json({ error: 'Admin, mini-admin, or match mini-admin access required' });
      })
      .catch(error => {
        console.error('Authorization check error:', error);
        return res.status(500).json({ error: 'Internal server error' });
      });
  } else {
    return res.status(403).json({ error: 'Admin or mini-admin access required' });
  }
}

// Export middleware functions for use in other routes
module.exports = router;
module.exports.authenticateToken = authenticateToken;
module.exports.authorizeAdmin = authorizeAdmin;
module.exports.authorizeMatchAdmin = authorizeMatchAdmin;
module.exports.authorizeMatchSpecificAdmin = authorizeMatchSpecificAdmin;