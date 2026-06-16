// backend/tests/unit/betService.test.js
const betService = require('../../src/services/betService');
const Bet = require('../../src/models/Bet');
const Match = require('../../src/models/Match');
const User = require('../../src/models/User');

jest.mock('../../src/models/Bet');
jest.mock('../../src/models/Match');
jest.mock('../../src/models/User');

describe('BetService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('placeBet', () => {
    it('should place a valid bet', async () => {
      const betData = {
        user_id: 1,
        match_id: 1,
        outcome: 'home_win',
        coins_bet: 10
      };

      User.findById.mockResolvedValue({ id: 1, total_coins: 50 });
      Match.findById.mockResolvedValue({
        id: 1,
        kickoff_time: new Date(Date.now() + 3600000).toISOString(),
        home_odds: 1.8,
        draw_odds: 3.2,
        away_odds: 4.5
      });
      Bet.create.mockResolvedValue({ id: 1, ...betData, odds_at_bet_time: 1.8 });
      User.updateCoins.mockResolvedValue({ changes: 1 });

      const result = await betService.placeBet(betData);

      expect(Bet.create).toHaveBeenCalled();
      expect(User.updateCoins).toHaveBeenCalledWith(1, -10);
      expect(result.potential_payout).toBe(18);
    });

    it('should reject bet with insufficient coins', async () => {
      User.findById.mockResolvedValue({ id: 1, total_coins: 5 });
      Match.findById.mockResolvedValue({
        id: 1,
        kickoff_time: new Date(Date.now() + 3600000).toISOString()
      });

      await expect(
        betService.placeBet({ user_id: 1, match_id: 1, outcome: 'home_win', coins_bet: 10 })
      ).rejects.toThrow('Insufficient coins');
    });

    it('should reject bet on locked match', async () => {
      User.findById.mockResolvedValue({ id: 1, total_coins: 50 });
      Match.findById.mockResolvedValue({
        id: 1,
        kickoff_time: new Date(Date.now() - 3600000).toISOString()
      });

      await expect(
        betService.placeBet({ user_id: 1, match_id: 1, outcome: 'home_win', coins_bet: 10 })
      ).rejects.toThrow('Match is locked');
    });

    it('should reject invalid outcome', async () => {
      User.findById.mockResolvedValue({ id: 1, total_coins: 50 });
      Match.findById.mockResolvedValue({
        id: 1,
        kickoff_time: new Date(Date.now() + 3600000).toISOString()
      });

      await expect(
        betService.placeBet({ user_id: 1, match_id: 1, outcome: 'invalid', coins_bet: 10 })
      ).rejects.toThrow('Invalid outcome');
    });

    it('should reject bet with invalid coin amount', async () => {
      User.findById.mockResolvedValue({ id: 1, total_coins: 50 });

      await expect(
        betService.placeBet({ user_id: 1, match_id: 1, outcome: 'home_win', coins_bet: 0 })
      ).rejects.toThrow('Coins must be greater than 0');
    });
  });

  describe('validateBet', () => {
    it('should validate correct bet data', async () => {
      User.findById.mockResolvedValue({ id: 1, total_coins: 50 });
      Match.findById.mockResolvedValue({
        id: 1,
        kickoff_time: new Date(Date.now() + 3600000).toISOString()
      });

      await expect(
        betService.validateBet(1, 1, 'home_win', 10)
      ).resolves.not.toThrow();
    });
  });
});
