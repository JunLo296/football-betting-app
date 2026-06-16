// backend/tests/unit/Match.test.js
const Match = require('../../src/models/Match');
const { initDatabase } = require('../../src/config/database');

// Mock the database module
jest.mock('../../src/config/database');

describe('Match Model', () => {
  let mockDb;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Create a mock database object
    mockDb = {
      run: jest.fn(),
      get: jest.fn(),
      all: jest.fn(),
    };

    // Mock initDatabase to return our mock db
    initDatabase.mockResolvedValue(mockDb);

    // Reset the Match model's dbPromise between tests
    Match.resetDb();
  });

  describe('create', () => {
    it('should create a new match successfully', async () => {
      const matchData = {
        api_match_id: 'match_001',
        home_team: 'Brazil',
        away_team: 'Argentina',
        kickoff_time: '2026-07-15T20:00:00Z',
        match_date: '2026-07-15',
        stage: 'Final',
        group_name: null,
        home_odds: 2.5,
        draw_odds: 3.2,
        away_odds: 2.8
      };

      // Mock successful insert
      mockDb.run.mockImplementation((sql, params, callback) => {
        callback.call({ lastID: 1 }, null);
      });

      const match = await Match.create(matchData);

      expect(match).toEqual({
        id: 1,
        ...matchData,
        home_score: null,
        away_score: null,
        result: null,
        status: 'upcoming',
        confirmed_by_admin_at: null
      });
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO matches'),
        expect.any(Array),
        expect.any(Function)
      );
    });

    it('should handle duplicate api_match_id', async () => {
      const matchData = {
        api_match_id: 'match_001',
        home_team: 'Brazil',
        away_team: 'Argentina',
        kickoff_time: '2026-07-15T20:00:00Z',
        match_date: '2026-07-15',
        stage: 'Final'
      };

      // Mock constraint error
      mockDb.run.mockImplementation((sql, params, callback) => {
        const error = new Error('UNIQUE constraint failed: matches.api_match_id');
        error.code = 'SQLITE_CONSTRAINT';
        callback.call({}, error);
      });

      await expect(Match.create(matchData)).rejects.toThrow('Match with this API ID already exists');
    });
  });

  describe('findById', () => {
    it('should find match by id', async () => {
      const mockMatch = {
        id: 1,
        api_match_id: 'match_001',
        home_team: 'Brazil',
        away_team: 'Argentina',
        kickoff_time: '2026-07-15T20:00:00Z',
        match_date: '2026-07-15',
        stage: 'Final',
        group_name: null,
        home_odds: 2.5,
        draw_odds: 3.2,
        away_odds: 2.8,
        home_score: null,
        away_score: null,
        result: null,
        status: 'upcoming',
        confirmed_by_admin_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      mockDb.get.mockImplementation((sql, params, callback) => {
        callback(null, mockMatch);
      });

      const match = await Match.findById(1);

      expect(match).toEqual(mockMatch);
      expect(mockDb.get).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM matches WHERE id = ?'),
        [1],
        expect.any(Function)
      );
    });

    it('should return null if match not found', async () => {
      mockDb.get.mockImplementation((sql, params, callback) => {
        callback(null, undefined);
      });

      const match = await Match.findById(999);

      expect(match).toBeNull();
    });
  });

  describe('getAll', () => {
    it('should return all matches', async () => {
      const mockMatches = [
        {
          id: 1,
          home_team: 'Brazil',
          away_team: 'Argentina',
          kickoff_time: '2026-07-15T20:00:00Z',
          match_date: '2026-07-15',
          stage: 'Final',
          status: 'upcoming'
        },
        {
          id: 2,
          home_team: 'France',
          away_team: 'Germany',
          kickoff_time: '2026-07-14T18:00:00Z',
          match_date: '2026-07-14',
          stage: 'Semi-Final',
          status: 'upcoming'
        }
      ];

      mockDb.all.mockImplementation((sql, params, callback) => {
        callback(null, mockMatches);
      });

      const matches = await Match.getAll();

      expect(matches).toEqual(mockMatches);
      expect(mockDb.all).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM matches'),
        [],
        expect.any(Function)
      );
    });

    it('should return empty array if no matches exist', async () => {
      mockDb.all.mockImplementation((sql, params, callback) => {
        callback(null, []);
      });

      const matches = await Match.getAll();

      expect(matches).toEqual([]);
    });
  });

  describe('updateStatus', () => {
    it('should update match status', async () => {
      mockDb.run.mockImplementation((sql, params, callback) => {
        callback.call({ changes: 1 }, null);
      });

      const result = await Match.updateStatus(1, 'live');

      expect(result).toEqual({ changes: 1 });
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE matches SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'),
        ['live', 1],
        expect.any(Function)
      );
    });

    it('should return changes: 0 if match not found', async () => {
      mockDb.run.mockImplementation((sql, params, callback) => {
        callback.call({ changes: 0 }, null);
      });

      const result = await Match.updateStatus(999, 'live');

      expect(result).toEqual({ changes: 0 });
    });
  });

  describe('updateScores', () => {
    it('should update match scores and result', async () => {
      mockDb.run.mockImplementation((sql, params, callback) => {
        callback.call({ changes: 1 }, null);
      });

      const result = await Match.updateScores(1, 2, 1, 'home');

      expect(result).toEqual({ changes: 1 });
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE matches'),
        [2, 1, 'home', 1],
        expect.any(Function)
      );
    });

    it('should handle draw results', async () => {
      mockDb.run.mockImplementation((sql, params, callback) => {
        callback.call({ changes: 1 }, null);
      });

      const result = await Match.updateScores(1, 1, 1, 'draw');

      expect(result).toEqual({ changes: 1 });
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.any(String),
        [1, 1, 'draw', 1],
        expect.any(Function)
      );
    });
  });

  describe('confirmResult', () => {
    it('should confirm match result by admin', async () => {
      mockDb.run.mockImplementation((sql, params, callback) => {
        callback.call({ changes: 1 }, null);
      });

      const result = await Match.confirmResult(1);

      expect(result).toEqual({ changes: 1 });
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE matches'),
        ['confirmed', 1],
        expect.any(Function)
      );
    });

    it('should return changes: 0 if match not found', async () => {
      mockDb.run.mockImplementation((sql, params, callback) => {
        callback.call({ changes: 0 }, null);
      });

      const result = await Match.confirmResult(999);

      expect(result).toEqual({ changes: 0 });
    });
  });

  describe('getLiveMatches', () => {
    it('should return matches with status "live"', async () => {
      const mockLiveMatches = [
        {
          id: 1,
          home_team: 'Brazil',
          away_team: 'Argentina',
          status: 'live',
          home_score: 1,
          away_score: 0
        }
      ];

      mockDb.all.mockImplementation((sql, params, callback) => {
        callback(null, mockLiveMatches);
      });

      const matches = await Match.getLiveMatches();

      expect(matches).toEqual(mockLiveMatches);
      expect(mockDb.all).toHaveBeenCalledWith(
        expect.stringContaining("SELECT * FROM matches WHERE status = 'live'"),
        [],
        expect.any(Function)
      );
    });
  });

  describe('getMatchesByDate', () => {
    it('should return matches for a specific date', async () => {
      const mockMatches = [
        {
          id: 1,
          home_team: 'Brazil',
          away_team: 'Argentina',
          match_date: '2026-07-15',
          status: 'upcoming'
        },
        {
          id: 2,
          home_team: 'France',
          away_team: 'Germany',
          match_date: '2026-07-15',
          status: 'upcoming'
        }
      ];

      mockDb.all.mockImplementation((sql, params, callback) => {
        callback(null, mockMatches);
      });

      const matches = await Match.getMatchesByDate('2026-07-15');

      expect(matches).toEqual(mockMatches);
      expect(mockDb.all).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM matches WHERE match_date = ?'),
        ['2026-07-15'],
        expect.any(Function)
      );
    });

    it('should return empty array if no matches on date', async () => {
      mockDb.all.mockImplementation((sql, params, callback) => {
        callback(null, []);
      });

      const matches = await Match.getMatchesByDate('2026-12-31');

      expect(matches).toEqual([]);
    });
  });
});
