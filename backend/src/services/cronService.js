// backend/src/services/cronService.js
const cron = require('node-cron');
const User = require('../models/User');
const Match = require('../models/Match');
const oddsApiService = require('./oddsApiService');
const apiFootballService = require('./apiFootballService');
const { initDatabase } = require('../config/database');

/**
 * CronService - Manages scheduled tasks for the betting app
 *
 * Jobs:
 * 1. Daily coin grants - Runs once per day at midnight
 * 2. Odds updates - Runs every 4 hours to update match odds
 * 3. Live scores - Runs every 5 minutes during matches
 */
class CronService {
  constructor() {
    this.jobs = [];
    this.db = null;
  }

  /**
   * Initialize database connection
   */
  async initDb() {
    if (!this.db) {
      this.db = await initDatabase();
    }
    return this.db;
  }

  /**
   * Grant daily coins to all users
   * Runs once per day at midnight
   */
  async grantDailyCoins() {
    try {
      console.log('[CRON] Starting daily coin grant...');
      const db = await this.initDb();

      // Get all users
      const users = await User.getAll();
      console.log(`[CRON] Found ${users.length} users to process`);

      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      let grantedCount = 0;
      let skippedCount = 0;

      for (const user of users) {
        try {
          // Check if user already received coins today
          const existingGrant = await this.checkDailyGrant(db, user.id, today);

          if (existingGrant) {
            skippedCount++;
            continue;
          }

          // Grant coins
          await User.updateCoins(user.id, 10);

          // Record the grant
          await this.recordDailyGrant(db, user.id, today, 10);

          grantedCount++;
          console.log(`[CRON] Granted 10 coins to user ${user.username} (ID: ${user.id})`);
        } catch (userError) {
          console.error(`[CRON] Error granting coins to user ${user.id}:`, userError.message);
        }
      }

      console.log(`[CRON] Daily coin grant completed. Granted: ${grantedCount}, Skipped: ${skippedCount}`);
    } catch (error) {
      console.error('[CRON] Error in grantDailyCoins:', error.message);
    }
  }

  /**
   * Check if user already received daily grant
   * @param {Database} db - Database instance
   * @param {number} userId - User ID
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Promise<Object|null>} Grant record or null
   */
  checkDailyGrant(db, userId, date) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM daily_coin_grants WHERE user_id = ? AND grant_date = ?';

