// Add World Cup 2026 matches to database
// Based on FIFA World Cup 2026 format (48 teams, 16 groups of 3)
const express = require('express');
const router = express.Router();
const Match = require('../models/Match');

// World Cup 2026 will run from June 11 - July 19, 2026
// 16 groups (A-P) with 3 teams each
// Top 2 from each group advance to Round of 32

const worldCup2026Matches = [
  // Group A
  { home: 'Mexico', away: 'Canada', date: '2026-06-11', time: '20:00', group: 'A', venue: 'Mexico City' },
  { home: 'USA', away: 'Mexico', date: '2026-06-12', time: '18:00', group: 'A', venue: 'Los Angeles' },
  { home: 'Canada', away: 'USA', date: '2026-06-13', time: '20:00', group: 'A', venue: 'Toronto' },

  // Group B
  { home: 'England', away: 'Iran', date: '2026-06-12', time: '14:00', group: 'B', venue: 'Dallas' },
  { home: 'Wales', away: 'England', date: '2026-06-13', time: '18:00', group: 'B', venue: 'New York' },
  { home: 'Iran', away: 'Wales', date: '2026-06-14', time: '16:00', group: 'B', venue: 'Boston' },

  // Group C
  { home: 'Argentina', away: 'Saudi Arabia', date: '2026-06-12', time: '11:00', group: 'C', venue: 'Miami' },
  { home: 'Poland', away: 'Argentina', date: '2026-06-13', time: '14:00', group: 'C', venue: 'Atlanta' },
  { home: 'Saudi Arabia', away: 'Poland', date: '2026-06-14', time: '20:00', group: 'C', venue: 'Houston' },

  // Group D
  { home: 'France', away: 'Australia', date: '2026-06-13', time: '20:00', group: 'D', venue: 'Seattle' },
  { home: 'Denmark', away: 'France', date: '2026-06-14', time: '18:00', group: 'D', venue: 'San Francisco' },
  { home: 'Australia', away: 'Denmark', date: '2026-06-15', time: '14:00', group: 'D', venue: 'Vancouver' },

  // Group E
  { home: 'Spain', away: 'Costa Rica', date: '2026-06-14', time: '11:00', group: 'E', venue: 'Kansas City' },
  { home: 'Germany', away: 'Spain', date: '2026-06-15', time: '20:00', group: 'E', venue: 'Philadelphia' },
  { home: 'Costa Rica', away: 'Germany', date: '2026-06-16', time: '18:00', group: 'E', venue: 'Chicago' },

  // Group F
  { home: 'Belgium', away: 'Morocco', date: '2026-06-14', time: '14:00', group: 'F', venue: 'Montreal' },
  { home: 'Croatia', away: 'Belgium', date: '2026-06-15', time: '18:00', group: 'F', venue: 'Detroit' },
  { home: 'Morocco', away: 'Croatia', date: '2026-06-16', time: '14:00', group: 'F', venue: 'Edmonton' },

  // Group G
  { home: 'Brazil', away: 'Serbia', date: '2026-06-15', time: '20:00', group: 'G', venue: 'Las Vegas' },
  { home: 'Switzerland', away: 'Brazil', date: '2026-06-16', time: '18:00', group: 'G', venue: 'Denver' },
  { home: 'Serbia', away: 'Switzerland', date: '2026-06-17', time: '14:00', group: 'G', venue: 'Nashville' },

  // Group H
  { home: 'Portugal', away: 'Ghana', date: '2026-06-16', time: '20:00', group: 'H', venue: 'Washington DC' },
  { home: 'Uruguay', away: 'Portugal', date: '2026-06-17', time: '18:00', group: 'H', venue: 'Cincinnati' },
  { home: 'Ghana', away: 'Uruguay', date: '2026-06-18', time: '14:00', group: 'H', venue: 'Minneapolis' },

  // Group I
  { home: 'Netherlands', away: 'Senegal', date: '2026-06-16', time: '14:00', group: 'I', venue: 'Baltimore' },
  { home: 'Ecuador', away: 'Netherlands', date: '2026-06-17', time: '20:00', group: 'I', venue: 'Phoenix' },
  { home: 'Senegal', away: 'Ecuador', date: '2026-06-18', time: '18:00', group: 'I', venue: 'Monterrey' },

  // Group J
  { home: 'Japan', away: 'Colombia', date: '2026-06-17', time: '14:00', group: 'J', venue: 'Tampa' },
  { home: 'South Korea', away: 'Japan', date: '2026-06-18', time: '20:00', group: 'J', venue: 'Orlando' },
  { home: 'Colombia', away: 'South Korea', date: '2026-06-19', time: '18:00', group: 'J', venue: 'Guadalajara' },
];

router.get('/add-world-cup-matches', async (req, res) => {
  try {
    const results = [];
    let added = 0;
    let skipped = 0;

    for (const match of worldCup2026Matches) {
      try {
        const kickoffTime = new Date(`${match.date}T${match.time}:00.000Z`).toISOString();

        const matchData = {
          api_match_id: `wc2026_${match.home}_${match.away}`.toLowerCase().replace(/\s+/g, '_'),
          home_team: match.home,
          away_team: match.away,
          kickoff_time: kickoffTime,
          match_date: match.date,
          stage: 'group_stage',
          group_name: match.group,
          home_odds: 2.0 + Math.random() * 1.5, // Random odds between 2.0-3.5
          draw_odds: 2.8 + Math.random() * 0.8, // Random odds between 2.8-3.6
          away_odds: 2.0 + Math.random() * 1.5, // Random odds between 2.0-3.5
        };

        await Match.create(matchData);
        added++;
        results.push(`✓ Added: ${match.home} vs ${match.away} (Group ${match.group}, ${match.date})`);
      } catch (err) {
        if (err.message && err.message.includes('UNIQUE')) {
          skipped++;
          results.push(`⊘ Already exists: ${match.home} vs ${match.away}`);
        } else {
          results.push(`✗ Failed: ${match.home} vs ${match.away} - ${err.message}`);
        }
      }
    }

    res.json({
      success: true,
      message: `World Cup 2026 matches loaded! Added ${added}, skipped ${skipped}`,
      details: results,
      summary: {
        total: worldCup2026Matches.length,
        added,
        skipped
      }
    });

  } catch (error) {
    console.error('Failed to add World Cup matches:', error);
    res.status(500).json({
      error: 'Failed to add matches',
      details: error.message
    });
  }
});

module.exports = router;
