// backend/src/app.js
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const matchRoutes = require('./routes/matches');
const betRoutes = require('./routes/bets');
const coinRoutes = require('./routes/coins');
const leaderboardRoutes = require('./routes/leaderboard');
const adminRoutes = require('./routes/admin');

const app = express();

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON request bodies

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/bets', betRoutes);
app.use('/api/coins', coinRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Handle JSON parsing errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  // Default error response
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

module.exports = app;
