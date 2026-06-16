// backend/tests/unit/SpecialBetOption.test.js
const SpecialBetOption = require('../../src/models/SpecialBetOption');
const SpecialBet = require('../../src/models/SpecialBet');
const { initDatabase, runMigrations } = require('../../src/config/database');

describe('SpecialBetOption Model', () => {
  let db;
  let testSpecialBetId;

  beforeAll(async () => {
    process.env.DATABASE_PATH = ':memory:';
    db = await initDatabase();
    await runMigrations(db);
    SpecialBetOption.setDb(db);
    SpecialBet.setDb(db);

    // Create a test special bet
    const specialBet = await SpecialBet.create({
      title: 'Test Tournament Winner',
      type: 'tournament_winner',
      lock_time: '2026-06-15T00:00:00Z'
    });
    testSpecialBetId = specialBet.id;
  });

  afterAll((done) => {
    db.close(done);
  });

  describe('create', () => {
    it('should create a special bet option', async () => {
      const optionData = {
        special_bet_id: testSpecialBetId,
        option_text: 'Brazil',
        odds: 3.5
      };

      const option = await SpecialBetOption.create(optionData);

      expect(option.id).toBeDefined();
      expect(option.special_bet_id).toBe(testSpecialBetId);
      expect(option.option_text).toBe('Brazil');
      expect(option.odds).toBe(3.5);
    });

    it('should create option with null is_correct by default', async () => {
      const optionData = {
        special_bet_id: testSpecialBetId,
        option_text: 'Argentina',
        odds: 4.0
      };

      const option = await SpecialBetOption.create(optionData);

      expect(option.is_correct).toBeNull();
    });
  });

  describe('findById', () => {
    it('should find option by id', async () => {
      const created = await SpecialBetOption.create({
        special_bet_id: testSpecialBetId,
        option_text: 'Germany',
        odds: 5.0
      });

      const found = await SpecialBetOption.findById(created.id);

      expect(found).toBeDefined();
      expect(found.option_text).toBe('Germany');
      expect(found.odds).toBe(5.0);
    });

    it('should return null for non-existent id', async () => {
      const found = await SpecialBetOption.findById(99999);

      expect(found).toBeNull();
    });
  });

  describe('findBySpecialBetId', () => {
    it('should find all options for a special bet', async () => {
      await SpecialBetOption.create({
        special_bet_id: testSpecialBetId,
        option_text: 'France',
        odds: 4.5
      });

      await SpecialBetOption.create({
        special_bet_id: testSpecialBetId,
        option_text: 'Spain',
        odds: 6.0
      });

      const options = await SpecialBetOption.findBySpecialBetId(testSpecialBetId);

      expect(Array.isArray(options)).toBe(true);
      expect(options.length).toBeGreaterThan(0);
      expect(options.every(opt => opt.special_bet_id === testSpecialBetId)).toBe(true);
    });

    it('should return empty array for special bet with no options', async () => {
      const newBet = await SpecialBet.create({
        title: 'Empty Options Test',
        type: 'test',
        lock_time: '2026-06-15T00:00:00Z'
      });

      const options = await SpecialBetOption.findBySpecialBetId(newBet.id);

      expect(Array.isArray(options)).toBe(true);
      expect(options.length).toBe(0);
    });
  });

  describe('updateOdds', () => {
    it('should update option odds', async () => {
      const option = await SpecialBetOption.create({
        special_bet_id: testSpecialBetId,
        option_text: 'England',
        odds: 7.0
      });

      await SpecialBetOption.updateOdds(option.id, 6.5);

      const updated = await SpecialBetOption.findById(option.id);
      expect(updated.odds).toBe(6.5);
    });
  });

  describe('markCorrect', () => {
    it('should mark option as correct', async () => {
      const option = await SpecialBetOption.create({
        special_bet_id: testSpecialBetId,
        option_text: 'Italy',
        odds: 8.0
      });

      await SpecialBetOption.markCorrect(option.id);

      const updated = await SpecialBetOption.findById(option.id);
      expect(updated.is_correct).toBe(1); // SQLite stores boolean as 1
    });

    it('should mark option as incorrect', async () => {
      const option = await SpecialBetOption.create({
        special_bet_id: testSpecialBetId,
        option_text: 'Netherlands',
        odds: 9.0
      });

      await SpecialBetOption.markCorrect(option.id, false);

      const updated = await SpecialBetOption.findById(option.id);
      expect(updated.is_correct).toBe(0); // SQLite stores boolean as 0
    });
  });

  describe('getCorrectOption', () => {
    it('should get the correct option for a special bet', async () => {
      const newBet = await SpecialBet.create({
        title: 'Test Correct Option',
        type: 'test',
        lock_time: '2026-06-15T00:00:00Z'
      });

      const option1 = await SpecialBetOption.create({
        special_bet_id: newBet.id,
        option_text: 'Option 1',
        odds: 2.0
      });

      const option2 = await SpecialBetOption.create({
        special_bet_id: newBet.id,
        option_text: 'Option 2',
        odds: 3.0
      });

      await SpecialBetOption.markCorrect(option2.id);

      const correctOption = await SpecialBetOption.getCorrectOption(newBet.id);

      expect(correctOption).toBeDefined();
      expect(correctOption.id).toBe(option2.id);
      expect(correctOption.option_text).toBe('Option 2');
    });

    it('should return null if no correct option is set', async () => {
      const newBet = await SpecialBet.create({
        title: 'Test No Correct Option',
        type: 'test',
        lock_time: '2026-06-15T00:00:00Z'
      });

      await SpecialBetOption.create({
        special_bet_id: newBet.id,
        option_text: 'Option A',
        odds: 2.0
      });

      const correctOption = await SpecialBetOption.getCorrectOption(newBet.id);

      expect(correctOption).toBeNull();
    });
  });
});
