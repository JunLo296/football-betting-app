// backend/tests/unit/cronService.test.js
const cronService = require('../../src/services/cronService');
const User = require('../../src/models/User');
const Match = require('../../src/models/Match');
const oddsApiService = require('../../src/services/oddsApiService');
const apiFootballService = require('../../src/services/apiFootballService');
const { initDatabase } = require('../../src/config/database');

// Mock the external modules
jest.mock('../../src/models/User');
jest.mock('../../src/models/Match');
jest.mock('../../src/services/oddsApiService');
jest.mock('../../src/services/apiFootballService');
jest.mock('node-cron');

// Mock the database to prevent actual database operations
const mockDb = {
  run: jest.fn((sql, params, callback) => {
    if (typeof callback === 'function') {
      callback.call({ lastID: 1, changes: 1 }, null);
    }
  }),
  get: jest.fn((sql, params, callback) => callback(null, null)),
  all: jest.fn((sql, params, callback) => callback(null, []))
};

jest.mock('../../src/config/database', () => ({
  initDatabase: jest.fn(() => mockDb)
}));

describe('CronService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset console.log and console.error to avoid cluttering test output
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
    console.error.mockRestore();
  });

  describe('grantDailyCoins', () => {
    it('should grant coins to all users who have not received them today', async () => {
      const mockUsers = [
        { id: 1, username: 'user1', total_coins: 50 },
        { id: 2, username: 'user2', total_coins: 30 },
        { id: 3, username: 'user3', total_coins: 100 }
      ];

      User.getAll.mockResolvedValue(mockUsers);
      User.updateCoins.mockResolvedValue({ changes: 1 });

      // Mock database check for existing grants (none exist)
      mockDb.get.mockImplementation((sql, params, callback) => {
        callback(null, null); // No grant exists for today
      });

      mockDb.run.mockImplementation((sql, params, callback) => {
        callback.call({ lastID: 1 }, null);
      });

      await cronService.grantDailyCoins();

      expect(User.getAll).toHaveBeenCalledTimes(1);
      expect(User.updateCoins).toHaveBeenCalledTimes(3);
      expect(User.updateCoins).toHaveBeenCalledWith(1, 10);
      expect(User.updateCoins).toHaveBeenCalledWith(2, 10);
      expect(User.updateCoins).toHaveBeenCalledWith(3, 10);
    });

    it('should skip users who already received coins today', async () => {
      const mockUsers = [
        { id: 1, username: 'user1', total_coins: 50 },
        { id: 2, username: 'user2', total_coins: 30 }
      ];

      User.getAll.mockResolvedValue(mockUsers);
      User.updateCoins.mockResolvedValue({ changes: 1 });

      // Mock database check - user1 already has grant, user2 doesn't
      mockDb.get.mockImplementation((sql, params, callback) => {
        const userId = params[0];
        if (userId === 1) {
          callback(null, { id: 1, user_id: 1 }); // Grant exists
        } else {
          callback(null, null); // No grant exists
        }
      });

      mockDb.run.mockImplementation((sql, params, callback) => {
        callback.call({ lastID: 1 }, null);
      });

      await cronService.grantDailyCoins();

      expect(User.getAll).toHaveBeenCalledTimes(1);
      expect(User.updateCoins).toHaveBeenCalledTimes(1);
      expect(User.updateCoins).toHaveBeenCalledWith(2, 10);
    });

    it('should handle errors gracefully', async () => {
      User.getAll.mockRejectedValue(new Error('Database error'));

      await expect(cronService.grantDailyCoins()).resolves.not.toThrow();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('updateMatchOdds', () => {
    it('should update odds for all upcoming matches', async () => {
      const mockMatches = [
        {
          id: 1,
          api_match_id: 'api_123',
          home_team: 'Germany',
          away_team: 'Spain',
          status: 'upcoming'
        },
        {
          id: 2,
          api_match_id: 'api_456',
          home_team: 'Brazil',
          away_team: 'Argentina',
          status: 'upcoming'
        }
      ];

      const mockOdds1 = {
        home_odds: 1.8,
        draw_odds: 3.2,
        away_odds: 4.5
      };

      const mockOdds2 = {
        home_odds: 2.1,
        draw_odds: 3.0,
        away_odds: 3.5
      };

      mockDb.all.mockImplementation((sql, params, callback) => {
        callback(null, mockMatches);
      });

      Match.updateOdds.mockResolvedValue({ changes: 1 });

      oddsApiService.getOddsForMatch
        .mockResolvedValueOnce(mockOdds1)
        .mockResolvedValueOnce(mockOdds2);

      await cronService.updateMatchOdds();

      expect(oddsApiService.getOddsForMatch).toHaveBeenCalledTimes(2);
      expect(Match.updateOdds).toHaveBeenCalledTimes(2);
      expect(Match.updateOdds).toHaveBeenCalledWith(1, 1.8, 3.2, 4.5);
      expect(Match.updateOdds).toHaveBeenCalledWith(2, 2.1, 3.0, 3.5);
    });

    it('should skip matches without API match ID', async () => {
      const mockMatches = [
        {
          id: 1,
          api_match_id: null,
          home_team: 'Germany',
          away_team: 'Spain',
          status: 'upcoming'
        }
      ];

      mockDb.all.mockImplementation((sql, params, callback) => {
        callback(null, mockMatches);
      });

      await cronService.updateMatchOdds();

      expect(oddsApiService.getOddsForMatch).not.toHaveBeenCalled();
      expect(Match.updateOdds).not.toHaveBeenCalled();
    });

    it('should skip matches where odds are not found', async () => {
      const mockMatches = [
        {
          id: 1,
          api_match_id: 'api_123',
          home_team: 'Germany',
          away_team: 'Spain',
          status: 'upcoming'
        }
      ];

      mockDb.all.mockImplementation((sql, params, callback) => {
        callback(null, mockMatches);
      });

      oddsApiService.getOddsForMatch.mockResolvedValue(null);

      await cronService.updateMatchOdds();

      expect(oddsApiService.getOddsForMatch).toHaveBeenCalledTimes(1);
      expect(Match.updateOdds).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockDb.all.mockImplementation((sql, params, callback) => {
        callback(new Error('Database error'), null);
      });

      await expect(cronService.updateMatchOdds()).resolves.not.toThrow();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('updateLiveScores', () => {
    it('should update scores for all live matches', async () => {
      const mockMatches = [
        {
          id: 1,
          api_match_id: 'api_123',
          home_team: 'Germany',
          away_team: 'Spain',
          status: 'live'
        },
        {
          id: 2,
          api_match_id: 'api_456',
          home_team: 'Brazil',
          away_team: 'Argentina',
          status: 'live'
        }
      ];

      const mockScores = [
        {
          api_match_id: 'api_123',
          home_score: 2,
          away_score: 1,
          status: 'live',
          elapsed: 65
        },
        {
          api_match_id: 'api_456',
          home_score: 1,
          away_score: 1,
          status: 'finished',
          elapsed: 90
        }
      ];

      Match.getLiveMatches.mockResolvedValue(mockMatches);
      apiFootballService.getLiveScores.mockResolvedValue(mockScores);
      Match.updateScores.mockResolvedValue({ changes: 1 });
      Match.updateStatus.mockResolvedValue({ changes: 1 });

      await cronService.updateLiveScores();

      expect(Match.getLiveMatches).toHaveBeenCalledTimes(1);
      expect(apiFootballService.getLiveScores).toHaveBeenCalledWith(['api_123', 'api_456']);
      expect(Match.updateScores).toHaveBeenCalledTimes(2);
      expect(Match.updateScores).toHaveBeenCalledWith(1, 2, 1, 'home_win');
      expect(Match.updateScores).toHaveBeenCalledWith(2, 1, 1, 'draw');
      expect(Match.updateStatus).toHaveBeenCalledWith(2, 'finished');
    });

    it('should not update if no live matches', async () => {
      Match.getLiveMatches.mockResolvedValue([]);

      await cronService.updateLiveScores();

      expect(Match.getLiveMatches).toHaveBeenCalledTimes(1);
      expect(apiFootballService.getLiveScores).not.toHaveBeenCalled();
    });

    it('should calculate result based on scores', async () => {
      const mockMatches = [
        { id: 1, api_match_id: 'api_1', status: 'live' },
        { id: 2, api_match_id: 'api_2', status: 'live' },
        { id: 3, api_match_id: 'api_3', status: 'live' }
      ];

      const mockScores = [
        { api_match_id: 'api_1', home_score: 3, away_score: 1, status: 'live' }, // home_win
        { api_match_id: 'api_2', home_score: 2, away_score: 2, status: 'live' }, // draw
        { api_match_id: 'api_3', home_score: 0, away_score: 1, status: 'live' }  // away_win
      ];

      Match.getLiveMatches.mockResolvedValue(mockMatches);
      apiFootballService.getLiveScores.mockResolvedValue(mockScores);
      Match.updateScores.mockResolvedValue({ changes: 1 });
      Match.updateStatus.mockResolvedValue({ changes: 1 });

      await cronService.updateLiveScores();

      expect(Match.updateScores).toHaveBeenCalledWith(1, 3, 1, 'home_win');
      expect(Match.updateScores).toHaveBeenCalledWith(2, 2, 2, 'draw');
      expect(Match.updateScores).toHaveBeenCalledWith(3, 0, 1, 'away_win');
    });

    it('should handle errors gracefully', async () => {
      Match.getLiveMatches.mockRejectedValue(new Error('Database error'));

      await expect(cronService.updateLiveScores()).resolves.not.toThrow();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('startCronJobs', () => {
    it('should be a function', () => {
      expect(typeof cronService.startCronJobs).toBe('function');
    });

    it('should not throw when called', () => {
      expect(() => cronService.startCronJobs()).not.toThrow();
    });
  });
});
