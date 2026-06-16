// backend/tests/unit/specialBetService.test.js
const specialBetService = require('../../src/services/specialBetService');
const SpecialBet = require('../../src/models/SpecialBet');
const SpecialBetOption = require('../../src/models/SpecialBetOption');
const SpecialBetPrediction = require('../../src/models/SpecialBetPrediction');
const User = require('../../src/models/User');

jest.mock('../../src/models/SpecialBet');
jest.mock('../../src/models/SpecialBetOption');
jest.mock('../../src/models/SpecialBetPrediction');
jest.mock('../../src/models/User');

describe('SpecialBetService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('placePrediction', () => {
    it('should place a valid prediction', async () => {
      const predictionData = {
        user_id: 1,
        special_bet_id: 1,
        option_id: 1,
        coins_bet: 10
      };

      User.findById.mockResolvedValue({ id: 1, total_coins: 50 });
      SpecialBet.findById.mockResolvedValue({
        id: 1,
        lock_time: new Date(Date.now() + 3600000).toISOString(),
        status: 'open'
      });
      SpecialBetOption.findById.mockResolvedValue({
        id: 1,
        special_bet_id: 1,
        option_text: 'Brazil',
        odds: 3.5
      });
      SpecialBetPrediction.hasUserBetOnSpecialBet.mockResolvedValue(false);
      SpecialBetPrediction.create.mockResolvedValue({
        id: 1,
        ...predictionData,
        odds_at_bet_time: 3.5
      });
      User.updateCoins.mockResolvedValue({ changes: 1 });

      const result = await specialBetService.placePrediction(predictionData);

      expect(SpecialBetPrediction.create).toHaveBeenCalled();
      expect(User.updateCoins).toHaveBeenCalledWith(1, -10);
      expect(result.potential_payout).toBe(35);
    });

    it('should reject prediction with insufficient coins', async () => {
      User.findById.mockResolvedValue({ id: 1, total_coins: 5 });
      SpecialBet.findById.mockResolvedValue({
        id: 1,
        lock_time: new Date(Date.now() + 3600000).toISOString(),
        status: 'open'
      });
      SpecialBetOption.findById.mockResolvedValue({ id: 1, special_bet_id: 1, odds: 3.5 });

      await expect(
        specialBetService.placePrediction({
          user_id: 1,
          special_bet_id: 1,
          option_id: 1,
          coins_bet: 10
        })
      ).rejects.toThrow('Insufficient coins');
    });

    it('should reject prediction on locked special bet', async () => {
      User.findById.mockResolvedValue({ id: 1, total_coins: 50 });
      SpecialBet.findById.mockResolvedValue({
        id: 1,
        lock_time: new Date(Date.now() - 3600000).toISOString(),
        status: 'locked'
      });

      await expect(
        specialBetService.placePrediction({
          user_id: 1,
          special_bet_id: 1,
          option_id: 1,
          coins_bet: 10
        })
      ).rejects.toThrow('Special bet is not open');
    });

    it('should reject prediction on closed special bet', async () => {
      User.findById.mockResolvedValue({ id: 1, total_coins: 50 });
      SpecialBet.findById.mockResolvedValue({
        id: 1,
        lock_time: new Date(Date.now() + 3600000).toISOString(),
        status: 'closed'
      });

      await expect(
        specialBetService.placePrediction({
          user_id: 1,
          special_bet_id: 1,
          option_id: 1,
          coins_bet: 10
        })
      ).rejects.toThrow('Special bet is not open');
    });

    it('should reject if user already bet on this special bet', async () => {
      User.findById.mockResolvedValue({ id: 1, total_coins: 50 });
      SpecialBet.findById.mockResolvedValue({
        id: 1,
        lock_time: new Date(Date.now() + 3600000).toISOString(),
        status: 'open'
      });
      SpecialBetOption.findById.mockResolvedValue({ id: 1, special_bet_id: 1, odds: 3.5 });
      SpecialBetPrediction.hasUserBetOnSpecialBet.mockResolvedValue(true);

      await expect(
        specialBetService.placePrediction({
          user_id: 1,
          special_bet_id: 1,
          option_id: 1,
          coins_bet: 10
        })
      ).rejects.toThrow('You have already placed a prediction on this special bet');
    });

    it('should reject if option does not belong to special bet', async () => {
      User.findById.mockResolvedValue({ id: 1, total_coins: 50 });
      SpecialBet.findById.mockResolvedValue({
        id: 1,
        lock_time: new Date(Date.now() + 3600000).toISOString(),
        status: 'open'
      });
      SpecialBetOption.findById.mockResolvedValue({ id: 1, special_bet_id: 999, odds: 3.5 });

      await expect(
        specialBetService.placePrediction({
          user_id: 1,
          special_bet_id: 1,
          option_id: 1,
          coins_bet: 10
        })
      ).rejects.toThrow('Invalid option for this special bet');
    });

    it('should reject prediction with invalid coin amount', async () => {
      User.findById.mockResolvedValue({ id: 1, total_coins: 50 });

      await expect(
        specialBetService.placePrediction({
          user_id: 1,
          special_bet_id: 1,
          option_id: 1,
          coins_bet: 0
        })
      ).rejects.toThrow('Coins must be greater than 0');
    });
  });

  describe('getUserPredictions', () => {
    it('should get user predictions with formatted data', async () => {
      const mockPredictions = [
        {
          id: 1,
          user_id: 1,
          special_bet_option_id: 1,
          coins_bet: 10,
          odds_at_bet_time: 3.5,
          payout: null,
          is_winner: null,
          special_bet_title: 'World Cup Winner',
          special_bet_status: 'open',
          option_text: 'Brazil'
        }
      ];

      SpecialBetPrediction.findByUser.mockResolvedValue(mockPredictions);

      const result = await specialBetService.getUserPredictions(1);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('prediction_id', 1);
      expect(result[0]).toHaveProperty('special_bet_title', 'World Cup Winner');
      expect(result[0]).toHaveProperty('potential_payout', 35);
      expect(result[0]).toHaveProperty('status', 'pending');
    });

    it('should correctly format won predictions', async () => {
      const mockPredictions = [
        {
          id: 1,
          coins_bet: 10,
          odds_at_bet_time: 3.5,
          payout: 35,
          is_winner: 1,
          special_bet_title: 'World Cup Winner',
          special_bet_status: 'resolved',
          option_text: 'Brazil'
        }
      ];

      SpecialBetPrediction.findByUser.mockResolvedValue(mockPredictions);

      const result = await specialBetService.getUserPredictions(1);

      expect(result[0].status).toBe('won');
      expect(result[0].payout).toBe(35);
    });

    it('should correctly format lost predictions', async () => {
      const mockPredictions = [
        {
          id: 1,
          coins_bet: 10,
          odds_at_bet_time: 3.5,
          payout: 0,
          is_winner: 0,
          special_bet_title: 'World Cup Winner',
          special_bet_status: 'resolved',
          option_text: 'Brazil'
        }
      ];

      SpecialBetPrediction.findByUser.mockResolvedValue(mockPredictions);

      const result = await specialBetService.getUserPredictions(1);

      expect(result[0].status).toBe('lost');
      expect(result[0].payout).toBe(0);
    });
  });

  describe('resolveSpecialBet', () => {
    it('should resolve special bet and process payouts', async () => {
      const specialBetId = 1;
      const correctOptionId = 1;

      SpecialBet.findById.mockResolvedValue({ id: 1, status: 'locked' });
      SpecialBetOption.findById.mockResolvedValue({ id: 1, special_bet_id: 1 });

      const winningPredictions = [
        { id: 1, user_id: 1, coins_bet: 10, odds_at_bet_time: 3.5 },
        { id: 2, user_id: 2, coins_bet: 20, odds_at_bet_time: 3.5 }
      ];

      SpecialBetPrediction.getWinningPredictions.mockResolvedValue(winningPredictions);
      SpecialBetPrediction.findBySpecialBet.mockResolvedValue([
        ...winningPredictions,
        { id: 3, user_id: 3, special_bet_option_id: 2, coins_bet: 15, odds_at_bet_time: 4.0 }
      ]);

      SpecialBetOption.markCorrect.mockResolvedValue({ changes: 1 });
      SpecialBetPrediction.updatePayout.mockResolvedValue({ changes: 1 });
      User.updateCoins.mockResolvedValue({ changes: 1 });
      SpecialBet.updateStatus.mockResolvedValue({ changes: 1 });

      const result = await specialBetService.resolveSpecialBet(specialBetId, correctOptionId);

      expect(SpecialBetOption.markCorrect).toHaveBeenCalledWith(correctOptionId);
      expect(SpecialBetPrediction.updatePayout).toHaveBeenCalled(); // Called for winners and losers
      expect(User.updateCoins).toHaveBeenCalledTimes(2); // Only winners get coins
      expect(SpecialBet.updateStatus).toHaveBeenCalledWith(specialBetId, 'resolved');
      expect(result.winners_count).toBe(2);
      expect(result.total_payout).toBe(105); // (10 * 3.5) + (20 * 3.5)
    });

    it('should reject if special bet not found', async () => {
      SpecialBet.findById.mockResolvedValue(null);

      await expect(
        specialBetService.resolveSpecialBet(1, 1)
      ).rejects.toThrow('Special bet not found');
    });

    it('should reject if correct option not found', async () => {
      SpecialBet.findById.mockResolvedValue({ id: 1 });
      SpecialBetOption.findById.mockResolvedValue(null);

      await expect(
        specialBetService.resolveSpecialBet(1, 1)
      ).rejects.toThrow('Option not found');
    });

    it('should reject if option does not belong to special bet', async () => {
      SpecialBet.findById.mockResolvedValue({ id: 1 });
      SpecialBetOption.findById.mockResolvedValue({ id: 1, special_bet_id: 999 });

      await expect(
        specialBetService.resolveSpecialBet(1, 1)
      ).rejects.toThrow('Invalid option for this special bet');
    });
  });

  describe('validatePrediction', () => {
    it('should validate correct prediction data', async () => {
      User.findById.mockResolvedValue({ id: 1, total_coins: 50 });
      SpecialBet.findById.mockResolvedValue({
        id: 1,
        lock_time: new Date(Date.now() + 3600000).toISOString(),
        status: 'open'
      });
      SpecialBetOption.findById.mockResolvedValue({ id: 1, special_bet_id: 1, odds: 3.5 });
      SpecialBetPrediction.hasUserBetOnSpecialBet.mockResolvedValue(false);

      await expect(
        specialBetService.validatePrediction(1, 1, 1, 10)
      ).resolves.not.toThrow();
    });
  });
});