      db.get(sql, [userId, date], (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      });
    });
  }

  /**
   * Record daily coin grant
   * @param {Database} db - Database instance
   * @param {number} userId - User ID
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {number} amount - Coins granted
   * @returns {Promise<void>}
   */
  recordDailyGrant(db, userId, date, amount) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO daily_coin_grants (user_id, grant_date, coins_granted)
        VALUES (?, ?, ?)
      `;

      db.run(sql, [userId, date, amount], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Update odds for upcoming matches
   * Runs every 4 hours
   */
  async updateMatchOdds() {
    try {
      console.log('[CRON] Starting odds update...');
      const db = await this.initDb();

      // Get all upcoming matches
      const matches = await this.getUpcomingMatches(db);
      console.log(`[CRON] Found ${matches.length} upcoming matches to update`);

      let updatedCount = 0;
      let skippedCount = 0;

      for (const match of matches) {
        try {
          // Skip matches without API ID
          if (!match.api_match_id) {
            skippedCount++;
            continue;
          }

          // Fetch updated odds from Odds API
          const odds = await oddsApiService.getOddsForMatch(
            'soccer_fifa_world_cup',
            match.home_team,
            match.away_team
          );

          if (!odds) {
            console.log(`[CRON] No odds found for match ${match.id}: ${match.home_team} vs ${match.away_team}`);
            skippedCount++;
            continue;
          }

          // Update match odds
          await Match.updateOdds(match.id, odds.home_odds, odds.draw_odds, odds.away_odds);
          updatedCount++;
          console.log(`[CRON] Updated odds for match ${match.id}: ${match.home_team} vs ${match.away_team}`);
        } catch (matchError) {
          console.error(`[CRON] Error updating odds for match ${match.id}:`, matchError.message);
          skippedCount++;
        }
      }

      console.log(`[CRON] Odds update completed. Updated: ${updatedCount}, Skipped: ${skippedCount}`);
    } catch (error) {
      console.error('[CRON] Error in updateMatchOdds:', error.message);
    }
  }

  /**
   * Get upcoming matches from database
   * @param {Database} db - Database instance
   * @returns {Promise<Array>} Array of upcoming matches
   */
  getUpcomingMatches(db) {
    return new Promise((resolve, reject) => {
      const sql = "SELECT * FROM matches WHERE status = 'upcoming' ORDER BY kickoff_time ASC";

      db.all(sql, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  /**
   * Update live scores for ongoing matches
   * Runs every 5 minutes during tournament
   */
  async updateLiveScores() {
    try {
      console.log('[CRON] Starting live scores update...');

      // Get all live matches
      const liveMatches = await Match.getLiveMatches();

      if (liveMatches.length === 0) {
        console.log('[CRON] No live matches found');
        return;
      }

      console.log(`[CRON] Found ${liveMatches.length} live matches to update`);

      // Get API match IDs
      const apiMatchIds = liveMatches
        .filter(match => match.api_match_id)
        .map(match => match.api_match_id);

      if (apiMatchIds.length === 0) {
        console.log('[CRON] No matches with API IDs found');
        return;
      }

      // Fetch live scores from API
      const liveScores = await apiFootballService.getLiveScores(apiMatchIds);

      let updatedCount = 0;

      // Update each match with latest scores
      for (const scoreData of liveScores) {
        try {
          // Find the corresponding match in our database
          const match = liveMatches.find(m => m.api_match_id === scoreData.api_match_id);

          if (!match) {
            continue;
          }

          // Calculate result based on scores
          let result = null;
          if (scoreData.home_score !== null && scoreData.away_score !== null) {
            if (scoreData.home_score > scoreData.away_score) {
              result = 'home_win';
            } else if (scoreData.home_score < scoreData.away_score) {
              result = 'away_win';
            } else {
              result = 'draw';
            }
          }

          // Update scores
          await Match.updateScores(match.id, scoreData.home_score, scoreData.away_score, result);

          // Update status if match is finished
          if (scoreData.status === 'finished' && match.status !== 'finished') {
            await Match.updateStatus(match.id, 'finished');
            console.log(`[CRON] Match ${match.id} finished: ${match.home_team} ${scoreData.home_score}-${scoreData.away_score} ${match.away_team}`);
          } else {
            console.log(`[CRON] Updated scores for match ${match.id}: ${match.home_team} ${scoreData.home_score}-${scoreData.away_score} ${match.away_team}`);
          }

          updatedCount++;
        } catch (matchError) {
          console.error(`[CRON] Error updating match ${scoreData.api_match_id}:`, matchError.message);
        }
      }

      console.log(`[CRON] Live scores update completed. Updated: ${updatedCount} matches`);
    } catch (error) {
      console.error('[CRON] Error in updateLiveScores:', error.message);
    }
  }

  /**
   * Start all cron jobs
   */
  startCronJobs() {
    console.log('[CRON] Initializing cron jobs...');

    // Daily coin grant - runs at midnight every day
    // Schedule: '0 0 * * *' (minute=0, hour=0, every day)
    const dailyCoinsJob = cron.schedule('0 0 * * *', () => {
      console.log('[CRON] Running scheduled daily coin grant...');
      this.grantDailyCoins();
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    this.jobs.push({ name: 'dailyCoins', job: dailyCoinsJob });
    console.log('[CRON] Daily coin grant job scheduled (runs at midnight UTC)');

    // Odds update - runs every 4 hours
    // Schedule: '0 */4 * * *' (minute=0, every 4 hours)
    const oddsUpdateJob = cron.schedule('0 */4 * * *', () => {
      console.log('[CRON] Running scheduled odds update...');
      this.updateMatchOdds();
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    this.jobs.push({ name: 'oddsUpdate', job: oddsUpdateJob });
    console.log('[CRON] Odds update job scheduled (runs every 4 hours)');

    // Live scores update - runs every 5 minutes
    // Schedule: '*/5 * * * *' (every 5 minutes)
    const liveScoresJob = cron.schedule('*/5 * * * *', () => {
      console.log('[CRON] Running scheduled live scores update...');
      this.updateLiveScores();
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    this.jobs.push({ name: 'liveScores', job: liveScoresJob });
    console.log('[CRON] Live scores job scheduled (runs every 5 minutes)');

    console.log('[CRON] All cron jobs initialized successfully');
    console.log('[CRON] Active jobs:', this.jobs.map(j => j.name).join(', '));
  }

  /**
   * Stop all cron jobs
   */
  stopCronJobs() {
    console.log('[CRON] Stopping all cron jobs...');

    for (const { name, job } of this.jobs) {
      job.stop();
      console.log(`[CRON] Stopped job: ${name}`);
    }

    this.jobs = [];
    console.log('[CRON] All cron jobs stopped');
  }

  /**
   * Get status of all cron jobs
   * @returns {Array} Array of job status objects
   */
  getJobsStatus() {
    return this.jobs.map(({ name, job }) => ({
      name,
      running: job.getStatus() === 'scheduled'
    }));
  }
}

// Export singleton instance
module.exports = new CronService();
