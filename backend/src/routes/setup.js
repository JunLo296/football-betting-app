// One-time setup endpoint to seed database
const express = require('express');
const router = express.Router();

let hasBeenRun = false;

// Function to initialize database
async function initializeDatabase() {
  if (hasBeenRun) {
    return {
      error: 'Database has already been initialized. This endpoint can only be run once per deployment.'
    };
  }

  try {
    // Import seed script logic
    const authService = require('../services/authService');
    const User = require('../models/User');
    const Match = require('../models/Match');
    const Bet = require('../models/Bet');

    const results = [];

    // Create admin user
    const adminExists = await User.findByUsername('admin');
    if (!adminExists) {
      await authService.register({
        username: 'admin',
        password: 'admin123',
        email: 'admin@family-betting.com',
        is_admin: true
      });
      results.push('✓ Admin user created');
    } else {
      results.push('⊘ Admin user already exists');
    }

    // Create family users
    const familyUsers = [
      { username: 'yijun', password: '1V81GisuE3xodban', email: 'yijun@family.com' },
      { username: 'jun', password: 'wmwP+KiiauTfNcb8', email: 'jun@family.com' },
      { username: 'alex', password: 'faa0E8VYePl+LJ0V', email: 'alex@family.com' },
      { username: 'max', password: 'TtF/zO3TiO5X8tX8', email: 'max@family.com' }
    ];

    for (const userData of familyUsers) {
      const exists = await User.findByUsername(userData.username);
      if (!exists) {
        await authService.register(userData);
        results.push(`✓ Created user: ${userData.username}`);
      } else {
        results.push(`⊘ User ${userData.username} already exists`);
      }
    }

    // Grant initial coins
    const allUsers = await User.getAll();
    for (const user of allUsers) {
      if (user.total_coins === 0) {
        await User.updateCoins(user.id, 100);
        results.push(`✓ Granted 100 coins to ${user.username}`);
      }
    }

    // Create sample matches
    const sampleMatches = [
      {
        api_match_id: 'wc2026_001',
        home_team: 'Germany',
        away_team: 'Spain',
        kickoff_time: new Date('2026-06-20T18:00:00Z').toISOString(),
        match_date: '2026-06-20',
        stage: 'group_stage',
        group_name: 'A',
        home_odds: 2.1,
        draw_odds: 3.2,
        away_odds: 3.5
      },
      {
        api_match_id: 'wc2026_002',
        home_team: 'Brazil',
        away_team: 'Argentina',
        kickoff_time: new Date('2026-06-21T21:00:00Z').toISOString(),
        match_date: '2026-06-21',
        stage: 'group_stage',
        group_name: 'B',
        home_odds: 2.4,
        draw_odds: 3.0,
        away_odds: 2.9
      },
      {
        api_match_id: 'wc2026_003',
        home_team: 'France',
        away_team: 'England',
        kickoff_time: new Date('2026-06-22T15:00:00Z').toISOString(),
        match_date: '2026-06-22',
        stage: 'group_stage',
        group_name: 'C',
        home_odds: 2.2,
        draw_odds: 3.1,
        away_odds: 3.3
      }
    ];

    for (const matchData of sampleMatches) {
      try {
        await Match.create(matchData);
        results.push(`✓ Created match: ${matchData.home_team} vs ${matchData.away_team}`);
      } catch (err) {
        if (err.message && err.message.includes('UNIQUE')) {
          results.push(`⊘ Match already exists: ${matchData.home_team} vs ${matchData.away_team}`);
        }
      }
    }

    hasBeenRun = true;

    return {
      success: true,
      message: 'Database initialized successfully!',
      details: results,
      credentials: {
        admin: { username: 'admin', password: 'admin123' },
        family: {
          yijun: 'yijun / 1V81GisuE3xodban',
          jun: 'jun / wmwP+KiiauTfNcb8',
          alex: 'alex / faa0E8VYePl+LJ0V',
          max: 'max / TtF/zO3TiO5X8tX8'
        }
      }
    };

  } catch (error) {
    console.error('Database initialization failed:', error);
    return {
      error: 'Failed to initialize database',
      details: error.message
    };
  }
}

// GET endpoint (easier for browser access)
router.get('/initialize-database', async (req, res) => {
  const result = await initializeDatabase();
  if (result.error) {
    return res.status(400).json(result);
  }
  res.json(result);
});

// POST endpoint
router.post('/initialize-database', async (req, res) => {
  const result = await initializeDatabase();
  if (result.error) {
    return res.status(400).json(result);
  }
  res.json(result);
});

module.exports = router;
