// backend/src/routes/matches.js
const express = require('express');
const router = express.Router();
const Match = require('../models/Match');
const authenticate = require('../middleware/auth');
const requireAdmin = require('../middleware/admin');

/**
 * GET /api/matches
 * Get all matches
 */
router.get('/', async (req, res) => {
  try {
    const matches = await Match.getAll();
    res.status(200).json(matches);
  } catch (error) {
    console.error('Error fetching matches:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/matches/:id
 * Get a specific match by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const matchId = parseInt(req.params.id, 10);

    if (isNaN(matchId)) {
      return res.status(400).json({ error: 'Invalid match ID' });
    }

    const match = await Match.findById(matchId);

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    res.status(200).json(match);
  } catch (error) {
    console.error('Error fetching match:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/matches/:id/confirm
 * Confirm match result (admin-only)
 */
router.post('/:id/confirm', authenticate, requireAdmin, async (req, res) => {
  try {
    const matchId = parseInt(req.params.id, 10);

    if (isNaN(matchId)) {
      return res.status(400).json({ error: 'Invalid match ID' });
    }

    // First check if the match exists
    const match = await Match.findById(matchId);

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Check if match has scores set
    if (match.home_score === null || match.away_score === null) {
      return res.status(400).json({ error: 'Cannot confirm match without scores' });
    }

    // Check if match is already confirmed
    if (match.status === 'confirmed') {
      return res.status(400).json({ error: 'Match already confirmed' });
    }

    // Confirm the match result
    const result = await Match.confirmResult(matchId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Fetch the updated match
    const updatedMatch = await Match.findById(matchId);

    res.status(200).json({
      message: 'Match result confirmed',
      match: updatedMatch
    });
  } catch (error) {
    console.error('Error confirming match:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
