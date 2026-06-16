// backend/src/services/oddsApiService.js
const axios = require('axios');

/**
 * Service for integrating with The Odds API
 * Provides access to betting odds for World Cup and other football matches
 *
 * API Documentation: https://the-odds-api.com/liveapi/guides/v4/
 */
class OddsApiService {
  constructor() {
    this.baseURL = 'https://api.the-odds-api.com/v4';
  }

  /**
   * Get API key at runtime
   */
  getApiKey() {
    return process.env.ODDS_API_KEY;
  }

  /**
   * Create axios instance with authentication
   */
  getAxiosInstance() {
    const apiKey = this.getApiKey();

    if (!apiKey) {
      throw new Error('ODDS_API_KEY not configured');
    }

    return axios.create({
      baseURL: this.baseURL
    });
  }

  /**
   * Fetch odds for a specific sport
   * @param {string} sportKey - Sport identifier (e.g., 'soccer_fifa_world_cup')
   * @returns {Promise<Array>} Array of match odds objects
   */
  async getFootballOdds(sportKey = 'soccer_fifa_world_cup') {
    try {
      const instance = this.getAxiosInstance();
      const apiKey = this.getApiKey();

      const response = await instance.get(`/sports/${sportKey}/odds`, {
        params: {
          apiKey: apiKey,
          regions: 'uk,eu',
          markets: 'h2h',
          oddsFormat: 'decimal'
        }
      });

      if (!response.data || !Array.isArray(response.data)) {
        return [];
      }

      // Filter out matches without bookmakers and normalize the data
      return response.data
        .filter(match => match.bookmakers && match.bookmakers.length > 0)
        .map(match => this.normalizeOdds(match));
    } catch (error) {
      this.handleApiError(error, 'Failed to fetch odds');
    }
  }

  /**
   * Get odds for a specific match by team names
   * @param {string} sportKey - Sport identifier
   * @param {string} homeTeam - Home team name
   * @param {string} awayTeam - Away team name
   * @returns {Promise<Object|null>} Match odds or null if not found
   */
  async getOddsForMatch(sportKey, homeTeam, awayTeam) {
    try {
      const allOdds = await this.getFootballOdds(sportKey);

      // Find match by team names (case-insensitive)
      const match = allOdds.find(odds =>
        odds.home_team.toLowerCase() === homeTeam.toLowerCase() &&
        odds.away_team.toLowerCase() === awayTeam.toLowerCase()
      );

      return match || null;
    } catch (error) {
      this.handleApiError(error, 'Failed to fetch match odds');
    }
  }

  /**
   * Get list of available sports
   * @returns {Promise<Array>} Array of available sports
   */
  async getAvailableSports() {
    try {
      const instance = this.getAxiosInstance();
      const apiKey = this.getApiKey();

      const response = await instance.get('/sports', {
        params: {
          apiKey: apiKey
        }
      });

      if (!response.data || !Array.isArray(response.data)) {
        return [];
      }

      return response.data;
    } catch (error) {
      this.handleApiError(error, 'Failed to fetch available sports');
    }
  }

  /**
   * Normalize odds data from API format to our internal format
   * @param {Object} match - Raw match odds from API
   * @returns {Object} Normalized odds object
   */
  normalizeOdds(match) {
    const averageOdds = this.calculateAverageOdds(
      match.bookmakers,
      match.home_team,
      match.away_team
    );

    return {
      match_id: match.id,
      home_team: match.home_team,
      away_team: match.away_team,
      commence_time: match.commence_time,
      home_odds: averageOdds.home_odds,
      draw_odds: averageOdds.draw_odds,
      away_odds: averageOdds.away_odds,
      bookmaker_count: match.bookmakers.length
    };
  }

  /**
   * Calculate average odds across multiple bookmakers
   * @param {Array} bookmakers - Array of bookmaker data
   * @param {string} homeTeam - Home team name
   * @param {string} awayTeam - Away team name
   * @returns {Object} Average odds for home, draw, and away
   */
  calculateAverageOdds(bookmakers, homeTeam, awayTeam) {
    let homeOddsSum = 0;
    let drawOddsSum = 0;
    let awayOddsSum = 0;
    let count = 0;

    for (const bookmaker of bookmakers) {
      const h2hMarket = bookmaker.markets.find(m => m.key === 'h2h');

      if (!h2hMarket || !h2hMarket.outcomes) {
        continue;
      }

      const homeOutcome = h2hMarket.outcomes.find(o =>
        o.name === homeTeam
      );
      const drawOutcome = h2hMarket.outcomes.find(o =>
        o.name === 'Draw'
      );
      const awayOutcome = h2hMarket.outcomes.find(o =>
        o.name === awayTeam
      );

      if (homeOutcome && drawOutcome && awayOutcome) {
        homeOddsSum += homeOutcome.price;
        drawOddsSum += drawOutcome.price;
        awayOddsSum += awayOutcome.price;
        count++;
      }
    }

    // Default odds if no valid bookmakers found
    if (count === 0) {
      return {
        home_odds: 2.0,
        draw_odds: 3.0,
        away_odds: 3.5
      };
    }

    // Round to 1 decimal place
    return {
      home_odds: Math.round((homeOddsSum / count) * 10) / 10,
      draw_odds: Math.round((drawOddsSum / count) * 10) / 10,
      away_odds: Math.round((awayOddsSum / count) * 10) / 10
    };
  }

  /**
   * Handle API errors with proper error messages
   * @param {Error} error - The error object
   * @param {string} defaultMessage - Default error message
   * @throws {Error} Formatted error
   */
  handleApiError(error, defaultMessage) {
    if (error.response) {
      // API responded with error status
      const status = error.response.status;
      const message = error.response.data?.message || error.response.statusText;

      if (status === 429) {
        throw new Error('API rate limit exceeded');
      } else if (status === 401 || status === 403) {
        throw new Error('API authentication failed');
      } else if (status === 404) {
        throw new Error('Resource not found');
      } else {
        throw new Error(`API error (${status}): ${message}`);
      }
    } else if (error.request) {
      // Request made but no response received
      throw new Error(`${defaultMessage}: Network error`);
    } else if (error.message === 'ODDS_API_KEY not configured') {
      // Re-throw configuration errors
      throw error;
    } else {
      // Other errors
      throw new Error(defaultMessage);
    }
  }

  /**
   * Get remaining API requests (from response headers)
   * Useful for monitoring rate limits
   * @param {Object} response - Axios response object
   * @returns {Object} Rate limit info
   */
  getRateLimitInfo(response) {
    if (!response || !response.headers) {
      return null;
    }

    return {
      remaining: response.headers['x-requests-remaining'],
      used: response.headers['x-requests-used']
    };
  }
}

module.exports = new OddsApiService();
