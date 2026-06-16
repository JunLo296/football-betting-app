// backend/src/routes/specialBets.js
const express = require('express');
const router = express.Router();
const specialBetService = require('../services/specialBetService');
const SpecialBet = require('../models/SpecialBet');
const SpecialBetOption = require('../models/SpecialBetOption');
const authenticate = require('../middleware/auth');
const requireAdmin = require('../middleware/admin');

/**
 * GET /api/special-bets
 * Get all special bets with their options
 * Query params: status (optional)
 * Auth: Required
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { status } = req.query;
    const filters = {};

    if (status) {
      filters.status = status;
    }

    const specialBets = await specialBetService.getAllSpecialBetsWithOptions(filters);

    res.json({ special_bets: specialBets });
  } catch (err) {
    console.error('Error fetching special bets:', err);
    res.status(500).json({ error: 'Failed to fetch special bets' });
  }
});

/**
 * GET /api/special-bets/my-predictions
 * Get current user's predictions
 * Auth: Required
 * Note: This route must come before /:id to avoid route conflict
 */
router.get('/my-predictions', authenticate, async (req, res) => {
  try {
    const predictions = await specialBetService.getUserPredictions(req.user.id);

    res.json({ predictions });
  } catch (err) {
    console.error('Error fetching user predictions:', err);
    res.status(500).json({ error: 'Failed to fetch predictions' });
  }
});

/**
 * GET /api/special-bets/:id
 * Get specific special bet with options
 * Auth: Required
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const specialBet = await specialBetService.getSpecialBetWithOptions(
      parseInt(req.params.id)
    );

    if (!specialBet) {
      return res.status(404).json({ error: 'Special bet not found' });
    }

    res.json(specialBet);
  } catch (err) {
    console.error('Error fetching special bet:', err);
    res.status(500).json({ error: 'Failed to fetch special bet' });
  }
});

/**
 * POST /api/special-bets/:id/predict
 * Place a prediction on a special bet
 * Body: { option_id, coins_bet }
 * Auth: Required
 */
router.post('/:id/predict', authenticate, async (req, res) => {
  try {
    const { option_id, coins_bet } = req.body;

    if (!option_id || !coins_bet) {
      return res.status(400).json({ error: 'option_id and coins_bet are required' });
    }

    if (typeof coins_bet !== 'number' || coins_bet <= 0) {
      return res.status(400).json({ error: 'coins_bet must be a positive number' });
    }

    const result = await specialBetService.placePrediction({
      user_id: req.user.id,
      special_bet_id: parseInt(req.params.id),
      option_id,
      coins_bet
    });

    res.status(201).json(result);
  } catch (err) {
    console.error('Error placing prediction:', err);

    // Handle specific validation errors
    if (
      err.message.includes('Insufficient coins') ||
      err.message.includes('locked') ||
      err.message.includes('not open') ||
      err.message.includes('already placed') ||
      err.message.includes('Invalid option') ||
      err.message.includes('Coins must be')
    ) {
      return res.status(400).json({ error: err.message });
    }

    if (err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }

    res.status(500).json({ error: 'Failed to place prediction' });
  }
});

/**
 * POST /api/special-bets
 * Create a new special bet with options
 * Body: { title, type, lock_time, options: [{ option_text, odds }] }
 * Auth: Admin only
 */
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { title, type, lock_time, options, status = 'open' } = req.body;

    // Validate required fields
    if (!title || !type || !lock_time) {
      return res.status(400).json({
        error: 'title, type, and lock_time are required'
      });
    }

    if (!options || !Array.isArray(options) || options.length === 0) {
      return res.status(400).json({
        error: 'options array is required and must not be empty'
      });
    }

    // Validate each option
    for (const option of options) {
      if (!option.option_text || !option.odds) {
        return res.status(400).json({
          error: 'Each option must have option_text and odds'
        });
      }
      if (typeof option.odds !== 'number' || option.odds <= 0) {
        return res.status(400).json({
          error: 'odds must be a positive number'
        });
      }
    }

    // Create the special bet
    const specialBet = await SpecialBet.create({
      title,
      type,
      lock_time,
      status
    });

    // Create the options
    const createdOptions = [];
    for (const option of options) {
      const createdOption = await SpecialBetOption.create({
        special_bet_id: specialBet.id,
        option_text: option.option_text,
        odds: option.odds
      });
      createdOptions.push(createdOption);
    }

    res.status(201).json({
      special_bet: {
        ...specialBet,
        options: createdOptions
      }
    });
  } catch (err) {
    console.error('Error creating special bet:', err);
    res.status(500).json({ error: 'Failed to create special bet' });
  }
});

/**
 * POST /api/special-bets/:id/resolve
 * Resolve a special bet and process payouts
 * Body: { correct_option_id }
 * Auth: Admin only
 */
router.post('/:id/resolve', authenticate, requireAdmin, async (req, res) => {
  try {
    const { correct_option_id } = req.body;

    if (!correct_option_id) {
      return res.status(400).json({ error: 'correct_option_id is required' });
    }

    const result = await specialBetService.resolveSpecialBet(
      parseInt(req.params.id),
      correct_option_id
    );

    res.json({
      message: 'Special bet resolved successfully',
      ...result
    });
  } catch (err) {
    console.error('Error resolving special bet:', err);

    if (err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }

    if (err.message.includes('Invalid option')) {
      return res.status(400).json({ error: err.message });
    }

    res.status(500).json({ error: 'Failed to resolve special bet' });
  }
});

module.exports = router;
