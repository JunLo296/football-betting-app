// backend/tests/unit/apiFootballService.test.js
const apiFootballService = require('../../src/services/apiFootballService');
const axios = require('axios');

jest.mock('axios');

describe('ApiFootballService', () => {
  let mockAxiosInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.API_FOOTBALL_KEY = 'test-api-key';

    // Create a mock axios instance
    mockAxiosInstance = {
      get: jest.fn()
    };

    // Mock axios.create to return our mock instance
    axios.create.mockReturnValue(mockAxiosInstance);
  });

  describe('getWorldCupFixtures', () => {
    it('should fetch World Cup 2026 fixtures', async () => {
      const mockResponse = {
        data: {
          response: [
            {
              fixture: {
                id: 12345,
                date: '2026-06-20T18:00:00+00:00',
                status: { short: 'NS' }
              },
              league: { name: 'World Cup', round: 'Group Stage - 1' },
              teams: {
                home: { name: 'Germany' },
                away: { name: 'Spain' }
              },
              goals: { home: null, away: null }
            }
          ]
        }
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const fixtures = await apiFootballService.getWorldCupFixtures(2026);

      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: {
            'x-rapidapi-key': 'test-api-key',
            'x-rapidapi-host': 'v3.football.api-sports.io'
          }
        })
      );

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/fixtures',
        expect.objectContaining({
          params: expect.objectContaining({
            league: 1,
            season: 2026
          })
        })
      );

      expect(fixtures).toHaveLength(1);
      expect(fixtures[0].api_match_id).toBe('12345');
      expect(fixtures[0].home_team).toBe('Germany');
      expect(fixtures[0].away_team).toBe('Spain');
    });

    it('should handle API errors gracefully', async () => {
      mockAxiosInstance.get.mockRejectedValue({
        response: { status: 429, data: { message: 'Rate limit exceeded' } }
      });

      await expect(apiFootballService.getWorldCupFixtures(2026)).rejects.toThrow('API rate limit exceeded');
    });

    it('should handle network errors', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Network error'));

      await expect(apiFootballService.getWorldCupFixtures(2026)).rejects.toThrow('Failed to fetch fixtures');
    });

    it('should handle missing API key', async () => {
      delete process.env.API_FOOTBALL_KEY;

      await expect(apiFootballService.getWorldCupFixtures(2026)).rejects.toThrow('API_FOOTBALL_KEY not configured');
    });
  });

  describe('getLiveScores', () => {
    it('should fetch live scores for specific matches', async () => {
      const mockResponse = {
        data: {
          response: [
            {
              fixture: {
                id: 12345,
                status: { short: 'LIVE', elapsed: 45 }
              },
              goals: { home: 2, away: 1 },
              teams: {
                home: { name: 'Brazil' },
                away: { name: 'Argentina' }
              }
            }
          ]
        }
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const liveScores = await apiFootballService.getLiveScores(['12345']);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/fixtures',
        expect.objectContaining({
          params: expect.objectContaining({
            ids: '12345'
          })
        })
      );

      expect(liveScores).toHaveLength(1);
      expect(liveScores[0].api_match_id).toBe('12345');
      expect(liveScores[0].home_score).toBe(2);
      expect(liveScores[0].away_score).toBe(1);
      expect(liveScores[0].status).toBe('live');
    });

    it('should return empty array when no matches provided', async () => {
      const liveScores = await apiFootballService.getLiveScores([]);
      expect(liveScores).toEqual([]);
    });

    it('should handle API errors during live score fetch', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('API error'));

      await expect(apiFootballService.getLiveScores(['12345'])).rejects.toThrow('Failed to fetch live scores');
    });
  });

  describe('getMatchDetails', () => {
    it('should fetch detailed match information', async () => {
      const mockResponse = {
        data: {
          response: [
            {
              fixture: {
                id: 12345,
                date: '2026-06-20T18:00:00+00:00',
                status: { short: 'FT' }
              },
              league: { name: 'World Cup', round: 'Final' },
              teams: {
                home: { name: 'France' },
                away: { name: 'England' }
              },
              goals: { home: 3, away: 2 }
            }
          ]
        }
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const match = await apiFootballService.getMatchDetails('12345');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/fixtures',
        expect.objectContaining({
          params: { id: '12345' }
        })
      );

      expect(match.api_match_id).toBe('12345');
      expect(match.home_team).toBe('France');
      expect(match.away_team).toBe('England');
      expect(match.home_score).toBe(3);
      expect(match.away_score).toBe(2);
      expect(match.status).toBe('finished');
    });

    it('should return null for non-existent match', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: { response: [] } });

      const match = await apiFootballService.getMatchDetails('99999');
      expect(match).toBeNull();
    });
  });

  describe('parseMatchStatus', () => {
    it('should parse various match statuses', () => {
      expect(apiFootballService.parseMatchStatus('NS')).toBe('upcoming');
      expect(apiFootballService.parseMatchStatus('TBD')).toBe('upcoming');
      expect(apiFootballService.parseMatchStatus('1H')).toBe('live');
      expect(apiFootballService.parseMatchStatus('2H')).toBe('live');
      expect(apiFootballService.parseMatchStatus('HT')).toBe('live');
      expect(apiFootballService.parseMatchStatus('FT')).toBe('finished');
      expect(apiFootballService.parseMatchStatus('AET')).toBe('finished');
      expect(apiFootballService.parseMatchStatus('PEN')).toBe('finished');
      expect(apiFootballService.parseMatchStatus('CANC')).toBe('cancelled');
      expect(apiFootballService.parseMatchStatus('PST')).toBe('postponed');
      expect(apiFootballService.parseMatchStatus('UNKNOWN')).toBe('upcoming');
    });
  });
});
