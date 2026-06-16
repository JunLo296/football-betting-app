// backend/tests/integration/specialBets.test.js
const request = require('supertest');
const { initDatabase, runMigrations } = require('../../src/config/database');
const SpecialBet = require('../../src/models/SpecialBet');
const SpecialBetOption = require('../../src/models/SpecialBetOption');
const SpecialBetPrediction = require('../../src/models/SpecialBetPrediction');
const User = require('../../src/models/User');

// Mock environment variables
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRES_IN = '1h';

// Import services and app after models are loaded
const authService = require('../../src/services/authService');
const app = require('../../src/app');

describe('Special Bets Endpoints', () => {
  let db;
  let adminToken;
  let userToken;
  let userId;
  let specialBetId;
  let optionId1;
  let optionId2;

  beforeAll(async () => {
    // Initialize test database
    db = await initDatabase(':memory:');
    await runMigrations(db);

    // Set db for all models
    SpecialBet.setDb(db);
    SpecialBetOption.setDb(db);
    SpecialBetPrediction.setDb(db);
    User.setDb(db);
  });

  beforeEach(async () => {
    // Create admin user with unique username for each test
    const adminUsername = `admin_${Date.now()}_${Math.random()}`;
    const admin = await authService.register({
      username: adminUsername,
      password: 'admin123',
      email: `${adminUsername}@example.com`,
      is_admin: true
    });
    adminToken = await authService.generateToken({
      userId: admin.id,
      username: admin.username
    });

    // Create regular user with unique username for each test
    const userUsername = `testuser_${Date.now()}_${Math.random()}`;
    const user = await authService.register({
      username: userUsername,
      password: 'password123',
      email: `${userUsername}@example.com`
    });
    userId = user.id;
    userToken = await authService.generateToken({
      userId: user.id,
      username: user.username
    });

    // Grant coins to user
    await User.updateCoins(userId, 100);

    // Create a test special bet
    const specialBet = await SpecialBet.create({
      title: 'World Cup 2026 Winner',
      type: 'tournament_winner',
      lock_time: '2027-06-15T00:00:00Z', // Future date
      status: 'open'
    });
    specialBetId = specialBet.id;

    // Create options
    const option1 = await SpecialBetOption.create({
      special_bet_id: specialBetId,
      option_text: 'Brazil',
      odds: 3.5
    });
    optionId1 = option1.id;

    const option2 = await SpecialBetOption.create({
      special_bet_id: specialBetId,
      option_text: 'Argentina',
      odds: 4.0
    });
    optionId2 = option2.id;
  });

  afterAll(async () => {
    if (db) {
      await new Promise((resolve) => db.close(resolve));
    }
  });

  describe('GET /api/special-bets', () => {
    it('should return all special bets with options', async () => {
      const res = await request(app)
        .get('/api/special-bets')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('special_bets');
      expect(Array.isArray(res.body.special_bets)).toBe(true);
      expect(res.body.special_bets.length).toBeGreaterThan(0);

      const bet = res.body.special_bets[0];
      expect(bet).toHaveProperty('id');
      expect(bet).toHaveProperty('title');
      expect(bet).toHaveProperty('options');
      expect(Array.isArray(bet.options)).toBe(true);
    });

    it('should filter by status', async () => {
      const res = await request(app)
        .get('/api/special-bets?status=open')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.special_bets.every(bet => bet.status === 'open')).toBe(true);
    });

    it('should require authentication', async () => {
      const res = await request(app).get('/api/special-bets');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/special-bets/:id', () => {
    it('should return specific special bet with options', async () => {
      const res = await request(app)
        .get(`/api/special-bets/${specialBetId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', specialBetId);
      expect(res.body).toHaveProperty('title', 'World Cup 2026 Winner');
      expect(res.body).toHaveProperty('options');
      expect(res.body.options.length).toBe(2);
    });

    it('should return 404 for non-existent special bet', async () => {
      const res = await request(app)
        .get('/api/special-bets/99999')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/special-bets/:id/predict', () => {
    it('should place a prediction successfully', async () => {
      const res = await request(app)
        .post(`/api/special-bets/${specialBetId}/predict`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          option_id: optionId1,
          coins_bet: 10
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('prediction_id');
      expect(res.body).toHaveProperty('new_balance', 90);
      expect(res.body).toHaveProperty('potential_payout', 35);
    });

    it('should reject duplicate prediction on same special bet', async () => {
      // First, place a prediction
      await request(app)
        .post(`/api/special-bets/${specialBetId}/predict`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          option_id: optionId1,
          coins_bet: 10
        });

      // Try to place another prediction on the same special bet
      const res = await request(app)
        .post(`/api/special-bets/${specialBetId}/predict`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          option_id: optionId2,
          coins_bet: 10
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('already placed a prediction');
    });

    it('should reject prediction with insufficient coins', async () => {
      // Create a new special bet
      const newBet = await SpecialBet.create({
        title: 'Top Scorer',
        type: 'top_scorer',
        lock_time: '2027-06-15T00:00:00Z',
        status: 'open'
      });

      const newOption = await SpecialBetOption.create({
        special_bet_id: newBet.id,
        option_text: 'Player A',
        odds: 5.0
      });

      const res = await request(app)
        .post(`/api/special-bets/${newBet.id}/predict`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          option_id: newOption.id,
          coins_bet: 1000
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Insufficient coins');
    });

    it('should reject prediction without option_id', async () => {
      const newBet = await SpecialBet.create({
        title: 'Golden Boot',
        type: 'golden_boot',
        lock_time: '2027-06-15T00:00:00Z',
        status: 'open'
      });

      const res = await request(app)
        .post(`/api/special-bets/${newBet.id}/predict`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          coins_bet: 10
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('required');
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .post(`/api/special-bets/${specialBetId}/predict`)
        .send({
          option_id: optionId1,
          coins_bet: 10
        });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/special-bets/my-predictions', () => {
    it('should return user predictions', async () => {
      // First place a prediction
      await request(app)
        .post(`/api/special-bets/${specialBetId}/predict`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          option_id: optionId1,
          coins_bet: 10
        });

      // Now get predictions
      const res = await request(app)
        .get('/api/special-bets/my-predictions')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('predictions');
      expect(Array.isArray(res.body.predictions)).toBe(true);
      expect(res.body.predictions.length).toBeGreaterThan(0);

      const prediction = res.body.predictions[0];
      expect(prediction).toHaveProperty('prediction_id');
      expect(prediction).toHaveProperty('special_bet_title');
      expect(prediction).toHaveProperty('option_text');
      expect(prediction).toHaveProperty('status');
    });

    it('should require authentication', async () => {
      const res = await request(app).get('/api/special-bets/my-predictions');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/special-bets (admin only)', () => {
    it('should create a special bet', async () => {
      const res = await request(app)
        .post('/api/special-bets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Most Goals Team',
          type: 'most_goals_team',
          lock_time: '2027-06-15T00:00:00Z',
          options: [
            { option_text: 'Germany', odds: 3.0 },
            { option_text: 'France', odds: 3.5 },
            { option_text: 'Spain', odds: 4.0 }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('special_bet');
      expect(res.body.special_bet).toHaveProperty('id');
      expect(res.body.special_bet).toHaveProperty('title', 'Most Goals Team');
      expect(res.body.special_bet.options.length).toBe(3);
    });

    it('should reject creation without admin rights', async () => {
      const res = await request(app)
        .post('/api/special-bets')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Test Bet',
          type: 'test',
          lock_time: '2027-06-15T00:00:00Z',
          options: [{ option_text: 'Option 1', odds: 2.0 }]
        });

      expect(res.status).toBe(403);
    });

    it('should reject creation without required fields', async () => {
      const res = await request(app)
        .post('/api/special-bets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Incomplete Bet'
        });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/special-bets/:id/resolve (admin only)', () => {
    it('should resolve a special bet', async () => {
      // Create a new special bet for resolution
      const bet = await SpecialBet.create({
        title: 'Test Resolution',
        type: 'test',
        lock_time: '2027-06-15T00:00:00Z',
        status: 'locked'
      });

      const option1 = await SpecialBetOption.create({
        special_bet_id: bet.id,
        option_text: 'Winner',
        odds: 2.0
      });

      const option2 = await SpecialBetOption.create({
        special_bet_id: bet.id,
        option_text: 'Loser',
        odds: 3.0
      });

      // Create a new user and prediction
      const bettorUsername = `bettor_${Date.now()}_${Math.random()}`;
      const newUser = await authService.register({
        username: bettorUsername,
        password: 'pass123',
        email: `${bettorUsername}@example.com`
      });
      await User.updateCoins(newUser.id, 100);

      await SpecialBetPrediction.create({
        user_id: newUser.id,
        special_bet_option_id: option1.id,
        coins_bet: 20,
        odds_at_bet_time: 2.0
      });

      const res = await request(app)
        .post(`/api/special-bets/${bet.id}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          correct_option_id: option1.id
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Special bet resolved successfully');
      expect(res.body).toHaveProperty('winners_count', 1);
      expect(res.body).toHaveProperty('total_payout', 40);
    });

    it('should reject resolution without admin rights', async () => {
      const res = await request(app)
        .post(`/api/special-bets/${specialBetId}/resolve`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          correct_option_id: optionId1
        });

      expect(res.status).toBe(403);
    });

    it('should reject resolution without correct_option_id', async () => {
      const res = await request(app)
        .post(`/api/special-bets/${specialBetId}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });
});
