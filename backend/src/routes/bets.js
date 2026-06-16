// backend/src/routes/bets.js
const express = require('express');
const router = express.Router();
const betService = require('../services/betService');
const Bet = require('../models/Bet');
const authenticate = require('../middleware/auth');

// Place a bet
router.post('/', authenticate, async (req, res) => {
  try {
    const { match_id, outcome, coins_bet } = req.body;

    if (!match_id || !outcome || coins_bet == null) {
      return res.status(400).json({ error: 'match_id, outcome, and coins_bet are required' });
    }

    const result = await betService.placeBet({
      user_id: req.user.id,
      match_id,
      outcome,
      coins_bet
    });

    res.status(201).json(result);
  } catch (err) {
    if (err.message === 'Insufficient coins' ||
        err.message === 'Invalid outcome' ||
        err.message === 'Match is locked' ||
        err.message === 'Coins must be greater than 0') {
      return res.status(400).json({ error: err.message });
    }
    if (err.message === 'Match not found') {
      return res.status(404).json({ error: err.message });
    }
    console.error('Place bet error:', err);
    res.status(500).json({ error: 'Failed to place bet' });
  }
});

// Get current user's bets
router.get('/my-bets', authenticate, async (req, res) => {
  try {
    const bets = await betService.getUserBets(req.user.id);
    res.json({ bets });
  } catch (err) {
    console.error('Get user bets error:', err);
    res.status(500).json({ error: 'Failed to fetch bets' });
  }
});

// Get all bets for a specific match
router.get('/match/:matchId', authenticate, async (req, res) => {
  try {
    const bets = await Bet.findByMatch(req.params.matchId);
    res.json({ bets });
  } catch (err) {
    console.error('Get match bets error:', err);
    res.status(500).json({ error: 'Failed to fetch match bets' });
  }
});

module.exports = router;
