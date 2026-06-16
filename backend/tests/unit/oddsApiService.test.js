// backend/tests/unit/oddsApiService.test.js
const oddsApiService = require('../../src/services/oddsApiService');
const axios = require('axios');

jest.mock('axios');

describe('OddsApiService', () => {
  let mockAxiosInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ODDS_API_KEY = 'test-odds-api-key';

    // Create a mock axios instance
    mockAxiosInstance = {
      get: jest.fn()
    };

    // Mock axios.create to return our mock instance
    axios.create.mockReturnValue(mockAxiosInstance);
  });

  describe('getFootballOdds', () => {
    it('should fetch odds for World Cup matches', async () => {
      const mockResponse = {
        data: [
          {
            id: 'abc123',
            sport_key: 'soccer_fifa_world_cup',
            commence_time: '2026-06-20T18:00:00Z',
            home_team: 'Germany',
            away_team: 'Spain',
            bookmakers: [
              {
                key: 'betfair',
                markets: [
                  {
                    key: 'h2h',
                    outcomes: [
                      { name: 'Germany', price: 1.8 },
                      { name: 'Draw', price: 3.2 },
                      { name: 'Spain', price: 4.5 }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const odds = await oddsApiService.getFootballOdds('soccer_fifa_world_cup');

      expect(axios.create).toHaveBeenCalled();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/sports/soccer_fifa_world_cup/odds',
        expect.objectContaining({
          params: {
            apiKey: 'test-odds-api-key',
            regions: 'uk,eu',
            markets: 'h2h',
            oddsFormat: 'decimal'
          }
        })
      );

      expect(odds).toHaveLength(1);
      expect(odds[0].match_id).toBe('abc123');
      expect(odds[0].home_team).toBe('Germany');
      expect(odds[0].away_team).toBe('Spain');
      expect(odds[0].home_odds).toBe(1.8);
      expect(odds[0].draw_odds).toBe(3.2);
      expect(odds[0].away_odds).toBe(4.5);
    });

    it('should handle matches with multiple bookmakers by averaging odds', async () => {
      const mockResponse = {
        data: [
          {
            id: 'abc456',
            sport_key: 'soccer_fifa_world_cup',
            commence_time: '2026-06-21T21:00:00Z',
            home_team: 'Brazil',
            away_team: 'Argentina',
            bookmakers: [
              {
                key: 'betfair',
                markets: [
                  {
                    key: 'h2h',
                    outcomes: [
                      { name: 'Brazil', price: 2.0 },
                      { name: 'Draw', price: 3.0 },
                      { name: 'Argentina', price: 3.5 }
                    ]
                  }
                ]
              },
              {
                key: 'bet365',
                markets: [
                  {
                    key: 'h2h',
                    outcomes: [
                      { name: 'Brazil', price: 2.2 },
                      { name: 'Draw', price: 3.2 },
                      { name: 'Argentina', price: 3.3 }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const odds = await oddsApiService.getFootballOdds('soccer_fifa_world_cup');

      expect(odds[0].home_odds).toBe(2.1);
      expect(odds[0].draw_odds).toBe(3.1);
      expect(odds[0].away_odds).toBe(3.4);
    });

    it('should handle API rate limit errors', async () => {
      mockAxiosInstance.get.mockRejectedValue({
        response: { status: 429, data: { message: 'Rate limit exceeded' } }
      });

      await expect(oddsApiService.getFootballOdds('soccer_fifa_world_cup')).rejects.toThrow('API rate limit exceeded');
    });

    it('should handle network errors', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Network error'));

      await expect(oddsApiService.getFootballOdds('soccer_fifa_world_cup')).rejects.toThrow('Failed to fetch odds');
    });

    it('should handle missing API key', async () => {
      delete process.env.ODDS_API_KEY;

      await expect(oddsApiService.getFootballOdds('soccer_fifa_world_cup')).rejects.toThrow('ODDS_API_KEY not configured');
    });

    it('should skip matches without bookmakers', async () => {
      const mockResponse = {
        data: [
          {
            id: 'abc789',
            sport_key: 'soccer_fifa_world_cup',
            commence_time: '2026-06-22T15:00:00Z',
            home_team: 'France',
            away_team: 'England',
            bookmakers: []
          }
        ]
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const odds = await oddsApiService.getFootballOdds('soccer_fifa_world_cup');
      expect(odds).toHaveLength(0);
    });
  });

  describe('getAvailableSports', () => {
    it('should fetch available sports', async () => {
      const mockResponse = {
        data: [
          {
            key: 'soccer_fifa_world_cup',
            title: 'FIFA World Cup',
            active: true
          },
          {
            key: 'soccer_uefa_champs_league',
            title: 'UEFA Champions League',
            active: true
          }
        ]
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const sports = await oddsApiService.getAvailableSports();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/sports',
        expect.objectContaining({
          params: { apiKey: 'test-odds-api-key' }
        })
      );

      expect(sports).toHaveLength(2);
      expect(sports[0].key).toBe('soccer_fifa_world_cup');
    });

    it('should handle errors when fetching sports', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('API error'));

      await expect(oddsApiService.getAvailableSports()).rejects.toThrow('Failed to fetch available sports');
    });
  });

  describe('getOddsForMatch', () => {
    it('should fetch odds for a specific match by teams', async () => {
      const mockResponse = {
        data: [
          {
            id: 'match123',
            sport_key: 'soccer_fifa_world_cup',
            commence_time: '2026-06-23T18:00:00Z',
            home_team: 'Italy',
            away_team: 'Netherlands',
            bookmakers: [
              {
                key: 'betfair',
                markets: [
                  {
                    key: 'h2h',
                    outcomes: [
                      { name: 'Italy', price: 2.0 },
                      { name: 'Draw', price: 3.0 },
                      { name: 'Netherlands', price: 3.8 }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const odds = await oddsApiService.getOddsForMatch('soccer_fifa_world_cup', 'Italy', 'Netherlands');

      expect(odds).toBeDefined();
      expect(odds.home_team).toBe('Italy');
      expect(odds.away_team).toBe('Netherlands');
      expect(odds.home_odds).toBe(2.0);
    });

    it('should return null if match not found', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: [] });

      const odds = await oddsApiService.getOddsForMatch('soccer_fifa_world_cup', 'Team A', 'Team B');
      expect(odds).toBeNull();
    });
  });

  describe('calculateAverageOdds', () => {
    it('should calculate average odds across bookmakers', () => {
      const bookmakers = [
        {
          markets: [
            {
              key: 'h2h',
              outcomes: [
                { name: 'Team A', price: 2.0 },
                { name: 'Draw', price: 3.0 },
                { name: 'Team B', price: 4.0 }
              ]
            }
          ]
        },
        {
          markets: [
            {
              key: 'h2h',
              outcomes: [
                { name: 'Team A', price: 2.2 },
                { name: 'Draw', price: 3.2 },
                { name: 'Team B', price: 3.8 }
              ]
            }
          ]
        }
      ];

      const avgOdds = oddsApiService.calculateAverageOdds(bookmakers, 'Team A', 'Team B');

      expect(avgOdds.home_odds).toBe(2.1);
      expect(avgOdds.draw_odds).toBe(3.1);
      expect(avgOdds.away_odds).toBe(3.9);
    });

    it('should handle single bookmaker', () => {
      const bookmakers = [
        {
          markets: [
            {
              key: 'h2h',
              outcomes: [
                { name: 'Team A', price: 1.5 },
                { name: 'Draw', price: 3.5 },
                { name: 'Team B', price: 5.0 }
              ]
            }
          ]
        }
      ];

      const avgOdds = oddsApiService.calculateAverageOdds(bookmakers, 'Team A', 'Team B');

      expect(avgOdds.home_odds).toBe(1.5);
      expect(avgOdds.draw_odds).toBe(3.5);
      expect(avgOdds.away_odds).toBe(5.0);
    });

    it('should return default odds if no h2h markets found', () => {
      const bookmakers = [
        {
          markets: [
            {
              key: 'spreads',
              outcomes: []
            }
          ]
        }
      ];

      const avgOdds = oddsApiService.calculateAverageOdds(bookmakers, 'Team A', 'Team B');

      expect(avgOdds.home_odds).toBe(2.0);
      expect(avgOdds.draw_odds).toBe(3.0);
      expect(avgOdds.away_odds).toBe(3.5);
    });
  });
});
