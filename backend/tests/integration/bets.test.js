// backend/tests/integration/bets.test.js
const request = require('supertest');
const { initDatabase, runMigrations } = require('../../src/config/database');
const Match = require('../../src/models/Match');
const User = require('../../src/models/User');
const Bet = require('../../src/models/Bet');
const authService = require('../../src/services/authService');

// Mock environment variables
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRES_IN = '1h';

// Import app after environment is set
const app = require('../../src/app');

describe('Bet Endpoints', () => {
  let testDb;
  let userToken;
  let userId;
  let matchId;

  beforeAll(async () => {
    // Initialize test database
    testDb = await initDatabase(':memory:');
    // Run migrations to create tables
    await runMigrations(testDb);

    // Set the test database for ALL models
    User.setDb(testDb);
    Match.setDb(testDb);
    Bet.setDb(testDb);

    // Create a user
    const user = await authService.register({
      username: 'testuser',
      password: 'password123',
      email: 'test@example.com'
    });
    userId = user.id;

    // Give user some coins
    await User.updateCoins(userId, 100);

    // Generate token after user is created
    userToken = await authService.generateToken({
      userId: user.id,
      username: user.username,
      is_admin: false
    });

    // Create a match
    const match = await Match.create({
      api_match_id: 'test_match_1',
      home_team: 'Germany',
      away_team: 'Spain',
      kickoff_time: new Date(Date.now() + 3600000).toISOString(),
      match_date: '2026-06-20',
      stage: 'group_stage',
      group_name: 'A',
      home_odds: 1.8,
      draw_odds: 3.2,
      away_odds: 4.5
    });
    matchId = match.id;
  });

  afterAll(async () => {
    if (testDb) {
      await new Promise((resolve) => testDb.close(resolve));
    }
  });

  describe('POST /api/bets', () => {
    it('should place a bet successfully', async () => {
      const res = await request(app)
        .post('/api/bets')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          match_id: matchId,
          outcome: 'home_win',
          coins_bet: 10
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('bet_id');
      expect(res.body).toHaveProperty('new_balance');
      expect(res.body).toHaveProperty('potential_payout');
      expect(res.body.potential_payout).toBe(18); // 10 * 1.8
    });

    it('should reject bet without authentication', async () => {
      const res = await request(app)
        .post('/api/bets')
        .send({
          match_id: matchId,
          outcome: 'home_win',
          coins_bet: 10
        });

      expect(res.status).toBe(401);
    });

    it('should reject bet with insufficient coins', async () => {
      const res = await request(app)
        .post('/api/bets')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          match_id: matchId,
          outcome: 'home_win',
          coins_bet: 1000
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Insufficient coins');
    });

    it('should reject bet with invalid outcome', async () => {
      const res = await request(app)
        .post('/api/bets')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          match_id: matchId,
          outcome: 'invalid',
          coins_bet: 10
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid outcome');
    });

    it('should reject bet on non-existent match', async () => {
      const res = await request(app)
        .post('/api/bets')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          match_id: 99999,
          outcome: 'home_win',
          coins_bet: 10
        });

      expect(res.status).toBe(404);
    });

    it('should reject bet on locked match', async () => {
      // Create a match that has already started
      const pastMatch = await Match.create({
        api_match_id: 'test_match_past',
        home_team: 'Brazil',
        away_team: 'Argentina',
        kickoff_time: new Date(Date.now() - 3600000).toISOString(),
        match_date: '2026-06-19',
        stage: 'group_stage',
        group_name: 'B',
        home_odds: 2.0,
        draw_odds: 3.0,
        away_odds: 3.5
      });

      const res = await request(app)
        .post('/api/bets')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          match_id: pastMatch.id,
          outcome: 'home_win',
          coins_bet: 10
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Match is locked');
    });
  });

  describe('GET /api/bets/my-bets', () => {
    it('should return user bets', async () => {
      const res = await request(app)
        .get('/api/bets/my-bets')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('bets');
      expect(Array.isArray(res.body.bets)).toBe(true);
      expect(res.body.bets.length).toBeGreaterThan(0);
    });

    it('should reject request without authentication', async () => {
      const res = await request(app).get('/api/bets/my-bets');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/bets/match/:matchId', () => {
    it('should return bets for a specific match', async () => {
      const res = await request(app)
        .get(`/api/bets/match/${matchId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('bets');
      expect(Array.isArray(res.body.bets)).toBe(true);
    });

    it('should reject request without authentication', async () => {
      const res = await request(app).get(`/api/bets/match/${matchId}`);

      expect(res.status).toBe(401);
    });
  });
});
