// backend/src/services/specialBetService.js
const SpecialBet = require('../models/SpecialBet');
const SpecialBetOption = require('../models/SpecialBetOption');
const SpecialBetPrediction = require('../models/SpecialBetPrediction');
const User = require('../models/User');

/**
 * Service for handling special bets business logic
 */
class SpecialBetService {
  /**
   * Place a prediction on a special bet
   * @param {Object} predictionData - Prediction data
   * @param {number} predictionData.user_id - User ID
   * @param {number} predictionData.special_bet_id - Special bet ID
   * @param {number} predictionData.option_id - Option ID to bet on
   * @param {number} predictionData.coins_bet - Coins to wager
   * @returns {Promise<Object>} Created prediction with potential payout info
   */
  async placePrediction({ user_id, special_bet_id, option_id, coins_bet }) {
    // Validate the prediction
    await this.validatePrediction(user_id, special_bet_id, option_id, coins_bet);

    // Get the option to retrieve odds
    const option = await SpecialBetOption.findById(option_id);

    // Deduct coins from user
    await User.updateCoins(user_id, -coins_bet);

    // Create the prediction
    const prediction = await SpecialBetPrediction.create({
      user_id,
      special_bet_option_id: option_id,
      coins_bet,
      odds_at_bet_time: option.odds
    });

    // Get updated user balance
    const user = await User.findById(user_id);

    return {
      prediction_id: prediction.id,
      new_balance: user.total_coins,
      potential_payout: coins_bet * option.odds
    };
  }

  /**
   * Validate a prediction before placing
   * @param {number} userId - User ID
   * @param {number} specialBetId - Special bet ID
   * @param {number} optionId - Option ID
   * @param {number} coinsBet - Coins to bet
   * @throws {Error} If validation fails
   */
  async validatePrediction(userId, specialBetId, optionId, coinsBet) {
    // Validate coin amount
    if (coinsBet <= 0 || isNaN(coinsBet)) {
      throw new Error('Coins must be greater than 0');
    }

    // Check if user exists and has enough coins
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.total_coins < coinsBet) {
      throw new Error('Insufficient coins');
    }

    // Check if special bet exists
    const specialBet = await SpecialBet.findById(specialBetId);
    if (!specialBet) {
      throw new Error('Special bet not found');
    }

    // Check if special bet is open
    if (specialBet.status !== 'open') {
      throw new Error('Special bet is not open');
    }

    // Check if special bet is locked (past lock time)
    const lockTime = new Date(specialBet.lock_time);
    if (Date.now() >= lockTime.getTime()) {
      throw new Error('Special bet is locked');
    }

    // Check if option exists
    const option = await SpecialBetOption.findById(optionId);
    if (!option) {
      throw new Error('Option not found');
    }

    // Check if option belongs to the special bet
    if (option.special_bet_id !== specialBetId) {
      throw new Error('Invalid option for this special bet');
    }

    // Check if user has already bet on this special bet
    const hasAlreadyBet = await SpecialBetPrediction.hasUserBetOnSpecialBet(
      userId,
      specialBetId
    );
    if (hasAlreadyBet) {
      throw new Error('You have already placed a prediction on this special bet');
    }
  }

  /**
   * Get user's predictions
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Array of formatted predictions
   */
  async getUserPredictions(userId) {
    const predictions = await SpecialBetPrediction.findByUser(userId);

    return predictions.map(prediction => ({
      prediction_id: prediction.id,
      special_bet_title: prediction.special_bet_title,
      special_bet_type: prediction.special_bet_type,
      special_bet_status: prediction.special_bet_status,
      special_bet_lock_time: prediction.special_bet_lock_time,
      option_text: prediction.option_text,
      coins_bet: prediction.coins_bet,
      odds_at_bet_time: prediction.odds_at_bet_time,
      potential_payout: prediction.coins_bet * prediction.odds_at_bet_time,
      payout: prediction.payout,
      is_winner: prediction.is_winner,
      status:
        prediction.is_winner === null
          ? 'pending'
          : prediction.is_winner
          ? 'won'
          : 'lost',
      placed_at: prediction.placed_at
    }));
  }

  /**
   * Resolve a special bet and process payouts
   * @param {number} specialBetId - Special bet ID
   * @param {number} correctOptionId - ID of the correct option
   * @returns {Promise<Object>} Resolution summary
   */
  async resolveSpecialBet(specialBetId, correctOptionId) {
    // Validate special bet exists
    const specialBet = await SpecialBet.findById(specialBetId);
    if (!specialBet) {
      throw new Error('Special bet not found');
    }

    // Validate option exists
    const correctOption = await SpecialBetOption.findById(correctOptionId);
    if (!correctOption) {
      throw new Error('Option not found');
    }

    // Validate option belongs to special bet
    if (correctOption.special_bet_id !== specialBetId) {
      throw new Error('Invalid option for this special bet');
    }

    // Mark the correct option
    await SpecialBetOption.markCorrect(correctOptionId);

    // Get all predictions for this special bet
    const allPredictions = await SpecialBetPrediction.findBySpecialBet(specialBetId);

    // Get winning predictions
    const winningPredictions = await SpecialBetPrediction.getWinningPredictions(
      correctOptionId
    );

    let totalPayout = 0;
    let winnersCount = 0;

    // Process winning predictions
    for (const prediction of winningPredictions) {
      const payout = prediction.coins_bet * prediction.odds_at_bet_time;

      // Update prediction with payout
      await SpecialBetPrediction.updatePayout(prediction.id, payout, true);

      // Credit user with payout
      await User.updateCoins(prediction.user_id, payout);

      totalPayout += payout;
      winnersCount++;
    }

    // Process losing predictions (mark them as lost with 0 payout)
    for (const prediction of allPredictions) {
      if (prediction.special_bet_option_id !== correctOptionId) {
        await SpecialBetPrediction.updatePayout(prediction.id, 0, false);
      }
    }

    // Update special bet status to resolved
    await SpecialBet.updateStatus(specialBetId, 'resolved');

    return {
      special_bet_id: specialBetId,
      correct_option_id: correctOptionId,
      winners_count: winnersCount,
      total_payout: totalPayout,
      total_predictions: allPredictions.length
    };
  }

  /**
   * Get all special bets with their options
   * @param {Object} filters - Optional filters
   * @param {string} filters.status - Filter by status
   * @returns {Promise<Array>} Array of special bets with options
   */
  async getAllSpecialBetsWithOptions(filters = {}) {
    return await SpecialBet.getAllWithOptions(filters);
  }

  /**
   * Get a specific special bet with its options
   * @param {number} specialBetId - Special bet ID
   * @returns {Promise<Object|null>} Special bet with options
   */
  async getSpecialBetWithOptions(specialBetId) {
    return await SpecialBet.getWithOptions(specialBetId);
  }
}

module.exports = new SpecialBetService();
