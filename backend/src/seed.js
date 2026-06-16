// backend/src/seed.js
// Seed script to populate database with test data

require('dotenv').config();
const { initDatabase, runMigrations } = require('./config/database');
const User = require('./models/User');
const Match = require('./models/Match');
const Bet = require('./models/Bet');
const SpecialBet = require('./models/SpecialBet');
const authService = require('./services/authService');

async function seed() {
  console.log('Starting database seed...');

  try {
    // Initialize database
    const db = await initDatabase();
    await runMigrations(db);

    console.log('✓ Database initialized');

    // Create admin user
    console.log('\nCreating admin user...');
    const adminExists = await User.findByUsername('admin');
    if (!adminExists) {
      await authService.register({
        username: 'admin',
        password: 'admin123',
        email: 'admin@family-betting.com',
        is_admin: true
      });
      console.log('✓ Admin user created (username: admin, password: admin123)');
      console.log('  ⚠️  WARNING: Change admin password after first login!');
    } else {
      console.log('⊘ Admin user already exists');
    }

    // Create sample family users
    console.log('\nCreating sample users...');
    const sampleUsers = [
      { username: 'dad', password: 'dad123', email: 'dad@family.com' },
      { username: 'mom', password: 'mom123', email: 'mom@family.com' },
      { username: 'son', password: 'son123', email: 'son@family.com' },
      { username: 'daughter', password: 'daughter123', email: 'daughter@family.com' }
    ];

    const createdUsers = [];
    for (const userData of sampleUsers) {
      const exists = await User.findByUsername(userData.username);
      if (!exists) {
        const user = await authService.register(userData);
        createdUsers.push(user);
        console.log(`✓ Created user: ${userData.username} (password: ${userData.password})`);
      } else {
        console.log(`⊘ User ${userData.username} already exists`);
        createdUsers.push(exists);
      }
    }

    // Grant initial coins to all users
    console.log('\nGranting initial coins...');
    const allUsers = await User.getAll();
    for (const user of allUsers) {
      if (user.total_coins === 0) {
        await User.updateCoins(user.id, 100);
        console.log(`✓ Granted 100 coins to ${user.username}`);
      }
    }

    // Create sample matches
    console.log('\nCreating sample matches...');
    const sampleMatches = [
      {
        api_match_id: 'wc2026_001',
        home_team: 'Germany',
        away_team: 'Spain',
        kickoff_time: new Date('2026-06-20T18:00:00Z').toISOString(),
        match_date: '2026-06-20',
        stage: 'group_stage',
        group_name: 'A',
        home_odds: 2.1,
        draw_odds: 3.2,
        away_odds: 3.5
      },
      {
        api_match_id: 'wc2026_002',
        home_team: 'Brazil',
        away_team: 'Argentina',
        kickoff_time: new Date('2026-06-21T21:00:00Z').toISOString(),
        match_date: '2026-06-21',
        stage: 'group_stage',
        group_name: 'B',
        home_odds: 2.4,
        draw_odds: 3.0,
        away_odds: 2.9
      },
      {
        api_match_id: 'wc2026_003',
        home_team: 'France',
        away_team: 'England',
        kickoff_time: new Date('2026-06-22T15:00:00Z').toISOString(),
        match_date: '2026-06-22',
        stage: 'group_stage',
        group_name: 'C',
        home_odds: 2.2,
        draw_odds: 3.1,
        away_odds: 3.3
      },
      {
        api_match_id: 'wc2026_004',
        home_team: 'Netherlands',
        away_team: 'Italy',
        kickoff_time: new Date('2026-06-23T18:00:00Z').toISOString(),
        match_date: '2026-06-23',
        stage: 'group_stage',
        group_name: 'D',
        home_odds: 2.3,
        draw_odds: 3.0,
        away_odds: 3.2
      },
      {
        api_match_id: 'wc2026_005',
        home_team: 'Portugal',
        away_team: 'Belgium',
        kickoff_time: new Date('2026-06-24T21:00:00Z').toISOString(),
        match_date: '2026-06-24',
        stage: 'group_stage',
        group_name: 'E',
        home_odds: 2.5,
        draw_odds: 3.0,
        away_odds: 2.8
      },
      // A finished match for testing
      {
        api_match_id: 'wc2026_past_001',
        home_team: 'Uruguay',
        away_team: 'Colombia',
        kickoff_time: new Date('2026-06-15T18:00:00Z').toISOString(),
        match_date: '2026-06-15',
        stage: 'group_stage',
        group_name: 'F',
        home_odds: 2.0,
        draw_odds: 3.2,
        away_odds: 3.8,
        home_score: 2,
        away_score: 1,
        result: 'home_win',
        status: 'confirmed'
      }
    ];

    const createdMatches = [];
    for (const matchData of sampleMatches) {
      try {
        const match = await Match.create(matchData);

        // Update confirmed match status
        if (matchData.status === 'confirmed') {
          await Match.confirmResult(match.id, {
            home_score: matchData.home_score,
            away_score: matchData.away_score,
            result: matchData.result
          });
        }

        createdMatches.push(match);
        console.log(`✓ Created match: ${matchData.home_team} vs ${matchData.away_team}`);
      } catch (err) {
        if (err.message.includes('UNIQUE')) {
          console.log(`⊘ Match ${matchData.home_team} vs ${matchData.away_team} already exists`);
        } else {
          throw err;
        }
      }
    }

    // Create sample bets on upcoming matches
    console.log('\nCreating sample bets...');
    const upcomingMatches = await Match.getAll({ status: 'upcoming' });

    if (upcomingMatches.length > 0 && createdUsers.length > 0) {
      // Dad bets on first match
      const match1 = upcomingMatches[0];
      const dadUser = await User.findByUsername('dad');
      if (dadUser && dadUser.total_coins >= 10) {
        try {
          await Bet.create({
            user_id: dadUser.id,
            match_id: match1.id,
            outcome: 'home_win',
            coins_bet: 10,
            odds_at_bet_time: match1.home_odds
          });
          await User.updateCoins(dadUser.id, -10);
          console.log(`✓ Created bet: dad bet 10 coins on ${match1.home_team} to win`);
        } catch (err) {
          console.log(`⊘ Could not create bet for dad: ${err.message}`);
        }
      }

      // Mom bets on second match
      if (upcomingMatches.length > 1) {
        const match2 = upcomingMatches[1];
        const momUser = await User.findByUsername('mom');
        if (momUser && momUser.total_coins >= 15) {
          try {
            await Bet.create({
              user_id: momUser.id,
              match_id: match2.id,
              outcome: 'draw',
              coins_bet: 15,
              odds_at_bet_time: match2.draw_odds
            });
            await User.updateCoins(momUser.id, -15);
            console.log(`✓ Created bet: mom bet 15 coins on draw`);
          } catch (err) {
            console.log(`⊘ Could not create bet for mom: ${err.message}`);
          }
        }
      }

      // Son bets on third match
      if (upcomingMatches.length > 2) {
        const match3 = upcomingMatches[2];
        const sonUser = await User.findByUsername('son');
        if (sonUser && sonUser.total_coins >= 20) {
          try {
            await Bet.create({
              user_id: sonUser.id,
              match_id: match3.id,
              outcome: 'away_win',
              coins_bet: 20,
              odds_at_bet_time: match3.away_odds
            });
            await User.updateCoins(sonUser.id, -20);
            console.log(`✓ Created bet: son bet 20 coins on ${match3.away_team} to win`);
          } catch (err) {
            console.log(`⊘ Could not create bet for son: ${err.message}`);
          }
        }
      }
    }

    // Create a sample special bet
    console.log('\nCreating sample special bet...');
    try {
      const specialBet = await SpecialBet.create({
        title: 'Golden Boot Winner - World Cup 2026',
        type: 'golden_boot',
        lock_time: new Date('2026-07-15T00:00:00Z').toISOString()
      });
      console.log(`✓ Created special bet: ${specialBet.title}`);

      // Add options for the special bet
      const players = [
        { name: 'Kylian Mbappé', odds: 4.5 },
        { name: 'Erling Haaland', odds: 5.0 },
        { name: 'Harry Kane', odds: 6.0 },
        { name: 'Lionel Messi', odds: 7.0 },
        { name: 'Cristiano Ronaldo', odds: 8.5 }
      ];

      for (const player of players) {
        await SpecialBet.createOption(specialBet.id, player.name, player.odds);
        console.log(`  ✓ Added option: ${player.name} (${player.odds}x)`);
      }
    } catch (err) {
      if (err.message.includes('UNIQUE')) {
        console.log('⊘ Special bet already exists');
      } else {
        console.log(`⊘ Could not create special bet: ${err.message}`);
      }
    }

    console.log('\n========================================');
    console.log('✓ Seed completed successfully!');
    console.log('========================================');
    console.log('\nYou can now login with:');
    console.log('  Admin: username=admin, password=admin123');
    console.log('  Users: username=dad/mom/son/daughter, password=[username]123');
    console.log('\n⚠️  Remember to change the admin password after first login!');
    console.log('========================================\n');

    // Close database connection
    db.close(() => {
      console.log('Database connection closed');
      process.exit(0);
    });

  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
}

// Run seed if this file is executed directly
if (require.main === module) {
  seed();
}

module.exports = seed;
