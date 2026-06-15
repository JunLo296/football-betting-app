// backend/src/routes/auth.js
const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const authenticate = require('../middleware/auth');
const requireAdmin = require('../middleware/admin');

/**
 * POST /api/auth/register
 * Register a new user (admin-only)
 */
router.post('/register', authenticate, requireAdmin, async (req, res) => {
  try {
    const { username, password, email } = req.body;

    // Register user
    const user = await authService.register({ username, password, email });

    res.status(201).json(user);
  } catch (error) {
    // Determine appropriate status code
    if (error.message.includes('required') ||
        error.message.includes('at least') ||
        error.message.includes('already exists')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/login
 * Login with username and password
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Login user
    const result = await authService.login({ username, password });

    res.status(200).json(result);
  } catch (error) {
    // Determine appropriate status code
    if (error.message.includes('required')) {
      return res.status(400).json({ error: error.message });
    }
    if (error.message.includes('Invalid credentials')) {
      return res.status(401).json({ error: error.message });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user info
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    // User info is already attached by authenticate middleware
    res.status(200).json(req.user);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
