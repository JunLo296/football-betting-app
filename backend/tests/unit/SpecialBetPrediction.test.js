// backend/tests/unit/SpecialBetPrediction.test.js
const SpecialBetPrediction = require('../../src/models/SpecialBetPrediction');
const SpecialBet = require('../../src/models/SpecialBet');
const SpecialBetOption = require('../../src/models/SpecialBetOption');
const User = require('../../src/models/User');
const { initDatabase, runMigrations } = require('../../src/config/database');

describe('SpecialBetPrediction Model', () => {
  let db;
  let testUserId;
  let testSpecialBetId;
  let testOptionId;

  beforeAll(async () => {
    process.env.DATABASE_PATH = ':memory:';
    db = await initDatabase();
    await runMigrations(db);
    SpecialBetPrediction.setDb(db);
    SpecialBet.setDb(db);
    SpecialBetOption.setDb(db);
    User.setDb(db);

    // Create test user with unique username
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('testpass', 10);
    const testUsername = `testuser_${Date.now()}_${Math.random()}`;
    const user = await User.create({
      username: testUsername,
      password_hash: hashedPassword,
      email: `${testUsername}@example.com`
    });
    testUserId = user.id;

    // Grant some coins to the user
    await User.updateCoins(testUserId, 100);

    // Create a test special bet
    const specialBet = await SpecialBet.create({
      title: 'Test Tournament Winner',
      type: 'tournament_winner',
      lock_time: '2026-06-15T00:00:00Z'
    });
    testSpecialBetId = specialBet.id;

    // Create a test option
    const option = await SpecialBetOption.create({
      special_bet_id: testSpecialBetId,
      option_text: 'Brazil',
      odds: 3.5
    });
    testOptionId = option.id;
  });

  afterAll((done) => {
    db.close(done);
  });

  describe('create', () => {
    it('should create a prediction', async () => {
      const predictionData = {
        user_id: testUserId,
        special_bet_option_id: testOptionId,
        coins_bet: 10,
        odds_at_bet_time: 3.5
      };

      const prediction = await SpecialBetPrediction.create(predictionData);

      expect(prediction.id).toBeDefined();
      expect(prediction.user_id).toBe(testUserId);
      expect(prediction.special_bet_option_id).toBe(testOptionId);
      expect(prediction.coins_bet).toBe(10);
      expect(prediction.odds_at_bet_time).toBe(3.5);
    });

    it('should create prediction with null payout and is_winner by default', async () => {
      const predictionData = {
        user_id: testUserId,
        special_bet_option_id: testOptionId,
        coins_bet: 5,
        odds_at_bet_time: 3.5
      };

      const prediction = await SpecialBetPrediction.create(predictionData);

      expect(prediction.payout).toBeNull();
      expect(prediction.is_winner).toBeNull();
    });
  });

  describe('findById', () => {
    it('should find prediction by id', async () => {
      const created = await SpecialBetPrediction.create({
        user_id: testUserId,
        special_bet_option_id: testOptionId,
        coins_bet: 15,
        odds_at_bet_time: 3.5
      });

      const found = await SpecialBetPrediction.findById(created.id);

      expect(found).toBeDefined();
      expect(found.coins_bet).toBe(15);
    });

    it('should return null for non-existent id', async () => {
      const found = await SpecialBetPrediction.findById(99999);

      expect(found).toBeNull();
    });
  });

  describe('findByUser', () => {
    it('should find all predictions for a user', async () => {
      const predictions = await SpecialBetPrediction.findByUser(testUserId);

      expect(Array.isArray(predictions)).toBe(true);
      expect(predictions.length).toBeGreaterThan(0);
      expect(predictions.every(p => p.user_id === testUserId)).toBe(true);
    });

    it('should include special bet and option details', async () => {
      const predictions = await SpecialBetPrediction.findByUser(testUserId);

      expect(predictions.length).toBeGreaterThan(0);
      const prediction = predictions[0];
      expect(prediction).toHaveProperty('special_bet_title');
      expect(prediction).toHaveProperty('option_text');
      expect(prediction).toHaveProperty('special_bet_status');
    });

    it('should return empty array for user with no predictions', async () => {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('testpass2', 10);
      const newUsername = `newuser_${Date.now()}_${Math.random()}`;
      const newUser = await User.create({
        username: newUsername,
        password_hash: hashedPassword,
        email: `${newUsername}@example.com`
      });

      const predictions = await SpecialBetPrediction.findByUser(newUser.id);

      expect(Array.isArray(predictions)).toBe(true);
      expect(predictions.length).toBe(0);
    });
  });

  describe('findBySpecialBet', () => {
    it('should find all predictions for a special bet', async () => {
      const predictions = await SpecialBetPrediction.findBySpecialBet(testSpecialBetId);

      expect(Array.isArray(predictions)).toBe(true);
      predictions.forEach(p => {
        expect(p).toHaveProperty('username');
      });
    });
  });

  describe('findByOption', () => {
    it('should find all predictions for a specific option', async () => {
      const predictions = await SpecialBetPrediction.findByOption(testOptionId);

      expect(Array.isArray(predictions)).toBe(true);
      expect(predictions.every(p => p.special_bet_option_id === testOptionId)).toBe(true);
    });
  });

  describe('updatePayout', () => {
    it('should update prediction with payout for winner', async () => {
      const prediction = await SpecialBetPrediction.create({
        user_id: testUserId,
        special_bet_option_id: testOptionId,
        coins_bet: 20,
        odds_at_bet_time: 3.5
      });

      const expectedPayout = 20 * 3.5;
      await SpecialBetPrediction.updatePayout(prediction.id, expectedPayout, true);

      const updated = await SpecialBetPrediction.findById(prediction.id);
      expect(updated.payout).toBe(expectedPayout);
      expect(updated.is_winner).toBe(1); // SQLite stores boolean as 1
    });

    it('should update prediction with 0 payout for loser', async () => {
      const prediction = await SpecialBetPrediction.create({
        user_id: testUserId,
        special_bet_option_id: testOptionId,
        coins_bet: 20,
        odds_at_bet_time: 3.5
      });

      await SpecialBetPrediction.updatePayout(prediction.id, 0, false);

      const updated = await SpecialBetPrediction.findById(prediction.id);
      expect(updated.payout).toBe(0);
      expect(updated.is_winner).toBe(0); // SQLite stores boolean as 0
    });
  });

  describe('getWinningPredictions', () => {
    it('should get all winning predictions for an option', async () => {
      const newOption = await SpecialBetOption.create({
        special_bet_id: testSpecialBetId,
        option_text: 'Argentina',
        odds: 4.0
      });

      // Create predictions
      await SpecialBetPrediction.create({
        user_id: testUserId,
        special_bet_option_id: newOption.id,
        coins_bet: 10,
        odds_at_bet_time: 4.0
      });

      const winningPredictions = await SpecialBetPrediction.getWinningPredictions(newOption.id);

      expect(Array.isArray(winningPredictions)).toBe(true);
      expect(winningPredictions.every(p => p.special_bet_option_id === newOption.id)).toBe(true);
    });
  });

  describe('hasUserBetOnSpecialBet', () => {
    it('should return true if user has already bet on special bet', async () => {
      const hasBet = await SpecialBetPrediction.hasUserBetOnSpecialBet(testUserId, testSpecialBetId);

      expect(hasBet).toBe(true);
    });

    it('should return false if user has not bet on special bet', async () => {
      const newBet = await SpecialBet.create({
        title: 'New Special Bet',
        type: 'test',
        lock_time: '2026-06-15T00:00:00Z'
      });

      const hasBet = await SpecialBetPrediction.hasUserBetOnSpecialBet(testUserId, newBet.id);

      expect(hasBet).toBe(false);
    });
  });
});
