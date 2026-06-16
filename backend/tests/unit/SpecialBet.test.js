// backend/tests/unit/SpecialBet.test.js
const SpecialBet = require('../../src/models/SpecialBet');
const { initDatabase, runMigrations } = require('../../src/config/database');

describe('SpecialBet Model', () => {
  let db;

  beforeAll(async () => {
    process.env.DATABASE_PATH = ':memory:';
    db = await initDatabase();
    await runMigrations(db);
    SpecialBet.setDb(db);
  });

  afterAll((done) => {
    db.close(done);
  });

  describe('create', () => {
    it('should create a special bet', async () => {
      const betData = {
        title: 'Who will win the World Cup 2026?',
        type: 'tournament_winner',
        lock_time: '2026-06-15T00:00:00Z',
        status: 'open'
      };

      const specialBet = await SpecialBet.create(betData);

      expect(specialBet.id).toBeDefined();
      expect(specialBet.title).toBe('Who will win the World Cup 2026?');
      expect(specialBet.type).toBe('tournament_winner');
      expect(specialBet.status).toBe('open');
    });

    it('should create with default status', async () => {
      const betData = {
        title: 'Top Scorer',
        type: 'top_scorer',
        lock_time: '2026-06-15T00:00:00Z'
      };

      const specialBet = await SpecialBet.create(betData);

      expect(specialBet.status).toBe('open');
    });
  });

  describe('findById', () => {
    it('should find special bet by id', async () => {
      const created = await SpecialBet.create({
        title: 'Golden Boot Winner',
        type: 'golden_boot',
        lock_time: '2026-06-15T00:00:00Z'
      });

      const found = await SpecialBet.findById(created.id);

      expect(found).toBeDefined();
      expect(found.title).toBe('Golden Boot Winner');
      expect(found.type).toBe('golden_boot');
    });

    it('should return null for non-existent id', async () => {
      const found = await SpecialBet.findById(99999);

      expect(found).toBeNull();
    });
  });

  describe('getAll', () => {
    it('should return all special bets', async () => {
      const bets = await SpecialBet.getAll();

      expect(Array.isArray(bets)).toBe(true);
      expect(bets.length).toBeGreaterThan(0);
    });

    it('should filter by status', async () => {
      await SpecialBet.create({
        title: 'Test Bet Closed',
        type: 'test',
        lock_time: '2026-06-15T00:00:00Z',
        status: 'closed'
      });

      const openBets = await SpecialBet.getAll({ status: 'open' });
      const closedBets = await SpecialBet.getAll({ status: 'closed' });

      expect(openBets.every(bet => bet.status === 'open')).toBe(true);
      expect(closedBets.every(bet => bet.status === 'closed')).toBe(true);
    });
  });

  describe('updateStatus', () => {
    it('should update special bet status', async () => {
      const bet = await SpecialBet.create({
        title: 'Test Update',
        type: 'test',
        lock_time: '2026-06-15T00:00:00Z',
        status: 'open'
      });

      await SpecialBet.updateStatus(bet.id, 'locked');

      const updated = await SpecialBet.findById(bet.id);
      expect(updated.status).toBe('locked');
    });
  });

  describe('getWithOptions', () => {
    it('should get special bet with its options', async () => {
      const bet = await SpecialBet.create({
        title: 'Test With Options',
        type: 'test',
        lock_time: '2026-06-15T00:00:00Z'
      });

      // We'll need to create options first - this will be tested after SpecialBetOption model is created
      const result = await SpecialBet.getWithOptions(bet.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(bet.id);
      expect(Array.isArray(result.options)).toBe(true);
    });
  });

  describe('getAllWithOptions', () => {
    it('should get all special bets with options', async () => {
      const results = await SpecialBet.getAllWithOptions();

      expect(Array.isArray(results)).toBe(true);
      results.forEach(bet => {
        expect(bet).toHaveProperty('id');
        expect(bet).toHaveProperty('title');
        expect(Array.isArray(bet.options)).toBe(true);
      });
    });

    it('should filter by status when getting with options', async () => {
      const openBets = await SpecialBet.getAllWithOptions({ status: 'open' });

      expect(openBets.every(bet => bet.status === 'open')).toBe(true);
    });
  });
});
