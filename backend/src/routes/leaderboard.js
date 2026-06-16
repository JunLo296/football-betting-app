// backend/src/routes/leaderboard.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authenticate = require('../middleware/auth');

// Get leaderboard
router.get('/', authenticate, async (req, res) => {
  try {
    const users = await User.getAll();

    // Sort by total_coins descending
    const leaderboard = users
      .map(user => ({
        id: user.id,
        username: user.username,
        total_coins: user.total_coins,
        is_admin: user.is_admin
      }))
      .sort((a, b) => b.total_coins - a.total_coins)
      .map((user, index) => ({
        rank: index + 1,
        ...user
      }));

    res.json({ leaderboard });
  } catch (err) {
    console.error('Get leaderboard error:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

module.exports = router;
