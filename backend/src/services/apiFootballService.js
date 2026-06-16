// backend/src/services/apiFootballService.js
const axios = require('axios');

/**
 * Service for integrating with API-Football (RapidAPI)
 * Provides access to World Cup fixtures, live scores, and match details
 *
 * API Documentation: https://www.api-football.com/documentation-v3
 */
class ApiFootballService {
  constructor() {
    this.baseURL = 'https://v3.football.api-sports.io';
  }

  /**
   * Get API key at runtime
   */
  getApiKey() {
    return process.env.API_FOOTBALL_KEY;
  }

  /**
   * Create axios instance with authentication headers
   */
  getAxiosInstance() {
    const apiKey = this.getApiKey();

    if (!apiKey) {
      throw new Error('API_FOOTBALL_KEY not configured');
    }

    return axios.create({
      baseURL: this.baseURL,
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      }
    });
  }

  /**
   * Fetch World Cup fixtures for a specific season
   * @param {number} season - The World Cup year (e.g., 2026)
   * @returns {Promise<Array>} Array of normalized fixture objects
   */
  async getWorldCupFixtures(season) {
    try {
      const instance = this.getAxiosInstance();

      const response = await instance.get('/fixtures', {
        params: {
          league: 1, // FIFA World Cup league ID
          season: season
        }
      });

      if (!response.data || !response.data.response) {
        return [];
      }

      return response.data.response.map(fixture => this.normalizeFixture(fixture));
    } catch (error) {
      this.handleApiError(error, 'Failed to fetch fixtures');
    }
  }

  /**
   * Fetch live scores for specific matches
   * @param {Array<string>} matchIds - Array of API match IDs
   * @returns {Promise<Array>} Array of live score objects
   */
  async getLiveScores(matchIds) {
    if (!matchIds || matchIds.length === 0) {
      return [];
    }

    try {
      const instance = this.getAxiosInstance();

      const response = await instance.get('/fixtures', {
        params: {
          ids: matchIds.join('-')
        }
      });

      if (!response.data || !response.data.response) {
        return [];
      }

      return response.data.response.map(fixture => ({
        api_match_id: fixture.fixture.id.toString(),
        home_score: fixture.goals.home,
        away_score: fixture.goals.away,
        status: this.parseMatchStatus(fixture.fixture.status.short),
        elapsed: fixture.fixture.status.elapsed
      }));
    } catch (error) {
      this.handleApiError(error, 'Failed to fetch live scores');
    }
  }

  /**
   * Get detailed information for a specific match
   * @param {string} matchId - API match ID
   * @returns {Promise<Object|null>} Match details or null if not found
   */
  async getMatchDetails(matchId) {
    try {
      const instance = this.getAxiosInstance();

      const response = await instance.get('/fixtures', {
        params: {
          id: matchId
        }
      });

      if (!response.data || !response.data.response || response.data.response.length === 0) {
        return null;
      }

      return this.normalizeFixture(response.data.response[0]);
    } catch (error) {
      this.handleApiError(error, 'Failed to fetch match details');
    }
  }

  /**
   * Normalize API-Football fixture to our internal format
   * @param {Object} fixture - Raw fixture from API
   * @returns {Object} Normalized fixture object
   */
  normalizeFixture(fixture) {
    const stage = this.extractStage(fixture.league.round);
    const groupName = this.extractGroup(fixture.league.round);

    return {
      api_match_id: fixture.fixture.id.toString(),
      home_team: fixture.teams.home.name,
      away_team: fixture.teams.away.name,
      kickoff_time: fixture.fixture.date,
      match_date: fixture.fixture.date.split('T')[0],
      stage: stage,
      group_name: groupName,
      home_score: fixture.goals.home,
      away_score: fixture.goals.away,
      status: this.parseMatchStatus(fixture.fixture.status.short)
    };
  }

  /**
   * Parse API-Football status codes to our internal status
   * @param {string} statusCode - API status code (e.g., 'NS', 'FT', '1H')
   * @returns {string} Internal status (upcoming, live, finished, cancelled, postponed)
   */
  parseMatchStatus(statusCode) {
    const statusMap = {
      'TBD': 'upcoming',
      'NS': 'upcoming',
      '1H': 'live',
      'HT': 'live',
      '2H': 'live',
      'ET': 'live',
      'P': 'live',
      'LIVE': 'live',
      'FT': 'finished',
      'AET': 'finished',
      'PEN': 'finished',
      'BT': 'live',
      'SUSP': 'postponed',
      'INT': 'postponed',
      'PST': 'postponed',
      'CANC': 'cancelled',
      'ABD': 'cancelled',
      'AWD': 'finished',
      'WO': 'finished'
    };

    return statusMap[statusCode] || 'upcoming';
  }

  /**
   * Extract stage from round string (e.g., "Group Stage - 1" -> "group_stage")
   * @param {string} round - Round description from API
   * @returns {string} Normalized stage
   */
  extractStage(round) {
    if (!round) return 'group_stage';

    const lowerRound = round.toLowerCase();

    if (lowerRound.includes('group')) return 'group_stage';
    if (lowerRound.includes('round of 16') || lowerRound.includes('8th finals')) return 'round_of_16';
    if (lowerRound.includes('quarter')) return 'quarter_finals';
    if (lowerRound.includes('semi')) return 'semi_finals';
    if (lowerRound.includes('3rd place')) return 'third_place';
    if (lowerRound.includes('final') && !lowerRound.includes('semi')) return 'final';

    return 'group_stage';
  }

  /**
   * Extract group name from round string (e.g., "Group A - 1" -> "A")
   * @param {string} round - Round description from API
   * @returns {string|null} Group letter or null
   */
  extractGroup(round) {
    if (!round) return null;

    const groupMatch = round.match(/Group ([A-Z])/i);
    return groupMatch ? groupMatch[1].toUpperCase() : null;
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
    } else if (error.message === 'API_FOOTBALL_KEY not configured') {
      // Re-throw configuration errors
      throw error;
    } else {
      // Other errors
      throw new Error(defaultMessage);
    }
  }
}

module.exports = new ApiFootballService();
