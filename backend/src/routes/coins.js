// backend/src/routes/coins.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authenticate = require('../middleware/auth');

// Get current user's coin balance
router.get('/balance', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user_id: user.id,
      username: user.username,
      total_coins: user.total_coins
    });
  } catch (err) {
    console.error('Get balance error:', err);
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
});

module.exports = router;
