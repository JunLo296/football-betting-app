// backend/src/routes/admin.js
const express = require('express');
const router = express.Router();
const Match = require('../models/Match');
const User = require('../models/User');
const payoutService = require('../services/payoutService');
const authenticate = require('../middleware/auth');
const requireAdmin = require('../middleware/admin');

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// Create a new match
router.post('/matches', async (req, res) => {
  try {
    const {
      api_match_id,
      home_team,
      away_team,
      kickoff_time,
      match_date,
      stage,
      group_name,
      home_odds,
      draw_odds,
      away_odds
    } = req.body;

    if (!home_team || !away_team || !kickoff_time || !match_date || !stage) {
      return res.status(400).json({ error: 'Required fields: home_team, away_team, kickoff_time, match_date, stage' });
    }

    const match = await Match.create({
      api_match_id,
      home_team,
      away_team,
      kickoff_time,
      match_date,
      stage,
      group_name,
      home_odds,
      draw_odds,
      away_odds
    });

    res.status(201).json(match);
  } catch (err) {
    console.error('Create match error:', err);
    res.status(500).json({ error: 'Failed to create match' });
  }
});

// Update match odds
router.patch('/matches/:id/odds', async (req, res) => {
  try {
    const { home_odds, draw_odds, away_odds } = req.body;

    if (home_odds == null || draw_odds == null || away_odds == null) {
      return res.status(400).json({ error: 'All odds are required' });
    }

    const match = await Match.findById(req.params.id);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Update odds (this would be a new method in Match model)
    await Match.updateOdds(req.params.id, home_odds, draw_odds, away_odds);

    res.json({ message: 'Odds updated successfully', match_id: parseInt(req.params.id) });
  } catch (err) {
    console.error('Update odds error:', err);
    res.status(500).json({ error: 'Failed to update odds' });
  }
});

// Confirm match result and trigger payouts
router.post('/matches/:id/confirm-result', async (req, res) => {
  try {
    const { home_score, away_score, result } = req.body;

    if (home_score == null || away_score == null || !result) {
      return res.status(400).json({ error: 'home_score, away_score, and result are required' });
    }

    if (!['home_win', 'draw', 'away_win'].includes(result)) {
      return res.status(400).json({ error: 'Invalid result value' });
    }

    const match = await Match.findById(req.params.id);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Confirm match result
    await Match.confirmResult(req.params.id, { home_score, away_score, result });

    // Process payouts
    const payoutSummary = await payoutService.processPayout(parseInt(req.params.id), result);

    res.json({
      message: 'Match result confirmed and payouts processed',
      match_id: parseInt(req.params.id),
      payout_summary: payoutSummary
    });
  } catch (err) {
    console.error('Confirm result error:', err);
    res.status(500).json({ error: 'Failed to confirm result' });
  }
});

// Grant coins to a user (admin action)
router.post('/users/:userId/grant-coins', async (req, res) => {
  try {
    const { amount, reason } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await User.updateCoins(req.params.userId, amount);

    const updatedUser = await User.findById(req.params.userId);

    res.json({
      message: 'Coins granted successfully',
      user_id: parseInt(req.params.userId),
      amount_granted: amount,
      new_balance: updatedUser.total_coins,
      reason: reason || 'Admin grant'
    });
  } catch (err) {
    console.error('Grant coins error:', err);
    res.status(500).json({ error: 'Failed to grant coins' });
  }
});

// Get all users (admin view)
router.get('/users', async (req, res) => {
  try {
    const users = await User.getAll();
    res.json({ users });
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

module.exports = router;
